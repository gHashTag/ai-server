import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'
import { PaymentType } from '@/interfaces/payments.interface'
import { invalidateBalanceCache, getUserBalance } from './getUserBalance'

// Схема для метаданных
export const balanceUpdateMetadataSchema = z
  .object({
    inv_id: z.string().optional(),
    currency: z.string().default('STARS'),
    bot_name: z.string().default('neuro_blogger_bot'),
    language: z.enum(['ru', 'en']).default('ru'),
    service_type: z.string().optional(),
    subscription_type: z.string().optional(),
    payment_method: z.string().default('Robokassa'),
    operation_id: z.string().optional(),
    category: z.enum(['REAL', 'TEST']).default('REAL'),
    cost: z.number().optional(),
  })
  .strict()

export type BalanceUpdateMetadata = z.infer<typeof balanceUpdateMetadataSchema>

// Схема для входных параметров
export const updateUserBalanceRobokassaParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  amount: z.number().positive('Сумма должна быть положительной'),
  type: z.enum(['money_income', 'money_outcome']),
  description: z.string().optional(),
  metadata: balanceUpdateMetadataSchema.optional(),
})

export type UpdateUserBalanceRobokassaParams = z.infer<
  typeof updateUserBalanceRobokassaParamsSchema
>

// Схема для ответа
export const balanceUpdateResultSchema = z.object({
  success: z.boolean(),
  transaction_id: z.string().optional(),
  new_balance: z.number().optional(),
  error_message: z.string().optional(),
})

export type BalanceUpdateResult = z.infer<typeof balanceUpdateResultSchema>

/**
 * Обновляет баланс пользователя через Robokassa или системные операции
 * Использует Zod валидацию и современный Supabase клиент
 */
