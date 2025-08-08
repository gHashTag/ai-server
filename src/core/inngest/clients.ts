import { Inngest } from 'inngest'
import { INNGEST_WEBHOOK_URL } from '../../config'

console.log('🔄 Initializing Inngest client (v3 style)...')
console.log(
  '🌐 Inngest webhook URL (v3 context):',
  INNGEST_WEBHOOK_URL // Webhook URL might be handled differently or via env vars for v3
)

export const inngest = new Inngest({
  id: 'ai-training-server', // v3 requires id
  eventKey: process.env.INNGEST_EVENT_KEY, // ✅ ДОБАВЛЕНО для production
  // signingKey is also usually handled by middleware/serve or env vars
})

console.log('✅ Inngest v3 client created:', !!inngest)

// Массив functions здесь больше не нужен, он будет формироваться в месте использования serve
