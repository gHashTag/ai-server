import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest/clients'
import {
  generateModelTraining,
  modelTrainingV2,
  broadcastMessage,
  processPayment,
} from '../inngest-functions'

console.log('🔍 Регистрация Inngest функций:', {
  generateModelTrainingExists: !!generateModelTraining,
  modelTrainingV2Exists: !!modelTrainingV2,
  broadcastMessageExists: !!broadcastMessage,
  processPaymentExists: !!processPayment,
})

// Регистрация ВСЕХ функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [
    generateModelTraining,
    modelTrainingV2,
    broadcastMessage,
    processPayment,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})

console.log('✅ Inngest маршруты настроены!')
