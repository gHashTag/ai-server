import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest-client/clients'
import {
  generateModelTraining,
  generateTextToImageInngest,
  generateTextToVideoInngest,
  generateImageToVideoInngest,
  generateSpeechInngest,
  createVoiceAvatarInngest,
} from '@/core/inngest-client/helpers'

// Регистрация ВСЕХ Inngest функций в одном месте (План А)
export const inngestRouter = serve({
  client: inngest,
  functions: [
    // Существующая функция обучения модели
    generateModelTraining,
    // Новые обертки для основных сервисов
    generateTextToImageInngest,
    generateTextToVideoInngest,
    generateImageToVideoInngest,
    generateSpeechInngest,
    createVoiceAvatarInngest,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
