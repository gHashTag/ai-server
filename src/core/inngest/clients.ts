import { Inngest } from 'inngest'
import { INNGEST_WEBHOOK_URL } from '@/config'
import { isDev } from '@/config'
// Добавляем лог для проверки инициализации
console.log('🔄 Initializing Inngest client (v2)...')
console.log(
  '🌐 Inngest webhook URL (v3 context, may not be used by v2 client):',
  INNGEST_WEBHOOK_URL
)

export const inngest = new Inngest({
  name: 'ai-training-server',
  eventKey: isDev ? undefined : process.env.INNGEST_EVENT_KEY,
})

// Проверка экспорта
console.log('✅ Inngest v2 client created:', !!inngest)

// Массив functions здесь больше не нужен, он будет формироваться в месте использования serve
