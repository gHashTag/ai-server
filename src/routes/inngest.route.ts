import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest-client/clients'
import {
  handleTrainingCompletion,
  generateModelTraining,
} from '@/core/inngest-client/helpers'

// Регистрация ВСЕХ функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [generateModelTraining, handleTrainingCompletion],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
