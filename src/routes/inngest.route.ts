import { serve } from 'inngest/express' // Предполагаемый v3 импорт для Express
// Импортируем только клиент inngest
import { inngest } from '@/core/inngest/clients'
// Импортируем массив функций и отдельные функции для проверки
import {
  functions,
  processPayment,
  instagramScraperV2,
} from '@/inngest-functions'

console.log(
  '🚦 Настройка Inngest маршрутов (v3). Обнаружено функций:',
  functions.length
)

// Логируем для проверки, какие конкретно функции были найдены
console.log('🔍 Обнаруженные Inngest функции для регистрации (v3):', {
  totalFunctions: functions.length,
  processPaymentExists: !!processPayment,
  instagramScraperV2Exists: !!instagramScraperV2,
  functionNames: functions.map(fn => fn.name || 'unnamed'),
})

// v3 Express middleware setup
// Используем serve({ client, functions, signingKey, dev }) как основной паттерн для v3
export const inngestRouter = serve({
  client: inngest,
  functions: functions, // Используем готовый массив функций
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // dev: isDev, // The 'dev' flag is often handled by INNGEST_DEV env var or absence of event key in v3
})

console.log('✅ Inngest v3 маршруты настроены!')
