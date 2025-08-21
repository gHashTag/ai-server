/**
 * АНАЛИЗ ФУНКЦИЙ МОНИТОРИНГА КОНКУРЕНТОВ
 * 
 * Проверяет что код правильно настроен на Supabase
 */

const fs = require('fs')
const path = require('path')

console.log('🧪 АНАЛИЗ ФУНКЦИЙ МОНИТОРИНГА КОНКУРЕНТОВ')
console.log('=' .repeat(60))

function analyzeFile(filePath, fileName) {
  console.log(`\\n🔍 Анализ файла: ${fileName}`)
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ Файл не найден:', filePath)
    return false
  }
  
  const content = fs.readFileSync(filePath, 'utf8')
  
  // Проверяем базовые требования
  const checks = [
    {
      name: 'Импорт Supabase',
      test: content.includes("from '@/supabase/client'"),
      required: true
    },
    {
      name: 'Отсутствие PostgreSQL Pool',
      test: !content.includes('new Pool'),
      required: true
    },
    {
      name: 'Использование supabase.from',
      test: content.includes('supabase.from'),
      required: true
    },
    {
      name: 'Отсутствие client.query',
      test: !content.includes('client.query'),
      required: true
    }
  ]
  
  let allPassed = true
  
  checks.forEach(check => {
    const status = check.test ? '✅' : '❌'
    console.log(`   ${status} ${check.name}`)
    
    if (check.required && !check.test) {
      allPassed = false
    }
  })
  
  return allPassed
}

function analyzeCompetitorMonitoring() {
  const filePath = './src/inngest-functions/competitorMonitoring.ts'
  const content = fs.readFileSync(filePath, 'utf8')
  
  console.log('\\n📋 Анализ процесса competitorMonitoring:')
  
  // Проверяем все шаги
  const steps = [
    'validate-input',
    'create-subscription', 
    'parse-competitor-reels',
    'wait-for-parsing-complete',
    'prepare-user-result',
    'send-user-notification',
    'record-delivery-history',
    'setup-monitoring'
  ]
  
  steps.forEach(step => {
    const found = content.includes(step)
    console.log(`   ${found ? '✅' : '❌'} ${step}`)
  })
  
  // Проверяем интеграцию с Apify
  const apifyIntegration = content.includes("'instagram/apify-scrape'")
  console.log(`   ${apifyIntegration ? '✅' : '❌'} Интеграция с Apify scraper`)
  
  // Проверяем Telegram интеграцию
  const telegramIntegration = content.includes('getBotByName')
  console.log(`   ${telegramIntegration ? '✅' : '❌'} Интеграция с Telegram`)
  
  return content
}

function analyzeApifyScraper() {
  const filePath = './src/inngest-functions/instagramApifyScraper.ts'
  const content = fs.readFileSync(filePath, 'utf8')
  
  console.log('\\n📋 Анализ instagramApifyScraper:')
  
  // Проверяем что используется upsert
  const usesUpsert = content.includes('.upsert(')
  console.log(`   ${usesUpsert ? '✅' : '❌'} Использует Supabase upsert`)
  
  // Проверяем схему данных
  const hasReelMapping = content.includes('reel_id') && content.includes('video_url')
  console.log(`   ${hasReelMapping ? '✅' : '❌'} Правильная схема данных рилзов`)
  
  // Проверяем обработку Apify данных
  const processesApifyData = content.includes('ApifyReelItem')
  console.log(`   ${processesApifyData ? '✅' : '❌'} Обработка данных Apify`)
  
  return content
}

function checkSupabaseIntegration() {
  console.log('\\n🔍 Проверка интеграции Supabase...')
  
  const clientPath = './src/supabase/client.ts'
  
  if (!fs.existsSync(clientPath)) {
    console.log('❌ Supabase client не найден')
    return false
  }
  
  const clientContent = fs.readFileSync(clientPath, 'utf8')
  
  const hasCreateClient = clientContent.includes('createClient')
  const hasExport = clientContent.includes('export const supabase')
  
  console.log(`   ${hasCreateClient ? '✅' : '❌'} Инициализация Supabase клиента`)
  console.log(`   ${hasExport ? '✅' : '❌'} Экспорт supabase объекта`)
  
  return hasCreateClient && hasExport
}

function checkExpectedTables() {
  console.log('\\n📋 Ожидаемые таблицы в Supabase:')
  
  const tables = [
    {
      name: 'competitor_subscriptions',
      description: 'Подписки пользователей на конкурентов',
      requiredFields: ['user_telegram_id', 'competitor_username', 'bot_name', 'is_active']
    },
    {
      name: 'competitor_profiles', 
      description: 'Профили конкурентов',
      requiredFields: ['username', 'total_subscribers']
    },
    {
      name: 'competitor_delivery_history',
      description: 'История доставок',
      requiredFields: ['subscription_id', 'reels_count', 'delivery_status']
    },
    {
      name: 'instagram_apify_reels',
      description: 'Спарсенные рилзы Instagram',
      requiredFields: ['reel_id', 'url', 'owner_username', 'project_id', 'views_count']
    }
  ]
  
  tables.forEach((table, index) => {
    console.log(`   ${index + 1}. ${table.name} - ${table.description}`)
    console.log(`      Поля: ${table.requiredFields.join(', ')}`)
  })
}

// Главная функция анализа
async function runAnalysis() {
  try {
    // Анализируем основные файлы
    const competitorFile = './src/inngest-functions/competitorMonitoring.ts'
    const apifyFile = './src/inngest-functions/instagramApifyScraper.ts'
    
    const competitorOk = analyzeFile(competitorFile, 'competitorMonitoring.ts')
    const apifyOk = analyzeFile(apifyFile, 'instagramApifyScraper.ts')
    
    // Детальный анализ
    analyzeCompetitorMonitoring()
    analyzeApifyScraper()
    
    // Проверяем Supabase
    const supabaseOk = checkSupabaseIntegration()
    
    // Показываем ожидаемые таблицы
    checkExpectedTables()
    
    console.log('\\n🎯 СВОДКА РЕЗУЛЬТАТОВ:')
    console.log('=' .repeat(40))
    console.log(`✅ CompetitorMonitoring на Supabase: ${competitorOk ? 'ДА' : 'НЕТ'}`)
    console.log(`✅ InstagramApifyScraper на Supabase: ${apifyOk ? 'ДА' : 'НЕТ'}`)
    console.log(`✅ Supabase клиент настроен: ${supabaseOk ? 'ДА' : 'НЕТ'}`)
    
    const allReady = competitorOk && apifyOk && supabaseOk
    
    if (allReady) {
      console.log('\\n🎉 ВСЕ ГОТОВО ДЛЯ ТЕСТИРОВАНИЯ!')
      console.log('\\n📋 Следующие шаги:')
      console.log('   1. 🗄️ Создать таблицы в Supabase (если не созданы)')
      console.log('   2. ⚙️ Настроить переменные окружения')
      console.log('   3. 🚀 Запустить Inngest сервер')
      console.log('   4. 🧪 Протестировать с реальными данными')
    } else {
      console.log('\\n⚠️ ТРЕБУЮТСЯ ИСПРАВЛЕНИЯ')
      console.log('Некоторые компоненты еще не готовы')
    }
    
  } catch (error) {
    console.error('💥 ОШИБКА АНАЛИЗА:', error.message)
  }
}

runAnalysis()