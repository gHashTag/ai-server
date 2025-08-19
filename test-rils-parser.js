/**
 * Тест RILS парсера (Instagram Apify Scraper)
 */

const { inngest } = require('./dist/core/inngest/clients')

async function testRilsParser() {
  console.log('🧪 Тестирование RILS парсера...')

  try {
    // Тестовые данные для парсинга
    const testEvent = {
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: 'yacheslav_nekludov', // Тестовый аккаунт
        project_id: 1,
        source_type: 'competitor',
        max_reels: 5, // Небольшое количество для теста
        min_views: 100,
        max_age_days: 30,
        requester_telegram_id: '144022504',
        bot_name: 'test-bot'
      }
    }

    console.log('📤 Отправляем событие:', JSON.stringify(testEvent, null, 2))

    // Отправляем событие
    const result = await inngest.send(testEvent)
    
    console.log('✅ Событие отправлено успешно!')
    console.log('🆔 ID события:', result.ids[0])
    
    console.log('\n📋 Результат:')
    console.log('- Функция: instagram-apify-scraper')
    console.log('- Событие: instagram/apify-scrape')
    console.log('- Статус: Отправлено в очередь')
    
    console.log('\n⚠️  ВАЖНО: Для работы нужен APIFY_TOKEN в .env файле')
    console.log('💡 Проверьте логи Inngest для результатов парсинга')

  } catch (error) {
    console.error('❌ Ошибка:', error.message)
    
    if (error.message.includes('APIFY_TOKEN')) {
      console.log('\n🔧 РЕШЕНИЕ: Добавьте APIFY_TOKEN в .env файл:')
      console.log('APIFY_TOKEN=your_apify_token_here')
    }
  }
}

// Запуск теста
testRilsParser()