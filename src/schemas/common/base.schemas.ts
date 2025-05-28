import { z } from 'zod'

// Базовые примитивы
export const stringSchema = z.string().min(1, 'Поле не может быть пустым')
export const numberSchema = z
  .number()
  .positive('Число должно быть положительным')
export const booleanSchema = z.boolean()
export const urlSchema = z.string().url('Некорректный URL')
export const emailSchema = z.string().email('Некорректный email')

// ID схемы
export const uuidSchema = z.string().uuid('Некорректный UUID')
export const telegramIdSchema = z
  .union([
    z.string().regex(/^\d+$/, 'Telegram ID должен содержать только цифры'),
    z.number().int().positive('Telegram ID должен быть положительным числом'),
  ])
  .transform(val => String(val)) // Нормализуем к строке

// Языковые схемы
export const languageSchema = z.enum(['ru', 'en'], {
  errorMap: () => ({ message: 'Язык должен быть ru или en' }),
})

export const isRuSchema = z.boolean({
  errorMap: () => ({ message: 'is_ru должно быть boolean' }),
})

// Схемы для файлов
export const fileUrlSchema = z.string().url('Некорректный URL файла')
export const fileIdSchema = z.string().min(1, 'ID файла не может быть пустым')

// Схемы для пагинации
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  offset: z.number().int().nonnegative().optional(),
})

// Схемы для сортировки
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')
export const sortBySchema = z.string().min(1)

// Схемы для дат
export const dateSchema = z.string().datetime('Некорректный формат даты')
export const timestampSchema = z
  .number()
  .int()
  .positive('Некорректный timestamp')

// Схемы для метаданных
export const metadataSchema = z.record(z.unknown()).optional()

// Схемы для ответов API
export const successResponseSchema = z.object({
  success: z.boolean().default(true),
  message: z.string(),
  data: z.unknown().optional(),
})

export const errorResponseSchema = z.object({
  success: z.boolean().default(false),
  message: z.string(),
  error: z.string().optional(),
  details: z.unknown().optional(),
})

// Типы TypeScript из схем
export type TelegramId = z.infer<typeof telegramIdSchema>
export type Language = z.infer<typeof languageSchema>
export type Pagination = z.infer<typeof paginationSchema>
export type SortOrder = z.infer<typeof sortOrderSchema>
export type Metadata = z.infer<typeof metadataSchema>
export type SuccessResponse = z.infer<typeof successResponseSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
