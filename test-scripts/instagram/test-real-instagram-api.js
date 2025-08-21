/**
 * Тест реальных Instagram API ключей
 */

const axios = require('axios')

async function testRealInstagramAPI() {
  console.log('🔍 Тестируем реальные Instagram API ключи...')

  const API_KEY = process.env.RAPIDAPI_INSTAGRAM_KEY || 'your-rapidapi-key-here'
  const HOST = 'real-time-instagram-scraper-api1.p.rapidapi.com'
  const BASE_URL = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'

  console.log('API Key:', API_KEY.substring(0, 10) + '...')
  console.log('Host:', HOST)

  try {
    // Тестируем поиск похожих пользователей для популярного аккаунта
    console.log('\n🔍 Ищем похожих пользователей для @instagram...')

    const response = await axios.get(`${BASE_URL}/v1/similar_users_v2`, {
      params: {
        username_or_id: 'instagram',
        count: 10,
      },
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': HOST,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    console.log('✅ API Response Status:', response.status)
    console.log('📊 Response Data Structure:')
    console.log('- Status:', response.data?.status)
    console.log('- Message:', response.data?.message)

    if (response.data?.data) {
      if (typeof response.data.data === 'string') {
        console.log('❌ API Error Response:', response.data.data)
        return false
      }

      const users = response.data.data.users
      console.log(`🎉 SUCCESS! Found ${users?.length || 0} similar users`)

      if (users && users.length > 0) {
        console.log('\n🎯 Примеры реальных конкурентов:')
        users.slice(0, 3).forEach((user, index) => {
          const verified = user.is_verified ? '✅' : '❌'
          console.log(
            `${index + 1}. @${user.username} - ${user.full_name} ${verified}`
          )
          console.log(`   PK: ${user.pk}, Private: ${user.is_private}`)
        })
        return true
      }
    }

    console.log('⚠️ No users found in response')
    return false
  } catch (error) {
    console.error('❌ API Error:', error.message)
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Response:', error.response.data)
    }
    return false
  }
}

// Запускаем тест
if (require.main === module) {
  testRealInstagramAPI()
    .then(success => {
      if (success) {
        console.log(
          '\n🎉 API ключи работают! Можно запускать реальный парсинг.'
        )
      } else {
        console.log('\n❌ Проблемы с API ключами или сервисом.')
      }
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 Критическая ошибка:', error)
      process.exit(1)
    })
}

module.exports = { testRealInstagramAPI }
