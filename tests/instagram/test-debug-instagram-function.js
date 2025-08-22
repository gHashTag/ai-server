#!/usr/bin/env node

/**
 * 🔍 ОТЛАДОЧНАЯ ВЕРСИЯ Instagram функции
 * Показывает каждый шаг выполнения для диагностики
 */

require('dotenv').config({ path: '.env' })
const { Inngest } = require('inngest')

console.log('🔍 ОТЛАДОЧНАЯ ДИАГНОСТИКА INSTAGRAM ФУНКЦИИ')
console.log('==========================================')
console.log('')

const inngest = new Inngest({
  id: 'debug-instagram-client',
  name: 'Debug Instagram Client',
})

async function debugInstagramFunction() {
  try {
    console.log('🚀 ЗАПУСК ДИАГНОСТИЧЕСКОЙ INSTAGRAM ФУНКЦИИ...')
    console.log('')

    // Проверяем все необходимые переменные окружения
    console.log('🔧 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ:')
    console.log(
      `✅ RAPIDAPI_INSTAGRAM_KEY: ${
        process.env.RAPIDAPI_INSTAGRAM_KEY ? 'НАЙДЕН' : '❌ НЕ НАЙДЕН'
      }`
    )
    console.log(
      `✅ NEON_DATABASE_URL: ${
        process.env.NEON_DATABASE_URL ? 'НАЙДЕН' : '❌ НЕ НАЙДЕН'
      }`
    )
    console.log(
      `✅ BOT_TOKEN_1: ${process.env.BOT_TOKEN_1 ? 'НАЙДЕН' : '❌ НЕ НАЙДЕН'}`
    )
    console.log('')

    const debugEvent = {
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: 'cristiano',
        project_id: 12345,
        max_users: 3, // Минимальное количество для быстрой отладки
        max_reels_per_user: 0, // Отключаем рилсы для упрощения
        scrape_reels: false,
        requester_telegram_id: '144022504',
        language: 'ru',
        bot_name: 'neuro_blogger_bot',
      },
    }

    console.log('📋 ДАННЫЕ СОБЫТИЯ:')
    console.log(JSON.stringify(debugEvent.data, null, 2))
    console.log('')

    const result = await inngest.send(debugEvent)

    console.log('🎉 СОБЫТИЕ ДЛЯ ДИАГНОСТИЧЕСКОЙ ФУНКЦИИ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)
    console.log('')

    console.log('🎯 ЧТО ДОЛЖНО ПРОИЗОЙТИ:')
    console.log('   Step 1: ✅ validate-input - проверка входных данных')
    console.log('   Step 2: ✅ validate-project-id - проверка project_id')
    console.log('   Step 3: 📡 call-instagram-api - запрос к Instagram API')
    console.log(
      '   Step 4: 🔄 process-users-with-zod - обработка пользователей'
    )
    console.log('   Step 5: 💾 save-to-neon-database-zod - сохранение в БД')
    console.log('   Step 6: ⏭️ skip reels (scrape_reels = false)')
    console.log('   Step 7: 📦 generate-reports-archive - СОЗДАНИЕ АРХИВА')
    console.log('   Step 8: 📱 Отправка в Telegram с архивом')
    console.log('')

    console.log('🕐 ОЖИДАНИЕ РЕЗУЛЬТАТА...')
    console.log('Если функция НЕ ОТПРАВИТ сообщение в Telegram:')
    console.log('• Проверьте логи сервера')
    console.log('• Функция падает на одном из шагов')
    console.log('• Нужно добавить больше логирования')
    console.log('')

    // Показываем Inngest URL для мониторинга
    console.log('🌐 Мониторинг: http://localhost:8288')
    console.log('📊 Проверьте выполнение функции в Inngest UI')
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message)
  }
}

// Запускаем отладку
debugInstagramFunction()
