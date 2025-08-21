/**
 * Тест Instagram API с разными пользователями
 */

const axios = require('axios')

async function testWithDifferentUsers() {
  console.log('🔍 Тестируем Instagram API с разными пользователями...')

  const API_KEY = 'da6f54ca68mshc06984da37c569bp1743f1jsne4c79beeb969'
  const HOST = 'real-time-instagram-scraper-api1.p.rapidapi.com'
  const BASE_URL = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'

  // Популярные аккаунты для тестирования
  const testUsers = [
    'cristiano', // Криштиану Роналду
    'kyliejenner', // Кайли Дженнер
    'selenagomez', // Селена Гомес
    'kimkardashian', // Ким Кардашьян
    'arianagrande', // Ариана Гранде
  ]

  for (const username of testUsers) {
    console.log(`\n🔍 Ищем похожих пользователей для @${username}...`)

    try {
      const response = await axios.get(`${BASE_URL}/v1/similar_users_v2`, {
        params: {
          username_or_id: username,
          count: 5,
        },
        headers: {
          'x-rapidapi-key': API_KEY,
          'x-rapidapi-host': HOST,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      })

      console.log(`✅ API Response для @${username}:`, response.status)
      console.log('- Status:', response.data?.status)
      console.log('- Message:', response.data?.message || 'No message')

      if (response.data?.data && typeof response.data.data !== 'string') {
        const users = response.data.data.users
        if (users && users.length > 0) {
          console.log(
            `🎉 SUCCESS! Найдено ${users.length} похожих пользователей для @${username}`
          )

          console.log('🎯 Реальные конкуренты:')
          users.slice(0, 3).forEach((user, index) => {
            const verified = user.is_verified ? '✅' : '❌'
            console.log(
              `${index + 1}. @${user.username} - ${
                user.full_name || 'No name'
              } ${verified}`
            )
          })

          // НАЙДЕН РАБОЧИЙ ПОЛЬЗОВАТЕЛЬ! Запускаем полноценный парсинг
          console.log(
            `\n🚀 ОТЛИЧНО! @${username} работает. Запускаем полный парсинг...`
          )
          return await runFullScraping(username, users)
        }
      } else if (typeof response.data?.data === 'string') {
        console.log(`⚠️ API Error для @${username}:`, response.data.data)
      }

      // Добавляем задержку между запросами
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`❌ Ошибка для @${username}:`, error.message)
      if (error.response?.status === 429) {
        console.log('⏳ Rate limit, ждём 5 секунд...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  console.log('\n❌ Не удалось найти подходящий аккаунт для парсинга')
  return false
}

async function runFullScraping(targetUser, similarUsers) {
  console.log(`\n🔥 ЗАПУСКАЕМ ПОЛНЫЙ ПАРСИНГ для @${targetUser}`)

  // Теперь запустим реальную Inngest функцию с этими данными
  const { Inngest } = require('inngest')
  const inngest = new Inngest({ id: 'real-scraper-app' })

  try {
    const result = await inngest.send({
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: targetUser,
        project_id: 1,
        max_users: 10,
        max_reels_per_user: 5,
        scrape_reels: true,
        requester_telegram_id: 'real_client_123',
      },
    })

    console.log('✅ Полный парсинг запущен в Inngest:', result.ids[0])
    return true
  } catch (error) {
    console.error('❌ Ошибка запуска полного парсинга:', error.message)
    return false
  }
}

// Запускаем тест
if (require.main === module) {
  testWithDifferentUsers()
    .then(success => {
      if (success) {
        console.log('\n🎉 Реальный парсинг Instagram запущен успешно!')
        console.log(
          '📊 Проверьте базу данных через 1-2 минуты для результатов.'
        )
      } else {
        console.log('\n❌ Не удалось запустить реальный парсинг.')
      }
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 Критическая ошибка:', error)
      process.exit(1)
    })
}

module.exports = { testWithDifferentUsers }
