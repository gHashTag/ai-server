/**
 * Проверка ПРАВИЛЬНОГО Railway сервера
 */

const axios = require('axios')

const CORRECT_URL =
  'https://ai-server-production-production-8e2d.up.railway.app'

async function checkCorrectServer() {
  console.log('🔍 === ПРОВЕРКА ПРАВИЛЬНОГО RAILWAY СЕРВЕРА ===\n')
  console.log(`🌐 Правильный URL: ${CORRECT_URL}\n`)

  // 1. Базовые проверки
  console.log('📋 Шаг 1: Базовые проверки сервера...')
  const basicEndpoints = [
    { name: 'Health Check', path: '/health' },
    { name: 'Root Endpoint', path: '/' },
  ]

  for (const endpoint of basicEndpoints) {
    try {
      const response = await axios.get(`${CORRECT_URL}${endpoint.path}`, {
        timeout: 10000,
        validateStatus: () => true,
      })

      console.log(`   ✅ ${endpoint.name}: ${response.status}`)
      if (response.data) {
        const preview = JSON.stringify(response.data, null, 2).substring(0, 150)
        console.log(`      📊 ${preview}...`)
      }
    } catch (error) {
      console.log(`   🔴 ${endpoint.name}: ${error.message}`)
    }
  }

  // 2. Тестируем Competitor Subscriptions API
  console.log('\n🎯 Шаг 2: Тестирование Competitor Subscriptions API...')
  const competitorEndpoints = [
    {
      name: 'Stats',
      path: '/api/competitor-subscriptions/stats',
      method: 'GET',
    },
    {
      name: 'List',
      path: '/api/competitor-subscriptions?user_telegram_id=test&bot_name=test',
      method: 'GET',
    },
  ]

  for (const endpoint of competitorEndpoints) {
    try {
      const response = await axios.get(`${CORRECT_URL}${endpoint.path}`, {
        timeout: 8000,
        validateStatus: () => true,
      })

      if (response.status < 300) {
        console.log(`   ✅ ${endpoint.name}: ${response.status} OK`)
        if (response.data?.success) {
          console.log(`      📊 Success: ${response.data.success}`)
          if (response.data.stats) {
            console.log(
              `      📈 Stats: Users=${response.data.stats.total_users}, Subs=${response.data.stats.total_subscriptions}`
            )
          }
        }
      } else if (response.status === 404) {
        console.log(`   🟡 ${endpoint.name}: 404 Not Found`)
      } else {
        console.log(`   ⚠️ ${endpoint.name}: ${response.status}`)
      }
    } catch (error) {
      console.log(`   🔴 ${endpoint.name}: ${error.message}`)
    }
  }

  // 3. Тестируем Video Status API
  console.log('\n🎬 Шаг 3: Тестирование Video Status API...')
  const videoEndpoints = [
    { name: 'Video Stats', path: '/generate/video-jobs/stats' },
    {
      name: 'Video Status Example',
      path: '/generate/text-to-video/status/test123',
    },
  ]

  for (const endpoint of videoEndpoints) {
    try {
      const response = await axios.get(`${CORRECT_URL}${endpoint.path}`, {
        timeout: 8000,
        validateStatus: () => true,
      })

      if (response.status < 300) {
        console.log(`   ✅ ${endpoint.name}: ${response.status} OK`)
        if (response.data?.success !== undefined) {
          console.log(`      📊 Success: ${response.data.success}`)
        }
      } else if (response.status === 404) {
        console.log(`   🟡 ${endpoint.name}: 404 Not Found`)
      } else {
        console.log(`   ⚠️ ${endpoint.name}: ${response.status}`)
      }
    } catch (error) {
      console.log(`   🔴 ${endpoint.name}: ${error.message}`)
    }
  }

  // 4. Тестируем POST создание подписки
  console.log('\n📤 Шаг 4: Тестирование POST создания подписки...')
  try {
    const createResponse = await axios.post(
      `${CORRECT_URL}/api/competitor-subscriptions`,
      {
        user_telegram_id: 'test_correct_server_123',
        user_chat_id: 'test_correct_server_123',
        bot_name: 'test_bot_correct',
        competitor_username: 'test_competitor_correct',
        max_reels: 5,
        min_views: 1000,
        max_age_days: 7,
        delivery_format: 'digest',
      },
      {
        timeout: 10000,
        validateStatus: () => true,
      }
    )

    console.log(`   📋 POST создание подписки: ${createResponse.status}`)
    if (createResponse.status < 300) {
      console.log(`   ✅ POST работает! Создана подписка`)
      if (createResponse.data?.subscription?.id) {
        const subscriptionId = createResponse.data.subscription.id
        console.log(`   🆔 ID подписки: ${subscriptionId}`)

        // Сразу удаляем тестовую подписку
        try {
          const deleteResponse = await axios.delete(
            `${CORRECT_URL}/api/competitor-subscriptions/${subscriptionId}`,
            {
              timeout: 5000,
              validateStatus: () => true,
            }
          )
          console.log(
            `   🗑️ Тестовая подписка удалена: ${deleteResponse.status}`
          )
        } catch (e) {
          console.log(`   ⚠️ Не удалось удалить тестовую подписку`)
        }
      }
    } else {
      console.log(`   ❌ POST не работает: ${createResponse.status}`)
      if (createResponse.data) {
        console.log(
          `   📊 Ответ:`,
          JSON.stringify(createResponse.data, null, 2).substring(0, 200)
        )
      }
    }
  } catch (error) {
    console.log(`   🔴 POST ошибка: ${error.message}`)
  }

  // 5. Тестируем POST video generation
  console.log('\n🎥 Шаг 5: Тестирование POST video generation...')
  try {
    const videoResponse = await axios.post(
      `${CORRECT_URL}/generate/text-to-video`,
      {
        prompt: 'Test video generation from correct server',
        videoModel: 'luma-ai',
        telegram_id: 'test_correct_123',
        username: 'test_user',
        is_ru: false,
        bot_name: 'test_bot',
        duration: 5,
      },
      {
        timeout: 10000,
        validateStatus: () => true,
      }
    )

    console.log(`   📋 POST video generation: ${videoResponse.status}`)
    if (videoResponse.status < 300 && videoResponse.data?.jobId) {
      console.log(`   ✅ Video generation работает!`)
      console.log(`   🆔 Job ID: ${videoResponse.data.jobId}`)

      // Проверим статус этого задания
      setTimeout(async () => {
        try {
          const statusResponse = await axios.get(
            `${CORRECT_URL}/generate/text-to-video/status/${videoResponse.data.jobId}`,
            {
              timeout: 5000,
              validateStatus: () => true,
            }
          )
          console.log(`   📊 Статус задания: ${statusResponse.status}`)
          if (statusResponse.data) {
            console.log(
              `   📈 Job status:`,
              JSON.stringify(statusResponse.data, null, 2).substring(0, 200)
            )
          }
        } catch (e) {
          console.log(`   ⚠️ Не удалось проверить статус задания`)
        }
      }, 2000)
    } else {
      console.log(`   ❌ Video generation не работает: ${videoResponse.status}`)
    }
  } catch (error) {
    console.log(`   🔴 Video generation ошибка: ${error.message}`)
  }

  console.log('\n🎯 === ПРОВЕРКА ЗАВЕРШЕНА ===')
}

checkCorrectServer().catch(console.error)
