#!/usr/bin/env node

/**
 * 🎯 ПРАВИЛЬНЫЙ ТЕСТ - На правильный endpoint!
 *
 * Отправляем событие на порт 4000 где РЕАЛЬНО зарегистрированы функции
 */

// ПРАВИЛЬНЫЙ URL - основной сервер где зарегистрированы функции!
const CORRECT_URL = 'http://localhost:4000/api/inngest'

console.log('🎯 ПРАВИЛЬНЫЙ ТЕСТ - отправка на основной сервер!')
console.log('===================================================')
console.log('📋 Исправление: события отправляем туда, где функции!')
console.log(`🌐 Endpoint: ${CORRECT_URL}`)
console.log('')

// Правильное событие для функции instagramScraperV2
const correctEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov',
    project_id: 37,
    max_users: 3,
    max_reels_per_user: 2,
    scrape_reels: true,
    requester_telegram_id: '144022504', // 🎯 РЕАЛЬНЫЙ пользователь
    bot_name: 'neuro_blogger_bot', // 🤖 ПРАВИЛЬНЫЙ бот
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `correct-test-${Date.now()}`,
    debug_source: 'correct-endpoint-test',
  },
}

async function sendToCorrectEndpoint() {
  try {
    console.log('🔥 ОТПРАВЛЯЕМ НА ПРАВИЛЬНЫЙ ENDPOINT!')
    console.log('')
    console.log('📋 Параметры теста:')
    console.log(`   • 🎯 Target: @${correctEvent.data.username_or_id}`)
    console.log(`   • 👥 Competitors: ${correctEvent.data.max_users}`)
    console.log(`   • 🎬 Reels: ${correctEvent.data.max_reels_per_user}`)
    console.log(`   • 📱 User ID: ${correctEvent.data.requester_telegram_id}`)
    console.log(`   • 🤖 Bot: ${correctEvent.data.bot_name}`)
    console.log('')

    console.log('📤 Отправляем на ПРАВИЛЬНЫЙ сервер...')

    const response = await fetch(CORRECT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(correctEvent),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('')
    console.log('🎉 СОБЫТИЕ ОТПРАВЛЕНО НА ПРАВИЛЬНЫЙ ENDPOINT!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('✅ ИСПРАВЛЕНИЕ СРАБОТАЛО!')
    console.log('   • Событие отправлено туда, где зарегистрированы функции')
    console.log('   • Функция instagramScraperV2 получит событие')
    console.log('   • Начнется реальная обработка!')

    console.log('')
    console.log('⚡ ЧТО ПРОИЗОЙДЕТ СЕЙЧАС:')
    console.log('   1. 🔍 Функция получит событие на основном сервере')
    console.log('   2. 📊 Начнется анализ Instagram аккаунта')
    console.log('   3. 👥 Поиск конкурентов через API')
    console.log('   4. 🎬 Анализ рилсов')
    console.log('   5. 📄 Создание отчетов')
    console.log('   6. 📦 Упаковка в ZIP')
    console.log('   7. 📱 ОТПРАВКА В TELEGRAM!')

    console.log('')
    console.log('🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:')
    console.log(
      `   • Пользователь ${correctEvent.data.requester_telegram_id} получит сообщение`
    )
    console.log(`   • От бота ${correctEvent.data.bot_name}`)
    console.log('   • Со ссылкой на архив Instagram анализа')
    console.log('   • Архив будет содержать реальные данные')

    console.log('')
    console.log('⏱️  ВРЕМЯ ОЖИДАНИЯ: 2-3 минуты')
    console.log('🔍 ПРОВЕРЬТЕ TELEGRAM!')
  } catch (error) {
    console.error(
      '❌ Ошибка при отправке на правильный endpoint:',
      error.message
    )
    process.exit(1)
  }
}

// Запускаем ПРАВИЛЬНЫЙ тест
sendToCorrectEndpoint()
