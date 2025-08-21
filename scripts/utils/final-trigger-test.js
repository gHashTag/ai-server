const { triggerApifyInstagramScraping } = require('./dist/inngest-functions/instagramApifyScraper')

async function finalTriggerTest() {
  console.log('🎯 ФИНАЛЬНЫЙ ТЕСТ: Триггер доставки с улучшенным логированием')
  
  try {
    const parseResult = await triggerApifyInstagramScraping({
      username_or_hashtag: 'theaisurfer',
      project_id: 999,
      source_type: 'competitor',
      max_reels: 2, // Минимум для быстрого теста
      requester_telegram_id: 'auto-system', // ИМЕННО ЭТО ДОЛЖНО АКТИВИРОВАТЬ ТРИГГЕР
      bot_name: 'neuro_blogger_bot'
    })
    
    console.log('✅ Event ID:', parseResult.eventId)
    console.log('⏳ Ожидаем завершения и проверяем логи...')
    
    // Ждем завершения функции
    setTimeout(async () => {
      try {
        const fetch = (await import('node-fetch')).default
        
        // Проверяем статус функции
        const statusResponse = await fetch(`http://localhost:8288/v1/events/${parseResult.eventId}/runs`)
        const statusData = await statusResponse.json()
        
        if (statusData.data && statusData.data[0]) {
          const run = statusData.data[0]
          console.log('\n📊 Результат функции:')
          console.log(`• Status: ${run.status}`)
          console.log(`• Output:`, JSON.stringify(run.output, null, 2))
          
          // Проверяем события доставки
          const deliveryResponse = await fetch('http://localhost:8288/v1/events?name=competitor%2Fdelivery-reels')
          const deliveryData = await deliveryResponse.json()
          
          console.log('\n🔍 Проверка событий доставки:')
          console.log(`📬 Найдено delivery событий: ${deliveryData.data ? deliveryData.data.length : 0}`)
          
          if (deliveryData.data && deliveryData.data.length > 0) {
            console.log('\n🎉 ТРИГГЕР РАБОТАЕТ!')
            deliveryData.data.slice(0, 3).forEach((event, i) => {
              console.log(`${i + 1}. Event: ${event.id}`)
              console.log(`   Competitor: ${event.data.competitor_username}`)
              console.log(`   Triggered by: ${event.data.triggered_by}`)
              console.log(`   Created: ${event.created_at}`)
            })
          } else {
            console.log('\n❌ ТРИГГЕР НЕ РАБОТАЕТ!')
            console.log('🔍 Возможные причины:')
            console.log('1. Условие if не выполняется')
            console.log('2. inngest.send() не работает в step.run')
            console.log('3. Ошибка в названии события')
            console.log('4. Проблема с импортом inngest')
          }
        }
      } catch (error) {
        console.error('❌ Ошибка проверки:', error.message)
      }
    }, 120000) // 2 минуты
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message)
  }
}

finalTriggerTest()