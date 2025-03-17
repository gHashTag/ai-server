import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest/clients'
import {
  generateModelTraining,
  modelTrainingV2,
} from '@/core/inngest/functions'

// Регистрация ВСЕХ функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [generateModelTraining, modelTrainingV2],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
