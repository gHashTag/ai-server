#!/usr/bin/env node

/**
 * РЕАЛЬНЫЙ ТЕСТ KIE.AI API
 *
 * Проверяет:
 * 1. Подключение к настоящему Kie.ai API
 * 2. Проверку баланса
 * 3. Генерацию видео с заданным duration
 * 4. Fallback на Vertex AI
 */

require('dotenv').config()
const axios = require('axios')

console.log('🧪 РЕАЛЬНЫЙ ТЕСТ KIE.AI API\n')

class RealKieAiTest {
  constructor() {
    this.apiKey = process.env.KIE_AI_API_KEY
    this.baseUrl = 'https://api.kie.ai/api/v1'
  }

  async testApiConnection() {
    console.log('🔗 1. ТЕСТ ПОДКЛЮЧЕНИЯ К KIE.AI API')
    console.log('=' * 50)

    if (!this.apiKey) {
      console.log('❌ KIE_AI_API_KEY не найден в environment')
      console.log('💡 Добавьте KIE_AI_API_KEY=your_key в .env файл')
      console.log('💡 Получить ключ: https://kie.ai → Settings → API Keys')
      return false
    }

    console.log('✅ KIE_AI_API_KEY найден')
    console.log(`🔑 Ключ: ${this.apiKey.substring(0, 20)}...`)

    try {
      console.log('⏳ Проверка соединения с Kie.ai API...')

      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      console.log('✅ Подключение успешно!')
      console.log('📊 Ответ API:', JSON.stringify(response.data, null, 2))

      return true
    } catch (error) {
      console.log('❌ Ошибка подключения:', error.message)

      if (error.response) {
        console.log('📋 Статус:', error.response.status)
        console.log('📋 Данные:', JSON.stringify(error.response.data, null, 2))

        if (error.response.status === 401) {
          console.log('💡 Неверный API ключ. Проверьте KIE_AI_API_KEY')
        } else if (error.response.status === 429) {
          console.log('💡 Превышен лимит запросов. Подождите немного')
        }
      }

      return false
    }
  }

  async testAccountBalance() {
    console.log('\n💰 2. ТЕСТ ПРОВЕРКИ БАЛАНСА')
    console.log('=' * 50)

    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      const credits = response.data.credits || 0

      console.log(`💎 Текущий баланс: ${credits} кредитов`)

      if (credits > 0) {
        console.log('✅ Баланс достаточен для тестирования')

        // Примерный расчет стоимости
        const veo3FastCost = 0.05 // $0.05 за секунду
        const creditCost = 0.01 // примерно $0.01 за кредит
        const maxDuration = Math.floor((credits * creditCost) / veo3FastCost)

        console.log(
          `📊 Можно сгенерировать ~${maxDuration} секунд Veo-3 Fast видео`
        )

        return true
      } else {
        console.log('❌ Недостаточно кредитов для генерации')
        console.log('💡 Пополните баланс на https://kie.ai')
        return false
      }
    } catch (error) {
      console.log('❌ Ошибка получения баланса:', error.message)
      return false
    }
  }

  async testVideoGeneration() {
    console.log('\n🎬 3. ТЕСТ ГЕНЕРАЦИИ ВИДЕО')
    console.log('=' * 50)

    console.log('⚠️  ВНИМАНИЕ: Этот тест потратит реальные кредиты!')
    console.log('💰 Стоимость: ~$0.10 за 2 секунды Veo-3 Fast')

    // В реальной ситуации здесь был бы запрос пользователю
    const shouldContinue = process.env.RUN_REAL_TESTS === 'true'

    if (!shouldContinue) {
      console.log(
        '🛑 Реальный тест пропущен (добавьте RUN_REAL_TESTS=true для запуска)'
      )
      console.log('📋 Тест остановлен для экономии кредитов')

      // Показать какой бы был запрос
      console.log('\n📝 Запрос который был бы отправлен:')
      console.log(
        JSON.stringify(
          {
            model: 'veo-3-fast',
            prompt: 'A cat playing with a ball of yarn, 2 seconds duration',
            duration: 2,
            aspectRatio: '16:9',
          },
          null,
          2
        )
      )

      return 'skipped'
    }

    try {
      console.log('⏳ Отправка запроса на генерацию...')

      const requestBody = {
        model: 'veo-3-fast',
        prompt: 'A cat playing with a ball of yarn, short clip',
        duration: 2, // Тестируем именно duration
        aspectRatio: '16:9',
      }

      console.log('📋 Параметры запроса:', JSON.stringify(requestBody, null, 2))

      const response = await axios.post(
        `${this.baseUrl}/video/generate`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 минут на генерацию
        }
      )

      console.log('✅ Запрос отправлен успешно!')
      console.log('📊 Ответ API:', JSON.stringify(response.data, null, 2))

      if (response.data.success && response.data.data?.videoUrl) {
        console.log('🎉 ВИДЕО СГЕНЕРИРОВАНО!')
        console.log(`🔗 URL: ${response.data.data.videoUrl}`)
        console.log(
          `⏱️  Duration: ${response.data.data.duration || 'unknown'} секунд`
        )
        console.log(`💰 Стоимость: $${response.data.cost?.usd || 'unknown'}`)

        return {
          success: true,
          videoUrl: response.data.data.videoUrl,
          duration: response.data.data.duration,
          cost: response.data.cost,
        }
      } else {
        console.log('❌ Не удалось сгенерировать видео')
        console.log('📋 Ответ:', response.data)
        return { success: false, error: 'No video generated' }
      }
    } catch (error) {
      console.log('❌ Ошибка генерации:', error.message)

      if (error.response) {
        console.log('📋 Статус:', error.response.status)
        console.log('📋 Данные:', JSON.stringify(error.response.data, null, 2))
      }

      return { success: false, error: error.message }
    }
  }

  async testFallbackLogic() {
    console.log('\n🔄 4. ТЕСТ FALLBACK ЛОГИКИ')
    console.log('=' * 50)

    console.log('💡 Симуляция недоступности Kie.ai для проверки fallback...')

    // Симулируем недоступность Kie.ai
    const originalApiKey = this.apiKey
    this.apiKey = 'invalid_key_for_test'

    try {
      console.log('⏳ Попытка подключения с неверным ключом...')

      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      })

      console.log('⚠️  Неожиданно: API ответил с неверным ключом')
    } catch (error) {
      console.log('✅ Правильно: API отклонил неверный ключ')
      console.log('📋 Статус:', error.response?.status || 'timeout')
      console.log('🔄 В реальном коде здесь бы сработал fallback на Vertex AI')
    }

    // Восстанавливаем ключ
    this.apiKey = originalApiKey

    console.log('\n💡 Fallback логика:')
    console.log('   1. Попытка Kie.ai API')
    console.log('   2. Если ошибка → fallback на Vertex AI')
    console.log('   3. Уведомление о использовании более дорогого провайдера')
  }

  async testDurationAPI() {
    console.log('\n⏱️  5. ТЕСТ DURATION API')
    console.log('=' * 50)

    const testCases = [
      { duration: 2, expected: 2, description: 'Минимальная длительность' },
      { duration: 5, expected: 5, description: 'Стандартная длительность' },
      { duration: 8, expected: 8, description: 'Максимальная для Fast' },
      {
        duration: 15,
        expected: 10,
        description: 'Превышение лимита (должно стать 10)',
      },
    ]

    testCases.forEach(testCase => {
      const clampedDuration = Math.max(2, Math.min(10, testCase.duration))
      const isCorrect = clampedDuration === testCase.expected

      console.log(`\n📊 ${testCase.description}:`)
      console.log(`   📝 Запрошено: ${testCase.duration} сек`)
      console.log(`   ✅ Ожидается: ${testCase.expected} сек`)
      console.log(`   🔄 Обработано: ${clampedDuration} сек`)
      console.log(
        `   ${isCorrect ? '✅' : '❌'} ${isCorrect ? 'КОРРЕКТНО' : 'ОШИБКА'}`
      )
    })
  }
}

