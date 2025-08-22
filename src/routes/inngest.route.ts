import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest-client/clients'
import {
  generateModelTraining,
  generateTextToImageInngest,
  generateTextToVideoInngest,
  generateImageToVideoInngest,
  generateSpeechInngest,
  createVoiceAvatarInngest,
  generateImageToPromptInngest,
  generateNeuroImageInngest,
  generateNeuroImageV2Inngest,
  generateLipSyncInngest,
  generateModelTrainingV2Inngest,
  analyzeABTestsInngest,
} from '@/core/inngest-client/helpers'

// Регистрация ВСЕХ Inngest функций в одном месте (План А)
export const inngestRouter = serve({
  client: inngest,
  functions: [
    // Существующие функции
    generateModelTraining,
    generateTextToImageInngest,
    generateTextToVideoInngest,
    generateImageToVideoInngest,
    generateSpeechInngest,
    createVoiceAvatarInngest,
    // Новые функции для полного покрытия MCP инструментов
    generateImageToPromptInngest,
    generateNeuroImageInngest,
    generateNeuroImageV2Inngest,
    generateLipSyncInngest,
    generateModelTrainingV2Inngest,
    // A/B тестирование и аналитика
    analyzeABTestsInngest,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
