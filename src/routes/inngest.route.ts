import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest/clients'
import {
  generateModelTraining,
  modelTrainingV2,
  neuroImageGeneration,
  broadcastMessage,
  processPayment,
} from '../inngest-functions'

// Регистрация ВСЕХ функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [
    neuroImageGeneration,
    generateModelTraining,
    modelTrainingV2,
    broadcastMessage,
    processPayment,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
