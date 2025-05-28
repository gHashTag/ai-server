import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'

// Схема для доступных полей пользователя
export const userFieldsSchema = z.enum([
  'id',
  'telegram_id',
  'username',
  'first_name',
  'last_name',
  'language_code',
  'level',
  'gender',
  'bot_name',
  'created_at',
  'updated_at',
  // Дополнительные поля для обратной совместимости
  'company',
  'position',
  'designation',
])

export type UserField = z.infer<typeof userFieldsSchema>

// Схема для входных параметров
export const getUserDataParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  fields: z
    .array(userFieldsSchema)
    .optional()
    .default([
      'username',
      'first_name',
      'last_name',
      'company',
      'position',
      'designation',
    ]),
})

export type GetUserDataParams = z.infer<typeof getUserDataParamsSchema>

// Схема для ответа пользователя
export const userDataResponseSchema = z.object({
  id: z.number().optional(),
  telegram_id: z.string(),
  username: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  language_code: z.string().nullable().optional(),
  level: z.number().nullable().optional(),
  gender: z.enum(['male', 'female']).nullable().optional(),
  bot_name: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  // Дополнительные поля для обратной совместимости (могут отсутствовать в БД)
  company: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
})

export type UserDataResponse = z.infer<typeof userDataResponseSchema>

/**
 * Получает данные пользователя из таблицы users
 * Современная версия с Zod валидацией и гибким выбором полей
 */
export const getUserDataV2 = async (
  params: GetUserDataParams
): Promise<UserDataResponse | null> => {
  try {
    // Валидация входных параметров
    const validatedParams = getUserDataParamsSchema.parse(params)

    logger.info('👤 Получение данных пользователя V2:', {
      telegram_id: validatedParams.telegram_id,
      fields: validatedParams.fields,
    })

    // Формируем строку полей для select
    const selectFields = validatedParams.fields?.join(', ') || '*'

    // Выполняем запрос к Supabase
    const { data, error } = await supabase
      .from('users')
      .select(selectFields)
      .eq('telegram_id', validatedParams.telegram_id.toString())
      .single()

    if (error) {
      // Если пользователь не найден, возвращаем null
      if (error.code === 'PGRST116') {
        logger.info('👤 Пользователь не найден:', {
          telegram_id: validatedParams.telegram_id,
        })
        return null
      }

      logger.error('❌ Ошибка получения данных пользователя:', {
        error: error.message,
        error_details: error,
        telegram_id: validatedParams.telegram_id,
      })
      throw new Error(`Ошибка получения данных пользователя: ${error.message}`)
    }

    if (!data) {
      logger.warn('⚠️ Нет данных пользователя:', {
        telegram_id: validatedParams.telegram_id,
      })
      return null
    }

    // Валидируем ответ через Zod
    const validatedUser = userDataResponseSchema.parse(data)

    logger.info('✅ Данные пользователя успешно получены:', {
      telegram_id: validatedUser.telegram_id,
      username: validatedUser.username,
      fields_count: validatedParams.fields?.length || 'all',
    })

    return validatedUser
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Ошибка валидации параметров получения данных:', {
        validation_errors: error.errors,
        params,
      })
      throw new Error(
        `Ошибка валидации: ${error.errors.map(e => e.message).join(', ')}`
      )
    }

    logger.error('❌ Ошибка в getUserDataV2:', {
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
      params,
    })
    throw error
  }
}

/**
 * Упрощенная версия для обратной совместимости
 * Получает данные пользователя с минимальными параметрами
 */
export const getUserDataSimple = async (
  telegram_id: string,
  fields?: UserField[]
): Promise<UserDataResponse | null> => {
  return getUserDataV2({
    telegram_id,
    fields,
  })
}
