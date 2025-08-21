/**
 * Тестирование API вызова similar_users_v2 для vyacheslav_nekludov
 * Проверяем правильный username (с буквой "v" в начале)
 */

require('dotenv').config()
const axios = require('axios')

async function testSimilarUsersAPI() {
  console.log('🔍 Тестирование API вызова similar_users_v2...\n')

  // Конфигурация API (из кода InstagramAPI класса)
  const config = {
    apiKey: process.env.RAPIDAPI_INSTAGRAM_KEY,
    host:
      process.env.RAPIDAPI_INSTAGRAM_HOST ||
      'real-time-instagram-scraper-api1.p.rapidapi.com',
    baseUrl: 'https://real-time-instagram-scraper-api1.p.rapidapi.com',
  }

  // Тестируем оба username
  const testCases = [
    {
      name: 'ПРАВИЛЬНЫЙ целевой пользователь',
      username_or_id: 'vyacheslav_nekludov', // ИСПРАВЛЕНО: добавлена буква "v"
      count: 30,
    },
    {
      name: 'Неправильный (старый) пользователь',
      username_or_id: 'yacheslav_nekludov', // без "v" - должен дать ошибку
      count: 5,
    },
    {
      name: 'Контрольный рабочий пользователь',
      username_or_id: 'treff_8',
      count: 5,
    },
  ]

  console.log('⚙️ Конфигурация:')
  console.log(
    `   API Key: ${
      config.apiKey ? config.apiKey.substring(0, 15) + '...' : 'НЕ НАЙДЕН'
    }`
  )
  console.log(`   Host: ${config.host}`)
  console.log(`   Base URL: ${config.baseUrl}\n`)

  if (!config.apiKey) {
    console.error('❌ RAPIDAPI_INSTAGRAM_KEY не найден!')
    return
  }

  for (const testCase of testCases) {
    console.log(`\n🧪 Тестируем: ${testCase.name}`)
    console.log(`   Target: ${testCase.username_or_id}`)
    console.log(`   Count: ${testCase.count}`)

    try {
      console.log('📞 Выполняем API вызов...')

      // Точно такой же запрос как в instagramScraper-v2.ts
      const response = await axios.get(
        `${config.baseUrl}/v1/similar_users_v2`,
        {
          params: {
            username_or_id: testCase.username_or_id,
            count: testCase.count,
          },
          headers: {
            'x-rapidapi-key': config.apiKey,
            'x-rapidapi-host': config.host,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      )

      console.log('✅ API ответ получен!')
      console.log('📊 Статус:', response.status)
      console.log('📋 Headers:', {
        'x-ratelimit-remaining': response.headers['x-ratelimit-remaining'],
        'x-ratelimit-limit': response.headers['x-ratelimit-limit'],
        'content-type': response.headers['content-type'],
      })

      console.log('\n🔍 Анализ ответа:')
      console.log('   Тип response.data:', typeof response.data)

      if (response.data) {
        console.log('   Ключи верхнего уровня:', Object.keys(response.data))

        // Проверяем структуру как в Zod схеме
        if (response.data.success !== undefined) {
          console.log('   success:', response.data.success)
        }

        if (response.data.status) {
          console.log('   status:', response.data.status)
        }

        if (response.data.message) {
          console.log('   message:', response.data.message)
        }

        if (response.data.data) {
          console.log('   data тип:', typeof response.data.data)

          if (typeof response.data.data === 'string') {
            console.log(
              '   ❌ data является строкой (ошибка API):',
              response.data.data
            )
          } else if (response.data.data.users) {
            console.log(
              '   ✅ data.users найдено, количество:',
              response.data.data.users.length
            )

            // Показываем первого пользователя как пример
            if (response.data.data.users.length > 0) {
              console.log('   📋 Первый пользователь:', {
                pk: response.data.data.users[0].pk,
                username: response.data.data.users[0].username,
                full_name: response.data.data.users[0].full_name,
                is_verified: response.data.data.users[0].is_verified,
                is_private: response.data.data.users[0].is_private,
              })
            }
          } else {
            console.log('   ❌ data.users не найдено')
          }
        } else {
          console.log('   ❌ data поле не найдено')
        }
      }

      // Краткий вывод результата
      if (response.data.status === 'ok') {
        console.log(`\n🎉 УСПЕХ для ${testCase.username_or_id}!`)
      } else {
        console.log(
          `\n❌ ОШИБКА для ${testCase.username_or_id}: ${response.data.message}`
        )
      }
    } catch (error) {
      console.error('❌ Ошибка API вызова:', error.message)

      if (error.response) {
        console.error('   Статус:', error.response.status)
        console.error('   Статус текст:', error.response.statusText)
        console.error('   Данные ошибки:', error.response.data)
      } else if (error.request) {
        console.error('   Запрос был отправлен, но ответа не получено')
      } else {
        console.error('   Ошибка настройки запроса:', error.message)
      }
    }

    // Небольшая задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n🎯 Заключение:')
  console.log('   Правильный username: vyacheslav_nekludov (с буквой "v")')
  console.log('   Неправильный username: yacheslav_nekludov (без буквы "v")')
}

// Запускаем тест
testSimilarUsersAPI().catch(console.error)
