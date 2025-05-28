import { z } from 'zod'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'
import { voiceIdSchema } from '@/schemas/api/generation.schemas'
import { invalidateUserCache } from './getUserByTelegramIdV2'

// === ZOD SCHEMAS ===

/**
 * Схема для параметров обновления голосовых настроек пользователя
 */
export const updateUserVoiceParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  voice_id_elevenlabs: voiceIdSchema,
})

/**
 * Схема для ответа пользователя из Supabase (адаптированная под строковые даты)
 */
export const userVoiceResponseSchema = z.object({
  id: z.number(),
  telegram_id: z.string(),
  voice_id_elevenlabs: z.string().nullable(),
  username: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  created_at: z.string().optional(), // Supabase возвращает строки для дат
  updated_at: z.string().optional(),
})

/**
 * Схема для результата операции обновления
 */
export const updateUserVoiceResultSchema = z.object({
  success: z.boolean(),
  user: userVoiceResponseSchema.nullable(),
  error_message: z.string().optional(),
})

// === TYPES ===

export type UpdateUserVoiceParams = z.infer<typeof updateUserVoiceParamsSchema>
export type UserVoiceResponse = z.infer<typeof userVoiceResponseSchema>
export type UpdateUserVoiceResult = z.infer<typeof updateUserVoiceResultSchema>

// === MAIN FUNCTION ===

/**
 * Обновляет голосовые настройки пользователя (voice_id_elevenlabs)
 * Современная версия с Zod валидацией и кэш-инвалидацией
 *
 * @param params - Параметры обновления
 * @returns Результат операции с информацией о пользователе
 */
export const updateUserVoiceV2 = async (
  params: UpdateUserVoiceParams
): Promise<UpdateUserVoiceResult> => {
  try {
    // Валидация входных параметров
    const validatedParams = updateUserVoiceParamsSchema.parse(params)

    logger.info('🎤 Обновление голосовых настроек пользователя V2:', {
      telegram_id: validatedParams.telegram_id,
      voice_id_elevenlabs: validatedParams.voice_id_elevenlabs,
    })

    // Обновляем голосовые настройки пользователя
    const { data, error } = await supabase
      .from('users')
      .update({ voice_id_elevenlabs: validatedParams.voice_id_elevenlabs })
      .eq('telegram_id', validatedParams.telegram_id)
      .select(
        'id, telegram_id, voice_id_elevenlabs, username, first_name, last_name, created_at, updated_at'
      )

    if (error) {
      logger.error('❌ Ошибка обновления голосовых настроек:', {
        error: error.message,
        error_code: error.code,
        telegram_id: validatedParams.telegram_id,
        voice_id_elevenlabs: validatedParams.voice_id_elevenlabs,
      })
      throw new Error(`Ошибка обновления голосовых настроек: ${error.message}`)
    }

    // Проверяем, был ли найден пользователь
    if (!data || data.length === 0) {
      logger.warn(
        '⚠️ Пользователь не найден для обновления голосовых настроек:',
        {
          telegram_id: validatedParams.telegram_id,
        }
      )
      return {
        success: false,
        user: null,
        error_message: `Пользователь с telegram_id ${validatedParams.telegram_id} не найден`,
      }
    }

    // Валидируем ответ от Supabase
    const validatedUser = userVoiceResponseSchema.parse(data[0])

    // Инвалидируем кэш пользователя
    invalidateUserCache(validatedParams.telegram_id)

    logger.info('✅ Голосовые настройки успешно обновлены:', {
      telegram_id: validatedParams.telegram_id,
      voice_id_elevenlabs: validatedParams.voice_id_elevenlabs,
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

    logger.error('❌ Неожиданная ошибка в updateUserVoiceV2:', {
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
export const updateUserVoiceSimple = async (
  telegram_id: string,
  voice_id_elevenlabs: string
): Promise<void> => {
  const result = await updateUserVoiceV2({
    telegram_id,
    voice_id_elevenlabs,
  })

  if (!result.success) {
    throw new Error(
      result.error_message || 'Ошибка обновления голосовых настроек'
    )
  }
}

// === EXPORTS ===

export { invalidateUserCache } from './getUserByTelegramIdV2'
