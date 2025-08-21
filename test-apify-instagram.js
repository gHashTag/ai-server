#!/usr/bin/env node

/**
 * Простой тест Instagram Apify Scraper функции
 */

require('dotenv').config({ path: '.env' })
const { Inngest } = require('inngest')

console.log('🎯 ТЕСТ INSTAGRAM APIFY SCRAPER')
console.log('==============================')

const inngest = new Inngest({
  id: 'test-instagram-apify-client',
  name: 'Test Instagram Apify Client',
})

async function testInstagramApify() {
  try {
    console.log('🚀 Запускаем Instagram Apify Scraper...')

    const event = {
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: 'cristiano',
        project_id: 1,
        source_type: 'competitor',
        max_reels: 3,
        requester_telegram_id: 'test_user',
        bot_name: 'test_bot'
      },
    }

    console.log('📋 Данные события:', JSON.stringify(event.data, null, 2))

    const result = await inngest.send(event)

    console.log('')
    console.log('✅ СОБЫТИЕ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)
    
    console.log('')
    console.log('🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:')
    console.log('   • Функция запросит данные из Instagram через Apify')
    console.log('   • Найдет и отфильтрует рилсы')
    console.log('   • Сохранит данные в Supabase')
    console.log('   • Отправит уведомление в Telegram')

    console.log('')
    console.log('⏱️  Проверьте логи функции через 30-60 секунд...')
    
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message)
    console.error('   Стек:', error.stack)
  }
}

// Запускаем тест
testInstagramApify()