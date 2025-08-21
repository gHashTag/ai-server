#!/usr/bin/env node

/**
 * 🎬 Прямая проверка KIE AI API с параметром 9:16
 * Тестирует интеграцию напрямую без промежуточных слоев
 */

require('dotenv').config({ path: '/Users/playra/ai-server/.env' })
const axios = require('axios')
const fs = require('fs')

// Конфигурация KIE AI API
const KIE_AI_CONFIG = {
  BASE_URL: 'https://api.kie.ai',
  API_KEY: process.env.KIE_AI_API_KEY || 'f52f224a92970aa6b7c7780104a00f71', // из env
  HEADERS: {
    'Authorization': `Bearer ${process.env.KIE_AI_API_KEY || 'f52f224a92970aa6b7c7780104a00f71'}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

console.log('🔑 Прямая проверка KIE AI API для 9:16 видео')
console.log('=' .repeat(60))
console.log(`🔐 API Key: ${KIE_AI_CONFIG.API_KEY ? KIE_AI_CONFIG.API_KEY.slice(0, 20) + '...' : 'НЕ НАЙДЕН'}`)
console.log(`🌐 Base URL: ${KIE_AI_CONFIG.BASE_URL}`)
console.log('')

// Тестовые сценарии для 9:16
const TEST_SCENARIOS = [
  {
    name: '🎯 КРИТИЧНО: Вертикальное видео 9:16',
    payload: {
      model: 'veo-3-fast',
      prompt: 'Beautiful sunset over ocean waves, perfect for vertical social media, cinematic quality',
      duration: 3,
      aspectRatio: '9:16',
      resolution: '720p',
      fps: 24
    },
    priority: 'CRITICAL'
  },
  {
    name: '📱 Instagram Story формат',
    payload: {
      model: 'veo-3',
      prompt: 'Dynamic city lights at night, vertical shot for Instagram story',
      duration: 5,
      aspectRatio: '9:16',
      resolution: '1080p',
      fps: 30
    },
    priority: 'HIGH'
  },
  {
    name: '📺 Сравнение с горизонтальным 16:9',
    payload: {
      model: 'veo-3-fast',
      prompt: 'Mountain landscape with flying eagle, wide shot',
      duration: 4,
      aspectRatio: '16:9',
      resolution: '1080p',
      fps: 24
    },
    priority: 'MEDIUM'
  }
]

/**
 * Проверка health статуса KIE AI API
 */
async function checkKieAIHealth() {
  console.log('🏥 Проверка health статуса KIE AI...')
  
  try {
    const response = await axios.get(`${KIE_AI_CONFIG.BASE_URL}/health`, {
      headers: KIE_AI_CONFIG.HEADERS,
      timeout: 10000
    })
    
    console.log(`✅ Health check успешен: ${response.status}`)
    console.log(`📊 Данные:`, response.data)
    return true
    
  } catch (error) {
    console.error(`❌ Health check неудачен:`, error.response?.status || error.message)
    if (error.response?.data) {
      console.error(`📋 Детали:`, error.response.data)
    }
    return false
  }
}

/**
 * Проверка доступных моделей
 */
async function checkAvailableModels() {
  console.log('\\n📋 Проверка доступных моделей...')
  
  try {
    const response = await axios.get(`${KIE_AI_CONFIG.BASE_URL}/v1/models`, {
      headers: KIE_AI_CONFIG.HEADERS,
      timeout: 15000
    })
    
    console.log(`✅ Модели получены: ${response.status}`)
    const models = response.data.data || response.data
    
    if (Array.isArray(models)) {
      console.log(`📊 Доступно моделей: ${models.length}`)
      
      // Ищем Veo модели
      const veoModels = models.filter(model => 
        model.id?.includes('veo') || model.name?.includes('veo')
      )
      
      if (veoModels.length > 0) {
        console.log('🎬 Найденные Veo модели:')
        veoModels.forEach(model => {
          console.log(`   📹 ${model.id || model.name}: ${model.description || 'Без описания'}`)
        })
      } else {
        console.log('⚠️  Veo модели не найдены, показываю все доступные:')
        models.slice(0, 5).forEach(model => {
          console.log(`   🔧 ${model.id || model.name}`)
        })
      }
    } else {
      console.log('📋 Ответ:', models)
    }
    
    return true
    
  } catch (error) {
    console.error(`❌ Ошибка получения моделей:`, error.response?.status || error.message)
    if (error.response?.data) {
      console.error(`📋 Детали:`, error.response.data)
    }
    return false
  }
}

/**
 * Тест генерации видео
 */
async function testVideoGeneration(scenario) {
  console.log(`\\n🎬 ${scenario.name}`)
  console.log(`   📋 Модель: ${scenario.payload.model}`)
  console.log(`   📐 Формат: ${scenario.payload.aspectRatio}`)
  console.log(`   ⏱️  Длительность: ${scenario.payload.duration}с`)
  console.log(`   🎯 Приоритет: ${scenario.priority}`)
  
  const startTime = Date.now()
  
  try {
    // Попробуем разные endpoints для генерации
    const possibleEndpoints = [
      '/v1/video/generate',
      '/api/v1/video/generate', 
      '/video/generate',
      '/generate/video',
      '/v1/generations'
    ]
    
    let response = null
    let usedEndpoint = null
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`   🔄 Попытка: ${KIE_AI_CONFIG.BASE_URL}${endpoint}`)
        
        response = await axios.post(`${KIE_AI_CONFIG.BASE_URL}${endpoint}`, scenario.payload, {
          headers: KIE_AI_CONFIG.HEADERS,
          timeout: 30000
        })
        
        usedEndpoint = endpoint
        console.log(`   ✅ Успешно через: ${endpoint}`)
        break
        
      } catch (endpointError) {
        console.log(`   ⚠️  ${endpoint}: ${endpointError.response?.status || endpointError.message}`)
        continue
      }
    }
    
    if (!response) {
      throw new Error('Все endpoints недоступны')
    }
    
    const responseTime = Date.now() - startTime
    console.log(`   ⏱️  Время ответа: ${responseTime}мс`)
    console.log(`   📊 Статус: ${response.status}`)
    console.log(`   📋 Данные:`, JSON.stringify(response.data, null, 2))
    
    // Проверяем структуру ответа
    const data = response.data
    if (data.id || data.task_id || data.job_id) {
      console.log(`   🆔 ID задачи: ${data.id || data.task_id || data.job_id}`)
    }
    
    if (data.status) {
      console.log(`   📈 Статус задачи: ${data.status}`)
    }
    
    if (data.estimated_time) {
      console.log(`   ⏰ Расчетное время: ${data.estimated_time}`)
    }
    
    // Успех для критичного теста
    if (scenario.priority === 'CRITICAL') {
      console.log(`   🎉 КРИТИЧЕСКИЙ ТЕСТ ПРОЙДЕН: 9:16 видео принято к обработке!`)
    }
    
    return {
      success: true,
      endpoint: usedEndpoint,
      response: data,
      responseTime
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(`   ❌ Ошибка генерации (${responseTime}мс):`, error.response?.status || error.message)
    
    if (error.response?.data) {
      console.error(`   📋 Детали ошибки:`, error.response.data)
    }
    
    // Критическая ошибка для 9:16
    if (scenario.priority === 'CRITICAL') {
      console.error(`   🚨 КРИТИЧЕСКИЙ ТЕСТ НЕ ПРОЙДЕН: 9:16 видео не работает!`)
    }
    
    return {
      success: false,
      error: error.message,
      responseTime
    }
  }
}

/**
 * Сохранение результатов теста
 */
function saveTestResults(results) {
  const reportPath = './test-results-kie-ai-direct.json'
  
  const report = {
    timestamp: new Date().toISOString(),
    api_key_status: KIE_AI_CONFIG.API_KEY ? 'НАЙДЕН' : 'НЕ НАЙДЕН',
    total_tests: results.length,
    passed_tests: results.filter(r => r.success).length,
    critical_passed: results.filter(r => r.priority === 'CRITICAL' && r.success).length,
    results: results,
    summary: {
      vertical_9x16_works: results.find(r => r.scenario.includes('9:16'))?.success || false,
      horizontal_16x9_works: results.find(r => r.scenario.includes('16:9'))?.success || false,
      kie_ai_integration: results.some(r => r.success)
    }
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\\n📄 Результаты сохранены в: ${reportPath}`)
  
  return report
}

