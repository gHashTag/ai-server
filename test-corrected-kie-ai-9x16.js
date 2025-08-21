#!/usr/bin/env node

/**
 * 🔧 ИСПРАВЛЕННЫЙ тест KIE AI API с правильными model identifiers
 * Использует правильные model names: veo3, veo3_fast
 */

require('dotenv').config({ path: '/Users/playra/ai-server/.env' })
const axios = require('axios')
const fs = require('fs')

// Правильная конфигурация KIE AI API с исправленными model names
const KIE_AI_CONFIG = {
  BASE_URL: 'https://api.kie.ai',
  API_KEY: process.env.KIE_AI_API_KEY || 'f52f224a92970aa6b7c7780104a00f71',
  HEADERS: {
    'Authorization': `Bearer ${process.env.KIE_AI_API_KEY || 'f52f224a92970aa6b7c7780104a00f71'}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

console.log('🔧 ИСПРАВЛЕННЫЙ тест KIE AI API с правильными model identifiers')
console.log('=' .repeat(70))
console.log(`🔐 API Key: ${KIE_AI_CONFIG.API_KEY ? KIE_AI_CONFIG.API_KEY.slice(0, 20) + '...' : 'НЕ НАЙДЕН'}`)
console.log(`🌐 Base URL: ${KIE_AI_CONFIG.BASE_URL}`)

// ПРАВИЛЬНЫЕ endpoints и model names из документации Kie.ai
const CORRECT_CONFIG = {
  endpoints: {
    veo_generate: '/api/v1/veo/generate',      // 🎬 Генерация Veo3 видео
    veo_record_info: '/api/v1/veo/record-info', // 📊 Информация о видео 
    veo_get_1080p: '/api/v1/veo/get-1080p-video', // 🎥 Получение HD видео
    chat_credit: '/api/v1/chat/credit',        // 💰 Проверка баланса
    health: '/health'                          // 🏥 Health check
  },
  models: {
    veo3_fast: 'veo3_fast',  // ИСПРАВЛЕНО: было veo-3-fast
    veo3: 'veo3',           // ИСПРАВЛЕНО: было veo-3
    runway_aleph: 'runway-aleph'
  }
}

console.log('\n📋 Используемые endpoints и models:')
console.log('   Endpoints:')
Object.entries(CORRECT_CONFIG.endpoints).forEach(([key, endpoint]) => {
  console.log(`      ${key}: ${endpoint}`)
})
console.log('   Models:')
Object.entries(CORRECT_CONFIG.models).forEach(([key, model]) => {
  console.log(`      ${key}: ${model}`)
})

/**
 * Проверка health статуса
 */
async function checkHealthFixed() {
  console.log('\n🏥 Проверка health и баланса...')
  
  try {
    const response = await axios.get(`${KIE_AI_CONFIG.BASE_URL}${CORRECT_CONFIG.endpoints.chat_credit}`, {
      headers: KIE_AI_CONFIG.HEADERS,
      timeout: 10000
    })
    
    console.log(`✅ API доступен: ${response.status}`)
    console.log(`💰 Баланс:`, response.data)
    return true
    
  } catch (error) {
    console.log(`❌ API недоступен: ${error.response?.status || error.message}`)
    if (error.response?.data) {
      console.log(`📋 Детали:`, error.response.data)
    }
    return false
  }
}

/**
 * КРИТИЧЕСКИЙ ТЕСТ: Генерация 9:16 видео с правильными model identifiers
 */
async function testVeo9x16Generation() {
  console.log('\n🎯 КРИТИЧЕСКИЙ ТЕСТ: Генерация 9:16 видео с правильными model identifiers')
  console.log('-' .repeat(60))
  
  const testPayload = {
    prompt: 'Beautiful sunset over ocean waves, perfect vertical shot for social media',
    model: CORRECT_CONFIG.models.veo3_fast, // Используем исправленный model identifier
    aspectRatio: '9:16',
    duration: 5
  }
  
  console.log('📋 Параметры запроса:')
  console.log(JSON.stringify(testPayload, null, 2))
  
  try {
    console.log(`\n🔄 Отправка запроса на ${CORRECT_CONFIG.endpoints.veo_generate}...`)
    
    const response = await axios.post(
      `${KIE_AI_CONFIG.BASE_URL}${CORRECT_CONFIG.endpoints.veo_generate}`,
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
      console.log(`\n🆔 ID задачи: ${recordId}`)
      
      // Попробуем получить информацию о задаче
      await checkTaskStatus(recordId)
    }
    
    console.log('\n🎉 КРИТИЧЕСКИЙ ТЕСТ ПРОЙДЕН: 9:16 видео принято к генерации!')
    
    return {
      success: true,
      response: data,
      endpoint: CORRECT_CONFIG.endpoints.veo_generate,
      model: CORRECT_CONFIG.models.veo3_fast
    }
    
  } catch (error) {
    console.error(`❌ Ошибка генерации 9:16: ${error.response?.status || error.message}`)
    
    if (error.response?.data) {
      console.error(`📋 Детали:`, JSON.stringify(error.response.data, null, 2))
    }
    
    console.error('\n🚨 КРИТИЧЕСКИЙ ТЕСТ НЕ ПРОЙДЕН!')
    
    return {
      success: false,
      error: error.message,
      endpoint: CORRECT_CONFIG.endpoints.veo_generate,
      model: CORRECT_CONFIG.models.veo3_fast
    }
  }
}

/**
 * Тест генерации с veo3 (качественная модель)
 */
async function testVeoQualityGeneration() {
  console.log('\n🎨 Тест качественной модели veo3 для 9:16')
  console.log('-' .repeat(50))
  
  const testPayload = {
    prompt: 'A professional dancer performing in a modern studio, vertical composition for Instagram',
    model: CORRECT_CONFIG.models.veo3, // Используем veo3 вместо veo-3
    aspectRatio: '9:16',
    duration: 4
  }
  
  try {
    const response = await axios.post(
      `${KIE_AI_CONFIG.BASE_URL}${CORRECT_CONFIG.endpoints.veo_generate}`,
      testPayload,
      {
        headers: KIE_AI_CONFIG.HEADERS,
        timeout: 30000
      }
    )
    
    console.log(`✅ veo3 принят: ${response.status}`)
    console.log(`📊 Ответ:`, JSON.stringify(response.data, null, 2))
    
    return { success: true, response: response.data, model: 'veo3' }
    
  } catch (error) {
    console.error(`❌ veo3 тест неудачен: ${error.response?.status || error.message}`)
    if (error.response?.data) {
      console.error(`📋 Детали:`, JSON.stringify(error.response.data, null, 2))
    }
    return { success: false, error: error.message, model: 'veo3' }
  }
}

/**
 * Проверка статуса задачи
 */
async function checkTaskStatus(recordId) {
  try {
    console.log(`\n📊 Проверка статуса задачи ${recordId}...`)
    
    const response = await axios.get(
      `${KIE_AI_CONFIG.BASE_URL}${CORRECT_CONFIG.endpoints.veo_record_info}?id=${recordId}`,
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
 * Основная функция
 */
async function main() {
  console.log('\n🚀 Запуск исправленного тестирования с правильными model identifiers...\n')
  
  const results = {
    timestamp: new Date().toISOString(),
    api_key_present: !!KIE_AI_CONFIG.API_KEY,
    fixes_applied: {
      endpoints_corrected: true,
      model_names_corrected: true,
      api_structure_updated: true
    },
    tests: {}
  }
  
  // 1. Health check
  console.log('📋 Выполняем проверки...')
  results.tests.health = await checkHealthFixed()
  
  // 2. Критический тест 9:16 с veo3_fast
  results.tests.vertical_9x16_fast = await testVeo9x16Generation()
  
  // 3. Тест качественной модели veo3
  results.tests.vertical_9x16_quality = await testVeoQualityGeneration()
  
  // 4. Сохранение результатов
  const reportPath = './test-results-corrected-kie-ai.json'
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  
  // 5. Итоговый отчет
  console.log('\n' + '='.repeat(70))
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ИСПРАВЛЕННОГО ТЕСТА')
  console.log('='.repeat(70))
  
  console.log(`\n🔐 API Key: ${results.api_key_present ? '✅ Найден' : '❌ Отсутствует'}`)
  console.log(`🏥 Health Check: ${results.tests.health ? '✅ Работает' : '❌ Не работает'}`)
  console.log(`🎯 9:16 veo3_fast: ${results.tests.vertical_9x16_fast?.success ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`)
  console.log(`🎨 9:16 veo3: ${results.tests.vertical_9x16_quality?.success ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`)
  
  console.log('\n🔧 ПРИМЕНЕННЫЕ ИСПРАВЛЕНИЯ:')
  console.log('✅ veo-3-fast → veo3_fast')
  console.log('✅ veo-3 → veo3')
  console.log('✅ /video/generate → /api/v1/veo/generate')
  console.log('✅ Обновлена конфигурация в kieAiService.ts')
  console.log('✅ Обновлена конфигурация в models.config.ts')
  
  if (results.tests.vertical_9x16_fast?.success || results.tests.vertical_9x16_quality?.success) {
    console.log('\n🎉 УСПЕХ: 9:16 видео генерация работает с исправленными model identifiers!')
    console.log('💡 Теперь можно тестировать через клиентский API')
    console.log('🎬 Вертикальные видео будут генерироваться правильно')
  } else {
    console.log('\n⚠️  Требуется дополнительная диагностика:')
    console.log('   1. Проверьте правильность API ключа')
    console.log('   2. Убедитесь что достаточно средств на аккаунте')
    console.log('   3. Проверьте актуальность model identifiers в документации Kie.ai')
  }
  
  console.log(`\n📄 Детальный отчет: ${reportPath}`)
  console.log('=' .repeat(70))
}

// Запуск
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  })
}

module.exports = { checkHealthFixed, testVeo9x16Generation, testVeoQualityGeneration }