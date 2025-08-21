/**
 * ПОЛНЫЙ ТЕСТ ФУНКЦИИ МОНИТОРИНГА КОНКУРЕНТОВ
 * 
 * Проверяет всю цепочку:
 * 1. Создание подписки
 * 2. Запуск парсинга через Apify
 * 3. Сохранение в Supabase
 * 4. Отправка результата пользователю
 */

console.log('🧪 ПОЛНЫЙ ТЕСТ ФУНКЦИИ МОНИТОРИНГА КОНКУРЕНТОВ')
console.log('=' .repeat(60))

// Проверяем переменные окружения
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY', 
  'BOT_TOKEN_1',
  'APIFY_TOKEN'
]

console.log('🔍 Проверка переменных окружения...')
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют переменные окружения:', missingVars)
  console.log('Используйте: export $(cat .env.temp | xargs)')
  process.exit(1)
}

console.log('✅ Все переменные окружения найдены')

// Импортируем необходимые модули
const { triggerCompetitorMonitoring } = require('./src/inngest-functions/competitorMonitoring')

// Тестовые данные
const testData = {
  username: 'natgeo', // Используем популярный аккаунт National Geographic
  user_telegram_id: '144022504', // Ваш telegram ID
  user_chat_id: '144022504',
  bot_name: 'neuro_blogger_bot',
  max_reels: 5, // Небольшое количество для теста
  min_views: 1000,
  max_age_days: 7,
  delivery_format: 'digest',
  project_id: 999 // Тестовый проект ID
}

async function testCompetitorMonitoring() {
  try {
    console.log('\\n🚀 Запуск функции мониторинга конкурентов...')
    console.log('📋 Данные теста:', JSON.stringify(testData, null, 2))
    
    // Запускаем функцию мониторинга
    const startTime = Date.now()
    console.log('⏰ Время начала:', new Date().toISOString())
    
    const result = await triggerCompetitorMonitoring(testData)
    
    console.log('\\n✅ Функция запущена успешно!')
    console.log('📝 ID события:', result.eventId)
    console.log('⏱️ Время выполнения:', Date.now() - startTime, 'мс')
    
    console.log('\\n⏳ Ожидание завершения процесса...')
    console.log('(Функция выполняется асинхронно через Inngest)')
    
    // Даем время на выполнение
    await new Promise(resolve => setTimeout(resolve, 30000)) // 30 секунд
    
    console.log('\\n🔍 Проверка результатов в базе данных...')
    await checkDatabaseResults()
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error)
    console.error('📋 Детали ошибки:', error.stack)
  }
}

async function checkDatabaseResults() {
  try {
    // Импортируем Supabase клиент
    const { supabase } = require('./src/supabase/client')
    
    // Проверяем подписку
    const { data: subscription, error: subError } = await supabase
      .from('competitor_subscriptions')
      .select('*')
      .eq('competitor_username', testData.username)
      .eq('user_telegram_id', testData.user_telegram_id)
      .eq('bot_name', testData.bot_name)
      .single()
    
    if (subError) {
      console.log('⚠️ Подписка не найдена:', subError.message)
    } else {
      console.log('✅ Подписка создана:', {
        id: subscription.id,
        competitor: subscription.competitor_username,
        active: subscription.is_active,
        created: subscription.created_at
      })
    }
    
    // Проверяем рилзы в БД
    const { data: reels, error: reelsError } = await supabase
      .from('instagram_apify_reels')
      .select('*')
      .eq('owner_username', testData.username)
      .eq('project_id', testData.project_id)
      .order('scraped_at', { ascending: false })
      .limit(5)
    
    if (reelsError) {
      console.log('⚠️ Рилзы не найдены:', reelsError.message)
    } else {
      console.log(`\\n📦 Найдено рилзов в БД: ${reels?.length || 0}`)
      
      if (reels && reels.length > 0) {
        console.log('🎬 Последний рилз:')
        const latestReel = reels[0]
        console.log({
          id: latestReel.reel_id,
          url: latestReel.url,
          caption: latestReel.caption?.substring(0, 100) + '...',
          views: latestReel.views_count,
          likes: latestReel.likes_count,
          published: latestReel.published_at,
          scraped: latestReel.scraped_at
        })
      }
    }
    
    // Проверяем историю доставки
    if (subscription) {
      const { data: deliveryHistory, error: deliveryError } = await supabase
        .from('competitor_delivery_history')
        .select('*')
        .eq('subscription_id', subscription.id)
        .order('delivered_at', { ascending: false })
        .limit(1)
      
      if (!deliveryError && deliveryHistory?.length > 0) {
        console.log('\\n📬 История доставки:')
        const delivery = deliveryHistory[0]
        console.log({
          status: delivery.delivery_status,
          reels_count: delivery.reels_count,
          delivered_at: delivery.delivered_at
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки БД:', error)
  }
}

// Запускаем тест
testCompetitorMonitoring()
  .then(() => {
    console.log('\\n🎉 ТЕСТ ЗАВЕРШЕН!')
    console.log('=' .repeat(60))
    console.log('📋 Что должно было произойти:')
    console.log('  1. ✅ Создана подписка в competitor_subscriptions')
    console.log('  2. 🎬 Запущен парсинг через Apify')
    console.log('  3. 💾 Рилзы сохранены в instagram_apify_reels')
    console.log('  4. 📝 Записана история в competitor_delivery_history')
    console.log('  5. 📱 Отправлено уведомление в Telegram')
    console.log('\\n📞 Проверьте Telegram на наличие сообщения от бота!')
  })
  .catch(error => {
    console.error('💥 ФАТАЛЬНАЯ ОШИБКА:', error)
    process.exit(1)
  })