#!/usr/bin/env node

/**
 * 🔥 ПРОВЕРЕННЫЙ ТЕСТ: Отправка архива пользователю 144022504
 *
 * Использует аккаунт, который точно работает для демонстрации функции
 */

const BASE_URL = 'http://localhost:8288/e/working-test-client'

console.log('🔥 ПРОВЕРЕННЫЙ ТЕСТ: Отправка архива пользователю 144022504')
console.log('=============================================================')

// Используем проверенный аккаунт
const workingTestEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov', // 🔧 ПРОВЕРЕННЫЙ аккаунт (работал ранее)
    project_id: 37,
    max_users: 4, // Умеренное количество
    max_reels_per_user: 2, // Небольшое количество рилсов
    scrape_reels: true,
    requester_telegram_id: '144022504', // 🎯 РЕАЛЬНЫЙ пользователь
    bot_name: 'neuro_blogger_bot',
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `working-test-${Date.now()}`,
    debug_source: 'working-account-delivery-test',
  },
}

async function sendWorkingTestEvent() {
  try {
    console.log('🚀 Запускаем тест с ПРОВЕРЕННЫМ аккаунтом...')
    console.log('')
    console.log('📋 Параметры ПРОВЕРЕННОГО теста:')
    console.log(
      `   • 🎯 Target: @${workingTestEvent.data.username_or_id} (проверенный аккаунт)`
    )
    console.log(
      `   • 👥 Competitors: ${workingTestEvent.data.max_users} аккаунтов`
    )
    console.log(
      `   • 🎬 Reels: ${workingTestEvent.data.max_reels_per_user} на каждого`
    )
    console.log(
      `   • 📱 User ID: ${workingTestEvent.data.requester_telegram_id}`
    )
    console.log(`   • 🤖 Bot: ${workingTestEvent.data.bot_name}`)
    console.log(`   • 🌍 Language: ${workingTestEvent.data.language}`)

    console.log('')
    console.log('📤 Отправляем проверенное событие...')

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workingTestEvent),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('')
    console.log('✅ ПРОВЕРЕННОЕ событие успешно отправлено!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⏳ Что происходит (с проверенным аккаунтом):')
    console.log(
      `   1. 🔍 Анализ @${workingTestEvent.data.username_or_id} через Instagram API`
    )
    console.log('   2. 👥 Поиск 4 конкурентов (умеренное количество)')
    console.log('   3. 🎬 Анализ 2 рилсов каждого (быстрее)')
    console.log('   4. 📊 Создание HTML отчета')
    console.log('   5. 📈 Генерация Excel файла')
    console.log('   6. 📦 Упаковка в ZIP архив')
    console.log('   7. 📱 ОТПРАВКА URL пользователю 144022504!')

    console.log('')
    console.log('📱 Ожидаемый результат:')
    console.log('   • Сообщение в Telegram для пользователя 144022504')
    console.log('   • Статистика анализа конкурентов')
    console.log('   • Ссылка для скачивания архива')
    console.log('   • Архив с HTML + Excel + README')

    console.log('')
    console.log('🔍 Мониторинг:')
    console.log('   📊 Dashboard: http://localhost:8288/functions')
    console.log(`   🆔 Event ID: ${result.ids?.[0] || 'unknown'}`)
    console.log('   ⏱️  Время: ~1-2 минуты (быстрее чем @cristiano)')

    console.log('')
    console.log('🎯 НАЧИНАЕМ ПРОВЕРЕННЫЙ ТЕСТ!')
  } catch (error) {
    console.error('❌ Ошибка при запуске проверенного теста:', error.message)
    process.exit(1)
  }
}

// Запускаем проверенный тест
sendWorkingTestEvent()
