#!/usr/bin/env node

/**
 * 🔧 МИНИМАЛЬНЫЙ ТЕСТ: Только поиск конкурентов БЕЗ рилсов
 *
 * Диагностика - убираем рилсы чтобы найти проблему
 */

const BASE_URL = 'http://localhost:8288/e/minimal-test-client'

console.log('🔧 МИНИМАЛЬНЫЙ ТЕСТ: БЕЗ рилсов для пользователя 144022504')
console.log('=============================================================')

// МИНИМАЛЬНЫЙ тест - только конкуренты
const minimalTestEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov',
    project_id: 37,
    max_users: 2, // Только 2 конкурента
    max_reels_per_user: 0, // ❌ БЕЗ рилсов
    scrape_reels: false, // ❌ БЕЗ рилсов
    requester_telegram_id: '144022504',
    bot_name: 'neuro_blogger_bot',
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `minimal-test-${Date.now()}`,
    debug_source: 'minimal-no-reels-test',
  },
}

async function sendMinimalTestEvent() {
  try {
    console.log('🔧 Запускаем МИНИМАЛЬНЫЙ тест...')
    console.log('')
    console.log('📋 Параметры МИНИМАЛЬНОГО теста:')
    console.log(`   • 🎯 Target: @${minimalTestEvent.data.username_or_id}`)
    console.log(
      `   • 👥 Competitors: ${minimalTestEvent.data.max_users} (минимум)`
    )
    console.log(
      `   • 🎬 Reels: ${minimalTestEvent.data.max_reels_per_user} (БЕЗ рилсов!)`
    )
    console.log(
      `   • 📱 User ID: ${minimalTestEvent.data.requester_telegram_id}`
    )
    console.log(`   • 🤖 Bot: ${minimalTestEvent.data.bot_name}`)

    console.log('')
    console.log('📤 Отправляем минимальное событие...')

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalTestEvent),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('')
    console.log('✅ МИНИМАЛЬНОЕ событие успешно отправлено!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⏳ Что происходит (МИНИМАЛЬНЫЙ тест):')
    console.log('   1. 🔍 Анализ базового аккаунта')
    console.log('   2. 👥 Поиск только 2 конкурентов')
    console.log('   3. ❌ БЕЗ анализа рилсов (быстрее)')
    console.log('   4. 📊 Создание простого HTML отчета')
    console.log('   5. 📈 Генерация базового Excel файла')
    console.log('   6. 📦 Упаковка в ZIP')
    console.log('   7. 📱 Отправка URL')

    console.log('')
    console.log('🎯 ЦЕЛЬ: Проверить работает ли базовая функция БЕЗ рилсов')
    console.log('   Если этот тест пройдет - проблема в анализе рилсов')
    console.log('   Если не пройдет - проблема в базовой функции')

    console.log('')
    console.log('🔍 Мониторинг:')
    console.log(`   🆔 Event ID: ${result.ids?.[0] || 'unknown'}`)
    console.log('   ⏱️  Время: ~30-60 секунд (очень быстро)')

    console.log('')
    console.log('🔧 НАЧИНАЕМ МИНИМАЛЬНЫЙ ТЕСТ!')
  } catch (error) {
    console.error('❌ Ошибка при запуске минимального теста:', error.message)
    process.exit(1)
  }
}

// Запускаем минимальный тест
sendMinimalTestEvent()
