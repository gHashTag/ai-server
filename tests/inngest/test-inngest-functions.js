/**
 * Тестирование реальных Inngest функций
 * Проверяет возможность запуска новых функций
 */

const { inngest } = require('./dist/core/inngest/clients');

async function testInngestFunctions() {
  console.log('🧪 ТЕСТИРОВАНИЕ INNGEST ФУНКЦИЙ');
  console.log('='.repeat(40));

  try {
    // 1. Тест системного мониторинга
    console.log('\n📊 Тестируем системный мониторинг...');
    const monitorResult = await inngest.send({
      name: 'system/trigger-monitor',
      data: { 
        trigger: 'test',
        timestamp: Date.now()
      }
    });
    console.log(`✅ Системный мониторинг запущен: ${monitorResult.ids[0]}`);

    // 2. Тест проверки здоровья
    console.log('\n💚 Тестируем проверку здоровья...');
    const healthResult = await inngest.send({
      name: 'system/trigger-health-check',
      data: { 
        trigger: 'test',
        timestamp: Date.now()
      }
    });
    console.log(`✅ Проверка здоровья запущена: ${healthResult.ids[0]}`);

    // 3. Тест автопарсера конкурентов  
    console.log('\n🤖 Тестируем автопарсер конкурентов...');
    const autoParserResult = await inngest.send({
      name: 'competitor/trigger-auto-parse',
      data: { 
        trigger: 'test',
        timestamp: Date.now()
      }
    });
    console.log(`✅ Автопарсер конкурентов запущен: ${autoParserResult.ids[0]}`);

    // 4. Тест тестового события для health check
    console.log('\n🧪 Тестируем health test handler...');
    const testEventResult = await inngest.send({
      name: 'system/health-test',
      data: { 
        timestamp: Date.now(),
        source: 'test-script'
      }
    });
    console.log(`✅ Health test event отправлен: ${testEventResult.ids[0]}`);

    console.log('\n' + '='.repeat(40));
    console.log('🎉 ВСЕ ТЕСТЫ УСПЕШНО ЗАПУЩЕНЫ');
    console.log('\nℹ️  Проверьте логи Inngest или админские уведомления');
    console.log('    для подтверждения выполнения функций.');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    console.error(error);
  }
}

testInngestFunctions();