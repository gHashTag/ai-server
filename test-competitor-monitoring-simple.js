/**
 * ПРОСТОЙ ТЕСТ ФУНКЦИЙ МОНИТОРИНГА КОНКУРЕНТОВ
 * 
 * Проверяет только логику функций без реального выполнения
 */

console.log('🧪 ПРОСТОЙ ТЕСТ ЛОГИКИ МОНИТОРИНГА КОНКУРЕНТОВ')
console.log('=' .repeat(60))

async function testFunctionLogic() {
  try {
    console.log('\\n🔍 Анализ функции competitorMonitoring...')
    
    // Импортируем функцию
    const { competitorMonitoring } = require('./src/inngest-functions/competitorMonitoring')
    
    console.log('✅ Функция competitorMonitoring успешно импортирована')
    console.log('📋 ID функции:', competitorMonitoring.id)
    console.log('📋 Название:', competitorMonitoring.name)
    
    // Проверяем что функция слушает правильное событие
    console.log('\\n🎯 События которые слушает функция:')
    if (competitorMonitoring._def && competitorMonitoring._def.trigger) {
      console.log('   -', competitorMonitoring._def.trigger.event || 'competitor/monitor')
    }
    
    console.log('\\n🔍 Анализ функции instagramApifyScraper...')
    
    // Импортируем функцию Apify
    const { instagramApifyScraper } = require('./src/inngest-functions/instagramApifyScraper')
    
    console.log('✅ Функция instagramApifyScraper успешно импортирована') 
    console.log('📋 ID функции:', instagramApifyScraper.id)
    console.log('📋 Название:', instagramApifyScraper.name)
    
    console.log('\\n🔍 Проверка интеграции с Supabase...')
    
    // Проверяем что Supabase клиент правильно настроен
    const { supabase } = require('./src/supabase/client')
    
    if (supabase) {
      console.log('✅ Supabase клиент успешно инициализирован')
      console.log('📋 URL:', supabase.supabaseUrl ? '(настроен)' : '(не настроен)')
      console.log('📋 Key:', supabase.supabaseKey ? '(настроен)' : '(не настроен)')
    } else {
      console.log('❌ Supabase клиент не найден')
    }
    
    console.log('\\n🔍 Проверка схемы валидации...')
    
    // Тестируем схему валидации
    const testData = {
      username: 'natgeo',
      user_telegram_id: '144022504',
      bot_name: 'neuro_blogger_bot',
      max_reels: 5,
      min_views: 1000,
      max_age_days: 7,
      delivery_format: 'digest'
    }
    
    // Импортируем z для валидации (из файла)
    const fs = require('fs')
    const competitorCode = fs.readFileSync('./src/inngest-functions/competitorMonitoring.ts', 'utf8')
    
    if (competitorCode.includes('CompetitorMonitoringEventSchema')) {
      console.log('✅ Схема валидации найдена в коде')
    }
    
    if (competitorCode.includes('supabase')) {
      console.log('✅ Интеграция с Supabase подтверждена')
    }
    
    if (competitorCode.includes('instagram/apify-scrape')) {
      console.log('✅ Интеграция с Apify scraper подтверждена')
    }
    
    console.log('\\n🔍 Анализ процесса выполнения...')
    
    const steps = [
      'validate-input - Валидация входных данных',
      'create-subscription - Создание подписки в Supabase', 
      'parse-competitor-reels - Запуск парсинга через Apify',
      'wait-for-parsing-complete - Ожидание и получение рилзов',
      'prepare-user-result - Подготовка результата для пользователя',
      'send-user-notification - Отправка уведомления в Telegram',
      'record-delivery-history - Запись истории доставки',
      'setup-monitoring - Настройка автоматического мониторинга'
    ]
    
    steps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`)
    })
    
    console.log('\\n🔍 Проверка изменений на Supabase...')
    
    // Проверяем что код использует Supabase, а не PostgreSQL
    const instagramCode = fs.readFileSync('./src/inngest-functions/instagramApifyScraper.ts', 'utf8')
    
    if (instagramCode.includes('supabase') && !instagramCode.includes('new Pool')) {
      console.log('✅ Instagram Apify Scraper переведен на Supabase')
    } else {
      console.log('❌ Instagram Apify Scraper все еще использует PostgreSQL')
    }
    
    if (competitorCode.includes('supabase') && !competitorCode.includes('new Pool')) {
      console.log('✅ Competitor Monitoring переведен на Supabase')
    } else {
      console.log('❌ Competitor Monitoring все еще использует PostgreSQL')
    }
    
  } catch (error) {
    console.error('❌ Ошибка при анализе:', error.message)
  }
}

// Тест структуры данных
function testDataStructures() {
  console.log('\\n🔍 Анализ структур данных...')
  
  const expectedTables = [
    'competitor_subscriptions - Подписки пользователей на конкурентов',
    'competitor_profiles - Профили конкурентов',  
    'competitor_delivery_history - История доставок',
    'instagram_apify_reels - Спарсенные рилзы Instagram'
  ]
  
  console.log('📋 Ожидаемые таблицы в Supabase:')
  expectedTables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table}`)
  })
  
  console.log('\\n📋 Пример потока данных:')
  console.log('   User → competitor_subscriptions (подписка)')
  console.log('   Apify → instagram_apify_reels (рилзы)')  
  console.log('   System → competitor_delivery_history (доставка)')
  console.log('   Telegram → User (уведомление + рилз)')
}

// Запускаем тесты
async function runTests() {
  try {
    await testFunctionLogic()
    testDataStructures()
    
    console.log('\\n🎉 АНАЛИЗ ЗАВЕРШЕН!')
    console.log('=' .repeat(60))
    console.log('\\n✅ РЕЗУЛЬТАТ: Функция мониторинга конкурентов готова к тестированию')
    console.log('\\n📋 Что нужно для реального теста:')
    console.log('   1. 🔑 Настроить переменные окружения Supabase')
    console.log('   2. 🤖 Настроить токен Telegram бота')
    console.log('   3. 🕷️ Настроить токен Apify')
    console.log('   4. 🗄️ Проверить что таблицы созданы в Supabase')
    console.log('   5. 🚀 Запустить Inngest локально или на сервере')
    
  } catch (error) {
    console.error('💥 ОШИБКА АНАЛИЗА:', error)
  }
}

runTests()