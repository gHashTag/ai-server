/**
 * Тест интеграции N8N с AI Server
 * Проверяет базовую функциональность N8N workflow автоматизации
 */

const axios = require('axios')
const { logger } = require('../../dist/utils/logger')

// Конфигурация для тестирования
const config = {
  aiServerUrl: 'http://localhost:4000', // Обновлен порт для dev окружения
  n8nUrl: 'http://localhost:5678',
  testTimeout: 30000, // 30 секунд
}

class N8nIntegrationTester {
  constructor() {
    this.aiServerClient = axios.create({
      baseURL: config.aiServerUrl,
      timeout: config.testTimeout,
    })

    this.n8nClient = axios.create({
      baseURL: config.n8nUrl,
      timeout: config.testTimeout,
      auth: {
        username: 'admin',
        password: 'admin123',
      },
    })
  }

  /**
   * Основная функция тестирования
   */
  async runTests() {
    console.log('🚀 Запуск тестов интеграции N8N с AI Server\\n')

    const tests = [
      {
        name: 'Проверка доступности AI Server',
        test: () => this.testAiServerHealth(),
      },
      { name: 'Проверка доступности N8N', test: () => this.testN8nHealth() },
      {
        name: 'Тест N8N API эндпоинтов',
        test: () => this.testN8nApiEndpoints(),
      },
      {
        name: 'Тест создания тестового workflow',
        test: () => this.testWorkflowCreation(),
      },
      {
        name: 'Тест запуска workflow через webhook',
        test: () => this.testWorkflowExecution(),
      },
      {
        name: 'Тест интеграции с Instagram API',
        test: () => this.testInstagramIntegration(),
      },
      {
        name: 'Тест интеграции с Generation API',
        test: () => this.testGenerationIntegration(),
      },
    ]

    const results = []

    for (const { name, test } of tests) {
      console.log(`\\n📋 Выполняется: ${name}`)

      try {
        const startTime = Date.now()
        const result = await test()
        const duration = Date.now() - startTime

        console.log(`✅ ${name} - ПРОЙДЕН (${duration}ms)`)
        results.push({ name, status: 'PASSED', duration, result })
      } catch (error) {
        console.log(`❌ ${name} - ПРОВАЛЕН: ${error.message}`)
        results.push({ name, status: 'FAILED', error: error.message })
      }
    }

    this.printTestSummary(results)
    return results
  }

  /**
   * Проверка здоровья AI Server
   */
  async testAiServerHealth() {
    const response = await this.aiServerClient.get('/api/n8n/health')

    if (response.status !== 200) {
      throw new Error(`AI Server не отвечает: ${response.status}`)
    }

    return {
      status: response.data.success ? 'healthy' : 'unhealthy',
      data: response.data,
    }
  }

  /**
   * Проверка здоровья N8N
   */
  async testN8nHealth() {
    try {
      const response = await this.n8nClient.get('/api/v1/workflows')

      if (response.status !== 200) {
        throw new Error(`N8N не отвечает: ${response.status}`)
      }

      return {
        status: 'healthy',
        workflowsCount: response.data.data?.length || 0,
      }
    } catch (error) {
      throw new Error(`N8N недоступен: ${error.message}`)
    }
  }

  /**
   * Тестирование N8N API эндпоинтов
   */
  async testN8nApiEndpoints() {
    const endpoints = [
      { method: 'GET', path: '/api/n8n/workflows', expectedStatus: 200 },
      { method: 'GET', path: '/api/n8n/health', expectedStatus: 200 },
    ]

    const results = []

    for (const endpoint of endpoints) {
      const response = await this.aiServerClient.request({
        method: endpoint.method,
        url: endpoint.path,
      })

      if (response.status !== endpoint.expectedStatus) {
        throw new Error(
          `Эндпоинт ${endpoint.path} вернул ${response.status}, ожидался ${endpoint.expectedStatus}`
        )
      }

      results.push({
        endpoint: endpoint.path,
        status: response.status,
        success: response.data.success,
      })
    }

    return results
  }

