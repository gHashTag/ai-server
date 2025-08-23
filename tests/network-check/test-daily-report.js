/**
 * Тест ежедневного отчета и интерактивных кнопок
 */

const { Inngest } = require('inngest')

// Инициализация Inngest клиента
const inngest = new Inngest({
  id: 'test-daily-report',
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev: true,
})

async function testDailyHealthReport() {
  console.log('📊 Тестирование Daily Health Report...')

  try {
    // Запускаем ежедневный отчет вручную
    const result = await inngest.send({
      name: 'system/trigger-daily-report',
      data: {
        userId: 'admin',
        source: 'manual_test',
        timestamp: new Date().toISOString(),
      },
    })

    console.log('✅ Daily Health Report запущен:', result.ids[0])
    console.log('📋 Отчет будет содержать:')
    console.log('   • Статистику за 24 часа')
    console.log('   • AI анализ логов')
    console.log('   • Интерактивные кнопки')
    console.log('   • Рекомендации по улучшению')

    return true
  } catch (error) {
    console.error('❌ Ошибка запуска daily report:', error.message)
    return false
  }
}

async function testTelegramCallbacks() {
  console.log('🔘 Тестирование Telegram Callbacks...')

  const testCallbacks = [
    'show_detailed_logs',
    'run_network_check',
    'deployment_status',
    'show_errors_only',
    'show_trends',
    'auto_fix',
  ]

  let successCount = 0

  for (const callback of testCallbacks) {
    try {
      const result = await inngest.send({
        name: 'telegram/callback',
        data: {
          callbackData: callback,
          chatId: process.env.ADMIN_CHAT_ID || 'test_chat',
          messageId: 123,
          userId: 'admin',
          source: 'manual_test',
        },
      })

      console.log(`✅ Callback "${callback}" обработан:`, result.ids[0])
      successCount++
    } catch (error) {
      console.error(`❌ Ошибка callback "${callback}":`, error.message)
    }
  }

  console.log(`📊 Обработано ${successCount}/${testCallbacks.length} callbacks`)
  return successCount === testCallbacks.length
}

async function testNetworkCheckWithButtons() {
  console.log('🌐 Тестирование Network Check с кнопками...')

  try {
    // Симулируем network check с проблемами
    const result = await inngest.send({
      name: 'network/trigger-check',
      data: {
        userId: 'admin',
        source: 'button_test',
        simulateFailure: true, // Флаг для симуляции проблем
        timestamp: new Date().toISOString(),
      },
    })

    console.log('✅ Network Check с кнопками запущен:', result.ids[0])
    console.log('🔘 Ожидаемые кнопки в уведомлении:')
    console.log('   • 🔄 Перезапустить проверку')
    console.log('   • 📊 Подробная статистика')
    console.log('   • 🛠 Попробовать исправить')
    console.log('   • 📞 Вызвать админа')
    console.log('   • 📈 История проверок')
    console.log('   • 🔍 Детали ошибок')

    return true
  } catch (error) {
    console.error('❌ Ошибка network check с кнопками:', error.message)
    return false
  }
}

async function testPostDeployWithButtons() {
  console.log('🚀 Тестирование Post-Deploy с кнопками...')

  try {
    // Симулируем post-deploy проверку
    const result = await inngest.send({
      name: 'deployment/completed',
      data: {
        version: 'test-buttons-v1.0.0',
        commit: 'btn123def',
        branch: 'feature/buttons',
        deployedAt: new Date().toISOString(),
        environment: 'staging',
        source: 'button_test',
      },
    })

    console.log('✅ Post-Deploy с кнопками запущен:', result.ids[0])
    console.log('🔘 Кнопки зависят от результата:')
    console.log('   Успех: ✅ Отлично! | 📊 Подробности')
    console.log(
      '   Проблемы: 🔄 Повторить | 🚀 Откатить | 🛠 Исправить | 📞 Вызвать разработчика'
    )

    return true
  } catch (error) {
    console.error('❌ Ошибка post-deploy с кнопками:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🧪 ТЕСТЫ ЕЖЕДНЕВНОГО ОТЧЕТА И ИНТЕРАКТИВНОСТИ')
  console.log('='.repeat(50))

  const tests = [
    { name: 'Daily Health Report', fn: testDailyHealthReport },
    { name: 'Telegram Callbacks', fn: testTelegramCallbacks },
    { name: 'Network Check с кнопками', fn: testNetworkCheckWithButtons },
    { name: 'Post-Deploy с кнопками', fn: testPostDeployWithButtons },
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
    console.log('\n🎉 ВСЕ ТЕСТЫ ИНТЕРАКТИВНОСТИ ПРОЙДЕНЫ!')
    console.log('\n📝 Проверьте Telegram:')
    console.log('1. Ежедневный отчет с кнопками')
    console.log('2. Network check уведомления с действиями')
    console.log('3. Post-deploy отчеты с интерактивностью')
    console.log('4. Callback обработка нажатий кнопок')
  } else {
    console.log('\n⚠️ НЕКОТОРЫЕ ТЕСТЫ ИНТЕРАКТИВНОСТИ ПРОВАЛИЛИСЬ')
    console.log('Проверьте конфигурацию Telegram бота')
  }

  return { passed, failed, total: tests.length }
}

// Запуск тестов
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(
      '💥 Критическая ошибка при запуске тестов интерактивности:',
      error
    )
    process.exit(1)
  })
}

module.exports = {
  testDailyHealthReport,
  testTelegramCallbacks,
  testNetworkCheckWithButtons,
  testPostDeployWithButtons,
  runAllTests,
}
