/**
 * Test script для проверки интеграции с Dart AI Task Manager
 * Проверяет двухстороннюю синхронизацию между GitHub Issues и Dart AI задачами
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const TEST_REPOSITORY = process.env.TEST_REPOSITORY || 'gHashTag/ai-server';

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testDartAIIntegration() {
  log('\n🚀 Запуск тестирования интеграции Dart AI Task Manager\n', colors.bold);

  try {
    // Тест 1: Проверка статуса интеграции
    log('📊 Тест 1: Проверка статуса интеграции', colors.blue);
    const statusResponse = await axios.get(`${BASE_URL}/api/dart-ai/status`);
    
    log(`✅ Статус: ${statusResponse.data.status}`, colors.green);
    log(`📡 API настроен: ${statusResponse.data.health_check.success}`, 
        statusResponse.data.health_check.success ? colors.green : colors.red);
    log(`📈 Статистика синхронизации:`, colors.blue);
    log(`   • Всего синхронизаций: ${statusResponse.data.sync_stats.total_syncs}`);
    log(`   • Успешных: ${statusResponse.data.sync_stats.successful_syncs}`);
    log(`   • Неудачных: ${statusResponse.data.sync_stats.failed_syncs}`);

    // Тест 2: Симуляция webhook от Dart AI
    log('\n🔔 Тест 2: Симуляция webhook от Dart AI', colors.blue);
    const dartTaskWebhook = {
      event: 'task.created',
      task: {
        id: `test-task-${Date.now()}`,
        title: 'Тестовая задача из Dart AI',
        description: 'Это тестовая задача для проверки синхронизации с GitHub Issues',
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      repository: TEST_REPOSITORY
    };

    try {
      const webhookResponse = await axios.post(
        `${BASE_URL}/webhooks/dart-ai/tasks`,
        dartTaskWebhook,
        {
          headers: {
            'x-dart-event': 'task.created',
            'x-dart-delivery': `test-${Date.now()}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      log(`✅ Webhook обработан: ${webhookResponse.data.message}`, colors.green);
      log(`🎯 Результат: ${webhookResponse.data.result}`, colors.yellow);
    } catch (error) {
      log(`❌ Ошибка webhook: ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
      }
    }

    // Тест 3: Симуляция webhook от GitHub Issues
    log('\n🔔 Тест 3: Симуляция webhook от GitHub Issues', colors.blue);
    const githubIssueWebhook = {
      action: 'opened',
      issue: {
        number: Math.floor(Math.random() * 1000) + 100,
        title: 'Тестовая issue из GitHub',
        body: 'Это тестовая issue для проверки синхронизации с Dart AI',
        state: 'open',
        assignees: [],
        labels: [{ name: 'test' }, { name: 'dart-ai-sync' }],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      repository: {
        full_name: TEST_REPOSITORY
      }
    };

    try {
      const githubWebhookResponse = await axios.post(
        `${BASE_URL}/webhooks/github/issues`,
        githubIssueWebhook,
        {
          headers: {
            'x-github-event': 'issues',
            'x-github-delivery': `test-${Date.now()}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      log(`✅ GitHub webhook обработан: ${githubWebhookResponse.data.message}`, colors.green);
      log(`🎯 Результат: ${githubWebhookResponse.data.result}`, colors.yellow);
    } catch (error) {
      log(`❌ Ошибка GitHub webhook: ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
      }
    }

    // Тест 4: Ручная синхронизация GitHub Issue
    log('\n🔄 Тест 4: Ручная синхронизация GitHub Issue', colors.blue);
    try {
      const manualSyncResponse = await axios.post(
        `${BASE_URL}/api/dart-ai/sync/github-issue`,
        {
          issue_number: 1, // Используем первую issue для теста
          repository: TEST_REPOSITORY
        }
      );
      
      log(`✅ Ручная синхронизация: ${manualSyncResponse.data.message}`, colors.green);
      log(`📊 Результат:`, colors.blue);
      log(`   • Успех: ${manualSyncResponse.data.result.success}`);
      log(`   • Создано задач: ${manualSyncResponse.data.result.tasks_created || 0}`);
      log(`   • Обновлено задач: ${manualSyncResponse.data.result.tasks_updated || 0}`);
    } catch (error) {
      log(`❌ Ошибка ручной синхронизации: ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${error.response.data.message}`, colors.yellow);
      }
    }

    // Тест 5: Ручная синхронизация Dart AI задачи
    log('\n🔄 Тест 5: Ручная синхронизация Dart AI задачи', colors.blue);
    try {
      const taskSyncResponse = await axios.post(
        `${BASE_URL}/api/dart-ai/sync/task`,
        {
          task_id: 'test-task-123',
          repository: TEST_REPOSITORY
        }
      );
      
      log(`✅ Синхронизация задачи: ${taskSyncResponse.data.message}`, colors.green);
      log(`📊 Результат:`, colors.blue);
      log(`   • Успех: ${taskSyncResponse.data.result.success}`);
      log(`   • Создано issues: ${taskSyncResponse.data.result.issues_created || 0}`);
      log(`   • Обновлено issues: ${taskSyncResponse.data.result.issues_updated || 0}`);
    } catch (error) {
      log(`❌ Ошибка синхронизации задачи: ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${error.response.data.message}`, colors.yellow);
      }
    }

    // Тест 6: Массовая синхронизация GitHub Issues
    log('\n🔄 Тест 6: Массовая синхронизация GitHub Issues', colors.blue);
    try {
      const bulkSyncResponse = await axios.post(
        `${BASE_URL}/api/dart-ai/sync/bulk-issues`,
        {
          repository: TEST_REPOSITORY,
          state: 'open',
          limit: 5
        }
      );
      
      log(`✅ Массовая синхронизация: ${bulkSyncResponse.data.message}`, colors.green);
      log(`📊 Результаты:`, colors.blue);
      log(`   • Всего issues: ${bulkSyncResponse.data.results.total}`);
      log(`   • Успешно: ${bulkSyncResponse.data.results.successful}`);
      log(`   • Неудачно: ${bulkSyncResponse.data.results.failed}`);
      
      if (bulkSyncResponse.data.results.errors.length > 0) {
        log(`⚠️  Ошибки:`, colors.yellow);
        bulkSyncResponse.data.results.errors.forEach(error => {
          log(`   • ${error}`, colors.yellow);
        });
      }
    } catch (error) {
      log(`❌ Ошибка массовой синхронизации: ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${error.response.data.message}`, colors.yellow);
      }
    }

    // Финальная проверка статуса
    log('\n📊 Финальная проверка статуса', colors.blue);
    const finalStatusResponse = await axios.get(`${BASE_URL}/api/dart-ai/status`);
    log(`📈 Обновленная статистика:`, colors.blue);
    log(`   • Всего синхронизаций: ${finalStatusResponse.data.sync_stats.total_syncs}`);
    log(`   • Успешных: ${finalStatusResponse.data.sync_stats.successful_syncs}`);
    log(`   • Неудачных: ${finalStatusResponse.data.sync_stats.failed_syncs}`);
    log(`   • Последняя синхронизация: ${finalStatusResponse.data.sync_stats.last_sync || 'Никогда'}`);

    log('\n🎉 Тестирование завершено успешно!', colors.bold + colors.green);

  } catch (error) {
    log(`\n💥 Критическая ошибка тестирования: ${error.message}`, colors.bold + colors.red);
    if (error.response?.data) {
      log(`📋 Детали ответа сервера:`, colors.yellow);
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    
    log(`\n🔍 Проверьте:`, colors.yellow);
    log(`   • Запущен ли сервер на ${BASE_URL}`);
    log(`   • Настроены ли переменные окружения DART_AI_API_KEY и GITHUB_TOKEN`);
    log(`   • Доступен ли Dart AI API`);
    
    process.exit(1);
  }
}

// Запуск тестов
if (require.main === module) {
  testDartAIIntegration();
}

module.exports = { testDartAIIntegration };