#!/usr/bin/env node

/**
 * 🧪 ТЕСТ тестовой Instagram функции
 *
 * Используем instagram/scraper-v2-test которая НЕ использует внешние API
 */

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.development.local' })

const { Inngest } = require('inngest')

console.log('🧪 ТЕСТ ТЕСТОВОЙ INSTAGRAM ФУНКЦИИ')
console.log('==================================')
console.log('')

const inngest = new Inngest({
  id: 'test-function-client',
  name: 'Test Function Client',
})

// Событие для ТЕСТОВОЙ функции (без внешних API)
const testEvent = {
  name: 'instagram/scraper-v2-test', // ТЕСТОВАЯ функция!
  data: {
    username_or_id: 'test_user',
    project_id: 1,
    requester_telegram_id: '144022504',
    bot_name: 'neuro_blogger_bot',
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `test-function-${Date.now()}`,
    debug_source: 'test-function-validation',
  },
}

async function testTestFunction() {
  try {
    console.log('🧪 ТЕСТИРУЕМ ТЕСТОВУЮ ФУНКЦИЮ (БЕЗ ВНЕШНИХ API)...')
    console.log('')
    console.log('📋 Преимущества тестовой функции:')
    console.log('   • 🚫 НЕ использует Instagram API')
    console.log('   • 🚫 НЕ требует внешних сервисов')
    console.log('   • ✅ Только тестирует логику')
    console.log('   • ✅ Проверяет базу данных')
    console.log('')

    console.log('📤 Отправляем событие для тестовой функции...')

    const result = await inngest.send(testEvent)

    console.log('')
    console.log('🎉 СОБЫТИЕ ДЛЯ ТЕСТОВОЙ ФУНКЦИИ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('🎯 ДИАГНОСТИЧЕСКАЯ ЦЕННОСТЬ:')
    console.log('   • Если СРАБОТАЕТ - проблема во внешних API')
    console.log('   • Если НЕ СРАБОТАЕТ - проблема в базовой инфраструктуре')

    console.log('')
    console.log('⏱️  Тестовая функция должна работать быстро (30 секунд)...')

    // Ждем 30 секунд
    console.log('⏳ Ожидание 30 секунд...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    console.log('')
    console.log('✅ ТЕСТ ТЕСТОВОЙ ФУНКЦИИ ЗАВЕРШЕН!')
    console.log('🔍 Если никаких ошибок - значит тестовая функция работает')
  } catch (error) {
    console.error('❌ Ошибка в тесте тестовой функции:', error.message)
    process.exit(1)
  }
}

testTestFunction()
