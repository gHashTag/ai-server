/**
 * Автономный тестовый скрипт для Kie.ai API
 * Этот файл можно запустить напрямую через node без компиляции
 */

const axios = require('axios')
const dotenv = require('dotenv')
const path = require('path')

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../.env') })

// Константы моделей Kie.ai
const KIE_AI_MODELS = {
  veo3_fast: {
    name: 'Veo 3 Fast',
    pricePerSecond: 0.05,
    maxDuration: 10,
  },
  veo3: {
    name: 'Veo 3 Quality',
    pricePerSecond: 0.25,
    maxDuration: 10,
  },
  'runway-aleph': {
    name: 'Runway Aleph',
    pricePerSecond: 0.3,
    maxDuration: 10,
  },
}

class SimpleKieAiClient {
  constructor() {
    this.apiKey = process.env.KIE_AI_API_KEY || ''
    this.baseUrl = 'https://api.kie.ai/api/v1'

    if (!this.apiKey) {
      console.warn('⚠️ KIE_AI_API_KEY not found in .env file')
    }
  }

  async checkHealth() {
    if (!this.apiKey) return false

    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      console.log('✅ Kie.ai API доступен. Кредиты:', response.data.credits)
      return true
    } catch (error) {
      console.error('❌ Kie.ai API недоступен:', error.message)
      return false
    }
  }

  async generateVideo(options) {
    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required')
    }

    const requestBody = {
      model: options.model,
      prompt: options.prompt,
      aspectRatio: options.aspectRatio || '16:9',
    }

    // Добавляем опциональные поля
    if (options.imageUrls) requestBody.imageUrls = options.imageUrls
    if (options.watermark) requestBody.watermark = options.watermark
    if (options.callBackUrl) requestBody.callBackUrl = options.callBackUrl
    if (options.seeds !== undefined) requestBody.seeds = options.seeds
    if (options.enableFallback !== undefined)
      requestBody.enableFallback = options.enableFallback

    console.log('\n📤 Отправляем запрос к Kie.ai API:')
    console.log(JSON.stringify(requestBody, null, 2))

    try {
      const response = await axios.post(
        `${this.baseUrl}/veo/generate`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      console.log('\n📥 Ответ от Kie.ai:')
      console.log(JSON.stringify(response.data, null, 2))

      if (response.data.code !== 200) {
        throw new Error(response.data.msg || 'Generation failed')
      }

      return {
        success: true,
        taskId: response.data.data?.taskId,
        message: response.data.msg,
      }
    } catch (error) {
      if (error.response) {
        console.error('\n❌ Ошибка от API:')
        console.error(`Status: ${error.response.status}`)
        console.error(`Data:`, error.response.data)

        if (error.response.status === 401) {
          throw new Error('Invalid API key. Check KIE_AI_API_KEY')
        } else if (error.response.status === 402) {
          throw new Error('Insufficient credits')
        } else if (error.response.status === 429) {
          throw new Error('Rate limit exceeded')
        }
      }
      throw error
    }
  }

  calculateCost(model, duration) {
    const modelConfig = KIE_AI_MODELS[model]
    if (!modelConfig) return 0
    return duration * modelConfig.pricePerSecond
  }
}

async function runTests() {
  console.log('🚀 Начинаем тестирование Kie.ai API...\n')
  console.log('='.repeat(50))

  const client = new SimpleKieAiClient()

  // 1. Проверка доступности API
  console.log('\n1️⃣ ПРОВЕРКА ДОСТУПНОСТИ API')
  console.log('-'.repeat(30))
  const isHealthy = await client.checkHealth()
  if (!isHealthy) {
    console.error('\n⚠️ API недоступен. Проверьте:')
    console.error('1. Наличие файла .env в корне проекта')
    console.error('2. Наличие KIE_AI_API_KEY в .env')
    console.error('3. Корректность API ключа')
    return
  }

  // 2. Тест с базовыми параметрами
  console.log('\n2️⃣ ТЕСТ БАЗОВОЙ ГЕНЕРАЦИИ')
  console.log('-'.repeat(30))
  try {
    const result = await client.generateVideo({
      model: 'veo3_fast',
      prompt: 'A beautiful sunset over mountains',
      aspectRatio: '16:9',
    })
    console.log('✅ Успешно! Task ID:', result.taskId)
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }

  // 3. Тест с массивом изображений
  console.log('\n3️⃣ ТЕСТ С МАССИВОМ ИЗОБРАЖЕНИЙ')
  console.log('-'.repeat(30))
  try {
    const result = await client.generateVideo({
      model: 'veo3',
      prompt: 'Smooth transition between images',
      imageUrls: [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ],
      aspectRatio: '9:16',
    })
    console.log('✅ Успешно! Task ID:', result.taskId)
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }

  // 4. Тест со всеми параметрами
  console.log('\n4️⃣ ТЕСТ СО ВСЕМИ ПАРАМЕТРАМИ')
  console.log('-'.repeat(30))
  try {
    const result = await client.generateVideo({
      model: 'veo3',
      prompt: 'Epic cinematic scene with effects',
      imageUrls: ['https://example.com/reference.jpg'],
      watermark: 'TestBrand',
      callBackUrl: 'https://webhook.site/test',
      seeds: 12345,
      enableFallback: true,
      aspectRatio: '16:9',
    })
    console.log('✅ Успешно! Task ID:', result.taskId)
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }

  // 5. Расчет стоимости
  console.log('\n5️⃣ РАСЧЕТ СТОИМОСТИ')
  console.log('-'.repeat(30))
  const duration = 10
  console.log(`Стоимость генерации ${duration} секунд видео:`)

  for (const [modelId, modelInfo] of Object.entries(KIE_AI_MODELS)) {
    const cost = client.calculateCost(modelId, duration)
    console.log(`• ${modelInfo.name}: $${cost.toFixed(3)}`)
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Тестирование завершено!')
  console.log('\n📌 Примечания:')
  console.log('• Видео генерируется асинхронно (1-3 минуты)')
  console.log('• Результаты доступны через webhook или проверку статуса')
  console.log('• Task ID используется для отслеживания прогресса')
}

// Запуск тестов
runTests().catch(error => {
  console.error('\n💥 Критическая ошибка:', error)
  process.exit(1)
})
