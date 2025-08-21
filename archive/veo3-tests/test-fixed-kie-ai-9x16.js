#!/usr/bin/env node

/**
 * 🔧 ИСПРАВЛЕННЫЙ тест KIE AI API с правильными endpoints 
 * Использует правильные endpoints из документации
 */

require('dotenv').config({ path: '/Users/playra/ai-server/.env' })
const axios = require('axios')
const fs = require('fs')

// Правильная конфигурация KIE AI API (из актуальной документации)
const KIE_AI_CONFIG = {
  BASE_URL: 'https://api.kie.ai',
  API_KEY: process.env.KIE_AI_API_KEY || 'your_kie_ai_api_key_here',
  HEADERS: {
    'Authorization': `Bearer ${process.env.KIE_AI_API_KEY || 'your_kie_ai_api_key_here'}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

console.log('🔧 ИСПРАВЛЕННЫЙ тест KIE AI API с правильными endpoints')
console.log('=' .repeat(65))
console.log(`🔐 API Key: ${KIE_AI_CONFIG.API_KEY ? KIE_AI_CONFIG.API_KEY.slice(0, 20) + '...' : 'НЕ НАЙДЕН'}`)
console.log(`🌐 Base URL: ${KIE_AI_CONFIG.BASE_URL}`)

// ПРАВИЛЬНЫЕ endpoints из документации
const CORRECT_ENDPOINTS = {
  veo_generate: '/api/v1/veo/generate',      // 🎬 Генерация Veo3 видео
  veo_record_info: '/api/v1/veo/record-info', // 📊 Информация о видео 
  veo_get_1080p: '/api/v1/veo/get-1080p-video', // 🎥 Получение HD видео
  chat_credit: '/api/v1/chat/credit',        // 💰 Проверка баланса
  health: '/health'                          // 🏥 Health check
}

console.log('\\n📋 Используемые endpoints:')
Object.entries(CORRECT_ENDPOINTS).forEach(([key, endpoint]) => {
  console.log(`   ${key}: ${endpoint}`)
})

/**
 * Проверка health статуса с правильным endpoint
 */
async function checkHealthFixed() {
  console.log('\\n🏥 Проверка health с правильным endpoint...')
  
  try {
    const response = await axios.get(`${KIE_AI_CONFIG.BASE_URL}${CORRECT_ENDPOINTS.health}`, {
      headers: KIE_AI_CONFIG.HEADERS,
      timeout: 10000
    })
    
    console.log(`✅ Health check успешен: ${response.status}`)
    console.log(`📊 Ответ:`, response.data)
    return true
    
  } catch (error) {
    console.log(`⚠️  Health endpoint недоступен: ${error.response?.status || error.message}`)
    
    // Попробуем альтернативный способ через credit check
    try {
      console.log('   🔄 Пробуем через credit endpoint...')
      const creditResponse = await axios.get(`${KIE_AI_CONFIG.BASE_URL}${CORRECT_ENDPOINTS.chat_credit}`, {
        headers: KIE_AI_CONFIG.HEADERS,
        timeout: 10000
      })
      
      console.log(`✅ Credit check успешен: ${creditResponse.status}`)
      console.log(`💰 Баланс:`, creditResponse.data)
      return true
      
    } catch (creditError) {
      console.error(`❌ Credit check тоже неудачен: ${creditError.response?.status || creditError.message}`)
      return false
    }
  }
}

/**
 * Тест генерации 9:16 видео с правильным endpoint
 */
async function testVeo9x16Generation() {
  console.log('\\n🎯 КРИТИЧЕСКИЙ ТЕСТ: Генерация 9:16 видео')
  console.log('-' .repeat(50))
  
  const testPayload = {
    prompt: 'Beautiful sunset over ocean waves, perfect vertical shot for social media',
    model: 'veo-3-fast',
    duration: 3,
    aspectRatio: '9:16',
    resolution: '720p'
  }
  
  console.log('📋 Параметры запроса:')
  console.log(JSON.stringify(testPayload, null, 2))
  
  try {
    console.log(`\\n🔄 Отправка запроса на ${CORRECT_ENDPOINTS.veo_generate}...`)
    
    const response = await axios.post(
      `${KIE_AI_CONFIG.BASE_URL}${CORRECT_ENDPOINTS.veo_generate}`,
      testPayload,
      {
        headers: KIE_AI_CONFIG.HEADERS,
        timeout: 30000
      }
    )
    
    console.log(`✅ Запрос принят: ${response.status}`)
    console.log(`📊 Ответ:`, JSON.stringify(response.data, null, 2))
    
    // Проверяем структуру ответа
    const data = response.data
    if (data.id || data.task_id || data.record_id) {
      const recordId = data.id || data.task_id || data.record_id
      console.log(`\\n🆔 ID задачи: ${recordId}`)
      
      // Попробуем получить информацию о задаче
      await checkTaskStatus(recordId)
    }
    
    console.log('\\n🎉 КРИТИЧЕСКИЙ ТЕСТ ПРОЙДЕН: 9:16 видео принято к генерации!')
    
    return {
      success: true,
      response: data,
      endpoint: CORRECT_ENDPOINTS.veo_generate
    }
    
  } catch (error) {
    console.error(`❌ Ошибка генерации 9:16: ${error.response?.status || error.message}`)
    
    if (error.response?.data) {
      console.error(`📋 Детали:`, JSON.stringify(error.response.data, null, 2))
    }
    
    console.error('\\n🚨 КРИТИЧЕСКИЙ ТЕСТ НЕ ПРОЙДЕН!')
    
    return {
      success: false,
      error: error.message,
      endpoint: CORRECT_ENDPOINTS.veo_generate
    }
  }
}

/**
 * Проверка статуса задачи
 */
async function checkTaskStatus(recordId) {
  try {
    console.log(`\\n📊 Проверка статуса задачи ${recordId}...`)
    
    const response = await axios.get(
      `${KIE_AI_CONFIG.BASE_URL}${CORRECT_ENDPOINTS.veo_record_info}?id=${recordId}`,
      {
        headers: KIE_AI_CONFIG.HEADERS,
        timeout: 15000
      }
    )
    
    console.log(`✅ Статус получен: ${response.status}`)
    console.log(`📊 Информация о задаче:`, JSON.stringify(response.data, null, 2))
    
    return response.data
    
  } catch (error) {
    console.log(`⚠️  Не удалось получить статус: ${error.response?.status || error.message}`)
    return null
  }
}

/**
 * Тест сравнения 16:9 формата
 */
async function testVeo16x9Generation() {
  console.log('\\n📺 Тест горизонтального 16:9 для сравнения')
  console.log('-' .repeat(40))
  
  const testPayload = {
    prompt: 'Epic mountain landscape with flying eagle, cinematic wide shot',
    model: 'veo-3-fast', 
    duration: 4,
    aspectRatio: '16:9',
    resolution: '1080p'
  }
  
  try {
    const response = await axios.post(
      `${KIE_AI_CONFIG.BASE_URL}${CORRECT_ENDPOINTS.veo_generate}`,
      testPayload,
      {
        headers: KIE_AI_CONFIG.HEADERS,
        timeout: 30000
      }
    )
    
    console.log(`✅ 16:9 видео принято: ${response.status}`)
    console.log(`📊 Ответ:`, JSON.stringify(response.data, null, 2))
    
    return { success: true, response: response.data }
    
  } catch (error) {
    console.error(`❌ 16:9 тест неудачен: ${error.response?.status || error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('\\n🚀 Запуск исправленного тестирования...\\n')
  
  const results = {
    timestamp: new Date().toISOString(),
    api_key_present: !!KIE_AI_CONFIG.API_KEY,
    tests: {}
  }
  
  // 1. Health check
  results.tests.health = await checkHealthFixed()
  
  // 2. Критический тест 9:16
  results.tests.vertical_9x16 = await testVeo9x16Generation()
  
  // 3. Сравнительный тест 16:9
  results.tests.horizontal_16x9 = await testVeo16x9Generation()
  
  // 4. Сохранение результатов
  const reportPath = './test-results-fixed-kie-ai.json'
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  
  // 5. Итоговый отчет
  console.log('\\n' + '='.repeat(65))
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ИСПРАВЛЕННОГО ТЕСТА')
  console.log('='.repeat(65))
  
  console.log(`\\n🔐 API Key: ${results.api_key_present ? '✅ Найден' : '❌ Отсутствует'}`)
  console.log(`🏥 Health Check: ${results.tests.health ? '✅ Работает' : '❌ Не работает'}`) 
  console.log(`🎯 Вертикальное 9:16: ${results.tests.vertical_9x16?.success ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`)
  console.log(`📺 Горизонтальное 16:9: ${results.tests.horizontal_16x9?.success ? '✅ Работает' : '❌ Не работает'}`)
  
  if (results.tests.vertical_9x16?.success) {
    console.log('\\n🎉 УСПЕХ: 9:16 видео генерация работает с исправленными endpoints!')
    console.log('💡 Теперь нужно перезапустить сервер для применения исправлений')
  } else {
    console.log('\\n⚠️  9:16 все еще не работает. Возможные причины:')
    console.log('   1. Неправильный API ключ')
    console.log('   2. Недостаточно средств на аккаунте') 
    console.log('   3. Другие endpoints в документации')
  }
  
  console.log(`\\n📄 Детальный отчет: ${reportPath}`)
  console.log('=' .repeat(65))
}

// Запуск
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1) 
  })
}

module.exports = { checkHealthFixed, testVeo9x16Generation, testVeo16x9Generation }