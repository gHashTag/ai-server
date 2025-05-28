import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'
import { PaymentType } from '@/interfaces/payments.interface'

// Схема для входных параметров
export const sendPaymentInfoParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  amount: z.number().positive('Сумма должна быть положительной'),
  stars: z.number().positive('Количество звезд должно быть положительным'),
  currency: z.string().default('RUB'),
  type: z.nativeEnum(PaymentType).default(PaymentType.MONEY_INCOME),
  payment_method: z.string().default('System'),
  description: z.string().optional(),
  bot_name: z.string(),
  subscription_type: z.string().optional(),
  service_type: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type SendPaymentInfoParams = z.infer<typeof sendPaymentInfoParamsSchema>

// Схема для ответа
export const paymentCreatedSchema = z.object({
  id: z.string().uuid(),
  telegram_id: z.string(),
  amount: z.number(),
  stars: z.number(),
  currency: z.string(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  type: z.nativeEnum(PaymentType),
  payment_method: z.string(),
  description: z.string().nullable(),
  bot_name: z.string(),
  created_at: z.string(),
  subscription_type: z.string().nullable(),
  service_type: z.string().nullable(),
  metadata: z.record(z.any()).nullable(),
})

export type PaymentCreated = z.infer<typeof paymentCreatedSchema>

/**
 * Создает новую запись платежа в таблице payments_v2
 * Использует Zod валидацию и современный Supabase клиент
 */
export const sendPaymentInfoV2 = async (
  params: SendPaymentInfoParams
): Promise<PaymentCreated> => {
  try {
    // Валидация входных параметров
    const validatedParams = sendPaymentInfoParamsSchema.parse(params)

    logger.info('💳 Создание новой записи платежа в payments_v2:', {
      telegram_id: validatedParams.telegram_id,
      amount: validatedParams.amount,
      stars: validatedParams.stars,
      type: validatedParams.type,
      payment_method: validatedParams.payment_method,
      bot_name: validatedParams.bot_name,
    })

    // Подготавливаем данные для вставки
    const paymentData = {
      telegram_id: validatedParams.telegram_id.toString(),
      amount: validatedParams.amount,
      stars: validatedParams.stars,
      currency: validatedParams.currency,
      status: 'PENDING' as const,
      type: validatedParams.type,
      payment_method: validatedParams.payment_method,
      description: validatedParams.description || null,
      bot_name: validatedParams.bot_name,
      subscription_type: validatedParams.subscription_type || null,
      service_type: validatedParams.service_type || null,
      metadata: validatedParams.metadata || null,
      created_at: new Date().toISOString(),
      payment_date: null, // Будет установлено при завершении платежа
    }

    // Вставляем запись в payments_v2
    const { data, error } = await supabase
      .from('payments_v2')
      .insert(paymentData)
      .select()
      .single()

    if (error) {
      logger.error('❌ Ошибка создания записи платежа в payments_v2:', {
        error: error.message,
        error_details: error,
        payment_data: paymentData,
      })
      throw new Error(`Ошибка создания платежа: ${error.message}`)
    }

    if (!data) {
      logger.error('❌ Нет данных после создания платежа:', {
        payment_data: paymentData,
      })
      throw new Error('Не получены данные после создания платежа')
    }

    // Валидируем ответ через Zod
    const validatedPayment = paymentCreatedSchema.parse(data)

    logger.info('✅ Запись платежа успешно создана в payments_v2:', {
      payment_id: validatedPayment.id,
      telegram_id: validatedPayment.telegram_id,
      amount: validatedPayment.amount,
      stars: validatedPayment.stars,
      type: validatedPayment.type,
    })

    return validatedPayment
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Ошибка валидации параметров создания платежа:', {
        validation_errors: error.errors,
        params,
      })
      throw new Error(
        `Ошибка валидации: ${error.errors.map(e => e.message).join(', ')}`
      )
    }

    logger.error('❌ Ошибка в sendPaymentInfoV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      params,
    })
    throw error
  }
}

/**
 * Упрощенная версия для обратной совместимости
 * Создает платеж с минимальными параметрами
 */
export const sendPaymentInfoSimple = async (
  telegram_id: string,
  amount: number,
  bot_name: string,
  description?: string
): Promise<PaymentCreated> => {
  return sendPaymentInfoV2({
    telegram_id,
    amount,
    stars: Math.floor(amount * 0.434), // Примерный курс RUB → Stars
    bot_name,
    description,
  })
}
