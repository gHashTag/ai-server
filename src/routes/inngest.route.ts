import { serve } from 'inngest/express'
import { inngest } from '@/inngest/client'
import {
  generateImageInngest,
  generateTextToVideoInngest,
  generateImageToVideoInngest,
  generateSpeechInngest,
  createVoiceAvatarInngest,
  generateModelTraining,
} from '@/inngest/functions'

// Регистрация ВСЕХ Inngest функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [
    // План А - Основные функции генерации
    generateImageInngest,
    generateTextToVideoInngest,
    generateImageToVideoInngest,
    generateSpeechInngest,
    createVoiceAvatarInngest,
    generateModelTraining,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
