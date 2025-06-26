/**
 * Диагностический скрипт для анализа ответа Instagram API
 * Поможет понять почему валидация падает с ошибкой "Expected object, received string"
 */

require('dotenv').config()
const axios = require('axios')

async function debugInstagramAPI() {
  console.log('🔍 Диагностика ответа Instagram API...\n')

  const config = {
    apiKey: process.env.RAPIDAPI_INSTAGRAM_KEY,
    host:
      process.env.RAPIDAPI_INSTAGRAM_HOST ||
      'real-time-instagram-scraper-api1.p.rapidapi.com',
    baseUrl: 'https://real-time-instagram-scraper-api1.p.rapidapi.com',
  }

  console.log('⚙️ Конфигурация:')
  console.log(
    `   API Key: ${
      config.apiKey ? config.apiKey.substring(0, 10) + '...' : 'НЕ НАЙДЕН'
    }`
  )
  console.log(`   Host: ${config.host}`)
  console.log(`   Base URL: ${config.baseUrl}\n`)

  if (!config.apiKey) {
    console.error('❌ API ключ не найден!')
    return
  }

  try {
    console.log('📞 Вызов Similar Users API...')
    const response = await axios.get(`${config.baseUrl}/v1/similar_users_v2`, {
      params: {
        username_or_id: 'treff_8',
        count: 3,
      },
      headers: {
        'x-rapidapi-key': config.apiKey,
        'x-rapidapi-host': config.host,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    console.log('✅ API ответ получен!')
    console.log('📊 Статус ответа:', response.status)
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2))

    console.log('\n🔍 Анализ структуры ответа:')
    console.log('   Тип response.data:', typeof response.data)
    console.log('   Конструктор:', response.data.constructor.name)

    if (typeof response.data === 'string') {
      console.log('⚠️ ПРОБЛЕМА: response.data это строка, а не объект!')
      console.log('📄 Содержимое строки (первые 500 символов):')
      console.log(response.data.substring(0, 500))

      try {
        const parsed = JSON.parse(response.data)
        console.log('✅ Строка успешно парсится как JSON')
        console.log('📊 Тип после парсинга:', typeof parsed)
        console.log('🔑 Ключи верхнего уровня:', Object.keys(parsed))

        if (parsed.data) {
          console.log('🔑 Ключи в parsed.data:', Object.keys(parsed.data))
        }
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError.message)
      }
    } else {
      console.log('✅ response.data это объект')
      console.log('🔑 Ключи верхнего уровня:', Object.keys(response.data))

      if (response.data.data) {
        console.log(
          '🔑 Ключи в response.data.data:',
          Object.keys(response.data.data)
        )
      }
    }

    console.log('\n📄 Полная структура ответа (первые 1000 символов):')
    console.log(JSON.stringify(response.data, null, 2).substring(0, 1000))
  } catch (error) {
    console.error('❌ Ошибка API вызова:', error.message)

    if (error.response) {
      console.log('📊 Статус ошибки:', error.response.status)
      console.log(
        '📋 Headers ошибки:',
        JSON.stringify(error.response.headers, null, 2)
      )
      console.log('📄 Данные ошибки:', error.response.data)
    }
  }
}

debugInstagramAPI().catch(console.error)
