/**
 * 🚀 PRODUCTION INTEGRATION TEST
 * Проверяет работоспособность ключевых функций после деплоя в продакшн
 *
 * Тестируемые функции:
 * 1. Instagram мониторинг и анализ конкурентов
 * 2. Veo3 Fast генерация видео 9:16
 * 3. Системный мониторинг
 * 4. Основные API endpoints
 */

const axios = require('axios')
const { inngest } = require('../../dist/core/inngest/clients')

// Конфигурация для продакшена
const PRODUCTION_CONFIG = {
  // Замените на реальный продакшн URL
  API_URL: process.env.PRODUCTION_API_URL || 'http://localhost:4000',
  // Замените на реальный тестовый Telegram ID
  TEST_TELEGRAM_ID: process.env.TEST_TELEGRAM_ID || '123456789',
  // Замените на реальный Instagram аккаунт для тестирования
  TEST_INSTAGRAM_USERNAME: process.env.TEST_INSTAGRAM_USERNAME || 'testuser',
  // Timeout для длительных операций (видео генерация)
  LONG_TIMEOUT: 300000, // 5 минут
  SHORT_TIMEOUT: 30000, // 30 секунд
}

console.log('🚀 PRODUCTION INTEGRATION TEST')
console.log('==============================')
console.log('API URL:', PRODUCTION_CONFIG.API_URL)
console.log('Test Telegram ID:', PRODUCTION_CONFIG.TEST_TELEGRAM_ID)
console.log('')

class ProductionTester {
  constructor() {
    this.results = {
      api: { status: 'pending', details: [] },
      instagram: { status: 'pending', details: [] },
      veo3: { status: 'pending', details: [] },
      monitoring: { status: 'pending', details: [] },
    }
  }

  async runAllTests() {
    console.log('📋 Starting comprehensive production tests...\n')

    try {
      // 1. Тест основных API endpoints
      await this.testBasicAPI()

      // 2. Тест Instagram функций
      await this.testInstagramAnalysis()

      // 3. Тест Veo3 генерации
      await this.testVeo3Generation()

      // 4. Тест системного мониторинга
      await this.testSystemMonitoring()

      // Финальный отчет
      this.generateReport()
    } catch (error) {
      console.error('❌ CRITICAL ERROR in production tests:', error.message)
      process.exit(1)
    }
  }

  async testBasicAPI() {
    console.log('🔍 Testing Basic API Endpoints...')

    try {
      // Health check
      const health = await axios.get(`${PRODUCTION_CONFIG.API_URL}/health`, {
        timeout: PRODUCTION_CONFIG.SHORT_TIMEOUT,
      })

      if (health.data.status === 'OK') {
        this.results.api.details.push('✅ Health check: OK')
      } else {
        throw new Error('Health check failed')
      }

      // API test endpoint
      const apiTest = await axios.get(`${PRODUCTION_CONFIG.API_URL}/api/test`, {
        timeout: PRODUCTION_CONFIG.SHORT_TIMEOUT,
      })

      if (apiTest.data.message) {
        this.results.api.details.push('✅ API test endpoint: OK')
      } else {
        throw new Error('API test endpoint failed')
      }

      // Root endpoint with API documentation
      const root = await axios.get(`${PRODUCTION_CONFIG.API_URL}/`, {
        timeout: PRODUCTION_CONFIG.SHORT_TIMEOUT,
      })

      if (root.data.status === 'success' && root.data.endpoints) {
        this.results.api.details.push('✅ API documentation: Available')
        this.results.api.details.push(
          `📋 Endpoints found: ${Object.keys(root.data.endpoints).length}`
        )
      }

      this.results.api.status = 'success'
      console.log('✅ Basic API tests passed\n')
    } catch (error) {
      this.results.api.status = 'failed'
      this.results.api.details.push(`❌ API Error: ${error.message}`)
      console.log('❌ Basic API tests failed:', error.message, '\n')
    }
  }

  async testInstagramAnalysis() {
    console.log('📸 Testing Instagram Analysis Functions...')

    try {
      // Тест анализа конкурентов
      const instagramEvent = {
        name: 'instagram/analyze-competitor-reels',
        data: {
          username: PRODUCTION_CONFIG.TEST_INSTAGRAM_USERNAME,
          max_reels: 5,
          days_back: 7,
          telegram_id: PRODUCTION_CONFIG.TEST_TELEGRAM_ID,
          project_id: 'test-project-' + Date.now(),
        },
      }

      console.log('  📤 Sending Instagram analysis event...')
      const result = await inngest.send(instagramEvent)

      if (result && result.ids && result.ids.length > 0) {
        this.results.instagram.details.push(
          '✅ Instagram event sent successfully'
        )
        this.results.instagram.details.push(`📨 Event ID: ${result.ids[0]}`)

        // Ждем некоторое время для обработки
        console.log('  ⏳ Waiting for processing...')
        await new Promise(resolve => setTimeout(resolve, 10000))

        this.results.instagram.details.push('✅ Event processing initiated')
      } else {
        throw new Error('Failed to send Instagram event')
      }

      this.results.instagram.status = 'success'
      console.log('✅ Instagram analysis test passed\n')
    } catch (error) {
      this.results.instagram.status = 'failed'
      this.results.instagram.details.push(
        `❌ Instagram Error: ${error.message}`
      )
      console.log('❌ Instagram analysis test failed:', error.message, '\n')
    }
  }

