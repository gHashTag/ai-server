#!/usr/bin/env node

/**
 * 🚀 ТЕСТ INNGEST ФУНКЦИИ для пользователя 144022504
 *
 * Запускаем instagramScraper-v2 через Inngest и ждем результат в Telegram
 */

const BASE_URL = 'http://localhost:8288/e/user-test-client'

console.log('🚀 ТЕСТ INNGEST ФУНКЦИИ для пользователя 144022504')
console.log('==================================================')

// Событие для Inngest функции
const inngestEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov', // Проверенный аккаунт
    project_id: 37,
    max_users: 3, // Небольшое количество для быстроты
    max_reels_per_user: 2, // Минимум рилсов
    scrape_reels: true,
    requester_telegram_id: '144022504', // 🎯 ВАШ ID
    bot_name: 'neuro_blogger_bot', // 🤖 ВАШ БОТ (BOT_TOKEN_1)
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `user-test-${Date.now()}`,
    debug_source: 'inngest-function-test-for-user',
  },
}

async function testInngestFunction() {
  try {
    console.log('🔥 ЗАПУСКАЕМ INNGEST ФУНКЦИЮ...')
    console.log('')
    console.log('📋 Параметры события:')
    console.log(`   • 🎯 Target: @${inngestEvent.data.username_or_id}`)
    console.log(`   • 👥 Competitors: ${inngestEvent.data.max_users}`)
    console.log(
      `   • 🎬 Reels: ${inngestEvent.data.max_reels_per_user} на каждого`
    )
    console.log(`   • 📱 User ID: ${inngestEvent.data.requester_telegram_id}`)
    console.log(`   • 🤖 Bot: ${inngestEvent.data.bot_name}`)
    console.log(`   • 🗣️ Language: ${inngestEvent.data.language}`)

    console.log('')
    console.log('📤 Отправляем событие в Inngest...')

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inngestEvent),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('')
    console.log('✅ INNGEST СОБЫТИЕ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⚡ ЧТО ПРОИСХОДИТ В INNGEST ФУНКЦИИ:')
    console.log('=====================================')
    console.log('   1. 🔍 Поиск данных Instagram API')
    console.log('   2. 👥 Анализ 3 конкурентов')
    console.log('   3. 🎬 Обработка по 2 рилса')
    console.log('   4. 💾 Сохранение в Neon DB')
    console.log('   5. 📊 Создание HTML отчета')
    console.log('   6. 📈 Генерация Excel файла')
    console.log('   7. 📦 Упаковка в ZIP архив')
    console.log('   8. 📱 ОТПРАВКА URL В TELEGRAM!')

    console.log('')
    console.log('📱 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ В TELEGRAM:')
    console.log('===================================')
    console.log(
      '• Пользователь 144022504 получит сообщение от neuro_blogger_bot'
    )
    console.log('• Сообщение будет содержать статистику анализа')
    console.log('• В сообщении будет ссылка для скачивания архива')
    console.log('• Архив будет доступен по ссылке')

    console.log('')
    console.log('🔍 Мониторинг:')
    console.log(`   📊 Inngest Dashboard: http://localhost:8288/functions`)
    console.log(`   🆔 Event ID: ${result.ids?.[0] || 'unknown'}`)
    console.log('   ⏱️  Время выполнения: ~2-3 минуты')

    console.log('')
    console.log('🎯 ПРОВЕРЬТЕ TELEGRAM ЧЕРЕЗ 2-3 МИНУТЫ!')
    console.log(
      'Если сообщение не пришло - значит есть проблема в Inngest функции'
    )
  } catch (error) {
    console.error('❌ Ошибка при запуске Inngest функции:', error.message)
    console.error('')
    console.error('🛠️  Возможные причины:')
    console.error('   • Inngest dev server не запущен (порт 8288)')
    console.error('   • Проблемы с сетевым подключением')
    console.error('   • Неправильный endpoint URL')
    console.error('')
    console.error('🔧 Проверьте что Inngest сервер работает:')
    console.error('   lsof -i :8288')
    process.exit(1)
  }
}

// Запускаем тест Inngest функции
sendInngestEvent()

async function sendInngestEvent() {
  await testInngestFunction()
}
