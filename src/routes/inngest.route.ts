import { serve } from 'inngest/express' // Предполагаемый v2 импорт для Express
// Импортируем только клиент inngest
import { inngest } from '@/core/inngest/clients'
// Импортируем все функции отдельно для сборки массива
import * as allDefinedFunctions from '@/inngest-functions'

// Собираем все экспортированные функции в один массив
const appFunctions = Object.values(allDefinedFunctions)

console.log(
  '🚦 Настройка Inngest маршрутов (v2). Количество обнаруженных функций для регистрации:',
  appFunctions.length
)

// Логируем для проверки, какие конкретно функции были найдены
// Это поможет убедиться, что все нужные функции попадают в serve
console.log('🔍 Обнаруженные Inngest функции для регистрации (v2):', {
  generateModelTrainingExists: !!allDefinedFunctions.generateModelTraining,
  modelTrainingV2Exists: !!allDefinedFunctions.modelTrainingV2,
  neuroImageGenerationExists: !!allDefinedFunctions.neuroImageGeneration,
  helloWorldExists: !!allDefinedFunctions.helloWorld, // если есть такая функция
  broadcastMessageExists: !!allDefinedFunctions.broadcastMessage,
  processPaymentExists: !!allDefinedFunctions.processPayment,
  // Добавьте сюда другие функции из вашего @/inngest-functions/index.ts для проверки
})

// v2 Express middleware setup
// Используем serve(client, functions, options) как основной паттерн для v2
export const inngestRouter = serve(inngest, appFunctions, {
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // dev: isDev, // Опция dev может быть здесь или обрабатываться автоматически
})

console.log('✅ Inngest v2 маршруты настроены и готовы к работе!')
