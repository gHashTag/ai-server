#!/usr/bin/env node

/**
 * 🔗 ПРЯМОЙ ТЕСТ Instagram API
 * Тестирует API напрямую без Inngest
 */

require('dotenv').config({ path: '.env' })
const axios = require('axios')

async function testInstagramAPIDirect() {
  console.log('🔗 ПРЯМОЙ ТЕСТ INSTAGRAM API')
  console.log('============================')
  console.log('')

  const apiKey = process.env.RAPIDAPI_INSTAGRAM_KEY
  const host = 'real-time-instagram-scraper-api1.p.rapidapi.com'
  const baseUrl = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'

  console.log(
    `🔑 API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : '❌ НЕ НАЙДЕН'}`
  )
  console.log(`🏠 Host: ${host}`)
  console.log(`🌐 Base URL: ${baseUrl}`)
  console.log('')

  try {
    console.log('📡 Запрос к Instagram API для @cristiano...')

    const response = await axios.get(`${baseUrl}/v1/similar_users_v2`, {
      params: {
        username_or_id: 'cristiano',
        count: 3,
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    console.log('✅ API УСПЕШНО ОТВЕТИЛ!')
    console.log(`📊 Status: ${response.status}`)
    console.log(`📋 Response data type: ${typeof response.data}`)

    if (response.data && response.data.data && response.data.data.users) {
      console.log(
        `👥 Найдено пользователей: ${response.data.data.users.length}`
      )
      console.log('')
      console.log('📋 Первые 3 пользователя:')
      response.data.data.users.slice(0, 3).forEach((user, i) => {
        console.log(
          `   ${i + 1}. @${user.username} (${user.full_name || 'Без имени'})`
        )
      })
    } else {
      console.log('⚠️ Неожиданная структура ответа:')
      console.log(JSON.stringify(response.data, null, 2))
    }

    console.log('')
    console.log('🎯 РЕЗУЛЬТАТ: Instagram API РАБОТАЕТ!')
    console.log('   • Если Instagram API работает, но функция нет')
    console.log('   • Значит проблема в коде Instagram функции')
    console.log('   • Нужно добавить детальные логи в функцию')
  } catch (error) {
    console.error('❌ ОШИБКА INSTAGRAM API!')
    console.error(`Тип ошибки: ${error.code || 'Неизвестно'}`)
    console.error(`Сообщение: ${error.message}`)

    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`)
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`)
    }

    console.log('')
    console.log('🎯 РЕЗУЛЬТАТ: Instagram API НЕ РАБОТАЕТ!')
    console.log('   • Проблема в API ключе или rate limiting')
    console.log('   • Instagram функция падает на API запросе')
  }
}

testInstagramAPIDirect()
