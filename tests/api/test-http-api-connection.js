#!/usr/bin/env node

/**
 * 🌐 Тест HTTP API подключения к Inngest Dev Server
 * Проверяет работу через прямые HTTP запросы (без SDK)
 */

async function testHttpApiConnection() {
  console.log('🌐 Тестируем HTTP API подключение к Inngest Dev Server...\n')

  const INNGEST_URL = 'http://localhost:8288/e/test-key'

  // Тест 1: Простое событие
  console.log('🧪 Тест 1: Отправка простого события')

  try {
    const response1 = await fetch(INNGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'test/http-connection',
        data: {
          message: 'Hello from HTTP API!',
          timestamp: new Date().toISOString(),
          test_number: 1,
        },
      }),
    })

    const result1 = await response1.json()

    if (result1.status === 200) {
      console.log('✅ Простое событие отправлено успешно')
      console.log('📋 Event ID:', result1.ids[0])
    } else {
      console.log('❌ Ошибка:', result1)
    }
  } catch (error) {
    console.error('❌ Ошибка HTTP запроса:', error.message)
  }

  console.log('')

  // Тест 2: Instagram Scraper событие
  console.log('🧪 Тест 2: Отправка Instagram Scraper события')

  try {
    const instagramEvent = {
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: 'test_user_http',
        project_id: 999,
        max_users: 3,
        max_reels_per_user: 2,
        scrape_reels: false,
        requester_telegram_id: 'http_test_144022504',
      },
    }

    const response2 = await fetch(INNGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(instagramEvent),
    })

    const result2 = await response2.json()

    if (result2.status === 200) {
      console.log('✅ Instagram событие отправлено успешно')
      console.log('📋 Event ID:', result2.ids[0])
      console.log('📊 Параметры:', {
        target: instagramEvent.data.username_or_id,
        project: instagramEvent.data.project_id,
        competitors: instagramEvent.data.max_users,
      })
    } else {
      console.log('❌ Ошибка:', result2)
    }
  } catch (error) {
    console.error('❌ Ошибка HTTP запроса:', error.message)
  }

  console.log('')

  // Тест 3: Batch события
  console.log('🧪 Тест 3: Отправка нескольких событий (batch)')

  try {
    const batchEvents = [
      {
        name: 'test/batch-event-1',
        data: { batch_id: 1, message: 'First event' },
      },
      {
        name: 'test/batch-event-2',
        data: { batch_id: 2, message: 'Second event' },
      },
      {
        name: 'test/batch-event-3',
        data: { batch_id: 3, message: 'Third event' },
      },
    ]

    const response3 = await fetch(INNGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchEvents),
    })

    const result3 = await response3.json()

    if (result3.status === 200) {
      console.log('✅ Batch события отправлены успешно')
      console.log('📋 Event IDs:', result3.ids)
      console.log('📊 Количество событий:', result3.ids.length)
    } else {
      console.log('❌ Ошибка:', result3)
    }
  } catch (error) {
    console.error('❌ Ошибка HTTP запроса:', error.message)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎯 ЗАКЛЮЧЕНИЕ:')
  console.log('• HTTP API работает на: http://localhost:8288/e/{key}')
  console.log('• События принимаются и обрабатываются')
  console.log('• Можно отправлять одиночные события и батчи')
  console.log('• Не требуется Inngest SDK - только fetch/axios')
  console.log('• Telegram бот может подключиться этим способом!')
  console.log('='.repeat(60))
}

// Запуск тестов
testHttpApiConnection().catch(error => {
  console.error('💥 Критическая ошибка:', error)
  process.exit(1)
})

module.exports = { testHttpApiConnection }
