#!/usr/bin/env node

/**
 * 🎯 РЕАЛЬНАЯ INSTAGRAM ФУНКЦИЯ с внешним API
 */

require('dotenv').config({ path: '.env' })
const { Inngest } = require('inngest')

console.log('🎯 ЗАПУСК РЕАЛЬНОЙ INSTAGRAM ФУНКЦИИ')
console.log('====================================')
console.log('')

const inngest = new Inngest({
  id: 'real-instagram-test-client',
  name: 'Real Instagram Test Client',
})

async function testRealInstagramScraper() {
  try {
    console.log('🚀 ОТПРАВЛЯЕМ СОБЫТИЕ ДЛЯ РЕАЛЬНОЙ INSTAGRAM ФУНКЦИИ...')

    const realEvent = {
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: 'cristiano',
        project_id: 12345,
        max_users: 5,
        max_reels_per_user: 3,
        scrape_reels: false,
        requester_telegram_id: '144022504',
        language: 'ru',
      },
    }

    const result = await inngest.send(realEvent)

    console.log('')
    console.log('🎉 СОБЫТИЕ ДЛЯ РЕАЛЬНОЙ INSTAGRAM ФУНКЦИИ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:')
    console.log('   • Реальная функция запросит данные у Instagram API')
    console.log('   • Создаст архив с HTML отчетом и Excel файлом')
    console.log('   • Отправит ссылку на скачивание в Telegram')
    console.log('   • Если НЕ РАБОТАЕТ - проблема в Instagram API или коде')

    console.log('')
    console.log('⏱️  Ожидаем результат 60 секунд...')
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message)
  }
}

// Запускаем тест
testRealInstagramScraper()
