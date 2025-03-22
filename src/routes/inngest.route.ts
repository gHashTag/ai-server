import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest/clients'
import {
  generateModelTraining,
  modelTrainingV2,
  neuroImageGeneration,
  helloWorld,
} from '../inngest-functions'

// Регистрация ВСЕХ функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [
    neuroImageGeneration,
    generateModelTraining,
    modelTrainingV2,
    helloWorld,
  ],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
