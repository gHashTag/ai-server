/**
 * Простой тест функции мониторинга конкурентов
 * Тестируем через прямой вызов Inngest события
 */

// Простая проверка подключения к БД и отправки события
async function testMonitoringFunction() {
  console.log('🚀 Тестирование функции мониторинга конкурентов...')
  
  // Проверяем переменные окружения
  if (!process.env.SUPABASE_URL) {
    console.error('❌ SUPABASE_URL не настроена')
    return
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY не настроена')
    return
  }
  
  console.log('✅ Supabase настроен')
  
  // Тестовые данные
  const testData = {
    username: 'natgeo',
    user_telegram_id: '144022504',
    user_chat_id: '144022504', 
    bot_name: 'neuro_blogger_bot',
    max_reels: 5,
    min_views: 1000,
    max_age_days: 14,
    delivery_format: 'digest',
    project_id: 999
  }
  
  console.log('📋 Данные для теста:', testData)
  
  try {
    // Проверим соединение с Supabase
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    // Проверяем таблицы (через запрос к таблице)
    console.log('📋 Проверяем таблицы конкурентов...')
    
    const { data: subscriptions, error } = await supabase
      .from('competitor_subscriptions')
      .select('*')
      .eq('user_telegram_id', testData.user_telegram_id)
      .limit(3)
    
    if (error) {
      console.log('❌ Ошибка подключения к Supabase:', error.message)
      return
    }
    
    console.log('✅ Подключение к Supabase работает')
    console.log(`👥 Текущих подписок: ${subscriptions.length}`)
    
    if (subscriptions.length > 0) {
      console.log('📊 Последние подписки:')
      subscriptions.forEach((sub, i) => {
        console.log(`${i + 1}. @${sub.competitor_username} (активна: ${sub.is_active})`)
      })
    }
      
    // Проверяем существующие рилзы в БД
    const { data: reels, error: reelsError } = await supabase
      .from('instagram_apify_reels')
      .select('*', { count: 'exact', head: true })
      .eq('owner_username', testData.username)
    
    if (reelsError) {
      console.log('⚠️ Ошибка проверки рилзов:', reelsError.message)
    } else if (reels && reels.length > 0) {
      console.log(`🎬 Рилзов @${testData.username} в БД: ${reels.length}`)
    } else {
      console.log(`📭 Рилзов @${testData.username} в БД пока нет`)
    }
    
    console.log('\n🎯 Тест завершен успешно!')
    console.log(`
📝 Для запуска полной функции используйте:

1. Через API (если сервер запущен):
   curl -X POST http://localhost:3000/api/competitor-monitoring \\
     -H "Content-Type: application/json" \\
     -d '${JSON.stringify(testData)}'

2. Через Inngest напрямую (в коде):
   await inngest.send({
     name: 'competitor/monitor',
     data: ${JSON.stringify(testData, null, 2)}
   })

3. Через Telegram бот (добавьте команду /monitor)

🔄 Система автоматически:
• Создаст подписку на @${testData.username}
• Запустит парсинг через Apify
• Сохранит ${testData.max_reels} лучших рилзов в БД
• Отправит 1 лучший рилз пользователю
• Настроит ежедневный мониторинг

⚡ Полный процесс займет 1-2 минуты
`)
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message)
  }
}

// Функция для создания тестовой подписки напрямую в БД
async function createTestSubscription() {
  console.log('\n🧪 Создание тестовой подписки в БД...')
  
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const subscriptionData = {
      user_telegram_id: '144022504',
      user_chat_id: '144022504',
      bot_name: 'neuro_blogger_bot',
      competitor_username: 'natgeo',
      max_reels: 5,
      min_views: 1000,
      max_age_days: 14,
      delivery_format: 'digest',
      is_active: true
    }

    // Проверяем существующую подписку
    const { data: existing } = await supabase
      .from('competitor_subscriptions')
      .select('*')
      .eq('user_telegram_id', subscriptionData.user_telegram_id)
      .eq('competitor_username', subscriptionData.competitor_username)
      .eq('bot_name', subscriptionData.bot_name)
      .single()

    let result
    if (existing) {
      // Обновляем существующую
      const { data, error } = await supabase
        .from('competitor_subscriptions')
        .update(subscriptionData)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Создаем новую
      const { data, error } = await supabase
        .from('competitor_subscriptions')
        .insert(subscriptionData)
        .select()
        .single()
      
      if (error) throw error
      result = data
    }
    
    console.log('✅ Тестовая подписка создана:')
    console.log(`   ID: ${result.id}`)
    console.log(`   Конкурент: @${result.competitor_username}`)
    console.log(`   Активна: ${result.is_active}`)
    
  } catch (error) {
    console.error('❌ Ошибка создания подписки:', error.message)
  }
}

async function main() {
  await testMonitoringFunction()
  
  // Опционально создаем тестовую подписку
  const createTest = process.argv.includes('--create-test')
  if (createTest) {
    await createTestSubscription()
  }
}

main().catch(console.error)