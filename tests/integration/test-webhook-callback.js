#!/usr/bin/env node
/**
 * 🔗 Тест Webhook Callback системы для Kie.ai
 * Проверяем что callback endpoint доступен и правильно обрабатывает данные
 */

const axios = require('axios')

const TEST_CONFIG = {
  API_URL: 'https://ai-server-production-production-8e2d.up.railway.app',
  CALLBACK_ENDPOINT: '/api/kie-ai/callback',
  
  // Mock данные от Kie.ai callback
  MOCK_CALLBACK_PAYLOAD: {
    taskId: 'test_callback_' + Date.now(),
    status: 'completed',
    videoUrl: 'https://test-video-url.com/video.mp4',
    duration: 5,
    cost: 0.25,
    model: 'veo3_fast',
    
    // Дополнительные данные которые могут приходить от Kie.ai
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    processingTime: 45000,
    quality: 'high',
    aspectRatio: '9:16'
  }
}

/**
 * Проверить доступность callback endpoint
 */
async function testCallbackEndpointHealth() {
  console.log('🏥 Проверяю доступность callback endpoint...')
  
  try {
    const response = await axios.get(
      `${TEST_CONFIG.API_URL}${TEST_CONFIG.CALLBACK_ENDPOINT}/health`,
      { timeout: 10000 }
    )
    
    console.log('✅ Callback endpoint доступен')
    console.log('📊 Health Response:', response.data)
    return true
    
  } catch (error) {
    console.error('❌ Callback endpoint недоступен:', error.message)
    console.error('🔍 URL:', `${TEST_CONFIG.API_URL}${TEST_CONFIG.CALLBACK_ENDPOINT}/health`)
    
    if (error.response) {
      console.error('📊 Status:', error.response.status)
      console.error('📋 Data:', error.response.data)
    }
    
    return false
  }
}

/**
 * Отправить тестовый callback от имени Kie.ai
 */