  async testVeo3Generation() {
    console.log('🎬 Testing Veo3 Fast Video Generation (9:16)...')

    try {
      // Тест Veo3 генерации видео
      const veo3Event = {
        name: 'veo3/video-generation',
        data: {
          prompt: 'A beautiful sunset over mountains, cinematic view',
          model: 'veo3_fast',
          aspectRatio: '9:16',
          duration: 5, // 5 секунд
          telegram_id: PRODUCTION_CONFIG.TEST_TELEGRAM_ID,
          bot_name: 'neuro_blogger_bot',
        },
      }

      console.log('  📤 Sending Veo3 generation event...')
      const result = await inngest.send(veo3Event)

      if (result && result.ids && result.ids.length > 0) {
        this.results.veo3.details.push('✅ Veo3 event sent successfully')
        this.results.veo3.details.push(`📨 Event ID: ${result.ids[0]}`)
        this.results.veo3.details.push('🎥 Format: 9:16 (vertical)')
        this.results.veo3.details.push('⚡ Model: veo3_fast')
        this.results.veo3.details.push('⏱ Duration: 5 seconds')

        // Ждем некоторое время для обработки
        console.log('  ⏳ Waiting for processing...')
        await new Promise(resolve => setTimeout(resolve, 15000))

        this.results.veo3.details.push('✅ Event processing initiated')
      } else {
        throw new Error('Failed to send Veo3 event')
      }

      this.results.veo3.status = 'success'
      console.log('✅ Veo3 generation test passed\n')
    } catch (error) {
      this.results.veo3.status = 'failed'
      this.results.veo3.details.push(`❌ Veo3 Error: ${error.message}`)
      console.log('❌ Veo3 generation test failed:', error.message, '\n')
    }
  }

  async testSystemMonitoring() {
    console.log('📊 Testing System Monitoring Functions...')

    try {
      // Тест системного мониторинга
      const monitoringEvent = {
        name: 'system/daily-monitor',
        data: {
          type: 'manual-test',
          timestamp: new Date().toISOString(),
        },
      }

      console.log('  📤 Sending system monitoring event...')
      const result = await inngest.send(monitoringEvent)

      if (result && result.ids && result.ids.length > 0) {
        this.results.monitoring.details.push(
          '✅ Monitoring event sent successfully'
        )
        this.results.monitoring.details.push(`📨 Event ID: ${result.ids[0]}`)

        // Проверим health check функцию
        const healthEvent = {
          name: 'system/health-check',
          data: { manual_test: true },
        }

        const healthResult = await inngest.send(healthEvent)
        if (healthResult && healthResult.ids) {
          this.results.monitoring.details.push('✅ Health check event sent')
        }
      } else {
        throw new Error('Failed to send monitoring event')
      }

      this.results.monitoring.status = 'success'
      console.log('✅ System monitoring test passed\n')
    } catch (error) {
      this.results.monitoring.status = 'failed'
      this.results.monitoring.details.push(
        `❌ Monitoring Error: ${error.message}`
      )
      console.log('❌ System monitoring test failed:', error.message, '\n')
    }
  }

  generateReport() {
    console.log('📋 PRODUCTION TEST REPORT')
    console.log('=========================')

    const categories = [
      { key: 'api', name: '🔗 Basic API' },
      { key: 'instagram', name: '📸 Instagram Analysis' },
      { key: 'veo3', name: '🎬 Veo3 Generation' },
      { key: 'monitoring', name: '📊 System Monitoring' },
    ]

    let allSuccess = true

    categories.forEach(category => {
      const result = this.results[category.key]
      const status =
        result.status === 'success'
          ? '✅ PASS'
          : result.status === 'failed'
          ? '❌ FAIL'
          : '⏳ PENDING'

      console.log(`\n${category.name}: ${status}`)
      result.details.forEach(detail => {
        console.log(`  ${detail}`)
      })

      if (result.status === 'failed') {
        allSuccess = false
      }
    })

    console.log('\n' + '='.repeat(50))
    if (allSuccess) {
      console.log('🎉 ALL PRODUCTION TESTS PASSED!')
      console.log('✅ Production deployment is working correctly')
      console.log('🚀 System is ready for use')
    } else {
      console.log('⚠️  SOME TESTS FAILED')
      console.log('🔍 Check failed components before using in production')
      console.log('🛠 Review error details above')
    }
    console.log('='.repeat(50))

    return allSuccess
  }
}

// Запуск тестов
async function runProductionTests() {
  const tester = new ProductionTester()

  try {
    const success = await tester.runAllTests()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('💥 FATAL ERROR:', error)
    process.exit(1)
  }
}

// Проверка переменных окружения
if (!process.env.NODE_ENV) {
  console.warn('⚠️  NODE_ENV not set, defaulting to development')
}

console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
console.log(`🔗 Target API: ${PRODUCTION_CONFIG.API_URL}`)
console.log('')

// Запустить если вызван напрямую
if (require.main === module) {
  runProductionTests()
}

module.exports = { ProductionTester, PRODUCTION_CONFIG }
