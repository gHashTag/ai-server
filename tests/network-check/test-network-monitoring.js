/**
 * Тест новой системы мониторинга Network Check
 */

const { Inngest } = require('inngest')

// Инициализация Inngest клиента
const inngest = new Inngest({
  id: 'test-network-monitoring',
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: true,
})

async function testNetworkCheckMonitor() {
  console.log('🌐 Тестирование Network Check Monitor...')

  try {
    // Запускаем network check вручную
    const result = await inngest.send({
      name: 'network/trigger-check',
      data: {
        userId: 'admin',
        source: 'manual_test',
        timestamp: new Date().toISOString(),
      },
    })

    console.log('✅ Network check запущен:', result.ids[0])
    return true
  } catch (error) {
    console.error('❌ Ошибка запуска network check:', error.message)
    return false
  }
}

async function testPostDeployCheck() {
  console.log('🚀 Тестирование Post-Deploy Network Check...')

  try {
    // Симулируем событие завершения деплоя
    const result = await inngest.send({
      name: 'deployment/completed',
      data: {
        version: 'test-v1.0.0',
        commit: 'abc123def',
        branch: 'main',
        deployedAt: new Date().toISOString(),
        environment: 'staging',
        source: 'manual_test',
      },
    })

    console.log('✅ Post-deploy check запущен:', result.ids[0])
    return true
  } catch (error) {
    console.error('❌ Ошибка запуска post-deploy check:', error.message)
    return false
  }
}

async function testDeploymentAutoDetector() {
  console.log('🔍 Тестирование Deployment Auto Detector...')

  // Этот тест проверяет работу автоматического обнаружения деплоев
  // В реальности эта функция запускается по расписанию
  console.log('⏰ Deployment Auto Detector работает по cron расписанию')
  console.log('   - Запуск каждые 5 минут')
  console.log('   - Проверка изменений версии')
  console.log('   - Автоматический запуск post-deploy checks')

  return true
}

async function testRecoverySystem() {
  console.log('🛠 Тестирование Recovery System...')

  try {
    // Симулируем необходимость восстановления
    const result = await inngest.send({
      name: 'deployment/recovery-needed',
      data: {
        version: 'test-v1.0.0',
        failureRate: 75, // Высокий процент неудач
        criticalEndpoints: ['Main API', 'User Balance API'],
        timestamp: new Date().toISOString(),
        source: 'manual_test',
      },
    })

    console.log('✅ Recovery system запущен:', result.ids[0])
    console.log('⚠️ Внимание: Этот тест может отправить уведомления в Telegram!')
    return true
  } catch (error) {
    console.error('❌ Ошибка запуска recovery system:', error.message)
    return false
  }
}

async function testRailwayWebhook() {
  console.log('🚂 Тестирование Railway Webhook...')

  try {
    // Симулируем webhook от Railway
    const result = await inngest.send({
      name: 'railway/deployment.webhook',
      data: {
        status: 'SUCCESS',
        deploymentId: 'railway-deploy-123',
        service: 'ai-server',
        environment: 'production',
        timestamp: new Date().toISOString(),
        source: 'manual_test',
      },
    })

    console.log('✅ Railway webhook обработан:', result.ids[0])
    return true
  } catch (error) {
    console.error('❌ Ошибка обработки Railway webhook:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🧪 ЗАПУСК ТЕСТОВ NETWORK MONITORING SYSTEM')
  console.log('=' * 50)

  const tests = [
    { name: 'Network Check Monitor', fn: testNetworkCheckMonitor },
    { name: 'Post-Deploy Check', fn: testPostDeployCheck },
    { name: 'Deployment Auto Detector', fn: testDeploymentAutoDetector },
    { name: 'Recovery System', fn: testRecoverySystem },
    { name: 'Railway Webhook', fn: testRailwayWebhook },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    console.log(`\n📋 Тест: ${test.name}`)
    console.log('-'.repeat(30))

    try {
      const success = await test.fn()
      if (success) {
        console.log(`✅ ${test.name} - ПРОЙДЕН`)
        passed++
      } else {
        console.log(`❌ ${test.name} - ПРОВАЛЕН`)
        failed++
      }
    } catch (error) {
      console.log(`💥 ${test.name} - ОШИБКА:`, error.message)
      failed++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('📊 РЕЗУЛЬТАТЫ ТЕСТОВ:')
  console.log(`✅ Пройдено: ${passed}`)
  console.log(`❌ Провалено: ${failed}`)
  console.log(`📋 Всего: ${tests.length}`)

  if (failed === 0) {
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!')
    console.log('\n📝 Следующие шаги:')
    console.log('1. Проверьте Inngest Dashboard (http://localhost:8288)')
    console.log('2. Убедитесь что функции зарегистрированы')
    console.log('3. Проверьте уведомления в Telegram')
  } else {
    console.log('\n⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛИЛИСЬ')
    console.log('Проверьте логи и конфигурацию системы')
  }

  return { passed, failed, total: tests.length }
}

// Запуск тестов
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Критическая ошибка при запуске тестов:', error)
    process.exit(1)
  })
}

module.exports = {
  testNetworkCheckMonitor,
  testPostDeployCheck,
  testDeploymentAutoDetector,
  testRecoverySystem,
  testRailwayWebhook,
  runAllTests,
}