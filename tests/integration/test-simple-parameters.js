#!/usr/bin/env node

/**
 * 🧪 ТЕСТ с простыми параметрами
 *
 * Минимальные параметры чтобы найти где падает функция
 */

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.development.local' })

// Импортируем Inngest client
const { Inngest } = require('inngest')

console.log('🧪 ТЕСТ С ПРОСТЫМИ ПАРАМЕТРАМИ')
console.log('==============================')
console.log('')

// Создаем Inngest client
const inngest = new Inngest({
  id: 'simple-test-client',
  name: 'Simple Test Client',
})

// МАКСИМАЛЬНО простые параметры
const simpleEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'cristiano', // Популярный аккаунт
    project_id: 1, // Простой ID
    max_users: 1, // Минимальное количество
    max_reels_per_user: 0, // БЕЗ рилсов!
    scrape_reels: false, // БЕЗ рилсов!
    requester_telegram_id: '144022504', // Пользователь
    bot_name: 'neuro_blogger_bot', // Бот
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `simple-test-${Date.now()}`,
    debug_source: 'simple-parameters-test',
  },
}

async function testSimpleParameters() {
  try {
    console.log('🧪 ТЕСТИРУЕМ ПРОСТЫЕ ПАРАМЕТРЫ...')
    console.log('')
    console.log('📋 Упрощения:')
    console.log(
      `   • 🎯 Популярный аккаунт: @${simpleEvent.data.username_or_id}`
    )
    console.log(`   • 🔢 Simple project_id: ${simpleEvent.data.project_id}`)
    console.log(`   • 👥 Минимум конкурентов: ${simpleEvent.data.max_users}`)
    console.log(`   • 🎬 БЕЗ рилсов: ${simpleEvent.data.scrape_reels}`)
    console.log(`   • 📱 User ID: ${simpleEvent.data.requester_telegram_id}`)
    console.log('')

    console.log('📤 Отправляем упрощенное событие...')

    // Отправляем упрощенное событие
    const result = await inngest.send(simpleEvent)

    console.log('')
    console.log('🎉 ПРОСТОЕ СОБЫТИЕ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('🎯 УПРОЩЕННЫЙ ТЕСТ:')
    console.log('   • Если СРАБОТАЕТ - проблема в сложных параметрах')
    console.log('   • Если НЕ СРАБОТАЕТ - проблема в базовой логике')

    console.log('')
    console.log('⏱️  Ждем результат (2 минуты)...')
  } catch (error) {
    console.error('❌ Ошибка в простом тесте:', error.message)
    process.exit(1)
  }
}

// Запускаем упрощенный тест
testSimpleParameters()
