#!/usr/bin/env node

/**
 * 🎯 ПРАВИЛЬНЫЙ ТЕСТ INNGEST ФУНКЦИИ
 *
 * Тестируем instagramScraper-v2 которая САМА создаст архив и отправит в Telegram
 */

// Загружаем переменные из правильного .env файла
require('dotenv').config({ path: '.env' })

console.log('🎯 ТЕСТ INNGEST ФУНКЦИИ instagramScraper-v2')
console.log('============================================')
console.log('')

// Проверяем что переменные загрузились
console.log('🔍 Проверка переменных окружения:')
console.log(
  `   BOT_TOKEN_1 загружен: ${process.env.BOT_TOKEN_1 ? '✅ ДА' : '❌ НЕТ'}`
)
console.log(`   ORIGIN загружен: ${process.env.ORIGIN ? '✅ ДА' : '❌ НЕТ'}`)
console.log('')

const BASE_URL = 'http://localhost:8288/e/real-inngest-test'

// Реальное событие для Inngest функции
const realInngstEvent = {
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov', // Проверенный аккаунт
    project_id: 38,
    max_users: 3, // Небольшое количество
    max_reels_per_user: 2, // Небольшое количество рилсов
    scrape_reels: true, // Включаем рилсы
    requester_telegram_id: '144022504', // 🎯 РЕАЛЬНЫЙ пользователь
    bot_name: 'neuro_blogger_bot', // 🤖 ПРАВИЛЬНЫЙ бот
    language: 'ru',
    timestamp: new Date().toISOString(),
    debug_session_id: `real-inngest-${Date.now()}`,
    debug_source: 'real-inngest-function-test',
  },
}

async function testInngstFunction() {
  try {
    console.log('🚀 ЗАПУСКАЕМ INNGEST ФУНКЦИЮ...')
    console.log('')
    console.log('📋 Параметры реального теста:')
    console.log(`   • 🎯 Target: @${realInngstEvent.data.username_or_id}`)
    console.log(`   • 👥 Competitors: ${realInngstEvent.data.max_users}`)
    console.log(`   • 🎬 Reels: ${realInngstEvent.data.max_reels_per_user}`)
    console.log(
      `   • 📱 User ID: ${realInngstEvent.data.requester_telegram_id}`
    )
    console.log(`   • 🤖 Bot: ${realInngstEvent.data.bot_name}`)
    console.log('')

    console.log('📤 Отправляем событие в Inngest...')

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(realInngstEvent),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('')
    console.log('✅ INNGEST СОБЫТИЕ УСПЕШНО ЗАПУЩЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⏳ ЧТО ПРОИСХОДИТ В INNGEST ФУНКЦИИ:')
    console.log('   1. 🔍 Функция получает событие')
    console.log('   2. 📊 Анализирует Instagram аккаунт')
    console.log('   3. 👥 Находит конкурентов')
    console.log('   4. 🎬 Анализирует рилсы')
    console.log('   5. 📄 Создает HTML отчет')
    console.log('   6. 📊 Генерирует Excel файл')
    console.log('   7. 📦 Упаковывает в ZIP архив')
    console.log('   8. 📱 ОТПРАВЛЯЕТ URL В TELEGRAM!')

    console.log('')
    console.log('📱 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:')
    console.log(
      `   • Пользователь ${realInngstEvent.data.requester_telegram_id} получит сообщение`
    )
    console.log(`   • От бота ${realInngstEvent.data.bot_name}`)
    console.log('   • С красиво оформленной статистикой')
    console.log('   • И ссылкой для скачивания архива')

    console.log('')
    console.log('🔍 Мониторинг выполнения:')
    console.log('   📊 Inngest Dashboard: http://localhost:8288/functions')
    console.log(`   🆔 Event ID: ${result.ids?.[0] || 'unknown'}`)
    console.log('   ⏱️  Ожидаемое время: 2-3 минуты')

    console.log('')
    console.log('🎯 ЗАДАЧА БУДЕТ ВЫПОЛНЕНА КОГДА:')
    console.log('   ✅ Функция создаст новый архив')
    console.log('   ✅ Функция отправит URL в Telegram')
    console.log('   ✅ Пользователь получит сообщение с архивом')

    console.log('')
    console.log('🚀 INNGEST ФУНКЦИЯ ЗАПУЩЕНА! Ожидайте результат в Telegram!')
  } catch (error) {
    console.error('❌ Ошибка при запуске Inngest функции:', error.message)
    console.error('')
    console.error('🛠️  Возможные причины:')
    console.error('   • Inngest dev server не запущен')
    console.error('   • Проблемы с переменными окружения')
    console.error('   • Неправильный endpoint URL')
    process.exit(1)
  }
}

// Запускаем ПРАВИЛЬНЫЙ тест Inngest функции
testInngstFunction()
