import { serve } from 'inngest/express'
import { inngest } from '@/core/inngest/clients'
import { generateModelTraining } from '@/core/inngest/functions'

// Регистрация ВСЕХ функций в одном месте
export const inngestRouter = serve({
  client: inngest,
  functions: [generateModelTraining],
  signingKey: process.env.INNGEST_SIGNING_KEY,
})
