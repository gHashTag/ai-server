/**
 * Instagram API Zod Schemas
 * Строгая типизация и валидация данных Instagram API
 */

import { z } from 'zod'

// Схема для одного пользователя Instagram
export const InstagramUserSchema = z.object({
  pk: z.union([z.string(), z.number()]).transform(val => String(val)), // pk может быть числом или строкой, конвертируем в строку
  pk_id: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
  username: z.string().min(1, 'Username не может быть пустым'),
  full_name: z.string().nullable().default(''),
  is_private: z.boolean().default(false),
  is_verified: z.boolean().default(false),
  strong_id__: z.string().optional(),
  profile_pic_id: z.string().optional(),
  profile_pic_url: z.string().url().optional().or(z.literal('')).default(''),
  chaining_info: z.any().optional(), // Может быть сложной структурой
  profile_chaining_secondary_label: z.string().optional().default(''),
  social_context: z.string().optional().default(''),
})

// Тип для пользователя Instagram (выведенный из схемы)
export type InstagramUser = z.infer<typeof InstagramUserSchema>

// Схема для ответа API Instagram
export const InstagramApiResponseSchema = z.object({
  status: z.string(),
  message: z.string().nullable().optional(), // Может быть null, undefined или строкой
  data: z.object({
    users: z.array(InstagramUserSchema),
  }),
})

// Тип для ответа API
export type InstagramApiResponse = z.infer<typeof InstagramApiResponseSchema>

// Схема для валидированного пользователя (готового для сохранения в БД)
export const ValidatedInstagramUserSchema = z.object({
  pk: z.string().min(1),
  username: z.string().min(1),
  full_name: z.string(),
  is_private: z.boolean(),
  is_verified: z.boolean(),
  profile_pic_url: z.string(),
  profile_chaining_secondary_label: z.string(),
  social_context: z.string(),
})

// Тип для валидированного пользователя
export type ValidatedInstagramUser = z.infer<
  typeof ValidatedInstagramUserSchema
>

// Схема для события Inngest
export const InstagramScrapingEventSchema = z.object({
  username_or_id: z.string().min(1, 'Username или ID обязателен'),
  max_users: z.number().int().min(1).max(100).default(50),
  requester_telegram_id: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// Тип для события
export type InstagramScrapingEvent = z.infer<
  typeof InstagramScrapingEventSchema
>

// Схема для результата сохранения в БД
export const DatabaseSaveResultSchema = z.object({
  saved: z.number().int().min(0),
  duplicatesSkipped: z.number().int().min(0),
  totalProcessed: z.number().int().min(0),
})

// Тип для результата сохранения
export type DatabaseSaveResult = z.infer<typeof DatabaseSaveResultSchema>

// Функция для валидации массива пользователей
export function validateInstagramUsers(users: unknown[]): {
  validUsers: ValidatedInstagramUser[]
  invalidUsers: unknown[]
  errors: string[]
} {
  const validUsers: ValidatedInstagramUser[] = []
  const invalidUsers: unknown[] = []
  const errors: string[] = []

  for (const [index, user] of users.entries()) {
    try {
      // Сначала парсим основную схему пользователя
      const parsedUser = InstagramUserSchema.parse(user)

      // Затем валидируем для сохранения в БД
      const validatedUser = ValidatedInstagramUserSchema.parse({
        pk: parsedUser.pk,
        username: parsedUser.username,
        full_name: parsedUser.full_name || '',
        is_private: parsedUser.is_private,
        is_verified: parsedUser.is_verified,
        profile_pic_url: parsedUser.profile_pic_url || '',
        profile_chaining_secondary_label:
          parsedUser.profile_chaining_secondary_label || '',
        social_context: parsedUser.social_context || '',
      })

      validUsers.push(validatedUser)
    } catch (error) {
      invalidUsers.push(user)
      if (error instanceof z.ZodError) {
        errors.push(
          `Пользователь ${index}: ${error.errors
            .map(e => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`
        )
      } else {
        errors.push(`Пользователь ${index}: Неизвестная ошибка валидации`)
      }
    }
  }

  return { validUsers, invalidUsers, errors }
}

// Функция для валидации ответа API
export function validateInstagramApiResponse(response: unknown): {
  success: boolean
  data?: InstagramApiResponse
  error?: string
} {
  try {
    const validatedResponse = InstagramApiResponseSchema.parse(response)
    return {
      success: true,
      data: validatedResponse,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Ошибка валидации API ответа: ${error.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`,
      }
    }
    return {
      success: false,
      error: 'Неизвестная ошибка валидации API ответа',
    }
  }
}
