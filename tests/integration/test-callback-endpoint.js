/**
 * 🔗 Test Kie.ai Callback Endpoint
 * Тестирование callback endpoint для проверки обработки уведомлений от Kie.ai
 */

const axios = require('axios')
const { logger } = require('@/utils/logger')

// Конфигурация для тестирования
const CONFIG = {
  baseUrl: process.env.TEST_SERVER_URL || 'http://localhost:3000',
  timeout: 10000,
}

// Тестовые данные для callback
const TEST_CALLBACKS = [
  {
    name: 'Completed video generation',
    payload: {
      taskId: 'test_task_completed_123',
      status: 'completed',
      videoUrl: 'https://example.com/test-video-completed.mp4',
      duration: 8,
      cost: 0.40,
      metadata: {
        model: 'veo3_fast',
        aspectRatio: '9:16',
        prompt: 'Test completed video generation'
      }
    }
  },
  {
    name: 'Failed video generation',
    payload: {
      taskId: 'test_task_failed_456',
      status: 'failed',
      error: 'Test error: insufficient credits',
      metadata: {
        model: 'veo3_fast',
        aspectRatio: '9:16',
        prompt: 'Test failed video generation'
      }
    }
  },
  {
    name: 'Processing status update',
    payload: {
      taskId: 'test_task_processing_789',
      status: 'processing',
      progress: 75,
      metadata: {
        model: 'veo3',
        aspectRatio: '16:9',
        prompt: 'Test processing status update'
      }
    }
  }
]

/**
 * Тест health check endpoint
 */
async function testHealthCheck() {
  console.log('🔍 Testing callback health check endpoint...')

  try {
    const response = await axios.get(`${CONFIG.baseUrl}/api/kie-ai/callback/health`, {
      timeout: CONFIG.timeout
    })

    console.log('✅ Health check successful:', {
      status: response.status,
      data: response.data
    })

    return response.status === 200
  } catch (error) {
    console.error('❌ Health check failed:', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    })
    return false
  }
}

/**
 * Тест GET запрос к callback endpoint (должен вернуть документацию)
 */
async function testGetEndpoint() {
  console.log('🔍 Testing GET request to callback endpoint...')

  try {
    const response = await axios.get(`${CONFIG.baseUrl}/api/kie-ai/callback`, {
      timeout: CONFIG.timeout
    })

    console.log('✅ GET endpoint successful:', {
      status: response.status,
      message: response.data.message,
      hasDocumentation: !!response.data.documentation
    })

    return response.status === 200
  } catch (error) {
    console.error('❌ GET endpoint failed:', {
      error: error.message,
      status: error.response?.status
    })
    return false
  }
}

/**
 * Тест POST запросов к callback endpoint
 */
