import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { usernameSchema } from '@/schemas/common/telegram.schemas'
import {
  paymentInfoSchema,
  type PaymentInfo,
} from './getPaymentsInfoByTelegramIdV2'

// Схема для входных параметров
export const getPaymentsByUsernameParamsSchema = z.object({
  username: usernameSchema.refine(val => val !== undefined, {
    message: 'Username обязателен для поиска платежей',
  }),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']).optional(),
  type: z.enum(['MONEY_INCOME', 'MONEY_OUTCOME', 'REFUND']).optional(),
  bot_name: z.string().optional(), // Фильтр по боту
})

export type GetPaymentsByUsernameParams = z.infer<
  typeof getPaymentsByUsernameParamsSchema
>

// Схема для ответа с информацией о пользователе
export const userPaymentsInfoSchema = z.object({
  user_info: z.object({
    telegram_id: z.string(),
    username: z.string(),
    user_id: z.string().optional(),
  }),
  payments: z.array(paymentInfoSchema),
  total_count: z.number(),
  has_more: z.boolean(),
  limit: z.number(),
  offset: z.number(),
})

export type UserPaymentsInfo = z.infer<typeof userPaymentsInfoSchema>

/**
 * Получает информацию о платежах пользователя по username из таблицы payments_v2
 * Использует Drizzle ORM и Zod валидацию
 */
export const getPaymentsInfoByUsernameV2 = async (
  params: GetPaymentsByUsernameParams
): Promise<UserPaymentsInfo> => {
  try {
    // Валидация входных параметров
    const validatedParams = getPaymentsByUsernameParamsSchema.parse(params)

    logger.info(
      '👤 Получение платежей пользователя по username из payments_v2:',
      {
        username: validatedParams.username,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
        filters: {
          status: validatedParams.status,
          type: validatedParams.type,
          bot_name: validatedParams.bot_name,
        },
      }
    )

    // Сначала получаем telegram_id по username
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('telegram_id, username, user_id')
      .eq('username', validatedParams.username)
      .single()

    if (userError) {
      logger.error('❌ Ошибка получения пользователя по username:', {
        error: userError.message,
        error_details: userError,
        username: validatedParams.username,
      })
      throw new Error(
        `Пользователь с username ${validatedParams.username} не найден`
      )
    }

    if (!userData?.telegram_id) {
      logger.warn('⚠️ Пользователь найден, но telegram_id отсутствует:', {
        username: validatedParams.username,
        user_data: userData,
      })
      throw new Error(
        `У пользователя ${validatedParams.username} отсутствует telegram_id`
      )
    }

    // Строим запрос к payments_v2 по telegram_id
    let query = supabase
      .from('payments_v2')
      .select('*')
      .eq('telegram_id', userData.telegram_id)
      .order('created_at', { ascending: false })

    // Добавляем фильтры если указаны
    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }

    if (validatedParams.type) {
      query = query.eq('type', validatedParams.type)
    }

    if (validatedParams.bot_name) {
      query = query.eq('bot_name', validatedParams.bot_name)
    }

    // Получаем общее количество записей для пагинации
    let countQuery = supabase
      .from('payments_v2')
      .select('*', { count: 'exact', head: true })
      .eq('telegram_id', userData.telegram_id)

    // Добавляем те же фильтры для подсчета
    if (validatedParams.status) {
      countQuery = countQuery.eq('status', validatedParams.status)
    }

    if (validatedParams.type) {
      countQuery = countQuery.eq('type', validatedParams.type)
    }

    if (validatedParams.bot_name) {
      countQuery = countQuery.eq('bot_name', validatedParams.bot_name)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      logger.error('❌ Ошибка подсчета платежей:', {
        error: countError.message,
        telegram_id: userData.telegram_id,
      })
    }

    // Получаем данные с пагинацией
    const { data: paymentsData, error: paymentsError } = await query.range(
      validatedParams.offset,
      validatedParams.offset + validatedParams.limit - 1
    )

    if (paymentsError) {
      logger.error('❌ Ошибка получения платежей из payments_v2:', {
        error: paymentsError.message,
        error_details: paymentsError,
        telegram_id: userData.telegram_id,
        username: validatedParams.username,
      })
      throw new Error(`Ошибка получения платежей: ${paymentsError.message}`)
    }

    if (!paymentsData || paymentsData.length === 0) {
      logger.info('ℹ️ Платежи не найдены для пользователя:', {
        username: validatedParams.username,
        telegram_id: userData.telegram_id,
      })

      return {
        user_info: {
          telegram_id: userData.telegram_id,
          username: userData.username,
          user_id: userData.user_id,
        },
        payments: [],
        total_count: 0,
        has_more: false,
        limit: validatedParams.limit,
        offset: validatedParams.offset,
      }
    }

    // Валидируем каждый платеж через Zod
    const validatedPayments = paymentsData
      .map((payment, index) => {
        try {
          return paymentInfoSchema.parse(payment)
        } catch (validationError) {
          logger.warn('⚠️ Ошибка валидации платежа:', {
            payment_index: index,
            payment_id: payment.id,
            username: validatedParams.username,
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

    const result: UserPaymentsInfo = {
      user_info: {
        telegram_id: userData.telegram_id,
        username: userData.username,
        user_id: userData.user_id,
      },
      payments: validatedPayments,
      total_count: totalCount || 0,
      has_more:
        validatedParams.offset + validatedParams.limit < (totalCount || 0),
      limit: validatedParams.limit,
      offset: validatedParams.offset,
    }

    logger.info('✅ Платежи пользователя успешно получены по username:', {
      username: validatedParams.username,
      telegram_id: userData.telegram_id,
      total_found: paymentsData.length,
      valid_payments: validatedPayments.length,
      total_count: totalCount,
      has_more: result.has_more,
    })

    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error(
        '❌ Ошибка валидации параметров запроса платежей по username:',
        {
          validation_errors: error.errors,
          params,
        }
      )
      throw new Error(
        `Ошибка валидации: ${error.errors.map(e => e.message).join(', ')}`
      )
    }

    logger.error('❌ Ошибка в getPaymentsInfoByUsernameV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      params,
    })
    throw error
  }
}

/**
 * Упрощенная версия для обратной совместимости
 * Возвращает только массив платежей в старом формате
 */
export const getPaymentsInfoByUsernameSimple = async (
  username: string
): Promise<PaymentInfo[]> => {
  const result = await getPaymentsInfoByUsernameV2({ username })
  return result.payments
}
