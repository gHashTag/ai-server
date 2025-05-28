import { z } from 'zod'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'
import { PaymentType } from '@/interfaces/payments.interface'

// === ZOD SCHEMAS ===

/**
 * Схема для валидации типов платежей
 */
export const paymentTypeSchema = z.nativeEnum(PaymentType, {
  errorMap: () => ({ message: 'Недопустимый тип платежа' }),
})

/**
 * Схема для валидации лимита записей
 */
export const limitSchema = z
  .number()
  .int()
  .min(1, 'Лимит должен быть больше 0')
  .max(100, 'Лимит не может превышать 100')
  .default(10)

/**
 * Схема для параметров получения истории платежей
 */
export const getPaymentHistoryParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  limit: limitSchema.optional(),
  payment_type: paymentTypeSchema.optional(),
  bot_name: z.string().optional(),
})

/**
 * Схема для платежа из Supabase (адаптированная под строковые даты)
 */
export const paymentHistoryItemSchema = z.object({
  id: z.string().uuid(),
  telegram_id: z.string(),
  type: z.string(), // PaymentType as string
  stars: z.number().nullable(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  description: z.string().nullable(),
  payment_method: z.string().nullable(),
  bot_name: z.string().nullable().optional(),
  status: z.string(),
  created_at: z.string(), // Supabase возвращает строки для дат
  updated_at: z.string().optional(),
  metadata: z.record(z.any()).nullable().optional(),
})

/**
 * Схема для результата получения истории платежей
 */
export const getPaymentHistoryResultSchema = z.object({
  success: z.boolean(),
  payments: z.array(paymentHistoryItemSchema).nullable(),
  total_count: z.number().optional(),
  error_message: z.string().optional(),
})

// === TYPES ===

export type GetPaymentHistoryParams = z.infer<
  typeof getPaymentHistoryParamsSchema
>
export type PaymentHistoryItem = z.infer<typeof paymentHistoryItemSchema>
export type GetPaymentHistoryResult = z.infer<
  typeof getPaymentHistoryResultSchema
>

// === CACHE ===

type PaymentHistoryCache = {
  [key: string]: {
    payments: PaymentHistoryItem[]
    timestamp: number
  }
}

// Время жизни кэша истории платежей в миллисекундах (2 минуты)
const PAYMENT_HISTORY_CACHE_TTL = 2 * 60 * 1000

// Кэш истории платежей
const paymentHistoryCache: PaymentHistoryCache = {}

// === MAIN FUNCTION ===

/**
 * Получает историю платежей пользователя
 * Современная версия с Zod валидацией, кэшированием и фильтрацией
 *
 * @param params - Параметры получения истории платежей
 * @returns Результат операции с массивом платежей
 */
export const getPaymentHistoryV2 = async (
  params: GetPaymentHistoryParams
): Promise<GetPaymentHistoryResult> => {
  try {
    // Валидация входных параметров
    const validatedParams = getPaymentHistoryParamsSchema.parse(params)
    const limit = validatedParams.limit || 10

    logger.info('📋 Получение истории платежей V2:', {
      telegram_id: validatedParams.telegram_id,
      limit,
      payment_type: validatedParams.payment_type,
      bot_name: validatedParams.bot_name,
    })

    // Проверяем кэш
    const cacheKey = `${validatedParams.telegram_id}_${limit}_${
      validatedParams.payment_type || 'all'
    }_${validatedParams.bot_name || 'all'}`
    const now = Date.now()

    if (
      paymentHistoryCache[cacheKey] &&
      now - paymentHistoryCache[cacheKey].timestamp < PAYMENT_HISTORY_CACHE_TTL
    ) {
      logger.info('💾 Получение истории платежей из кэша:', {
        telegram_id: validatedParams.telegram_id,
        cache_key: cacheKey,
        cached_count: paymentHistoryCache[cacheKey].payments.length,
      })
      return {
        success: true,
        payments: paymentHistoryCache[cacheKey].payments,
      }
    }

    // Строим запрос к базе данных
    let query = supabase
      .from('payments_v2')
      .select(
        'id, telegram_id, type, stars, amount, currency, description, payment_method, bot_name, status, created_at, updated_at, metadata'
      )
      .eq('telegram_id', validatedParams.telegram_id)
      .eq('status', 'COMPLETED')

    // Добавляем фильтры если они указаны
    if (validatedParams.payment_type) {
      query = query.eq('type', validatedParams.payment_type)
    }

    if (validatedParams.bot_name) {
      query = query.eq('bot_name', validatedParams.bot_name)
    }

    // Выполняем запрос
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('❌ Ошибка получения истории платежей:', {
        error: error.message,
        error_code: error.code,
        telegram_id: validatedParams.telegram_id,
        limit,
      })
      throw new Error(`Ошибка получения истории платежей: ${error.message}`)
    }

    // Проверяем, есть ли данные
    if (!data || data.length === 0) {
      logger.info('ℹ️ История платежей пуста:', {
        telegram_id: validatedParams.telegram_id,
        limit,
        payment_type: validatedParams.payment_type,
        bot_name: validatedParams.bot_name,
      })
      return {
        success: true,
        payments: [],
      }
    }

    // Валидируем каждый платеж
    const validatedPayments = data.map(payment =>
      paymentHistoryItemSchema.parse(payment)
    )

    // Сохраняем в кэш
    paymentHistoryCache[cacheKey] = {
      payments: validatedPayments,
      timestamp: now,
    }

    logger.info('✅ История платежей успешно получена:', {
      telegram_id: validatedParams.telegram_id,
      payments_count: validatedPayments.length,
      limit,
      payment_type: validatedParams.payment_type,
      bot_name: validatedParams.bot_name,
    })

    return {
      success: true,
      payments: validatedPayments,
      total_count: validatedPayments.length,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Ошибки валидации Zod пробрасываем как есть
      throw error
    }

    logger.error('❌ Неожиданная ошибка в getPaymentHistoryV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      telegram_id: params.telegram_id,
    })

    throw error
  }
}

