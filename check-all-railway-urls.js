/**
 * Проверка всех возможных Railway URL'ов
 */

const axios = require('axios')

const POSSIBLE_URLS = [
  'https://ai-server-production-d5e9.up.railway.app',
  'https://ai-server-production-production-8e2d.up.railway.app',
  'https://ai-server-express.railway.app',
  'https://web-production-d5e9.up.railway.app',
  'https://ai-server-production.up.railway.app'
]

async function checkAllURLs() {
  console.log('🔍 === ПОИСК РАБОЧЕГО RAILWAY URL ===\n')
  
  for (const url of POSSIBLE_URLS) {
    console.log(`🌐 Проверяем: ${url}`)
    
    try {
      const startTime = Date.now()
      const response = await axios.get(`${url}/health`, { 
        timeout: 8000,
        validateStatus: () => true
      })
      const responseTime = Date.now() - startTime
      
      console.log(`   ✅ Статус: ${response.status} (${responseTime}ms)`)
      
      if (response.data) {
        console.log(`   📊 Ответ:`, JSON.stringify(response.data, null, 2).substring(0, 150) + '...')
      }
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`   🟢 РАБОЧИЙ URL НАЙДЕН! `)
        
        // Тестируем основные endpoint'ы на найденном URL
        await testWorkingServer(url)
        return url
        
      } else if (response.status === 404 && !response.data?.message?.includes('Application not found')) {
        console.log(`   🟡 Сервер отвечает, но endpoint /health не найден`)
        
        // Попробуем root endpoint
        try {
          const rootResponse = await axios.get(url, { timeout: 5000, validateStatus: () => true })
          if (rootResponse.status < 300) {
            console.log(`   🟢 ROOT ENDPOINT РАБОТАЕТ!`)
            await testWorkingServer(url)
            return url
          }
        } catch (e) {
          console.log(`   🔴 Root endpoint тоже не работает`)
        }
        
      } else if (response.data?.message?.includes('Application not found')) {
        console.log(`   🔴 Application not found - неверный URL`)
      } else {
        console.log(`   🟡 Неожиданный ответ`)
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   🔴 Соединение отклонено`)
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   ⏰ Таймаут`)
      } else if (error.code === 'ENOTFOUND') {
        console.log(`   🔴 URL не найден`)
      } else {
        console.log(`   🔴 Ошибка: ${error.message}`)
      }
    }
    
    console.log('')
  }
  
  console.log('❌ Рабочий URL не найден!')
  return null
}

async function testWorkingServer(baseUrl) {
  console.log(`\n🧪 === ТЕСТИРОВАНИЕ РАБОЧЕГО СЕРВЕРА: ${baseUrl} ===`)
  
  const testEndpoints = [
    { name: 'Health', path: '/health' },
    { name: 'Root', path: '/' },
    { name: 'Competitor Stats', path: '/api/competitor-subscriptions/stats' },
    { name: 'Competitor Base', path: '/api/competitor-subscriptions' },
    { name: 'Video Generation', path: '/generate/text-to-video' },
  ]
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint.path}`, { 
        timeout: 5000,
        validateStatus: () => true 
      })
      
      if (response.status < 300) {
        console.log(`   ✅ ${endpoint.name}: ${response.status} OK`)
      } else if (response.status === 404) {
        console.log(`   🟡 ${endpoint.name}: 404 Not Found`)
      } else {
        console.log(`   ⚠️ ${endpoint.name}: ${response.status}`)
      }
      
    } catch (error) {
      console.log(`   🔴 ${endpoint.name}: ERROR ${error.message}`)
    }
  }
  
  // Тест создания подписки
  console.log('\n🔄 Тестируем POST создание подписки...')
  try {
    const createResponse = await axios.post(`${baseUrl}/api/competitor-subscriptions`, {
      user_telegram_id: 'health_test_user',
      user_chat_id: 'health_test_user',
      bot_name: 'health_check_bot',
      competitor_username: 'test_health_check',
      max_reels: 3,
      min_views: 500,
      max_age_days: 5,
      delivery_format: 'digest'
    }, { 
      timeout: 8000,
      validateStatus: () => true 
    })
    
    console.log(`   📋 POST статус: ${createResponse.status}`)
    if (createResponse.status < 300) {
      console.log(`   ✅ POST работает! Создана подписка`)
      
      // Сразу удаляем тестовую подписку
      if (createResponse.data?.subscription?.id) {
        try {
          await axios.delete(`${baseUrl}/api/competitor-subscriptions/${createResponse.data.subscription.id}`, { timeout: 5000 })
          console.log(`   🗑️ Тестовая подписка удалена`)
        } catch (e) {
          console.log(`   ⚠️ Не удалось удалить тестовую подписку`)
        }
      }
    } else {
      console.log(`   ❌ POST не работает`)
    }
    
  } catch (error) {
    console.log(`   🔴 POST ошибка: ${error.message}`)
  }
}

checkAllURLs()
  .then(workingUrl => {
    if (workingUrl) {
      console.log(`\n🎉 === РЕЗУЛЬТАТ ===`)
      console.log(`✅ Рабочий URL: ${workingUrl}`)
      console.log(`🔗 Сохраните этот URL для дальнейшего использования!`)
    } else {
      console.log(`\n💀 === РЕЗУЛЬТАТ ===`)
      console.log(`❌ Ни один URL не работает`)
      console.log(`🚨 Возможно, сервер временно недоступен или нужен новый deployment`)
    }
  })
  .catch(console.error)