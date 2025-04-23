import { Inngest } from 'inngest'
import { INNGEST_WEBHOOK_URL } from '@/config'

// Добавляем лог для проверки инициализации
console.log('🔄 Initializing Inngest client...')
console.log('🌐 Inngest webhook URL:', INNGEST_WEBHOOK_URL)

//
export const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY,
  baseUrl: INNGEST_WEBHOOK_URL || 'http://localhost:8288'
})

// Проверка экспорта
console.log('✅ Inngest client created:', !!inngest)

export const functions = []
