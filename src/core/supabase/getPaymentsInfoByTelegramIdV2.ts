import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'

// Zod схема для ответа платежа
export const paymentInfoSchema = z.object({
  id: z.string().uuid(),
  inv_id: z.string().nullable(),
  telegram_id: z.string(),
  amount: z.number(),
  stars: z.number(),
  currency: z.string(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  type: z.enum(['MONEY_INCOME', 'MONEY_OUTCOME', 'REFUND']),
  payment_method: z.string(),
  description: z.string().nullable(),
  bot_name: z.string(),
  created_at: z.string(),
  payment_date: z.string().nullable(),
  subscription_type: z.string().nullable(),
  service_type: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
})

export type PaymentInfo = z.infer<typeof paymentInfoSchema>

// Схема для входных параметров
export const getPaymentsParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  type: z.enum(['MONEY_INCOME', 'MONEY_OUTCOME', 'REFUND']).optional(),
})

export type GetPaymentsParams = z.infer<typeof getPaymentsParamsSchema>

/**
 * Получает информацию о платежах пользователя из таблицы payments_v2
 * Использует Drizzle ORM и Zod валидацию
 */
export const getPaymentsInfoByTelegramIdV2 = async (
  params: GetPaymentsParams
): Promise<PaymentInfo[]> => {
  try {
    // Валидация входных параметров
    const validatedParams = getPaymentsParamsSchema.parse(params)

    logger.info('💳 Получение платежей пользователя из payments_v2:', {
      telegram_id: validatedParams.telegram_id,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      filters: {
        status: validatedParams.status,
        type: validatedParams.type,
      },
    })

    // Строим запрос к payments_v2
    let query = supabase
      .from('payments_v2')
      .select('*')
      .eq('telegram_id', validatedParams.telegram_id)
      .order('created_at', { ascending: false })
      .range(
        validatedParams.offset,
        validatedParams.offset + validatedParams.limit - 1
      )

    // Добавляем фильтры если указаны
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }

    if (validatedParams.type) {
      query = query.eq('type', validatedParams.type)
    }

    const { data, error } = await query

    if (error) {
      logger.error('❌ Ошибка получения платежей из payments_v2:', {
        error: error.message,
        error_details: error,
        telegram_id: validatedParams.telegram_id,
      })
      throw new Error(`Ошибка получения платежей: ${error.message}`)
    }

    if (!data || data.length === 0) {
      logger.info('ℹ️ Платежи не найдены:', {
        telegram_id: validatedParams.telegram_id,
      })
      return []
    }

    // Валидируем каждый платеж через Zod
    const validatedPayments = data
      .map((payment, index) => {
        try {
          return paymentInfoSchema.parse(payment)
        } catch (validationError) {
          logger.warn('⚠️ Ошибка валидации платежа:', {
            payment_index: index,
            payment_id: payment.id,
            validation_error:
              validationError instanceof z.ZodError
                ? validationError.errors
                : validationError,
          })
          // Возвращаем null для невалидных платежей
          return null
        }
      })
      .filter((payment): payment is PaymentInfo => payment !== null)

    logger.info('✅ Платежи успешно получены из payments_v2:', {
      telegram_id: validatedParams.telegram_id,
      total_found: data.length,
      valid_payments: validatedPayments.length,
    })

    return validatedPayments
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Ошибка валидации параметров запроса платежей:', {
        validation_errors: error.errors,
        params,
      })
      throw new Error(
        `Ошибка валидации: ${error.errors.map(e => e.message).join(', ')}`
      )
    }

    logger.error('❌ Ошибка в getPaymentsInfoByTelegramIdV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      params,
    })
    throw error
  }
}

/**
 * Упрощенная версия для обратной совместимости
 * Возвращает только основные поля в старом формате
 */
export const getPaymentsInfoByTelegramIdSimple = async (
  telegram_id: string
): Promise<{ id: string; amount: number; date: string }[]> => {
  const payments = await getPaymentsInfoByTelegramIdV2({ telegram_id })

  return payments.map(payment => ({
    id: payment.id,
    amount: payment.amount,
    date: payment.created_at,
  }))
}
