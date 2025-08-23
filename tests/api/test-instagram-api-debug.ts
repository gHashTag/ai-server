/**
 * 🔍 ДИАГНОСТИКА INSTAGRAM API
 * Проверяем API ключ и доступность эндпоинтов
 */

import axios from 'axios'

async function debugInstagramAPI() {
  console.log('🔍 === ДИАГНОСТИКА INSTAGRAM API ===\n')

  const apiKey =
    process.env.RAPIDAPI_INSTAGRAM_KEY ||
    'da6f54ca68mshc06984da37c569bp1743f1jsne4c79beeb969'
  const host =
    process.env.RAPIDAPI_INSTAGRAM_HOST ||
    'real-time-instagram-scraper-api1.p.rapidapi.com'
  const baseUrl = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'

  console.log('🔧 Конфигурация:')
  console.log(
    `   🔑 API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(
      apiKey.length - 10
    )}`
  )
  console.log(`   🌐 Host: ${host}`)
  console.log(`   📡 Base URL: ${baseUrl}`)

  // Тест 1: Проверим базовый эндпоинт
  console.log('\n🎯 Тест 1: Проверка доступности API...')
  try {
    const healthResponse = await axios.get(`${baseUrl}/`, {
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
      },
      timeout: 10000,
    })
    console.log('✅ Базовый эндпоинт доступен:', healthResponse.status)
  } catch (error: any) {
    console.log(
      '⚠️ Базовый эндпоинт недоступен:',
      error.response?.status || error.message
    )
  }

  // Тест 2: Попробуем простой эндпоинт - получить информацию о пользователе
  console.log('\n👤 Тест 2: Получение информации о пользователе...')
  try {
    const userResponse = await axios.get(`${baseUrl}/v1/user_info`, {
      params: {
        username_or_id: 'instagram', // Официальный аккаунт Instagram
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    })
    console.log('✅ User info API работает:', userResponse.status)
    console.log(
      '📊 Пример ответа:',
      JSON.stringify(userResponse.data, null, 2).substring(0, 500) + '...'
    )
  } catch (error: any) {
    console.log(
      '❌ User info API error:',
      error.response?.status,
      error.response?.data || error.message
    )

    if (error.response?.status === 403) {
      console.log('🔒 403 Forbidden - возможные причины:')
      console.log('   1. Неверный API ключ')
      console.log('   2. API ключ не активирован для этого эндпоинта')
      console.log('   3. Превышен лимит запросов')
      console.log('   4. Неправильный хост')
    }
  }

  // Тест 3: Попробуем список доступных эндпоинтов
  console.log('\n📋 Тест 3: Проверка доступных эндпоинтов...')
  const endpoints = [
    '/v1/user_info',
    '/v1/user_reels',
    '/v1/similar_users_v2',
    '/v1/user_posts',
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Проверяем ${endpoint}...`)
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        params: {
          username_or_id: 'instagram',
          count: 1,
        },
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': host,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
      console.log(`✅ ${endpoint}: доступен (${response.status})`)
    } catch (error: any) {
      const status = error.response?.status
      const message = error.response?.data?.message || error.message
      console.log(`❌ ${endpoint}: недоступен (${status}) - ${message}`)
    }
  }

  // Тест 4: Проверим headers ответа
  console.log('\n📊 Тест 4: Анализ Rate Limits...')
  try {
    const response = await axios.get(`${baseUrl}/v1/user_info`, {
      params: {
        username_or_id: 'instagram',
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
      },
      timeout: 10000,
    })

    console.log('🔍 Rate Limit Headers:')
    console.log(
      `   x-ratelimit-limit: ${
        response.headers['x-ratelimit-limit'] || 'не указан'
      }`
    )
    console.log(
      `   x-ratelimit-remaining: ${
        response.headers['x-ratelimit-remaining'] || 'не указан'
      }`
    )
    console.log(
      `   x-ratelimit-reset: ${
        response.headers['x-ratelimit-reset'] || 'не указан'
      }`
    )
  } catch (error: any) {
    console.log(
      '❌ Не удалось получить rate limit info:',
      error.response?.status
    )
  }

  // Тест 5: Альтернативные тестовые аккаунты
  console.log('\n🧪 Тест 5: Альтернативные аккаунты...')
  const testAccounts = ['instagram', 'cristiano', 'arianagrande', 'therock']

  for (const account of testAccounts) {
    try {
      console.log(`\n👤 Тестируем аккаунт: ${account}`)
      const response = await axios.get(`${baseUrl}/v1/user_reels`, {
        params: {
          username_or_id: account,
          count: 3,
        },
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': host,
        },
        timeout: 15000,
      })

      console.log(`✅ ${account}: успех (${response.status})`)
      if (response.data?.data?.items) {
        console.log(`   📹 Найдено рилз: ${response.data.data.items.length}`)
      }

      // Выходим после первого успешного теста
      console.log('\n🎉 Найден рабочий API эндпоинт!')
      break
    } catch (error: any) {
      console.log(
        `❌ ${account}: ошибка (${error.response?.status}) - ${
          error.response?.data?.message || error.message
        }`
      )
    }

    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n📋 === ЗАКЛЮЧЕНИЕ ===')
  console.log('Если все тесты показывают 403 ошибку:')
  console.log('1. 🔄 Проверь актуальность API ключа на RapidAPI')
  console.log('2. 💳 Убедись что подписка активна')
  console.log('3. 📊 Проверь лимиты запросов')
  console.log('4. 🌐 Попробуй другой хост или эндпоинт')
  console.log('')
  console.log('Если есть успешные ответы - API работает!')
}

// Экспортируем переменные и запускаем
process.env.RAPIDAPI_INSTAGRAM_KEY =
  'da6f54ca68mshc06984da37c569bp1743f1jsne4c79beeb969'
process.env.RAPIDAPI_INSTAGRAM_HOST =
  'real-time-instagram-scraper-api1.p.rapidapi.com'

debugInstagramAPI()
  .then(() => {
    console.log('\n🏁 Диагностика завершена')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Диагностика провалена:', error.message)
    process.exit(1)
  })
