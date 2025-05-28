import { z } from 'zod'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'
import { SubscriptionType } from '@/interfaces/subscription.interface'
import { invalidateUserCache } from './getUserByTelegramIdV2'

// === ZOD SCHEMAS ===

/**
 * Схема для валидации типов подписки
 */
export const subscriptionTypeSchema = z.nativeEnum(SubscriptionType, {
  errorMap: () => ({ message: 'Недопустимый тип подписки' }),
})

/**
 * Схема для параметров обновления подписки пользователя
 */
export const updateUserSubscriptionParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  subscription_type: subscriptionTypeSchema,
})

/**
 * Схема для ответа пользователя из Supabase (адаптированная под строковые даты)
 */
export const userSubscriptionResponseSchema = z.object({
  id: z.number(),
  telegram_id: z.string(),
  subscription: z.string().nullable(),
  username: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  created_at: z.string().optional(), // Supabase возвращает строки для дат
  updated_at: z.string().optional(),
})

/**
 * Схема для результата операции обновления подписки
 */
export const updateUserSubscriptionResultSchema = z.object({
  success: z.boolean(),
  user: userSubscriptionResponseSchema.nullable(),
  error_message: z.string().optional(),
})

// === TYPES ===

export type UpdateUserSubscriptionParams = z.infer<
  typeof updateUserSubscriptionParamsSchema
>
export type UserSubscriptionResponse = z.infer<
  typeof userSubscriptionResponseSchema
>
export type UpdateUserSubscriptionResult = z.infer<
  typeof updateUserSubscriptionResultSchema
>

// === MAIN FUNCTION ===

/**
 * Обновляет подписку пользователя
 * Современная версия с Zod валидацией и кэш-инвалидацией
 *
 * @param params - Параметры обновления подписки
 * @returns Результат операции с информацией о пользователе
 */
export const updateUserSubscriptionV2 = async (
  params: UpdateUserSubscriptionParams
): Promise<UpdateUserSubscriptionResult> => {
  try {
    // Валидация входных параметров
    const validatedParams = updateUserSubscriptionParamsSchema.parse(params)

    logger.info('📋 Обновление подписки пользователя V2:', {
      telegram_id: validatedParams.telegram_id,
      subscription_type: validatedParams.subscription_type,
    })

    // Обновляем подписку пользователя
    const { data, error } = await supabase
      .from('users')
      .update({ subscription: validatedParams.subscription_type })
      .eq('telegram_id', validatedParams.telegram_id)
      .select(
        'id, telegram_id, subscription, username, first_name, last_name, created_at, updated_at'
      )

    if (error) {
      logger.error('❌ Ошибка обновления подписки:', {
        error: error.message,
        error_code: error.code,
        telegram_id: validatedParams.telegram_id,
        subscription_type: validatedParams.subscription_type,
      })
      throw new Error(`Ошибка обновления подписки: ${error.message}`)
    }

    // Проверяем, был ли найден пользователь
    if (!data || data.length === 0) {
      logger.warn('⚠️ Пользователь не найден для обновления подписки:', {
        telegram_id: validatedParams.telegram_id,
      })
      return {
        success: false,
        user: null,
        error_message: `Пользователь с telegram_id ${validatedParams.telegram_id} не найден`,
      }
    }

    // Валидируем ответ от Supabase
    const validatedUser = userSubscriptionResponseSchema.parse(data[0])

    // Инвалидируем кэш пользователя
    invalidateUserCache(validatedParams.telegram_id)

    logger.info('✅ Подписка успешно обновлена:', {
      telegram_id: validatedParams.telegram_id,
      subscription_type: validatedParams.subscription_type,
      username: validatedUser.username,
    })

    return {
      success: true,
      user: validatedUser,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Ошибки валидации Zod пробрасываем как есть
      throw error
    }

    logger.error('❌ Неожиданная ошибка в updateUserSubscriptionV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      telegram_id: params.telegram_id,
    })

    throw error
  }
}

// === WRAPPER FUNCTION FOR BACKWARD COMPATIBILITY ===

/**
 * Wrapper функция для обратной совместимости
 * Использует новую V2 функцию под капотом
 */
export const updateUserSubscriptionSimple = async (
  telegram_id: string,
  subscription: string
): Promise<void> => {
  // Валидируем что subscription является валидным SubscriptionType
  const subscriptionType = subscriptionTypeSchema.parse(subscription)

  const result = await updateUserSubscriptionV2({
    telegram_id,
    subscription_type: subscriptionType,
  })

  if (!result.success) {
    throw new Error(result.error_message || 'Ошибка обновления подписки')
  }
}

// === EXPORTS ===

export { invalidateUserCache } from './getUserByTelegramIdV2'
