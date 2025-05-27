import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

// Drizzle схема для таблицы users
export const users = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  telegram_id: text('telegram_id').notNull().unique(),
  username: text('username'),
  first_name: text('first_name'),
  last_name: text('last_name'),
  language_code: text('language_code'),
  // is_premium: boolean('is_premium').default(false), // Поле отсутствует в БД
  level: integer('level').default(0),
  gender: text('gender'), // 'male' | 'female' | null
  bot_name: text('bot_name'),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Базовые Zod схемы от Drizzle
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)
export const updateUserSchema = insertUserSchema.partial().omit({
  id: true,
  created_at: true,
} as const)

// TypeScript типы
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UpdateUser = z.infer<typeof updateUserSchema>

// Кастомные Zod схемы для валидации API
export const createUserApiSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  language_code: z
    .string()
    .length(2, 'Код языка должен быть 2 символа')
    .optional(),
  // is_premium убираем - поля нет в БД
  level: z
    .number()
    .int()
    .min(0, 'Уровень не может быть отрицательным')
    .default(0),
  gender: z.enum(['male', 'female']).optional(),
  bot_name: z.string().optional(),
})

export const updateUserApiSchema = createUserApiSchema.partial().omit({
  telegram_id: true, // telegram_id нельзя изменить
})

// Дополнительные Zod схемы для API
export const telegramIdSchema = z.string().min(1, 'Telegram ID обязателен')
export const userGenderSchema = z.enum(['male', 'female']).optional()
export const userLevelSchema = z
  .number()
  .int()
  .min(0, 'Уровень не может быть отрицательным')

// Типы для API
export type CreateUserApi = z.infer<typeof createUserApiSchema>
export type UpdateUserApi = z.infer<typeof updateUserApiSchema>
