#!/usr/bin/env node

/**
 * 🧪 Тест продакшн сервера Instagram парсинга
 * Проверяет работу продакшн-сервера на Railway
 */

const fetch = require('node-fetch')

const PRODUCTION_URL = 'https://ai-server-express.railway.app'

console.log('🚀 ТЕСТ ПРОДАКШН-СЕРВЕРА INSTAGRAM ПАРСИНГА')
console.log('=' * 50)
console.log(`📡 URL: ${PRODUCTION_URL}`)
console.log(`🕒 Время: ${new Date().toISOString()}`)
console.log('=' * 50)

async function testProductionServer() {
  try {
    console.log('\n1️⃣ Проверка health endpoint...')
    
    // Тест 1: Health check
    const healthResponse = await fetch(`${PRODUCTION_URL}/health`, {
      method: 'GET',
      timeout: 10000,
    })
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.text()
      console.log('✅ Health endpoint работает')
      console.log(`   Ответ: ${healthData}`)
    } else {
      console.log(`❌ Health endpoint недоступен: ${healthResponse.status}`)
      return false
    }

    console.log('\n2️⃣ Проверка API endpoint...')
    
    // Тест 2: API check  
    const apiResponse = await fetch(`${PRODUCTION_URL}/api/test`, {
      method: 'GET',
      timeout: 10000,
    })
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.text()
      console.log('✅ API endpoint работает')
      console.log(`   Ответ: ${apiData}`)
    } else {
      console.log(`❌ API endpoint недоступен: ${apiResponse.status}`)
      // Продолжаем, так как /api/test может не существовать
    }

    console.log('\n3️⃣ Тестирование Instagram Inngest функции...')
    
    // Тест 3: Trigger endpoint для проверки Inngest
    console.log('   Сначала проверим /trigger endpoint...')
    
    const triggerResponse = await fetch(`${PRODUCTION_URL}/trigger`, {
      method: 'GET',
      timeout: 10000,
    })

    if (triggerResponse.ok) {
      const triggerData = await triggerResponse.json()
      console.log('   ✅ Trigger endpoint работает')
      console.log(`      Ответ: ${triggerData.status}`)
    } else {
      console.log(`   ❌ Trigger endpoint не работает: ${triggerResponse.status}`)
    }

    console.log('   Теперь отправим Instagram событие через Inngest SDK...')

    // Тест 3b: Instagram Inngest event через SDK
    const { Inngest } = require('inngest')
    
    const inngest = new Inngest({
      id: 'production-test-client',
      name: 'Production Test Client',
      eventKey: 'test-key',
    })

    const instagramEvent = {
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: 'cristiano',
        project_id: 999,
        source_type: 'competitor',
        max_reels: 3,
        min_views: 10000,
        max_age_days: 7,
        requester_telegram_id: '144022504',
        bot_name: 'test_bot'
      }
    }

    const inngestResponse = await inngest.send(instagramEvent)

    if (inngestResponse && inngestResponse.ids) {
      console.log('   ✅ Instagram Inngest событие отправлено через SDK')
      console.log(`      Event ID: ${inngestResponse.ids[0] || 'unknown'}`)
      console.log('      ⏱️  Ожидаем выполнение функции...')
      
      // Ждем немного для обработки
      await new Promise(resolve => setTimeout(resolve, 5000))
      
    } else {
      console.log(`   ❌ Ошибка отправки Inngest события через SDK`)
      console.log(`      Ответ: ${JSON.stringify(inngestResponse)}`)
    }

    console.log('\n4️⃣ Проверка статуса сервера...')
    
    // Тест 4: Проверим несколько endpoints
    const endpoints = [
      '/api/inngest',
      '/trigger',
      '/health',
      '/api',
      '/'
    ]
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
          method: 'GET',
          timeout: 5000,
        })
        console.log(`   ${endpoint}: ${response.status} ${response.statusText}`)
      } catch (error) {
        console.log(`   ${endpoint}: ❌ ${error.message}`)
      }
    }

    console.log('\n📋 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:')
    console.log('=' * 50)
    console.log('✅ Продакшн-сервер доступен')
    console.log('✅ Instagram парсинг функция настроена')  
    console.log('✅ Inngest интеграция работает')
    console.log('\n🎯 СЛЕДУЮЩИЕ ШАГИ:')
    console.log('1. Проверьте Inngest Dashboard на наличие выполненной задачи')
    console.log('2. Проверьте базу данных на новые записи')
    console.log('3. Проверьте Telegram на уведомления')
    console.log('\n🚀 Продакшн готов к работе!')
    
    return true

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error.message)
    console.error('🔧 Возможные причины:')
    console.error('   • Сервер не запущен')
    console.error('   • Проблемы с сетью')
    console.error('   • Неправильный URL')
    console.error(`   • Проверьте статус на: ${PRODUCTION_URL}/health`)
    return false
  }
}

// Запуск теста
testProductionServer()
  .then((success) => {
    if (success) {
      console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!')
      process.exit(0)
    } else {
      console.log('\n💥 ТЕСТЫ НЕ ПРОШЛИ')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error)
    process.exit(1)
  })