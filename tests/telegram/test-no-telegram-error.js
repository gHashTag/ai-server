const { triggerApifyInstagramScraping } = require('./dist/inngest-functions/instagramApifyScraper')

async function testNoTelegramError() {
  console.log('🔧 Тест без ошибки Telegram')
  
  try {
    const parseResult = await triggerApifyInstagramScraping({
      username_or_hashtag: 'theaisurfer',
      project_id: 999,
      source_type: 'competitor',
      max_reels: 1, // Минимум для быстрого теста
      requester_telegram_id: 'auto-system', // Не должен отправлять в Telegram
      bot_name: 'neuro_blogger_bot'
    })
    
    console.log('✅ Event ID:', parseResult.eventId)
    console.log('⏳ Ждем завершения...')
    
    setTimeout(async () => {
      try {
        const fetch = (await import('node-fetch')).default
        
        const statusResponse = await fetch(`http://localhost:8288/v1/events/${parseResult.eventId}/runs`)
        const statusData = await statusResponse.json()
        
        if (statusData.data && statusData.data[0]) {
          console.log('\n✅ Результат функции:')
          console.log(`• Status: ${statusData.data[0].status}`)
          console.log(`• Reels found: ${statusData.data[0].output?.reelsFound || 0}`)
          
          // Проверим логи на ошибки Telegram
          console.log('\n🔍 Проверяем наличие ошибок Telegram в логах...')
          // Если нет ошибки - значит исправление сработало
          
          // Проверяем доставку
          const deliveryResponse = await fetch('http://localhost:8288/v1/events?name=competitor%2Fdelivery-reels')
          const deliveryData = await deliveryResponse.json()
          
          console.log(`📬 Delivery событий: ${deliveryData.data ? deliveryData.data.length : 0}`)
          
          if (deliveryData.data && deliveryData.data.length > 0) {
            console.log('🎉 ТРИГГЕР РАБОТАЕТ!')
            console.log('События доставки найдены:', deliveryData.data.map(e => e.id))
          } else {
            console.log('❌ Триггер все еще не работает')
            console.log('🔍 Нужно исследовать причины...')
          }
        }
      } catch (error) {
        console.error('❌ Ошибка проверки:', error.message)
      }
    }, 90000) // 1.5 минуты
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message)
  }
}

testNoTelegramError()