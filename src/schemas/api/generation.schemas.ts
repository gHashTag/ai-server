import { z } from 'zod'
import {
  telegramIdSchema,
  stringSchema,
  numberSchema,
  isRuSchema,
  urlSchema,
  fileUrlSchema,
  successResponseSchema,
  errorResponseSchema,
} from '../common/base.schemas'
import {
  usernameSchema,
  botNameSchema,
  genderSchema,
  userParamsSchema,
} from '../common/telegram.schemas'

// Схемы для моделей и режимов
export const modelSchema = z.string().min(1, 'Модель не может быть пустой')
export const modelUrlSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+$/,
    'Некорректный формат model_url (должен быть username/model:version)'
  )

export const promptSchema = z
  .string()
  .min(1, 'Промпт не может быть пустым')
  .max(2000, 'Промпт не может быть длиннее 2000 символов')

export const numImagesSchema = z
  .number()
  .int('Количество изображений должно быть целым числом')
  .min(1, 'Минимальное количество изображений: 1')
  .max(10, 'Максимальное количество изображений: 10')

export const stepsSchema = z
  .number()
  .int('Количество шагов должно быть целым числом')
  .min(1, 'Минимальное количество шагов: 1')
  .max(1000, 'Максимальное количество шагов: 1000')

export const voiceIdSchema = z.string().min(1, 'Voice ID не может быть пустым')

// Схемы для видео моделей
export const videoModelSchema = z.enum(
  ['runway-gen3', 'luma-dream-machine', 'kling-video', 'minimax-video'],
  {
    errorMap: () => ({ message: 'Неподдерживаемая модель видео' }),
  }
)