// === CACHE MANAGEMENT ===

/**
 * Инвалидирует кэш истории платежей для указанного пользователя
 * Должен вызываться после всех операций, изменяющих платежи
 */
export const invalidatePaymentHistoryCache = (telegram_id: string): void => {
  // Удаляем все записи кэша для данного пользователя
  Object.keys(paymentHistoryCache).forEach(key => {
    if (key.startsWith(`${telegram_id}_`)) {
      delete paymentHistoryCache[key]
    }
  })

  logger.info('🔄 Кэш истории платежей инвалидирован:', {
    telegram_id,
  })
}

/**
 * Очищает весь кэш истории платежей
 */
export const clearPaymentHistoryCache = (): void => {
  Object.keys(paymentHistoryCache).forEach(key => {
    delete paymentHistoryCache[key]
  })

  logger.info('🧹 Кэш истории платежей полностью очищен')
}

/**
 * Получает статистику кэша истории платежей
 */
export const getPaymentHistoryCacheStats = () => {
  const now = Date.now()
  const totalEntries = Object.keys(paymentHistoryCache).length
  const validEntries = Object.values(paymentHistoryCache).filter(
    entry => now - entry.timestamp < PAYMENT_HISTORY_CACHE_TTL
  ).length
  const expiredEntries = totalEntries - validEntries

  return {
    total: totalEntries,
    valid: validEntries,
    expired: expiredEntries,
    ttl_ms: PAYMENT_HISTORY_CACHE_TTL,
  }
}

// === WRAPPER FUNCTION FOR BACKWARD COMPATIBILITY ===

/**
 * Простая wrapper функция для обратной совместимости
 * Возвращает только массив платежей как в оригинальной функции
 */
export const getPaymentHistorySimple = async (
  telegram_id: string,
  limit = 10
): Promise<PaymentHistoryItem[]> => {
  const result = await getPaymentHistoryV2({
    telegram_id,
    limit,
  })

  if (!result.success || !result.payments) {
    return []
  }

  return result.payments
}
