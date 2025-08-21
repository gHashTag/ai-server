/**
 * Тест функции мониторинга конкурентов
 * Проверяет подписку на конкурента и получение последнего рилза
 */

// Конфигурация для тестирования
const https = require('https')
const fetch = require('node-fetch') // Если установлен

async function testCompetitorMonitoring() {
  console.log('🚀 Запуск теста мониторинга конкурентов...')
  
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
    const response = await fetch('http://localhost:3000/api/competitor-monitoring', {
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
    const response = await fetch('http://localhost:3000/api/competitor-monitoring/status/natgeo?user_telegram_id=144022504&bot_name=neuro_blogger_bot')
    const result = await response.json()
    
    if (result.success && result.monitoring) {
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
    const { createClient } = require('@supabase/supabase-js')
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Получаем подписки
    const { data: subscriptions, error: subError } = await supabase
      .from('competitor_subscriptions')
      .select(`
        *,
        competitor_profiles(display_name, followers_count)
      `)
      .eq('user_telegram_id', '144022504')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (subError) {
      throw subError
    }
    
    console.log(`📊 Найдено ${subscriptions.length} подписок:`)
    subscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. @${sub.competitor_username}`)
      console.log(`   🎯 Макс рилзов: ${sub.max_reels}`)
      console.log(`   👁 Мин просмотров: ${sub.min_views}`)
      console.log(`   ⏰ Создана: ${sub.created_at}`)
      console.log(`   ✅ Активна: ${sub.is_active}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Ошибка проверки подписок:', error.message)
  }
}

// Запуск тестов
async function runAllTests() {
  await testCompetitorMonitoring()
  
  // Ждем немного перед проверкой результатов
  console.log('\n⏳ Ждем 5 секунд перед проверкой...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  await checkSubscriptionStatus()
  await testGetCompetitorStatus()
}

// Проверяем переменные окружения
if (!process.env.SUPABASE_URL) {
  console.error('❌ SUPABASE_URL не настроена')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY не настроена')
  process.exit(1)
}

if (!process.env.INNGEST_EVENT_KEY) {
  console.error('❌ INNGEST_EVENT_KEY не настроена')
  process.exit(1)
}

runAllTests().catch(console.error)