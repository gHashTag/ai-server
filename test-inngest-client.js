#!/usr/bin/env node

/**
 * 🎯 ПРАВИЛЬНЫЙ ТЕСТ - через Inngest Client!
 *
 * Используем Inngest client для правильной отправки событий
 */

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.development.local' })

// Импортируем Inngest client
const { Inngest } = require('inngest')

console.log('🎯 ПРАВИЛЬНЫЙ ТЕСТ - через Inngest Client!')
console.log('==============================================')
console.log('')

// Создаем Inngest client
const inngest = new Inngest({
  id: 'test-client',
  name: 'Test Client',
})

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
    debug_session_id: `client-test-${Date.now()}`,
    debug_source: 'inngest-client-test',
  },
}

async function sendViaInngestClient() {
  try {
    console.log('🔥 ОТПРАВЛЯЕМ ЧЕРЕЗ INNGEST CLIENT!')
    console.log('')
    console.log('📋 Параметры теста:')
    console.log(`   • 🎯 Target: @${correctEvent.data.username_or_id}`)
    console.log(`   • 👥 Competitors: ${correctEvent.data.max_users}`)
    console.log(`   • 🎬 Reels: ${correctEvent.data.max_reels_per_user}`)
    console.log(`   • 📱 User ID: ${correctEvent.data.requester_telegram_id}`)
    console.log(`   • 🤖 Bot: ${correctEvent.data.bot_name}`)
    console.log('')

    console.log('📤 Отправляем через Inngest Client...')

    // Используем правильный метод Inngest client
    const result = await inngest.send(correctEvent)

    console.log('')
    console.log('🎉 СОБЫТИЕ ОТПРАВЛЕНО ЧЕРЕЗ INNGEST CLIENT!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('✅ ПРАВИЛЬНЫЙ МЕТОД СРАБОТАЛ!')
    console.log('   • Событие отправлено через Inngest Client')
    console.log('   • Функция instagramScraperV2 получит событие')
    console.log('   • Начнется реальная обработка!')

    console.log('')
    console.log('⚡ ЧТО ПРОИЗОЙДЕТ СЕЙЧАС:')
    console.log('   1. 🔍 Функция получит событие корректно')
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
    console.log('🔍 ПРОВЕРЬТЕ TELEGRAM - ДОЛЖНО ПРИЙТИ СООБЩЕНИЕ!')
  } catch (error) {
    console.error('❌ Ошибка при отправке через Inngest Client:', error.message)
    console.error('')
    console.error('🔍 Детали ошибки:', error)
    process.exit(1)
  }
}

// Запускаем ПРАВИЛЬНЫЙ тест через Inngest Client
sendViaInngestClient()
