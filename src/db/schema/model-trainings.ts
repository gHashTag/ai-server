import { pgTable, text, timestamp, integer, uuid } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'
import { users } from './users'

// Enums для статусов тренировки
export const trainingStatusEnum = z.enum([
  'starting',
  'processing',
  'SUCCESS',
  'FAILED',
  'canceled',
])

// Drizzle схема для таблицы model_trainings
export const modelTrainings = pgTable('model_trainings', {
  id: uuid('id').primaryKey().defaultRandom(),
  telegram_id: text('telegram_id').notNull(),
  model_name: text('model_name').notNull(),
  trigger_word: text('trigger_word').notNull(),
  zip_url: text('zip_url').notNull(),
  steps: integer('steps').notNull(),
  status: text('status').notNull(), // starting, processing, SUCCESS, FAILED, canceled
  gender: text('gender'), // male, female
  bot_name: text('bot_name'),
  replicate_training_id: text('replicate_training_id'),
  model_url: text('model_url'),
  created_at: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Базовые Zod схемы от Drizzle
export const insertModelTrainingSchema = createInsertSchema(modelTrainings)
export const selectModelTrainingSchema = createSelectSchema(modelTrainings)
export const updateModelTrainingSchema = insertModelTrainingSchema
  .partial()
  .omit({
    id: true,
    created_at: true,
  } as const)

// TypeScript типы
export type ModelTraining = typeof modelTrainings.$inferSelect
export type NewModelTraining = typeof modelTrainings.$inferInsert
export type UpdateModelTraining = z.infer<typeof updateModelTrainingSchema>

// Кастомные схемы для API валидации
export const createModelTrainingApiSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  model_name: z
    .string()
    .min(1, 'Имя модели обязательно')
    .max(100, 'Имя модели слишком длинное'),
  trigger_word: z
    .string()
    .min(1, 'Триггер слово обязательно')
    .max(50, 'Триггер слово слишком длинное'),
  zip_url: z.string().url('Некорректный URL архива'),
  steps: z
    .number()
    .int()
    .min(100, 'Минимум 100 шагов')
    .max(10000, 'Максимум 10000 шагов'),
  status: trainingStatusEnum,
  gender: z.enum(['male', 'female']).optional(),
  bot_name: z.string().optional(),
  replicate_training_id: z.string().optional(),
  model_url: z.string().url('Некорректный URL модели').optional(),
})

// Специальные схемы для создания тренировки
export const createModelTrainingRequestSchema = z.object({
  telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  model_name: z
    .string()
    .min(1, 'Имя модели обязательно')
    .max(100, 'Имя модели слишком длинное'),
  trigger_word: z
    .string()
    .min(1, 'Триггер слово обязательно')
    .max(50, 'Триггер слово слишком длинное'),
  zip_url: z.string().url('Некорректный URL архива'),
  steps: z
    .number()
    .int()
    .min(100, 'Минимум 100 шагов')
    .max(10000, 'Максимум 10000 шагов'),
  gender: z.enum(['male', 'female']).optional(),
  bot_name: z.string().optional(),
})

export const updateTrainingStatusSchema = z.object({
  status: trainingStatusEnum,
  replicate_training_id: z.string().optional(),
  model_url: z.string().url('Некорректный URL модели').optional(),
})

// Схема для получения тренировки с пользователем
export const trainingWithUserSchema = z.object({
  // Поля тренировки
  id: z.string().uuid(),
  telegram_id: z.string(),
  model_name: z.string(),
  trigger_word: z.string(),
  zip_url: z.string().url(),
  steps: z.number().int(),
  status: trainingStatusEnum,
  gender: z.enum(['male', 'female']).nullable(),
  bot_name: z.string().nullable(),
  replicate_training_id: z.string().nullable(),
  model_url: z.string().url().nullable(),
  created_at: z.date(),
  updated_at: z.date(),

  // Поля пользователя
  user_id: z.number().int().nullable(),
  user_username: z.string().nullable(),
  user_first_name: z.string().nullable(),
  user_last_name: z.string().nullable(),
  user_gender: z.enum(['male', 'female']).nullable(),
  user_bot_name: z.string().nullable(),
})

// Типы для API
export type CreateModelTrainingApi = z.infer<
  typeof createModelTrainingApiSchema
>
export type CreateModelTrainingRequest = z.infer<
  typeof createModelTrainingRequestSchema
>
export type UpdateTrainingStatus = z.infer<typeof updateTrainingStatusSchema>
export type TrainingWithUser = z.infer<typeof trainingWithUserSchema>