/**
 * Основная функция тестирования
 */
async function main() {
  console.log('🚀 Запуск прямого тестирования KIE AI API\\n')
  
  // 1. Health check
  const healthOk = await checkKieAIHealth()
  if (!healthOk) {
    console.log('⚠️  Health check неудачен, но продолжаем тестирование...')
  }
  
  // 2. Проверка моделей
  await checkAvailableModels()
  
  // 3. Тестирование генерации видео
  console.log('\\n' + '='.repeat(60))
  console.log('🎬 ТЕСТИРОВАНИЕ ГЕНЕРАЦИИ ВИДЕО')
  console.log('='.repeat(60))
  
  const results = []
  
  for (const scenario of TEST_SCENARIOS) {
    const result = await testVideoGeneration(scenario)
    results.push({
      scenario: scenario.name,
      priority: scenario.priority,
      payload: scenario.payload,
      ...result
    })
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  
  // 4. Финальный отчет
  console.log('\\n' + '='.repeat(60))
  console.log('📊 ФИНАЛЬНЫЙ ОТЧЕТ')
  console.log('='.repeat(60))
  
  const report = saveTestResults(results)
  
  console.log(`\\n✅ Успешных тестов: ${report.passed_tests}/${report.total_tests}`)
  console.log(`🎯 Критических пройдено: ${report.critical_passed}`)
  
  if (report.summary.vertical_9x16_works) {
    console.log('🎉 ВЕРТИКАЛЬНОЕ ВИДЕО (9:16) РАБОТАЕТ!')
  } else {
    console.log('❌ Вертикальное видео (9:16) НЕ РАБОТАЕТ')
  }
  
  if (report.summary.kie_ai_integration) {
    console.log('✅ Интеграция с KIE AI функциональна')
  } else {
    console.log('❌ Проблемы с интеграцией KIE AI')
  }
  
  console.log('\\n🔗 Для использования в проекте:')
  console.log('   1. Убедитесь что KIE_AI_API_KEY загружается в process.env')
  console.log('   2. Перезапустите сервер для загрузки новых переменных окружения')
  console.log('   3. Используйте найденные рабочие endpoints')
}

// Запуск тестирования
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  })
}

module.exports = { 
  checkKieAIHealth, 
  checkAvailableModels, 
  testVideoGeneration,
  KIE_AI_CONFIG 
}