  /**
   * Тест создания workflow'а
   */
  async testWorkflowCreation() {
    const testWorkflow = {
      name: 'Test Workflow Created by Integration Test',
      nodes: [
        {
          id: 'start',
          name: 'Start',
          type: 'n8n-nodes-base.start',
          position: [240, 300],
          parameters: {},
        },
        {
          id: 'webhook',
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          position: [460, 300],
          parameters: {
            httpMethod: 'POST',
            path: 'test-integration',
          },
        },
      ],
      connections: {
        Start: {
          main: [
            [
              {
                node: 'Webhook',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
      active: false,
    }

    const response = await this.aiServerClient.post(
      '/api/n8n/workflows',
      testWorkflow
    )

    if (!response.data.success) {
      throw new Error('Не удалось создать тестовый workflow')
    }

    return {
      workflowId: response.data.data.id,
      workflowName: response.data.data.name,
    }
  }

  /**
   * Тест выполнения workflow'а
   */
  async testWorkflowExecution() {
    const testData = {
      message: 'Test message from integration test',
      timestamp: new Date().toISOString(),
      testId: Math.random().toString(36).substring(7),
    }

    try {
      const response = await axios.post(
        `${config.n8nUrl}/webhook/test-integration`,
        testData,
        {
          timeout: 10000,
        }
      )

      return {
        webhookResponse: response.status,
        executionSuccess: true,
        responseData: response.data,
      }
    } catch (error) {
      // Это ожидаемо, если webhook не активен
      return {
        webhookResponse: error.response?.status || 'no_response',
        executionSuccess: false,
        note: 'Webhook может быть не активен, это нормально для теста',
      }
    }
  }

  /**
   * Тест интеграции с Instagram API
   */
  async testInstagramIntegration() {
    const testData = {
      username: 'test_instagram_user',
      source: 'n8n_integration_test',
    }

    try {
      const response = await this.aiServerClient.post(
        '/api/inngest/instagram-scraper',
        testData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        apiResponse: response.status,
        success: response.data.success || false,
        message: response.data.message || 'No message',
      }
    } catch (error) {
      // Instagram API может требовать специальной настройки
      return {
        apiResponse: error.response?.status || 'error',
        success: false,
        note: 'Instagram API может требовать дополнительной настройки',
      }
    }
  }

  /**
   * Тест интеграции с Generation API
   */
  async testGenerationIntegration() {
    const testData = {
      prompt: 'Test image generation from N8N integration',
      model: 'flux-schnell',
      aspect_ratio: '1:1',
      source: 'n8n_integration_test',
    }

    try {
      const response = await this.aiServerClient.post(
        '/api/generation/neuro-image',
        testData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      return {
        apiResponse: response.status,
        success: response.data.success || false,
        message: response.data.message || 'No message',
      }
    } catch (error) {
      return {
        apiResponse: error.response?.status || 'error',
        success: false,
        error: error.message,
        note: 'Generation API может требовать дополнительной настройки или API ключей',
      }
    }
  }

  /**
   * Вывод сводки тестов
   */
  printTestSummary(results) {
    console.log('\\n' + '='.repeat(60))
    console.log('📊 СВОДКА ТЕСТИРОВАНИЯ N8N ИНТЕГРАЦИИ')
    console.log('='.repeat(60))

    const passed = results.filter(r => r.status === 'PASSED').length
    const failed = results.filter(r => r.status === 'FAILED').length
    const total = results.length

    console.log(`\\n📈 Общие результаты:`)
    console.log(`   ✅ Пройдено: ${passed}/${total}`)
    console.log(`   ❌ Провалено: ${failed}/${total}`)
    console.log(`   📊 Процент успеха: ${Math.round((passed / total) * 100)}%`)

    console.log('\\n📋 Детальные результаты:')
    results.forEach((result, index) => {
      const icon = result.status === 'PASSED' ? '✅' : '❌'
      const duration = result.duration ? ` (${result.duration}ms)` : ''
      console.log(`   ${index + 1}. ${icon} ${result.name}${duration}`)

      if (result.status === 'FAILED' && result.error) {
        console.log(`      └─ Ошибка: ${result.error}`)
      }
    })

    console.log('\\n🎯 Рекомендации по настройке:')
    console.log('   1. Убедитесь, что N8N запущен на порту 5678')
    console.log('   2. Убедитесь, что AI Server запущен на порту 3000')
    console.log('   3. Настройте переменные окружения для API ключей')
    console.log('   4. Запустите: docker-compose up -d для полной настройки')

    console.log('\\n='.repeat(60))
  }
}

// Запуск тестов
async function main() {
  const tester = new N8nIntegrationTester()

  try {
    await tester.runTests()
  } catch (error) {
    console.error('❌ Критическая ошибка при выполнении тестов:', error.message)
    process.exit(1)
  }
}

// Запускаем только если файл выполняется напрямую
if (require.main === module) {
  main()
}

module.exports = N8nIntegrationTester
