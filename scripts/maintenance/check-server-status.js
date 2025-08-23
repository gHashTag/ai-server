/**
 * Проверка текущего состояния Railway сервера
 */

const axios = require('axios')

const RAILWAY_URL = 'https://ai-server-production-production-8e2d.up.railway.app'

async function checkServerStatus() {
  console.log('🔍 === ПРОВЕРКА СОСТОЯНИЯ СЕРВЕРА ===\n')
  
  const endpoints = [
    { name: 'Health Check', url: `${RAILWAY_URL}/health` },
    { name: 'Root Endpoint', url: `${RAILWAY_URL}/` },
    { name: 'Competitor Stats', url: `${RAILWAY_URL}/api/competitor-subscriptions/stats` },
    { name: 'Competitor Base', url: `${RAILWAY_URL}/api/competitor-subscriptions` },
    { name: 'Video Generation', url: `${RAILWAY_URL}/generate/text-to-video` },
    { name: 'Video Status (Example)', url: `${RAILWAY_URL}/generate/text-to-video/status/test123` },
  ]

  console.log(`🌐 Тестируем сервер: ${RAILWAY_URL}\n`)

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Проверяем: ${endpoint.name}`)
      console.log(`   URL: ${endpoint.url}`)
      
      const startTime = Date.now()
      const response = await axios.get(endpoint.url, { 
        timeout: 10000,
        validateStatus: () => true // Не выбрасывать ошибку для любого статуса
      })
      const responseTime = Date.now() - startTime
      
      console.log(`   ✅ Статус: ${response.status}`)
      console.log(`   ⏱️ Время ответа: ${responseTime}ms`)
      
      if (response.data) {
        if (typeof response.data === 'object') {
          console.log(`   📊 Данные:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...')
        } else {
          console.log(`   📊 Данные:`, response.data.toString().substring(0, 100) + '...')
        }
      }
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`   🟢 РАБОТАЕТ`)
      } else if (response.status === 404) {
        console.log(`   🟡 НЕ НАЙДЕН (404)`)
      } else if (response.status === 502) {
        console.log(`   🔴 СЕРВЕР НЕДОСТУПЕН (502)`)
      } else {
        console.log(`   🟡 ПРОБЛЕМА (${response.status})`)
      }
      
    } catch (error) {
      console.log(`   🔴 ОШИБКА: ${error.message}`)
      if (error.code === 'ECONNREFUSED') {
        console.log(`   💀 Сервер не отвечает`)
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`   ⏰ Таймаут`)
      }
    }
    
    console.log('')
  }

  // Специальная проверка POST запроса на создание подписки
  console.log('🧪 Тестируем POST запрос на создание подписки...')
  try {
    const createResponse = await axios.post(`${RAILWAY_URL}/api/competitor-subscriptions`, {
      user_telegram_id: 'test_check_123',
      user_chat_id: 'test_check_123', 
      bot_name: 'health_check_bot',
      competitor_username: 'test_competitor',
      max_reels: 5,
      min_views: 1000,
      max_age_days: 7,
      delivery_format: 'digest'
    }, { 
      timeout: 10000,
      validateStatus: () => true
    })
    
    console.log(`   ✅ POST статус: ${createResponse.status}`)
    if (createResponse.data) {
      console.log(`   📊 POST ответ:`, JSON.stringify(createResponse.data, null, 2).substring(0, 300) + '...')
    }
    
    // Если создали тестовую подписку, сразу удалим её
    if (createResponse.status === 200 && createResponse.data.subscription?.id) {
      const deleteResponse = await axios.delete(`${RAILWAY_URL}/api/competitor-subscriptions/${createResponse.data.subscription.id}`, {
        timeout: 5000,
        validateStatus: () => true
      })
      console.log(`   🗑️ Тестовая подписка удалена: ${deleteResponse.status}`)
    }
    
  } catch (error) {
    console.log(`   🔴 POST ОШИБКА: ${error.message}`)
  }

  console.log('\n🎯 === ПРОВЕРКА ЗАВЕРШЕНА ===')
}

checkServerStatus().catch(console.error)