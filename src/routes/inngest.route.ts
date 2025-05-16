import { serve } from 'inngest/express' // Предполагаемый v3 импорт для Express
// Импортируем только клиент inngest
import { inngest } from '@/core/inngest/clients'
// Импортируем все функции отдельно для сборки массива
import * as allDefinedFunctions from '@/inngest-functions'

// Собираем все экспортированные функции в один массив
const appFunctions = Object.values(allDefinedFunctions)

console.log(
  '🚦 Настройка Inngest маршрутов (v3). Обнаружено функций:',
  appFunctions.length
)

// Логируем для проверки, какие конкретно функции были найдены
// Это поможет убедиться, что все нужные функции попадают в serve
console.log('🔍 Обнаруженные Inngest функции для регистрации (v3):', {
  generateModelTrainingExists: !!allDefinedFunctions.generateModelTraining,
  modelTrainingV2Exists: !!allDefinedFunctions.modelTrainingV2,
  neuroImageGenerationExists: !!allDefinedFunctions.neuroImageGeneration,
  helloWorldExists: !!allDefinedFunctions.helloWorld, // если есть такая функция
  broadcastMessageExists: !!allDefinedFunctions.broadcastMessage,
  processPaymentExists: !!allDefinedFunctions.processPayment,
  // Добавьте сюда другие функции из вашего @/inngest-functions/index.ts для проверки
})

// v3 Express middleware setup
// Используем serve({ client, functions, signingKey, dev }) как основной паттерн для v3
export const inngestRouter = serve({
  client: inngest,
  functions: appFunctions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // dev: isDev, // The 'dev' flag is often handled by INNGEST_DEV env var or absence of event key in v3
})

console.log('✅ Inngest v3 маршруты настроены!')
