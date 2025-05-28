import { z } from 'zod'
import { telegramIdSchema, stringSchema, isRuSchema } from './base.schemas'

// Схемы для пользователей Telegram
export const usernameSchema = z
  .string()
  .min(1, 'Username не может быть пустым')
  .max(32, 'Username не может быть длиннее 32 символов')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username может содержать только буквы, цифры и подчеркивания'
  )
  .optional()

export const firstNameSchema = z
  .string()
  .min(1, 'Имя не может быть пустым')
  .max(64, 'Имя не может быть длиннее 64 символов')

export const lastNameSchema = z
  .string()
  .max(64, 'Фамилия не может быть длиннее 64 символов')
  .optional()

// Схемы для ботов
export const botNameSchema = z
  .string()
  .min(1, 'Имя бота не может быть пустым')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Имя бота может содержать только буквы, цифры и подчеркивания'
  )

export const botTokenSchema = z
  .string()
  .regex(/^\d+:[a-zA-Z0-9_-]+$/, 'Некорректный формат токена бота')

// Схемы для чатов
export const chatIdSchema = z
  .union([
    z.string().regex(/^-?\d+$/, 'Chat ID должен содержать только цифры'),
    z.number().int(),
  ])
  .transform(val => String(val))

// Базовая схема пользователя Telegram
export const telegramUserSchema = z.object({
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  first_name: firstNameSchema.optional(),
  last_name: lastNameSchema,
  language_code: z.string().length(2).optional(), // ISO 639-1
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

// Схема для валидации пользовательских параметров (замена validateUserParams)
export const userParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema.optional(),
})

// Схема для расширенных пользовательских параметров
export const extendedUserParamsSchema = userParamsSchema.extend({
  first_name: firstNameSchema.optional(),
  last_name: lastNameSchema,
  language_code: z.string().length(2).optional(),
})

// Схемы для gender
export const genderSchema = z.enum(['male', 'female'], {
  errorMap: () => ({ message: 'Gender должен быть male или female' }),
})

// Схема для пользователя с gender
export const telegramUserWithGenderSchema = telegramUserSchema.extend({
  gender: genderSchema.optional(),
})

// Типы TypeScript из схем
export type Username = z.infer<typeof usernameSchema>
export type FirstName = z.infer<typeof firstNameSchema>
export type LastName = z.infer<typeof lastNameSchema>
export type BotName = z.infer<typeof botNameSchema>
export type BotToken = z.infer<typeof botTokenSchema>
export type ChatId = z.infer<typeof chatIdSchema>
export type TelegramUser = z.infer<typeof telegramUserSchema>
export type UserParams = z.infer<typeof userParamsSchema>
export type ExtendedUserParams = z.infer<typeof extendedUserParamsSchema>
export type Gender = z.infer<typeof genderSchema>
export type TelegramUserWithGender = z.infer<
  typeof telegramUserWithGenderSchema
>
