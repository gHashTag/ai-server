import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { PaymentType, PaymentMethod } from '@/interfaces/payments.interface'
import { invalidateBalanceCache } from './getUserBalance'

// Zod схема для валидации входных данных
export const setPaymentV2Schema = z.object({
  inv_id: z.string().min(1, 'inv_id не может быть пустым'),
  telegram_id: z.string().min(1, 'telegram_id не может быть пустым'),
  amount: z.number().positive('amount должен быть положительным'),
  currency: z.enum(['RUB', 'USD', 'EUR', 'STARS'], {
    errorMap: () => ({ message: 'Неподдерживаемая валюта' }),
  }),
  stars: z.number().positive('stars должен быть положительным'),
  payment_method: z.enum(['Robokassa', 'Telegram', 'Manual', 'System'], {
    errorMap: () => ({ message: 'Неподдерживаемый метод оплаты' }),
  }),
  bot_name: z.string().min(1, 'bot_name не может быть пустым'),
  email: z.string().email().optional(),
  subscription_type: z
    .enum(['NEUROPHOTO', 'NEUROBASE', 'NEUROTESTER'])
    .optional(),
})

export type SetPaymentV2Input = z.infer<typeof setPaymentV2Schema>

/**
 * Обновляет статус платежа в таблице payments_v2
 * Использует Drizzle ORM и Zod валидацию
 */
export const setPaymentsV2 = async (
  input: SetPaymentV2Input
): Promise<void> => {
  try {
    // Валидация входных данных
    const validatedData = setPaymentV2Schema.parse(input)

    logger.info('💳 Обновление платежа в payments_v2:', {
      inv_id: validatedData.inv_id,
      telegram_id: validatedData.telegram_id,
      amount: validatedData.amount,
      stars: validatedData.stars,
      payment_method: validatedData.payment_method,
      bot_name: validatedData.bot_name,
    })

    // Обновляем существующую запись по inv_id в payments_v2
    const { data, error } = await supabase
      .from('payments_v2')
      .update({
        telegram_id: validatedData.telegram_id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        status: 'COMPLETED',
        payment_method: validatedData.payment_method,
        description: `Покупка: ${validatedData.stars} ⭐`,
        stars: validatedData.stars,
        bot_name: validatedData.bot_name,
        type: PaymentType.MONEY_INCOME, // Это пополнение баланса
        payment_date: new Date().toISOString(),
        subscription_type: validatedData.subscription_type || null,
        service_type: null, // Для пополнений service_type = null
        metadata: {
          email: validatedData.email,
          updated_by: 'setPaymentsV2',
          original_currency: validatedData.currency,
        },
      })
      .eq('inv_id', validatedData.inv_id)
      .select()

    if (error) {
      logger.error('❌ Ошибка обновления платежа в payments_v2:', {
        error: error.message,
        error_details: error,
        inv_id: validatedData.inv_id,
      })
      throw new Error(`Ошибка обновления платежа: ${error.message}`)
    }

    if (!data || data.length === 0) {
      logger.warn('⚠️ Платеж не найден для обновления:', {
        inv_id: validatedData.inv_id,
      })
      throw new Error(`Платеж с inv_id ${validatedData.inv_id} не найден`)
    }

    // Инвалидируем кэш баланса пользователя
    invalidateBalanceCache(validatedData.telegram_id)

    logger.info('✅ Платеж успешно обновлен в payments_v2:', {
      inv_id: validatedData.inv_id,
      telegram_id: validatedData.telegram_id,
      new_status: 'COMPLETED',
      stars: validatedData.stars,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Ошибка валидации данных платежа:', {
        validation_errors: error.errors,
        input,
      })
      throw new Error(
        `Ошибка валидации: ${error.errors.map(e => e.message).join(', ')}`
      )
    }

    logger.error('❌ Ошибка в setPaymentsV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      input,
    })
    throw error
  }
}

/**
 * Обратная совместимость - wrapper для старого API
 * @deprecated Используйте setPaymentsV2 напрямую
 */
// export const setPayments = setPaymentsV2 // ← УБРАНО: избегаем конфликта экспортов
