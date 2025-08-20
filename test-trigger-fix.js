const { triggerApifyInstagramScraping } = require('./dist/inngest-functions/instagramApifyScraper')

async function testTriggerFix() {
  console.log('🔧 Тестируем исправленный триггер доставки')
  
  try {
    // Запускаем парсинг с auto-system (исправленная версия)
    const parseResult = await triggerApifyInstagramScraping({
      username_or_hashtag: 'theaisurfer',
      project_id: 999,
      source_type: 'competitor', 
      max_reels: 3, // Меньше рилсов для быстрого теста
      requester_telegram_id: 'auto-system', // Ключевой параметр для триггера
      bot_name: 'neuro_blogger_bot'
    })
    
    console.log('✅ Парсинг запущен:', parseResult.eventId)
    console.log('🔍 Отслеживаем выполнение...')
    
    // Проверяем статус каждые 30 секунд
    const checkStatus = async () => {
      try {
        const fetch = (await import('node-fetch')).default
        const response = await fetch(`http://localhost:8288/v1/events/${parseResult.eventId}/runs`)
        const runs = await response.json()
        
        if (runs && runs.data && runs.data.length > 0) {
          const run = runs.data[0]
          console.log(`📊 Status: ${run.status} | Started: ${run.run_started_at}`)
          
          if (run.status === 'Completed') {
            console.log('✅ Парсинг завершен!')
            console.log('📦 Output:', JSON.stringify(run.output, null, 2))
            
            // Проверяем был ли запущен delivery
            setTimeout(async () => {
              const deliveryResponse = await fetch('http://localhost:8288/v1/events?name=competitor%2Fdelivery-reels')
              const deliveryEvents = await deliveryResponse.json()
              
              console.log('\n🔍 Проверяем события доставки:')
              console.log(`📬 Найдено delivery событий: ${deliveryEvents.data ? deliveryEvents.data.length : 0}`)
              
              if (deliveryEvents.data && deliveryEvents.data.length > 0) {
                console.log('🎉 УСПЕХ! Автоматический триггер работает!')
                deliveryEvents.data.forEach((event, i) => {
                  console.log(`${i + 1}. Event ID: ${event.id}`)
                  console.log(`   Data:`, JSON.stringify(event.data, null, 2))
                })
              } else {
                console.log('❌ ОШИБКА: Триггер доставки не сработал!')
              }
            }, 5000) // 5 секунд
            
            return true
          }
        }
        return false
      } catch (error) {
        console.error('❌ Ошибка проверки статуса:', error.message)
        return false
      }
    }
    
    // Проверяем каждые 30 секунд до завершения
    const interval = setInterval(async () => {
      const completed = await checkStatus()
      if (completed) {
        clearInterval(interval)
      }
    }, 30000)
    
    // Первая проверка сразу
    setTimeout(checkStatus, 5000)
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message)
  }
}

testTriggerFix()