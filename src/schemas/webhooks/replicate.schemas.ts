import { z } from 'zod'

// Схемы для статусов Replicate
export const replicateStatusSchema = z.enum(
  ['starting', 'processing', 'succeeded', 'failed', 'canceled'],
  {
    errorMap: () => ({ message: 'Некорректный статус Replicate' }),
  }
)

// Схема для входных данных Replicate
export const replicateInputSchema = z.record(z.unknown())

// Схема для выходных данных Replicate
export const replicateOutputSchema = z.union([
  z.string().url(), // URL изображения/видео
  z.array(z.string().url()), // Массив URL
  z.record(z.unknown()), // Объект с данными
  z.null(),
])

// Схема для метрик Replicate
export const replicateMetricsSchema = z
  .object({
    predict_time: z.number().optional(),
    total_time: z.number().optional(),
    image_count: z.number().optional(),
  })
  .optional()

// Схема для URL'ов Replicate
export const replicateUrlsSchema = z.object({
  get: z.string().url(),
  cancel: z.string().url().optional(),
})

// Основная схема Replicate webhook
export const replicateWebhookSchema = z.object({
  id: z.string().min(1, 'ID не может быть пустым'),
  version: z.string().min(1, 'Version не может быть пустой'),
  status: replicateStatusSchema,
  input: replicateInputSchema,
  output: replicateOutputSchema,
  error: z.string().nullable().optional(),
  logs: z.string().optional(),
  metrics: replicateMetricsSchema,
  urls: replicateUrlsSchema,
  created_at: z.string().datetime('Некорректный формат created_at'),
  started_at: z
    .string()
    .datetime('Некорректный формат started_at')
    .nullable()
    .optional(),
  completed_at: z
    .string()
    .datetime('Некорректный формат completed_at')
    .nullable()
    .optional(),
})

// Схема для Model Training webhook (специфичная для тренировки моделей)
export const replicateModelTrainingWebhookSchema =
  replicateWebhookSchema.extend({
    destination: z
      .string()
      .regex(
        /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/,
        'Некорректный формат destination (должен быть username/model)'
      )
      .optional(),
    webhook: z.string().url().optional(),
    webhook_events_filter: z.array(z.string()).optional(),
  })

// Схема для Image Generation webhook
export const replicateImageWebhookSchema = replicateWebhookSchema.extend({
  output: z.union([
    z.string().url(), // Одно изображение
    z.array(z.string().url()), // Массив изображений
    z.null(),
  ]),
})

// Схема для Video Generation webhook
export const replicateVideoWebhookSchema = replicateWebhookSchema.extend({
  output: z.union([
    z.string().url(), // URL видео
    z.null(),
  ]),
})

// Схема для валидации подписи Replicate
export const replicateSignatureSchema = z.object({
  'x-replicate-signature': z.string().min(1, 'Подпись Replicate отсутствует'),
})

// Типы TypeScript из схем
export type ReplicateStatus = z.infer<typeof replicateStatusSchema>
export type ReplicateInput = z.infer<typeof replicateInputSchema>
export type ReplicateOutput = z.infer<typeof replicateOutputSchema>
export type ReplicateMetrics = z.infer<typeof replicateMetricsSchema>
export type ReplicateUrls = z.infer<typeof replicateUrlsSchema>
export type ReplicateWebhook = z.infer<typeof replicateWebhookSchema>
export type ReplicateModelTrainingWebhook = z.infer<
  typeof replicateModelTrainingWebhookSchema
>
export type ReplicateImageWebhook = z.infer<typeof replicateImageWebhookSchema>
export type ReplicateVideoWebhook = z.infer<typeof replicateVideoWebhookSchema>
export type ReplicateSignature = z.infer<typeof replicateSignatureSchema>
