/**
 * Исследование рабочего сервера - какие эндпоинты доступны
 */

const axios = require('axios')

const WORKING_URL =
  'https://ai-server-production-production-8e2d.up.railway.app'

async function exploreServer() {
  console.log('🔍 === ИССЛЕДОВАНИЕ РАБОЧЕГО СЕРВЕРА ===\n')
  console.log(`🌐 Сервер: ${WORKING_URL}\n`)

  // 1. Проверим root endpoint и получим информацию о сервере
  console.log('📋 Шаг 1: Получение информации о сервере...')
  try {
    const rootResponse = await axios.get(WORKING_URL, { timeout: 5000 })
    console.log('✅ Root ответ:', JSON.stringify(rootResponse.data, null, 2))
  } catch (error) {
    console.log('❌ Root ошибка:', error.message)
  }

  // 2. Проверим health endpoint
  console.log('\n🏥 Шаг 2: Health check...')
  try {
    const healthResponse = await axios.get(`${WORKING_URL}/health`, {
      timeout: 5000,
    })
    console.log(
      '✅ Health ответ:',
      JSON.stringify(healthResponse.data, null, 2)
    )
  } catch (error) {
    console.log('❌ Health ошибка:', error.message)
  }

  // 3. Проверим список известных API эндпоинтов
  console.log('\n🔗 Шаг 3: Проверка известных API эндпоинтов...')
  const knownEndpoints = [
    '/api/test',
    '/api/users',
    '/api/generation',
    '/api/upload',
    '/api/webhook',
    '/api/payment',
    '/api/competitor-subscriptions',
    '/api/competitor-subscriptions/stats',
    '/generate/text-to-video',
    '/generate/text-to-image',
    '/api/inngest',
    '/trigger',
    '/api-docs',
  ]

  for (const endpoint of knownEndpoints) {
    try {
      const response = await axios.get(`${WORKING_URL}${endpoint}`, {
        timeout: 3000,
        validateStatus: () => true,
      })

      if (response.status < 300) {
        console.log(`   ✅ ${endpoint}: ${response.status} OK`)
        if (response.data && Object.keys(response.data).length > 0) {
          const preview = JSON.stringify(response.data, null, 2).substring(
            0,
            150
          )
          console.log(`      📊 ${preview}...`)
        }
      } else if (response.status === 404) {
        console.log(`   🟡 ${endpoint}: 404 Not Found`)
      } else if (response.status === 500) {
        console.log(`   🔴 ${endpoint}: 500 Server Error`)
      } else {
        console.log(`   ⚠️ ${endpoint}: ${response.status}`)
      }
    } catch (error) {
      if (error.code === 'ETIMEDOUT') {
        console.log(`   ⏰ ${endpoint}: Timeout`)
      } else {
        console.log(`   🔴 ${endpoint}: ${error.message}`)
      }
    }
  }

  // 4. Проверим POST эндпоинты
  console.log('\n📤 Шаг 4: Проверка POST эндпоинтов...')

  // Попробуем создать competitor subscription
  try {
    console.log('🧪 Тестируем POST /api/competitor-subscriptions...')
    const postResponse = await axios.post(
      `${WORKING_URL}/api/competitor-subscriptions`,
      {
        user_telegram_id: 'test_explore_123',
        bot_name: 'test_bot',
        competitor_username: 'test_competitor',
      },
      {
        timeout: 5000,
        validateStatus: () => true,
      }
    )

    console.log(`   📋 POST competitor-subscriptions: ${postResponse.status}`)
    if (postResponse.data) {
      console.log(
        `   📊 Ответ:`,
        JSON.stringify(postResponse.data, null, 2).substring(0, 200)
      )
    }
  } catch (error) {
    console.log(`   🔴 POST competitor-subscriptions ошибка: ${error.message}`)
  }

  // Попробуем video generation
  try {
    console.log('\n🎬 Тестируем POST /generate/text-to-video...')
    const videoResponse = await axios.post(
      `${WORKING_URL}/generate/text-to-video`,
      {
        user_telegram_id: 'test_user',
        prompt: 'test video',
        aspect_ratio: '16:9',
      },
      {
        timeout: 8000,
        validateStatus: () => true,
      }
    )

    console.log(`   📋 POST text-to-video: ${videoResponse.status}`)
    if (videoResponse.data) {
      console.log(
        `   📊 Ответ:`,
        JSON.stringify(videoResponse.data, null, 2).substring(0, 200)
      )
    }
  } catch (error) {
    console.log(`   🔴 POST text-to-video ошибка: ${error.message}`)
  }

  // 5. Проверим версию через package info или другие метаданные
  console.log('\n📦 Шаг 5: Поиск информации о версии...')
  const versionEndpoints = [
    '/version',
    '/info',
    '/status',
    '/api/version',
    '/api/info',
  ]

  for (const endpoint of versionEndpoints) {
    try {
      const response = await axios.get(`${WORKING_URL}${endpoint}`, {
        timeout: 3000,
        validateStatus: () => true,
      })

      if (response.status < 300 && response.data) {
        console.log(
          `   ✅ ${endpoint}:`,
          JSON.stringify(response.data, null, 2)
        )
      }
    } catch (error) {
      // Игнорируем ошибки для version endpoints
    }
  }

  console.log('\n🎯 === ИССЛЕДОВАНИЕ ЗАВЕРШЕНО ===')
}

exploreServer().catch(console.error)