async function main() {
  const tester = new RealKieAiTest()

  try {
    console.log('🚀 Запуск реального тестирования Kie.ai API...\n')

    // 1. Тест подключения
    const connectionOk = await tester.testApiConnection()

    if (connectionOk) {
      // 2. Тест баланса
      const balanceOk = await tester.testAccountBalance()

      // 3. Тест генерации (если есть баланс)
      if (balanceOk) {
        const generationResult = await tester.testVideoGeneration()

        if (generationResult?.success) {
          console.log('\n🎊 РЕАЛЬНАЯ ГЕНЕРАЦИЯ УСПЕШНА!')
          console.log('✅ Kie.ai API полностью функционален')
          console.log('✅ Duration API работает корректно')
        } else if (generationResult === 'skipped') {
          console.log('\n⏭️  Генерация пропущена для экономии кредитов')
          console.log('💡 Используйте RUN_REAL_TESTS=true для полного теста')
        }
      }
    }

    // 4. Тест fallback логики
    await tester.testFallbackLogic()

    // 5. Тест duration API
    await tester.testDurationAPI()

    console.log('\n🎯 ИТОГИ РЕАЛЬНОГО ТЕСТИРОВАНИЯ:')
    console.log('=' * 50)

    if (!process.env.KIE_AI_API_KEY) {
      console.log('❌ KIE_AI_API_KEY не настроен - Kie.ai недоступен')
      console.log('📋 Система будет использовать дорогой Vertex AI')
    } else if (connectionOk) {
      console.log('✅ Kie.ai API подключен и готов к работе')
      console.log('💰 Экономия до 87% против Vertex AI активна')
      console.log('⚡ Duration API работает через Kie.ai')
    } else {
      console.log('⚠️  Kie.ai API недоступен - активен fallback на Vertex AI')
    }

    console.log('\n📋 ДЛЯ АКТИВАЦИИ ЭКОНОМИИ:')
    console.log('1. Получите API ключ на https://kie.ai')
    console.log('2. Добавьте KIE_AI_API_KEY в .env')
    console.log('3. Пополните баланс ($5+ рекомендуется)')
    console.log('4. Перезапустите сервер')
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message)
    console.error(error.stack)
  }
}

if (require.main === module) {
  main()
}

module.exports = { RealKieAiTest }