export const updateUserBalanceRobokassaV2 = async (
  params: UpdateUserBalanceRobokassaParams
): Promise<BalanceUpdateResult> => {
  try {
    // Валидация входных параметров
    const validatedParams = updateUserBalanceRobokassaParamsSchema.parse(params)
    const metadata = validatedParams.metadata || {}

    logger.info('💰 Обновление баланса пользователя через Robokassa V2:', {
      telegram_id: validatedParams.telegram_id,
      amount: validatedParams.amount,
      type: validatedParams.type,
      description: validatedParams.description,
      metadata,
    })

    // Проверяем достаточность средств для списания
    if (validatedParams.type === 'money_outcome') {
      const currentBalance = await getUserBalance(
        validatedParams.telegram_id,
        metadata.bot_name
      )

      if (currentBalance < validatedParams.amount) {
        const errorMessage =
          metadata.language === 'en'
            ? `Insufficient funds. Current: ${currentBalance}⭐, Required: ${validatedParams.amount}⭐`
            : `Недостаточно средств. Текущий баланс: ${currentBalance}⭐, Требуется: ${validatedParams.amount}⭐`

        logger.warn('⚠️ Недостаточно средств для операции:', {
          telegram_id: validatedParams.telegram_id,
          current_balance: currentBalance,
          required_amount: validatedParams.amount,
        })

        return {
          success: false,
          error_message: errorMessage,
        }
      }
    }

    // Если есть inv_id, обновляем существующую запись
    if (metadata.inv_id) {
      logger.info('🔄 Обновление существующей записи платежа:', {
        inv_id: metadata.inv_id,
        telegram_id: validatedParams.telegram_id,
      })

      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments_v2')
        .update({
          status: 'COMPLETED',
          payment_date: new Date().toISOString(),
          description:
            validatedParams.description || 'Robokassa payment completed',
        })
        .eq('inv_id', metadata.inv_id)
        .eq('telegram_id', validatedParams.telegram_id.toString())
        .select()
        .single()

      if (updateError) {
        logger.error('❌ Ошибка обновления существующего платежа:', {
          error: updateError.message,
          inv_id: metadata.inv_id,
          telegram_id: validatedParams.telegram_id,
        })

        return {
          success: false,
          error_message: `Ошибка обновления платежа: ${updateError.message}`,
        }
      }

      // Инвалидируем кэш баланса
      invalidateBalanceCache(validatedParams.telegram_id)

      const newBalance = await getUserBalance(
        validatedParams.telegram_id,
        metadata.bot_name
      )

      logger.info('✅ Существующий платеж успешно обновлен:', {
        payment_id: updatedPayment?.id,
        telegram_id: validatedParams.telegram_id,
        new_balance: newBalance,
      })

      return {
        success: true,
        transaction_id: updatedPayment?.id,
        new_balance: newBalance,
      }
    }

    // Создаем новую запись платежа
    const invId = `${Date.now()}-${validatedParams.telegram_id}-${Math.random()
      .toString(36)
      .substr(2, 9)}`

    // Конвертируем тип в PaymentType enum
    const paymentType =
      validatedParams.type === 'money_income'
        ? PaymentType.MONEY_INCOME
        : PaymentType.MONEY_OUTCOME

    const paymentData = {
      telegram_id: validatedParams.telegram_id.toString(),
      inv_id: invId,
      amount: validatedParams.amount,
      stars: validatedParams.amount, // Для Robokassa amount == stars
      currency: metadata.currency,
      status: 'COMPLETED' as const,
      type: paymentType,
      payment_method: metadata.payment_method,
      description:
        validatedParams.description || `Robokassa ${validatedParams.type}`,
      bot_name: metadata.bot_name,
      subscription_type: metadata.subscription_type || null,
      service_type: metadata.service_type || null,
      metadata: {
        language: metadata.language,
        operation_id: metadata.operation_id,
        category: metadata.category,
        cost: metadata.cost,
      },
      created_at: new Date().toISOString(),
      payment_date: new Date().toISOString(),
    }

    logger.info('💼 Создание новой записи транзакции:', {
      inv_id: invId,
      telegram_id: validatedParams.telegram_id,
      amount: validatedParams.amount,
      type: paymentType,
    })

    const { data: newPayment, error: insertError } = await supabase
      .from('payments_v2')
      .insert(paymentData)
      .select()
      .single()

    if (insertError) {
      logger.error('❌ Ошибка создания новой записи платежа:', {
        error: insertError.message,
        error_details: insertError,
        payment_data: paymentData,
      })

      return {
        success: false,
        error_message: `Ошибка создания платежа: ${insertError.message}`,
      }
    }

    // Инвалидируем кэш баланса
    invalidateBalanceCache(validatedParams.telegram_id)

    const newBalance = await getUserBalance(
      validatedParams.telegram_id,
      metadata.bot_name
    )

    logger.info('✅ Новая транзакция успешно создана:', {
      payment_id: newPayment.id,
      telegram_id: validatedParams.telegram_id,
      amount: validatedParams.amount,
      type: paymentType,
      new_balance: newBalance,
    })

    return {
      success: true,
      transaction_id: newPayment.id,
      new_balance: newBalance,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Ошибка валидации параметров обновления баланса:', {
        validation_errors: error.errors,
        params,
      })
      return {
        success: false,
        error_message: `Ошибка валидации: ${error.errors
          .map(e => e.message)
          .join(', ')}`,
      }
    }

    logger.error('❌ Ошибка в updateUserBalanceRobokassaV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      params,
    })

    return {
      success: false,
      error_message:
        error instanceof Error ? error.message : 'Неизвестная ошибка',
    }
  }
}

/**
 * Упрощенная версия для обратной совместимости
 * Возвращает boolean как оригинальная функция
 */
export const updateUserBalanceRobokassaSimple = async (
  telegram_id: string,
  amount: number,
  type: 'money_income' | 'money_outcome',
  description?: string,
  metadata?: Partial<BalanceUpdateMetadata>
): Promise<boolean> => {
  const result = await updateUserBalanceRobokassaV2({
    telegram_id,
    amount,
    type,
    description,
    metadata,
  })

  return result.success
}
