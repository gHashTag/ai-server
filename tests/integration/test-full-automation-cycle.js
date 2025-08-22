const { triggerApifyInstagramScraping } = require('./dist/inngest-functions/instagramApifyScraper')

async function testFullAutomationCycle() {
  console.log('🧪 Тестируем полный цикл автоматизации: парсинг → доставка')
  
  try {
    // Запускаем парсинг с auto-system (это должно автоматически запустить доставку)
    const parseResult = await triggerApifyInstagramScraping({
      username_or_hashtag: 'theaisurfer',
      project_id: 999, // Специальный ID для авто-системы
      source_type: 'competitor',
      max_reels: 5,
      requester_telegram_id: 'auto-system', // КЛЮЧЕВОЙ параметр для автоматического триггера
      bot_name: 'neuro_blogger_bot'
    })
    
    console.log('✅ Парсинг запущен:', parseResult.eventId)
    console.log('⏳ Парсинг должен автоматически запустить доставку после завершения')
    console.log('📊 Event ID для отслеживания:', parseResult.eventId)
    
    // Проверяем статус через 2 минуты
    setTimeout(async () => {
      try {
        const fetch = (await import('node-fetch')).default
        const response = await fetch(`http://localhost:8288/v1/events/${parseResult.eventId}/runs`)
        const runs = await response.json()
        
        if (runs && runs.data && runs.data.length > 0) {
          const run = runs.data[0]
          console.log('\n📊 Статус выполнения через 2 минуты:')
          console.log(`• Status: ${run.status}`)
          console.log(`• Started: ${run.run_started_at}`)
          console.log(`• Ended: ${run.ended_at || 'Still running'}`)
          
          if (run.status === 'Completed') {
            console.log('✅ Парсинг завершен! Проверим доставки...')
            checkDeliveryHistory()
          }
        } else {
          console.log('⏳ Функция все еще выполняется...')
        }
      } catch (error) {
        console.error('❌ Ошибка проверки статуса:', error.message)
      }
    }, 120000) // 2 минуты
    
    // Проверяем доставки через 5 минут
    setTimeout(() => {
      checkDeliveryHistory()
    }, 300000) // 5 минут
    
  } catch (error) {
    console.error('❌ Ошибка запуска теста:', error.message)
  }
}

async function checkDeliveryHistory() {
  try {
    console.log('\n🔍 Проверяем историю доставок...')
    
    const { Pool } = require('pg')
    const dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
    
    const client = await dbPool.connect()
    
    // Проверяем доставки за последние 30 минут
    const thirtyMinutesAgo = new Date()
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)
    
    const result = await client.query(`
      SELECT 
        cdh.*,
        cs.competitor_username,
        cs.user_telegram_id
      FROM competitor_delivery_history cdh
      LEFT JOIN competitor_subscriptions cs ON cdh.subscription_id = cs.id
      WHERE cdh.created_at >= $1
      ORDER BY cdh.created_at DESC
    `, [thirtyMinutesAgo])
    
    client.release()
    
    console.log(`📬 Найдено доставок за последние 30 минут: ${result.rows.length}`)
    
    if (result.rows.length > 0) {
      console.log('\n📋 Детали доставок:')
      result.rows.forEach((delivery, index) => {
        console.log(`${index + 1}. @${delivery.competitor_username}:`)
        console.log(`   • Status: ${delivery.delivery_status}`)
        console.log(`   • Reels: ${delivery.reels_count}`)
        console.log(`   • User: ${delivery.user_telegram_id}`)
        console.log(`   • Method: ${delivery.delivery_method || 'auto'}`)
        console.log(`   • Trigger: ${delivery.delivery_trigger || 'scheduled'}`)
        console.log(`   • Time: ${delivery.created_at}`)
        if (delivery.error_message) {
          console.log(`   • Error: ${delivery.error_message}`)
        }
        console.log('')
      })
    } else {
      console.log('❌ Автоматические доставки не работают!')
      console.log('💡 Проверьте:')
      console.log('  1. Триггер доставки в instagramApifyScraper')
      console.log('  2. Работу competitorDelivery функции')
      console.log('  3. Логи Inngest')
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки доставок:', error.message)
  }
}

// Показать текущие подписки
async function showCurrentSubscriptions() {
  try {
    const { Pool } = require('pg')
    const dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
    
    const client = await dbPool.connect()
    const result = await client.query(`
      SELECT 
        competitor_username,
        user_telegram_id,
        max_reels,
        delivery_format,
        is_active
      FROM competitor_subscriptions 
      WHERE is_active = true
    `)
    client.release()
    
    console.log('\n📋 Активные подписки:')
    result.rows.forEach((sub, index) => {
      console.log(`${index + 1}. @${sub.competitor_username}`)
      console.log(`   • User: ${sub.user_telegram_id}`)
      console.log(`   • Max reels: ${sub.max_reels}`)
      console.log(`   • Format: ${sub.delivery_format}`)
    })
    
  } catch (error) {
    console.error('❌ Ошибка получения подписок:', error.message)
  }
}

console.log('🎯 Начинаем тест полной автоматизации!')
showCurrentSubscriptions().then(() => {
  testFullAutomationCycle()
})