const { triggerApifyInstagramScraping } = require('./dist/inngest-functions/instagramApifyScraper')

async function testDirectTrigger() {
  console.log('🔥 ФИНАЛЬНЫЙ ТЕСТ: Прямой триггер доставки (без step.run)')
  
  try {
    const parseResult = await triggerApifyInstagramScraping({
      username_or_hashtag: 'theaisurfer',
      project_id: 999,
      source_type: 'competitor',
      max_reels: 1,
      requester_telegram_id: 'auto-system', // Это должно активировать ПРЯМОЙ триггер
      bot_name: 'neuro_blogger_bot'
    })
    
    console.log('✅ Event ID:', parseResult.eventId)
    console.log('🔍 Отслеживаем прямой триггер...')
    
    setTimeout(async () => {
      try {
        const fetch = (await import('node-fetch')).default
        
        // Проверяем статус функции
        const statusResponse = await fetch(`http://localhost:8288/v1/events/${parseResult.eventId}/runs`)
        const statusData = await statusResponse.json()
        
        console.log('\n📊 Результат функции:')
        console.log(`• Status: ${statusData.data[0].status}`)
        console.log(`• Reels found: ${statusData.data[0].output?.reelsFound || 0}`)
        
        // Проверяем доставку
        const deliveryResponse = await fetch('http://localhost:8288/v1/events?name=competitor%2Fdelivery-reels')
        const deliveryData = await deliveryResponse.json()
        
        console.log('\n🎯 РЕЗУЛЬТАТ ТЕСТА:')
        console.log(`📬 Найдено delivery событий: ${deliveryData.data ? deliveryData.data.length : 0}`)
        
        if (deliveryData.data && deliveryData.data.length > 0) {
          console.log('\n🎉🎉🎉 ПОБЕДА! ПРЯМОЙ ТРИГГЕР РАБОТАЕТ! 🎉🎉🎉')
          
          // Показываем детали последних событий доставки
          const recentEvents = deliveryData.data.slice(0, 3)
          recentEvents.forEach((event, i) => {
            console.log(`\n${i + 1}. Delivery Event: ${event.id}`)
            console.log(`   • Competitor: ${event.data.competitor_username}`)
            console.log(`   • Project ID: ${event.data.project_id}`)
            console.log(`   • Triggered by: ${event.data.triggered_by}`)
            console.log(`   • Created: ${event.created_at}`)
          })
          
          // Проверяем выполнение delivery функций
          console.log('\n🔍 Проверяем выполнение delivery функций...')
          for (const event of recentEvents) {
            try {
              const deliveryRuns = await fetch(`http://localhost:8288/v1/events/${event.id}/runs`)
              const deliveryRunsData = await deliveryRuns.json()
              
              if (deliveryRunsData.data && deliveryRunsData.data.length > 0) {
                const run = deliveryRunsData.data[0]
                console.log(`📦 Delivery ${event.id}: ${run.status}`)
                if (run.output && run.output.delivery_summary) {
                  console.log(`   • Delivered: ${run.output.delivery_summary.delivered}`)
                  console.log(`   • Failed: ${run.output.delivery_summary.failed}`)
                  console.log(`   • Skipped: ${run.output.delivery_summary.skipped}`)
                }
              }
            } catch (err) {
              console.log(`❌ Ошибка проверки delivery ${event.id}:`, err.message)
            }
          }
          
        } else {
          console.log('\n❌ ПРЯМОЙ ТРИГГЕР ВСЕ ЕЩЕ НЕ РАБОТАЕТ!')
          console.log('🤔 Возможные причины:')
          console.log('   1. inngest.send() не работает вне step.run')
          console.log('   2. Проблема с импортом inngest в функции')
          console.log('   3. Условие if не выполняется')
          console.log('   4. Ошибка в названии события')
        }
        
      } catch (error) {
        console.error('❌ Ошибка проверки:', error.message)
      }
    }, 90000) // 1.5 минуты
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message)
  }
}

testDirectTrigger()