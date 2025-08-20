import { Inngest } from 'inngest'
import { logger } from '@/utils/logger'

// Добавляем лог для проверки инициализации
logger.info('🔄 Initializing Inngest client...')

export const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY || 'dev',
})

// Проверка экспорта
logger.info('✅ Inngest client created:', !!inngest)