async function testCallbacks() {
  console.log('🔍 Testing POST callbacks...')

  const results = []

  for (const testCase of TEST_CALLBACKS) {
    console.log(`\n🧪 Testing: ${testCase.name}`)
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/kie-ai/callback`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.timeout
      })

      console.log('✅ Callback successful:', {
        testCase: testCase.name,
        status: response.status,
        success: response.data.success,
        message: response.data.message,
        taskId: response.data.taskId
      })

      results.push({ name: testCase.name, success: true })
    } catch (error) {
      console.error('❌ Callback failed:', {
        testCase: testCase.name,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      })

      results.push({ name: testCase.name, success: false, error: error.message })
    }

    // Пауза между тестами
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return results
}

/**
 * Тест невалидных данных
 */
async function testInvalidPayloads() {
  console.log('\n🔍 Testing invalid payloads...')

  const invalidPayloads = [
    {
      name: 'Empty payload',
      payload: {}
    },
    {
      name: 'Missing taskId',
      payload: {
        status: 'completed',
        videoUrl: 'https://example.com/test.mp4'
      }
    },
    {
      name: 'Invalid status',
      payload: {
        taskId: 'test_invalid_status',
        status: 'invalid_status'
      }
    },
    {
      name: 'Non-JSON payload',
      payload: 'invalid json string'
    }
  ]

  const results = []

  for (const testCase of invalidPayloads) {
    console.log(`\n🧪 Testing invalid payload: ${testCase.name}`)
    
    try {
      const response = await axios.post(`${CONFIG.baseUrl}/api/kie-ai/callback`, testCase.payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: CONFIG.timeout
      })

      // Для невалидных данных ожидаем ошибку
      console.log('⚠️ Unexpected success for invalid payload:', {
        testCase: testCase.name,
        status: response.status,
        data: response.data
      })

      results.push({ name: testCase.name, expectedError: true, actualSuccess: true })
    } catch (error) {
      const status = error.response?.status
      
      if (status === 400) {
        console.log('✅ Correctly rejected invalid payload:', {
          testCase: testCase.name,
          status: status,
          error: error.response?.data?.error
        })
        
        results.push({ name: testCase.name, expectedError: true, actualError: true, correct: true })
      } else {
        console.error('❌ Unexpected error status:', {
          testCase: testCase.name,
          status: status,
          error: error.message
        })
        
        results.push({ name: testCase.name, expectedError: true, actualError: true, correct: false })
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return results
}

/**
 * Основная функция запуска тестов
 */
async function main() {
  console.log('🚀 Kie.ai Callback Endpoint Integration Test')
  console.log(`🌐 Target server: ${CONFIG.baseUrl}`)
  console.log(`⏱️ Timeout: ${CONFIG.timeout}ms`)
  console.log('')

  const testResults = {
    healthCheck: false,
    getEndpoint: false,
    validCallbacks: [],
    invalidCallbacks: []
  }

  try {
    // Тест 1: Health check
    testResults.healthCheck = await testHealthCheck()

    // Тест 2: GET endpoint documentation
    testResults.getEndpoint = await testGetEndpoint()

    // Тест 3: Валидные callback запросы
    testResults.validCallbacks = await testCallbacks()

    // Тест 4: Невалидные данные
    testResults.invalidCallbacks = await testInvalidPayloads()

    // Итоги тестирования
    console.log('\n🏁 Test Results Summary')
    console.log('=' .repeat(50))
    
    console.log(`✅ Health Check: ${testResults.healthCheck ? 'PASSED' : 'FAILED'}`)
    console.log(`✅ GET Endpoint: ${testResults.getEndpoint ? 'PASSED' : 'FAILED'}`)
    
    const validCallbacksPassed = testResults.validCallbacks.filter(r => r.success).length
    const validCallbacksTotal = testResults.validCallbacks.length
    console.log(`✅ Valid Callbacks: ${validCallbacksPassed}/${validCallbacksTotal} PASSED`)
    
    const invalidCallbacksCorrect = testResults.invalidCallbacks.filter(r => r.correct).length
    const invalidCallbacksTotal = testResults.invalidCallbacks.length
    console.log(`✅ Invalid Callbacks: ${invalidCallbacksCorrect}/${invalidCallbacksTotal} CORRECTLY REJECTED`)

    // Общий результат
    const allPassed = testResults.healthCheck && 
                     testResults.getEndpoint && 
                     validCallbacksPassed === validCallbacksTotal &&
                     invalidCallbacksCorrect === invalidCallbacksTotal

    console.log('\n' + '='.repeat(50))
    console.log(`🎯 OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`)
    
    if (!allPassed) {
      console.log('\n❌ Failed tests:')
      if (!testResults.healthCheck) console.log('   - Health check')
      if (!testResults.getEndpoint) console.log('   - GET endpoint')
      if (validCallbacksPassed !== validCallbacksTotal) {
        console.log(`   - Valid callbacks: ${validCallbacksTotal - validCallbacksPassed} failed`)
      }
      if (invalidCallbacksCorrect !== invalidCallbacksTotal) {
        console.log(`   - Invalid callbacks: ${invalidCallbacksTotal - invalidCallbacksCorrect} not properly rejected`)
      }
    }

    console.log('\n💡 Next steps:')
    console.log('   1. Ensure server is running and accessible')
    console.log('   2. Check server logs for callback processing details')
    console.log('   3. Verify database table creation for video_tasks')
    console.log('   4. Test with real Kie.ai webhook calls')

    process.exit(allPassed ? 0 : 1)

  } catch (error) {
    console.error('\n💥 Test suite failed:', {
      error: error.message,
      stack: error.stack
    })
    process.exit(1)
  }
}

// Запуск тестов
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  testHealthCheck,
  testGetEndpoint,
  testCallbacks,
  testInvalidPayloads,
  TEST_CALLBACKS,
  CONFIG
}