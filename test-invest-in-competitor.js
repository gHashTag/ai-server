/**
 * Тест функции investInCompetitor
 * Проверяет подписку на конкурента и получение последнего рилза
 */

// Конфигурация для тестирования
const https = require('https')
const fetch = require('node-fetch') // Если установлен

async function testInvestInCompetitor() {
  console.log('🚀 Запуск теста investInCompetitor...')
  
  try {
    // Тестовые данные
    const testData = {
      username: 'natgeo', // National Geographic - много качественных рилзов
      user_telegram_id: '144022504', // Тестовый telegram ID
      user_chat_id: '144022504',
      bot_name: 'neuro_blogger_bot',
      max_reels: 5, // Сохранить 5 рилзов в БД
      min_views: 1000,
      max_age_days: 14,
      delivery_format: 'digest',
      project_id: 999
    }
    
    console.log('📋 Тестовые данные:', testData)
    
    // Отправляем запрос через API
    const response = await fetch('http://localhost:3000/api/invest-competitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ Запрос отправлен успешно!')
      console.log('🔗 Event ID:', result.event_id)
      console.log('📊 Ожидается рилзов:', result.expected_reels)
      console.log('⏰ Ожидание завершения (может занять 1-2 минуты)...')
    } else {
      console.error('❌ Ошибка:', result.error)
      return
    }
    
    // Информация для пользователя
    console.log(`
📊 Что происходит:
1. ✅ Создается подписка на @${testData.username}
2. 🎬 Запускается парсинг рилзов через Apify
3. 💾 Сохраняется ${testData.max_reels} рилзов в базу данных
4. 📱 Возвращается 1 лучший рилз пользователю
5. 🔄 Настраивается автоматический мониторинг

🔍 Проверьте:
- Логи Inngest в дашборде
- Telegram бот для получения уведомления
- База данных для записей подписки

💡 Система мониторинга:
- Автоматически проверяет новые рилзы каждые 24 часа
- Отправляет обновления всем подписчикам
- Сохраняет историю доставок
`)
    
  } catch (error) {
    console.error('❌ Ошибка при отправке события:', error)
    console.error('Детали:', error.message)
  }
}

// Тест проверки статуса через API
async function testGetCompetitorStatus() {
  console.log('\n🔍 Тест проверки статуса через API...')
  
  try {
    const response = await fetch('http://localhost:3000/api/invest-competitor/status/natgeo?user_telegram_id=144022504&bot_name=neuro_blogger_bot')
    const result = await response.json()
    
    if (result.success && result.invested) {
      console.log(`📊 Статус подписки:`)
      console.log(`   ✅ Активна: ${result.subscription.is_active}`)
      console.log(`   🎯 Макс рилзов: ${result.subscription.max_reels}`)
      console.log(`   👁 Мин просмотров: ${result.subscription.min_views}`)
      console.log(`   📦 Рилзов в БД: ${result.reels_in_database}`)
      console.log(`   📅 Создана: ${result.subscription.created_at}`)
      
      if (result.latest_reels && result.latest_reels.length > 0) {
        console.log('\n🎬 Последние рилзы:')
        result.latest_reels.forEach((reel, index) => {
          console.log(`${index + 1}. 👁 ${reel.views_count?.toLocaleString()} | ❤️ ${reel.likes_count?.toLocaleString()}`)
          console.log(`   🔗 ${reel.url}`)
        })
      }
    } else {
      console.log('📭 Подписка не найдена или не активна')
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error.message)
  }
}

// Функция для проверки статуса подписок
async function checkSubscriptionStatus() {
  console.log('\n📋 Проверка статуса подписок...')
  
  try {
    const { Pool } = require('pg')
    
    const dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
    
    const client = await dbPool.connect()
    
    try {
      const result = await client.query(`
        SELECT 
          cs.*,
          cp.display_name,
          cp.followers_count
        FROM competitor_subscriptions cs
        LEFT JOIN competitor_profiles cp ON cs.competitor_username = cp.username
        WHERE cs.user_telegram_id = '144022504'
        ORDER BY cs.created_at DESC
        LIMIT 5
      `)
      
      console.log(`📊 Найдено ${result.rows.length} подписок:`)
      result.rows.forEach((sub, index) => {
        console.log(`${index + 1}. @${sub.competitor_username}`)
        console.log(`   🎯 Макс рилзов: ${sub.max_reels}`)
        console.log(`   👁 Мин просмотров: ${sub.min_views}`)
        console.log(`   ⏰ Создана: ${sub.created_at}`)
        console.log(`   ✅ Активна: ${sub.is_active}`)
        console.log('')
      })
      
    } finally {
      client.release()
      await dbPool.end()
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки подписок:', error.message)
  }
}

// Запуск тестов
async function runAllTests() {
  await testInvestInCompetitor()
  
  // Ждем немного перед проверкой результатов
  console.log('\n⏳ Ждем 5 секунд перед проверкой...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  await checkSubscriptionStatus()
  await testGetCompetitorStatus()
}

// Проверяем переменные окружения
if (!process.env.NEON_DATABASE_URL) {
  console.error('❌ NEON_DATABASE_URL не настроена')
  process.exit(1)
}

if (!process.env.INNGEST_EVENT_KEY) {
  console.error('❌ INNGEST_EVENT_KEY не настроена')
  process.exit(1)
}

runAllTests().catch(console.error)