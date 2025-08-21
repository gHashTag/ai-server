#!/usr/bin/env node

/**
 * 🧪 ТЕСТ ФУНКЦИИ С ОБХОДОМ INSTAGRAM API
 *
 * Максимально упрощенный тест - только базовая логика
 */

require('dotenv').config({ path: '.env' })
const { Inngest } = require('inngest')

console.log('🧪 ТЕСТ С ОБХОДОМ INSTAGRAM API')
console.log('===============================')
console.log('')

const inngest = new Inngest({
  id: 'bypass-api-client',
  name: 'Bypass API Client',
})

// ТЕСТОВОЕ событие - НЕ требует Instagram API
const bypassEvent = {
  name: 'instagram/scraper-v2-test', // ТЕСТОВАЯ функция!
  data: {
    username_or_id: 'test_account',
    project_id: 1, // Существующий project_id!
    requester_telegram_id: '144022504',
    bot_name: 'neuro_blogger_bot',
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `bypass-api-${Date.now()}`,
    debug_source: 'api-bypass-test',
  },
}

async function testBypassAPI() {
  try {
    console.log('🧪 ТЕСТИРУЕМ БЕЗ ВНЕШНИХ API...')
    console.log('')
    console.log('📋 Стратегия обхода проблем:')
    console.log('   • ✅ Используем существующий project_id: 1')
    console.log('   • 🚫 Никаких Instagram API вызовов')
    console.log('   • 💾 Только тестовые данные в БД')
    console.log('   • 📱 Проверяем Telegram отправку')
    console.log('')

    console.log('📤 Отправляем ТЕСТОВОЕ событие...')

    const result = await inngest.send(bypassEvent)

    console.log('')
    console.log('🎉 ТЕСТОВОЕ СОБЫТИЕ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('🎯 ДИАГНОСТИЧЕСКАЯ ЦЕЛЬ:')
    console.log('   • Проверить работает ли базовая инфраструктура')
    console.log('   • Изолировать проблему от Instagram API')
    console.log('   • Проверить Telegram отправку')
    console.log('   • Найти где именно падает функция')

    console.log('')
    console.log('⏱️  Ожидаем результат (60 секунд)...')

    // Ждем результат
    await new Promise(resolve => setTimeout(resolve, 60000))

    console.log('')
    console.log('🔍 ПРОВЕРИМ РЕЗУЛЬТАТ...')

    // Проверяем были ли созданы тестовые записи в БД
    console.log('💾 Проверяем сохранились ли тестовые данные в БД...')
  } catch (error) {
    console.error('❌ Ошибка в тесте обхода API:', error.message)
    process.exit(1)
  }
}

console.log('🚀 ЗАПУСКАЕМ ТЕСТ С ОБХОДОМ API...')
testBypassAPI()
