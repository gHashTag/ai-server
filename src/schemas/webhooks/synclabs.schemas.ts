import { z } from 'zod'

// Схемы для статусов SyncLabs
export const syncLabsStatusSchema = z.enum(
  ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
  {
    errorMap: () => ({ message: 'Некорректный статус SyncLabs' }),
  }
)

// Схема для входных данных SyncLabs
export const syncLabsInputSchema = z.array(
  z.object({
    url: z.string().url('Некорректный URL входного файла'),
    type: z.string().min(1, 'Тип файла не может быть пустым'),
  })
)

// Схема для опций SyncLabs
export const syncLabsOptionsSchema = z
  .object({
    output_format: z.string().default('mp4'),
    quality: z.enum(['low', 'medium', 'high']).optional(),
    fps: z.number().int().positive().optional(),
  })
  .optional()

// Основная схема SyncLabs webhook
export const syncLabsWebhookSchema = z.object({
  id: z.string().min(1, 'ID не может быть пустым'),
  createdAt: z.string().datetime('Некорректный формат createdAt'),
  status: syncLabsStatusSchema,
  model: z.string().min(1, 'Модель не может быть пустой'),
  input: syncLabsInputSchema,
  webhookUrl: z.string().url('Некорректный webhook URL'),
  options: syncLabsOptionsSchema,
  outputUrl: z.string().url('Некорректный output URL').nullable(),
  outputDuration: z.number().positive().nullable(),
  error: z.string().nullable(),
})

// Схема для LipSync Response (используется в контроллерах)
export const lipSyncResponseSchema = z.object({
  id: z.string().min(1, 'ID не может быть пустым'),
  createdAt: z.string().datetime('Некорректный формат createdAt'),
  status: syncLabsStatusSchema,
  model: z.string().min(1, 'Модель не может быть пустой'),
  input: syncLabsInputSchema,
  webhookUrl: z.string().url('Некорректный webhook URL'),
  options: syncLabsOptionsSchema,
  outputUrl: z.string().url('Некорректный output URL').nullable(),
  outputDuration: z.number().positive().nullable(),
  error: z.string().nullable(),
})

// Схема для ошибок SyncLabs
export const syncLabsErrorSchema = z.object({
  error: z.string().min(1, 'Сообщение об ошибке не может быть пустым'),
  message: z.string().optional(),
  code: z.number().int().optional(),
  details: z.record(z.unknown()).optional(),
})

// Схема для авторизации SyncLabs
export const syncLabsAuthSchema = z.object({
  authorization: z
    .string()
    .regex(
      /^Bearer .+$/,
      'Некорректный формат токена авторизации (должен быть Bearer token)'
    ),
})

// Типы TypeScript из схем
export type SyncLabsStatus = z.infer<typeof syncLabsStatusSchema>
export type SyncLabsInput = z.infer<typeof syncLabsInputSchema>
export type SyncLabsOptions = z.infer<typeof syncLabsOptionsSchema>
export type SyncLabsWebhook = z.infer<typeof syncLabsWebhookSchema>
export type LipSyncResponse = z.infer<typeof lipSyncResponseSchema>
export type SyncLabsError = z.infer<typeof syncLabsErrorSchema>
export type SyncLabsAuth = z.infer<typeof syncLabsAuthSchema>
