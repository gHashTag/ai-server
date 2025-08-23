/**
 * Тест N8N workflow для функции NeuroPhoto
 * Проверяет полную интеграцию: N8N workflow → AI Server API → Функция нейрофото
 */

const axios = require('axios');
const { logger } = require('../../dist/utils/logger');

// Конфигурация для тестирования
const config = {
  n8nWebhookUrl: 'http://localhost:5678/webhook/neurophoto-generation',
  aiServerUrl: 'http://localhost:4000',
  testTimeout: 60000, // 60 секунд для генерации изображения
};

class NeuroPhotoWorkflowTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Основная функция тестирования workflow
   */
  async runTests() {
    console.log('🎨 Запуск тестов N8N NeuroPhoto Workflow\\n');
    console.log('='.repeat(60));
    
    const tests = [
      { 
        name: 'Тест с корректными данными', 
        test: () => this.testValidRequest(),
        critical: true 
      },
      { 
        name: 'Тест без обязательного поля prompt', 
        test: () => this.testMissingPrompt(),
        critical: false 
      },
      { 
        name: 'Тест без telegram_id', 
        test: () => this.testMissingTelegramId(),
        critical: false 
      },
      { 
        name: 'Тест без model_url', 
        test: () => this.testMissingModelUrl(),
        critical: false 
      },
      { 
        name: 'Тест с дополнительными параметрами', 
        test: () => this.testWithOptionalParams(),
        critical: false 
      },
      { 
        name: 'Тест с некорректным model_url', 
        test: () => this.testInvalidModelUrl(),
        critical: false 
      },
    ];

    for (const { name, test, critical } of tests) {
      console.log(`\\n🔄 Выполняется: ${name}`);
      
      try {
        const startTime = Date.now();
        const result = await test();
        const duration = Date.now() - startTime;
        
        console.log(`✅ ${name} - ПРОЙДЕН (${duration}ms)`);
        this.testResults.push({ name, status: 'PASSED', duration, result, critical });
      } catch (error) {
        console.log(`❌ ${name} - ПРОВАЛЕН: ${error.message}`);
        this.testResults.push({ name, status: 'FAILED', error: error.message, critical });
        
        // Если критический тест провален, прекращаем
        if (critical) {
          console.log(`\\n🚨 Критический тест провален! Остановка тестирования.`);
          break;
        }
      }
    }
    
    this.printTestSummary();
    return this.testResults;
  }

  /**
   * Тест с корректными данными
   */
  async testValidRequest() {
    const testData = {
      prompt: 'Beautiful portrait of a person in a magical forest, high quality, detailed',
      telegram_id: '123456789',
      model_url: 'test-user-model/version-1', // Тестовый URL модели
      username: 'test_user_n8n',
      num_images: 1,
      is_ru: true,
      bot_name: 'neuro_blogger_bot',
      gender: 'female'
    };

    const response = await axios.post(config.n8nWebhookUrl, testData, {
      timeout: config.testTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    const data = response.data;
    
    // Проверяем структуру ответа
    if (!data.success) {
      throw new Error(`Workflow returned success=false: ${JSON.stringify(data)}`);
    }

    if (!data.workflow_id || data.workflow_id !== 'neurophoto-generation') {
      throw new Error('Missing or incorrect workflow_id');
    }

    if (!data.data || !data.data.telegram_id) {
      throw new Error('Missing data structure in response');
    }

    return {
      status: response.status,
      success: data.success,
      workflow_id: data.workflow_id,
      job_id: data.data.job_id,
      processing_type: 'async'
    };
  }

  /**
   * Тест без обязательного поля prompt
   */
  async testMissingPrompt() {
    const testData = {
      telegram_id: '123456789',
      model_url: 'test-user-model/version-1',
      username: 'test_user'
    };

    const response = await axios.post(config.n8nWebhookUrl, testData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 400) {
      throw new Error(`Expected status 400, got ${response.status}`);
    }

    const data = response.data;
    
    if (data.success !== false) {
      throw new Error('Expected success=false for invalid request');
    }

    if (!data.validation_error || !data.validation_error.missing_fields.includes('prompt')) {
      throw new Error('Expected validation error for missing prompt');
    }

    return {
      status: response.status,
      validation_error: true,
      missing_fields: data.validation_error.missing_fields
    };
  }

  /**
   * Тест без telegram_id
   */
  async testMissingTelegramId() {
    const testData = {
      prompt: 'Test prompt',
      model_url: 'test-user-model/version-1',
      username: 'test_user'
    };

    const response = await axios.post(config.n8nWebhookUrl, testData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 400) {
      throw new Error(`Expected status 400, got ${response.status}`);
    }

    const data = response.data;
    if (!data.validation_error.missing_fields.includes('telegram_id')) {
      throw new Error('Expected validation error for missing telegram_id');
    }

    return {
      status: response.status,
      validation_error: true,
      missing_fields: data.validation_error.missing_fields
    };
  }

  /**
   * Тест без model_url
   */
  async testMissingModelUrl() {
    const testData = {
      prompt: 'Test prompt',
      telegram_id: '123456789',
      username: 'test_user'
    };

    const response = await axios.post(config.n8nWebhookUrl, testData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 400) {
      throw new Error(`Expected status 400, got ${response.status}`);
    }

    const data = response.data;
    if (!data.validation_error.missing_fields.includes('model_url')) {
      throw new Error('Expected validation error for missing model_url');
    }

    return {
      status: response.status,
      validation_error: true,
      missing_fields: data.validation_error.missing_fields
    };
  }

  /**
   * Тест с дополнительными параметрами
   */
  async testWithOptionalParams() {
    const testData = {
      prompt: 'Professional headshot with business attire',
      telegram_id: '987654321',
      model_url: 'premium-user-model/v2',
      username: 'premium_user',
      num_images: 2,
      is_ru: false,
      bot_name: 'ai_koshey_bot',
      gender: 'male',
      // Дополнительные поля для проверки гибкости
      custom_field: 'should be ignored',
      extra_param: 123
    };

    const response = await axios.post(config.n8nWebhookUrl, testData, {
      timeout: config.testTimeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }

    const data = response.data;
    if (!data.success) {
      throw new Error(`Workflow failed: ${JSON.stringify(data)}`);
    }

    return {
      status: response.status,
      success: data.success,
      num_images: 2,
      bot_name: 'ai_koshey_bot'
    };
  }

  /**
   * Тест с некорректным model_url (может вызвать ошибку API)
   */
  async testInvalidModelUrl() {
    const testData = {
      prompt: 'Test with invalid model',
      telegram_id: '111111111',
      model_url: 'invalid-model-url-that-does-not-exist',
      username: 'error_test_user',
      num_images: 1
    };

    const response = await axios.post(config.n8nWebhookUrl, testData, {
      timeout: 30000, // Дольше ждем потому что API может возвращать ошибку не сразу
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // В зависимости от реализации, может быть 200 (async error) или 400 (sync error)
    if (response.status !== 200 && response.status !== 400) {
      throw new Error(`Unexpected status: ${response.status}`);
    }

    const data = response.data;

    // Если workflow отработал, но API вернул ошибку
    if (response.status === 200 && data.success) {
      // Это означает что запрос принят в обработку, но может завершиться ошибкой
      return {
        status: response.status,
        workflow_accepted: true,
        note: 'Request accepted but may fail at API level'
      };
    }

    // Если workflow сразу определил ошибку
    if (!data.success) {
      return {
        status: response.status,
        error_detected: true,
        error_info: data.error || data.validation_error
      };
    }

    return {
      status: response.status,
      data: data
    };
  }

  /**
   * Вывод сводки тестов
   */
  printTestSummary() {
    console.log('\\n' + '='.repeat(60));
    console.log('📊 СВОДКА ТЕСТИРОВАНИЯ NEUROPHOTO WORKFLOW');
    console.log('='.repeat(60));

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    const criticalFailed = this.testResults.filter(r => r.status === 'FAILED' && r.critical).length;

    console.log(`\\n📈 Общие результаты:`);
    console.log(`   ✅ Пройдено: ${passed}/${total}`);
    console.log(`   ❌ Провалено: ${failed}/${total}`);
    console.log(`   🚨 Критических провалов: ${criticalFailed}`);
    console.log(`   📊 Процент успеха: ${Math.round((passed / total) * 100)}%`);

    console.log('\\n📋 Детальные результаты:');
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      const critical = result.critical ? ' 🚨' : '';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`   ${index + 1}. ${icon} ${result.name}${critical}${duration}`);
      
      if (result.status === 'FAILED' && result.error) {
        console.log(`      └─ Ошибка: ${result.error}`);
      }
    });

    console.log('\\n🎯 Информация о workflow:');
    console.log(`   🔗 N8N Webhook URL: ${config.n8nWebhookUrl}`);
    console.log(`   🎛️ AI Server URL: ${config.aiServerUrl}`);
    console.log(`   ⏱️ Timeout: ${config.testTimeout}ms`);

    if (criticalFailed > 0) {
      console.log('\\n🚨 ВНИМАНИЕ: Есть критические ошибки!');
      console.log('   Проверьте что N8N запущен и workflow активирован');
      console.log('   Убедитесь что AI Server доступен');
    } else {
      console.log('\\n🎉 Все критические тесты прошли успешно!');
      console.log('   NeuroPhoto workflow готов к использованию');
    }

    console.log('\\n='.repeat(60));
  }
}

// Запуск тестов
async function main() {
  const tester = new NeuroPhotoWorkflowTester();
  
  try {
    console.log('🎨 NeuroPhoto N8N Workflow Tester');
    console.log('Тестирование интеграции N8N workflow с функцией нейрофото');
    console.log('');
    
    await tester.runTests();
  } catch (error) {
    console.error('❌ Критическая ошибка при выполнении тестов:', error.message);
    process.exit(1);
  }
}

// Запускаем только если файл выполняется напрямую
if (require.main === module) {
  main();
}

module.exports = NeuroPhotoWorkflowTester;