// === TEXT TO IMAGE ===
export const textToImageRequestSchema = z.object({
  prompt: promptSchema,
  model: modelSchema,
  num_images: numImagesSchema,
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

export const textToImageResponseSchema = successResponseSchema.extend({
  message: z.literal('Processing started'),
})

// === NEURO PHOTO ===
export const neuroPhotoRequestSchema = z.object({
  prompt: promptSchema,
  model_url: modelUrlSchema,
  num_images: numImagesSchema,
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
  gender: genderSchema.optional(),
})

export const neuroPhotoResponseSchema = successResponseSchema.extend({
  message: z.literal('Processing started'),
})

// === NEURO PHOTO V2 ===
export const neuroPhotoV2RequestSchema = z.object({
  prompt: promptSchema,
  num_images: numImagesSchema,
  telegram_id: telegramIdSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
  gender: genderSchema.optional(),
})

export const neuroPhotoV2ResponseSchema = successResponseSchema.extend({
  message: z.literal('Processing started'),
})

// === TEXT TO SPEECH ===
export const textToSpeechRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Текст не может быть пустым')
    .max(5000, 'Текст слишком длинный'),
  voice_id: voiceIdSchema,
  telegram_id: telegramIdSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

export const textToSpeechResponseSchema = successResponseSchema.extend({
  message: z.literal('Processing started'),
})

// === TEXT TO VIDEO ===
export const textToVideoRequestSchema = z.object({
  prompt: promptSchema,
  videoModel: videoModelSchema,
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

export const textToVideoResponseSchema = successResponseSchema.extend({
  message: z.literal('Processing started'),
})

// === IMAGE TO VIDEO ===
export const imageToVideoRequestSchema = z
  .object({
    // Для стандартной генерации
    imageUrl: fileUrlSchema.optional(),
    prompt: promptSchema.optional(),

    // Для морфинга
    imageAUrl: fileUrlSchema.optional(),
    imageBUrl: fileUrlSchema.optional(),
    is_morphing: z.boolean().optional(),

    // Общие параметры
    videoModel: videoModelSchema,
    telegram_id: telegramIdSchema,
    username: usernameSchema,
    is_ru: isRuSchema,
    bot_name: botNameSchema,
  })
  .refine(
    data => {
      if (data.is_morphing) {
        return data.imageAUrl && data.imageBUrl
      } else {
        return data.imageUrl && data.prompt
      }
    },
    {
      message:
        'Для морфинга нужны imageAUrl и imageBUrl, для стандартной генерации - imageUrl и prompt',
    }
  )

export const imageToVideoResponseSchema = successResponseSchema.extend({
  message: z.literal('Request accepted, processing started.'),
})

// === IMAGE TO PROMPT ===
export const imageToPromptRequestSchema = z.object({
  image: fileUrlSchema,
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

export const imageToPromptResponseSchema = successResponseSchema.extend({
  message: z.literal('Processing started'),
})

// === CREATE AVATAR VOICE ===
export const createAvatarVoiceRequestSchema = z.object({
  fileUrl: fileUrlSchema,
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

export const createAvatarVoiceResponseSchema = successResponseSchema.extend({
  message: z.literal('Voice creation started'),
})

// === CREATE MODEL TRAINING ===
export const createModelTrainingRequestSchema = z.object({
  type: z.string().min(1, 'Тип не может быть пустым'),
  triggerWord: z.string().min(1, 'Trigger word не может быть пустым'),
  modelName: z.string().min(1, 'Имя модели не может быть пустым'),
  steps: stepsSchema,
  telegram_id: telegramIdSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
  gender: genderSchema,
  // zipUrl будет обрабатываться через multer middleware
})

export const createModelTrainingResponseSchema = successResponseSchema.extend({
  message: z.literal('Model training started'),
})

// === CREATE LIP SYNC ===
export const createLipSyncRequestSchema = z.object({
  type: z.string().min(1, 'Тип не может быть пустым'),
  telegram_id: telegramIdSchema,
  is_ru: isRuSchema,
  // video и audio файлы будут обрабатываться через multer middleware
})

export const createLipSyncResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELED']),
  outputUrl: z.string().nullable(),
  message: z.string().optional(),
})

// === NEURO PHOTO SYNC (для MCP) ===
export const neuroPhotoSyncRequestSchema = z.object({
  prompt: promptSchema,
  model_url: modelUrlSchema,
  num_images: numImagesSchema,
  telegram_id: telegramIdSchema,
  username: usernameSchema,
  is_ru: isRuSchema,
  bot_name: botNameSchema,
})

export const neuroPhotoSyncResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        prompt_id: z.number(),
      })
    )
    .optional(),
  count: z.number().optional(),
})

// Типы TypeScript из схем
export type TextToImageRequest = z.infer<typeof textToImageRequestSchema>
export type TextToImageResponse = z.infer<typeof textToImageResponseSchema>
export type NeuroPhotoRequest = z.infer<typeof neuroPhotoRequestSchema>
export type NeuroPhotoResponse = z.infer<typeof neuroPhotoResponseSchema>
export type NeuroPhotoV2Request = z.infer<typeof neuroPhotoV2RequestSchema>
export type NeuroPhotoV2Response = z.infer<typeof neuroPhotoV2ResponseSchema>
export type TextToSpeechRequest = z.infer<typeof textToSpeechRequestSchema>
export type TextToSpeechResponse = z.infer<typeof textToSpeechResponseSchema>
export type TextToVideoRequest = z.infer<typeof textToVideoRequestSchema>
export type TextToVideoResponse = z.infer<typeof textToVideoResponseSchema>
export type ImageToVideoRequest = z.infer<typeof imageToVideoRequestSchema>
export type ImageToVideoResponse = z.infer<typeof imageToVideoResponseSchema>
export type ImageToPromptRequest = z.infer<typeof imageToPromptRequestSchema>
export type ImageToPromptResponse = z.infer<typeof imageToPromptResponseSchema>
export type CreateAvatarVoiceRequest = z.infer<
  typeof createAvatarVoiceRequestSchema
>
export type CreateAvatarVoiceResponse = z.infer<
  typeof createAvatarVoiceResponseSchema
>
export type CreateModelTrainingRequest = z.infer<
  typeof createModelTrainingRequestSchema
>
export type CreateModelTrainingResponse = z.infer<
  typeof createModelTrainingResponseSchema
>
export type CreateLipSyncRequest = z.infer<typeof createLipSyncRequestSchema>
export type CreateLipSyncResponse = z.infer<typeof createLipSyncResponseSchema>
export type NeuroPhotoSyncRequest = z.infer<typeof neuroPhotoSyncRequestSchema>
export type NeuroPhotoSyncResponse = z.infer<
  typeof neuroPhotoSyncResponseSchema
>
