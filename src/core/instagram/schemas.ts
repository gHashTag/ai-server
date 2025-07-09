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
    id: z.union([z.string(), z.number()]).optional(), // ID пользователя, для которого искали похожих
    users: z.array(InstagramUserSchema),
  }),
})

// Тип для ответа API
export type InstagramApiResponse = z.infer<typeof InstagramApiResponseSchema>

// Схема для валидированного пользователя (готового для сохранения в БД)
export const ValidatedInstagramUserSchema = z.object({
  pk: z.string().min(1),
  username: z.string().min(1),
  full_name: z.string().nullable(),
  is_private: z.boolean(),
  is_verified: z.boolean(),
  profile_pic_url: z.string().nullable(),
  profile_url: z.string().nullable(), // URL профиля Instagram
  profile_chaining_secondary_label: z.string().nullable(),
  social_context: z.string().nullable(),
  project_id: z.number().int().positive().nullable().optional(), // ID проекта для связи (INTEGER)
})

// Тип для валидированного пользователя
export type ValidatedInstagramUser = z.infer<
  typeof ValidatedInstagramUserSchema
>

// Обновленная схема события с поддержкой рилсов
export const InstagramScrapingEventSchema = z.object({
  username_or_id: z.string().min(1, 'Username or ID is required'),
  project_id: z
    .number()
    .int()
    .positive('Project ID must be a positive integer'),
  max_users: z.number().int().positive().max(100).optional().default(50),
  max_reels_per_user: z
    .number()
    .int()
    .positive()
    .max(200)
    .optional()
    .default(50),
  scrape_reels: z.boolean().optional().default(false),
  requester_telegram_id: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
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

// Схема для создания одного пользователя вручную
export const CreateInstagramUserEventSchema = z.object({
  pk: z.string().min(1, 'User PK is required'),
  username: z.string().min(1, 'Username is required'),
  full_name: z.string().optional().default(''),
  is_private: z.boolean().optional().default(false),
  is_verified: z.boolean().optional().default(false),
  profile_pic_url: z.string().url().optional().or(z.literal('')).default(''),
  profile_chaining_secondary_label: z.string().optional().default(''),
  social_context: z.string().optional().default(''),
  project_id: z
    .number()
    .int()
    .positive('Project ID must be a positive integer'),
  requester_telegram_id: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
})

// Тип для события создания пользователя
export type CreateInstagramUserEvent = z.infer<
  typeof CreateInstagramUserEventSchema
>

// Схема для результата создания одного пользователя
export const CreateUserResultSchema = z.object({
  success: z.boolean(),
  created: z.boolean(),
  alreadyExists: z.boolean(),
  user: ValidatedInstagramUserSchema.optional(),
  error: z.string().optional(),
})

// Тип для результата создания пользователя
export type CreateUserResult = z.infer<typeof CreateUserResultSchema>

// Функция для валидации массива пользователей
export function validateInstagramUsers(
  users: unknown[],
  projectId?: number
): {
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
        profile_url: `https://instagram.com/${parsedUser.username}`, // Генерируем URL профиля
        profile_chaining_secondary_label:
          parsedUser.profile_chaining_secondary_label || '',
        social_context: parsedUser.social_context || '',
        project_id: projectId || null, // Используем переданный project_id (number)
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

// Схема для рилса из API
export const RawInstagramReelSchema = z.object({
  media: z.object({
    pk: z.union([z.string(), z.number()]).transform(val => String(val)),
    id: z.string(),
    code: z.string(), // shortcode
    media_type: z.number(),
    image_versions2: z
      .object({
        candidates: z.array(
          z.object({
            url: z.string().url(),
            width: z.number(),
            height: z.number(),
          })
        ),
      })
      .optional(),
    video_versions: z
      .array(
        z.object({
          url: z.string().url(),
          width: z.number(),
          height: z.number(),
        })
      )
      .optional(),
    caption: z
      .object({
        text: z.string().optional(),
      })
      .nullable()
      .optional(),
    like_count: z.number().int().min(0).optional().default(0),
    comment_count: z.number().int().min(0).optional().default(0),
    play_count: z.number().int().min(0).optional().default(0),
    ig_play_count: z.number().int().min(0).optional().default(0),
    taken_at: z.number().int().positive(),
    user: z.object({
      pk: z.union([z.string(), z.number()]).transform(val => String(val)),
      username: z.string(),
      full_name: z.string().optional(),
      profile_pic_url: z.string().url().optional(),
      is_verified: z.boolean().optional(),
    }),
    video_duration: z.number().positive().optional(),
    has_audio: z.boolean().optional(),
  }),
})

// Схема ответа API рилсов (исправленная под реальную структуру)
export const InstagramReelsApiResponseSchema = z.object({
  status: z.string(),
  message: z.string().nullable().optional(),
  data: z.object({
    items: z.array(RawInstagramReelSchema),
    paging_info: z
      .object({
        max_id: z.string().optional(),
        more_available: z.boolean().optional(),
      })
      .optional(),
  }),
})

// Схема валидированного рилса для БД
export const ValidatedInstagramReelSchema = z.object({
  reel_id: z.string(),
  shortcode: z.string(),
  display_url: z.string().url(),
  video_url: z.string().url().optional(),
  caption: z.string().optional(),
  like_count: z.number().int().min(0),
  comment_count: z.number().int().min(0),
  play_count: z.number().int().min(0).optional(),
  taken_at_timestamp: z.number().int().positive(),
  owner_id: z.string(),
  owner_username: z.string(),
  owner_full_name: z.string().optional(),
  owner_profile_pic_url: z.string().url().optional(),
  owner_is_verified: z.boolean().optional(),
  is_video: z.boolean(),
  video_duration: z.number().positive().optional(),
  accessibility_caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  project_id: z.number().int().positive().optional(),
  scraped_for_user_pk: z.string().optional(),
})

// Схема результата сохранения рилсов
export const ReelsSaveResultSchema = z.object({
  saved: z.number().int().min(0),
  duplicatesSkipped: z.number().int().min(0),
  totalProcessed: z.number().int().min(0),
  userId: z.string(),
  username: z.string(),
})

// Экспорты типов для рилсов
export type ValidatedInstagramReel = z.infer<
  typeof ValidatedInstagramReelSchema
>
export type ReelsSaveResult = z.infer<typeof ReelsSaveResultSchema>

/**
 * Валидирует ответ API рилсов Instagram
 */
export function validateInstagramReelsApiResponse(data: any) {
  return InstagramReelsApiResponseSchema.safeParse(data)
}

/**
 * Валидирует и преобразует рилсы для сохранения в БД
 */
export function validateInstagramReels(
  reels: any[],
  projectId?: number,
  scrapedForUserPk?: string
): {
  validReels: ValidatedInstagramReel[]
  invalidReels: any[]
  errors: string[]
} {
  const validReels: ValidatedInstagramReel[] = []
  const invalidReels: any[] = []
  const errors: string[] = []

  for (const reel of reels) {
    try {
      // Сначала валидируем raw reel
      const rawReelValidation = RawInstagramReelSchema.safeParse(reel)

      if (!rawReelValidation.success) {
        invalidReels.push(reel)
        errors.push(
          `Invalid reel ${reel.id || 'unknown'}: ${
            rawReelValidation.error.message
          }`
        )
        continue
      }

      const rawReel = rawReelValidation.data

      // Преобразуем в формат для БД
      const validatedReel: ValidatedInstagramReel = {
        reel_id: rawReel.media.id,
        shortcode: rawReel.media.code,
        display_url: rawReel.media.image_versions2?.candidates[0].url || '',
        video_url: rawReel.media.video_versions?.[0].url || '',
        caption: rawReel.media.caption?.text || '',
        like_count: rawReel.media.like_count || 0,
        comment_count: rawReel.media.comment_count || 0,
        play_count: rawReel.media.play_count || 0,
        taken_at_timestamp: rawReel.media.taken_at,
        owner_id: rawReel.media.user.pk,
        owner_username: rawReel.media.user.username,
        owner_full_name: rawReel.media.user.full_name,
        owner_profile_pic_url: rawReel.media.user.profile_pic_url,
        owner_is_verified: rawReel.media.user.is_verified || false,
        is_video: rawReel.media.media_type === 2,
        video_duration: rawReel.media.video_duration,
        accessibility_caption: '',
        hashtags: [],
        mentions: [],
        project_id: projectId,
        scraped_for_user_pk: scrapedForUserPk,
      }

      // Финальная валидация
      const finalValidation =
        ValidatedInstagramReelSchema.safeParse(validatedReel)

      if (finalValidation.success) {
        validReels.push(finalValidation.data)
      } else {
        invalidReels.push(reel)
        errors.push(
          `Final validation failed for reel ${reel.id}: ${finalValidation.error.message}`
        )
      }
    } catch (error) {
      invalidReels.push(reel)
      errors.push(`Exception processing reel ${reel.id || 'unknown'}: ${error}`)
    }
  }

  return {
    validReels,
    invalidReels,
    errors,
  }
}
