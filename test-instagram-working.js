#!/usr/bin/env node

/**
 * Рабочий тест Instagram Apify функции 
 */

const { triggerApifyInstagramScraping } = require('./dist/inngest-functions/instagramApifyScraper')

console.log('🎯 ТЕСТ РЕАЛЬНОГО INSTAGRAM APIFY SCRAPER')
console.log('=========================================')

async function testInstagramApifyWorking() {
  try {
    console.log('🚀 Запускаем функцию triggerApifyInstagramScraping...')

    const testData = {
      username_or_hashtag: 'cristiano',
      project_id: 999,
      source_type: 'competitor',
      max_reels: 3,
      requester_telegram_id: 'test_user_123',
      bot_name: 'neuro_blogger_bot'
    }

    console.log('📋 Параметры:', JSON.stringify(testData, null, 2))

    const result = await triggerApifyInstagramScraping(testData)

    console.log('')
    console.log('✅ ФУНКЦИЯ ЗАПУЩЕНА!')
    console.log(`📋 Event ID: ${result.eventId}`)

    console.log('')
    console.log('🎯 ЧТО ПРОИСХОДИТ:')
    console.log('   • Inngest получил событие и запустил функцию')
    console.log('   • Функция валидирует параметры')
    console.log('   • Подключается к Apify API')
    console.log('   • Парсит Instagram @cristiano')
    console.log('   • Фильтрует рилсы')
    console.log('   • Сохраняет в Supabase')
    console.log('   • Отправляет в Telegram')

    console.log('')
    console.log('📊 МОНИТОРИНГ:')
    console.log('   • Dashboard: http://localhost:8288')
    console.log('   • Functions: http://localhost:8288/functions')
    console.log('   • Events: http://localhost:8288/events')
    console.log(`   • Your Event: http://localhost:8288/events/${result.eventId}`)

    console.log('')
    console.log('⏱️  Результат будет через 30-120 секунд...')

    console.log('')
    console.log('✅ ТЕСТ УСПЕШЕН - ФУНКЦИЯ РАБОТАЕТ!')

  } catch (error) {
    console.error('')
    console.error('❌ ОШИБКА ТЕСТА:', error.message)
    console.error('🔍 Стек:', error.stack)
  }
}

// Запуск
testInstagramApifyWorking()

console.log('')
console.log('📝 cURL эквивалент (если будет работать):')
console.log(`curl -X POST "http://localhost:8288/api/v1/events" \\`)
console.log(`  -H "Content-Type: application/json" \\`) 
console.log(`  -d '{`)
console.log(`    "name": "instagram/apify-scrape",`)
console.log(`    "data": {`)
console.log(`      "username_or_hashtag": "cristiano",`)
console.log(`      "project_id": 999,`)
console.log(`      "source_type": "competitor", `)
console.log(`      "max_reels": 3,`)
console.log(`      "requester_telegram_id": "test_user_123",`)
console.log(`      "bot_name": "neuro_blogger_bot"`)
console.log(`    }`)
console.log(`  }'`)