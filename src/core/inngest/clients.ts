import { Inngest } from 'inngest'

// Добавляем лог для проверки инициализации
console.log('🔄 Initializing Inngest client...')
//
export const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY,
})

// Проверка экспорта
console.log('✅ Inngest client created:', !!inngest)

export const functions = []