async function testCallbackProcessing() {
  console.log('\n📞 Тестирую обработку callback от Kie.ai...')
  
  const payload = TEST_CONFIG.MOCK_CALLBACK_PAYLOAD
  
  console.log('📤 Отправляю mock callback payload:')
  console.log(JSON.stringify(payload, null, 2))
  
  try {
    const startTime = Date.now()
    
    const response = await axios.post(
      `${TEST_CONFIG.API_URL}${TEST_CONFIG.CALLBACK_ENDPOINT}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kie.ai-Webhook/1.0'
        },
        timeout: 15000
      }
    )
    
    const responseTime = Date.now() - startTime
    
    console.log(`✅ Callback обработан успешно за ${responseTime}ms`)
    console.log('📊 Status:', response.status)
    console.log('📋 Response:', response.data)
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      responseTime
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    console.error(`❌ Ошибка callback за ${responseTime}ms:`)
    console.error('🔍 URL:', `${TEST_CONFIG.API_URL}${TEST_CONFIG.CALLBACK_ENDPOINT}`)
    
    if (error.response) {
      console.error('📊 Status:', error.response.status)
      console.error('📋 Response:', error.response.data)
    } else {
      console.error('🔌 Error:', error.message)
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      responseTime
    }
  }
}

/**
 * Тест с различными сценариями callback
 */
async function testCallbackScenarios() {
  console.log('\n🧪 Тестирую различные сценарии callback...')
  
  const scenarios = [
    {
      name: 'Успешная генерация',
      payload: {
        ...TEST_CONFIG.MOCK_CALLBACK_PAYLOAD,
        status: 'completed'
      }
    },
    {
      name: 'Ошибка генерации',
      payload: {
        ...TEST_CONFIG.MOCK_CALLBACK_PAYLOAD,
        taskId: 'error_task_' + Date.now(),
        status: 'failed',
        error: 'Insufficient credits',
        videoUrl: null
      }
    },
    {
      name: 'Callback с дополнительными данными',
      payload: {
        ...TEST_CONFIG.MOCK_CALLBACK_PAYLOAD,
        taskId: 'extra_data_task_' + Date.now(),
        telegram_id: '144022504',
        bot_name: 'neuro_blogger_bot',
        customMetadata: {
          originalPrompt: 'Test video generation',
          userAgent: 'Integration-Test'
        }
      }
    }
  ]
  
  const results = []
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    
    console.log(`\n${i + 1}. ${scenario.name}:`)
    console.log('📤 Payload:', JSON.stringify(scenario.payload, null, 2))
    
    try {
      const response = await axios.post(
        `${TEST_CONFIG.API_URL}${TEST_CONFIG.CALLBACK_ENDPOINT}`,
        scenario.payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Kie.ai-Webhook-Test/1.0'
          },
          timeout: 10000
        }
      )
      
      console.log(`✅ Scenario "${scenario.name}" - SUCCESS`)
      console.log('📊 Response:', response.data)
      
      results.push({
        name: scenario.name,
        success: true,
        status: response.status,
        data: response.data
      })
      
    } catch (error) {
      console.log(`❌ Scenario "${scenario.name}" - FAILED`)
      console.log('📋 Error:', error.response?.data || error.message)
      
      results.push({
        name: scenario.name,
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      })
    }
    
    // Пауза между сценариями
    if (i < scenarios.length - 1) {
      console.log('⏸️ Пауза 2 секунды...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  return results
}

/**
 * Проверить callback URL который генерируется сервисом
 */
async function testCallbackUrlGeneration() {
  console.log('\n🔗 Проверяю генерацию callback URL...')
  
  // Тестируем через диагностический endpoint если есть
  try {
    const response = await axios.get(
      `${TEST_CONFIG.API_URL}/api/kie-ai/callback/config`,
      { timeout: 5000 }
    )
    
    console.log('✅ Callback URL конфигурация:')
    console.log(JSON.stringify(response.data, null, 2))
    
    return response.data
    
  } catch (error) {
    console.log('ℹ️ Config endpoint недоступен (это нормально)')
    
    // Генерируем ожидаемый URL вручную
    const expectedCallbackUrl = `${TEST_CONFIG.API_URL}/api/kie-ai/callback`
    console.log('📋 Ожидаемый callback URL:', expectedCallbackUrl)
    
    return {
      expectedUrl: expectedCallbackUrl,
      note: 'Generated from base URL'
    }
  }
}

/**
 * Основная функция тестирования
 */
async function runCallbackTests() {
  console.log('🔗 ТЕСТ WEBHOOK CALLBACK СИСТЕМЫ KIE.AI')
  console.log('=' .repeat(60))
  console.log(`🌐 Base URL: ${TEST_CONFIG.API_URL}`)
  console.log(`📞 Callback Endpoint: ${TEST_CONFIG.CALLBACK_ENDPOINT}`)
  console.log('=' .repeat(60))
  
  const results = {
    healthCheck: false,
    basicCallback: false,
    scenarios: [],
    callbackConfig: null
  }
  
  try {
    // 1. Проверка доступности endpoint
    results.healthCheck = await testCallbackEndpointHealth()
    
    if (!results.healthCheck) {
      console.error('\n❌ Callback endpoint недоступен - прекращаю тесты')
      return results
    }
    
    // 2. Тест базовой обработки callback
    const basicResult = await testCallbackProcessing()
    results.basicCallback = basicResult.success
    
    // 3. Тест различных сценариев
    results.scenarios = await testCallbackScenarios()
    
    // 4. Проверка конфигурации callback URL
    results.callbackConfig = await testCallbackUrlGeneration()
    
    // Итоговый отчет
    console.log('\n' + '=' .repeat(60))
    console.log('📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ CALLBACK')
    console.log('=' .repeat(60))
    
    console.log(`🏥 Health Check: ${results.healthCheck ? '✅ OK' : '❌ FAILED'}`)
    console.log(`📞 Basic Callback: ${results.basicCallback ? '✅ OK' : '❌ FAILED'}`)
    
    const successfulScenarios = results.scenarios.filter(s => s.success).length
    console.log(`🧪 Scenarios: ${successfulScenarios}/${results.scenarios.length} успешно`)
    
    if (results.callbackConfig) {
      console.log('🔗 Callback URL конфигурация: ✅ OK')
    }
    
    const overallSuccess = results.healthCheck && 
                          results.basicCallback && 
                          successfulScenarios >= results.scenarios.length * 0.8
    
    console.log(`\n🎯 ОБЩИЙ РЕЗУЛЬТАТ: ${overallSuccess ? '✅ УСПЕШНО' : '❌ ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ'}`)
    
    if (overallSuccess) {
      console.log('\n🎉 Callback система работает корректно!')
      console.log('📋 Что проверить дальше:')
      console.log('   1. Убедиться что Kie.ai действительно вызывает этот URL')
      console.log('   2. Проверить обработку реальных callback от Kie.ai')
      console.log('   3. Убрать timeout из kieAiService для async режима')
    } else {
      console.log('\n🔧 Требуется исправление:')
      if (!results.healthCheck) console.log('   - Починить callback endpoint')
      if (!results.basicCallback) console.log('   - Исправить обработку callback')
      console.log('   - Проверить логи сервера на ошибки')
    }
    
    return results
    
  } catch (error) {
    console.error('\n💥 Критическая ошибка тестирования:', error.message)
    return results
  }
}

// Запуск тестов
if (require.main === module) {
  runCallbackTests()
    .then((results) => {
      const success = results.healthCheck && results.basicCallback
      console.log('\n' + (success ? '✅ Тесты завершены успешно' : '❌ Есть проблемы с callback системой'))
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 Критическая ошибка:', error)
      process.exit(1)
    })
}

module.exports = {
  testCallbackEndpointHealth,
  testCallbackProcessing,
  testCallbackScenarios,
  TEST_CONFIG
}