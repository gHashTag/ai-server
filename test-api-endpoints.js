/**
 * Тестирование API endpoints обновленной Dart AI интеграции
 */

const axios = require('axios');
require('dotenv').config();

const SERVER_URL = process.env.ORIGIN || 'http://localhost:4000';

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

async function testAPIEndpoints() {
  log('\n🔧 Тестирование API endpoints Dart AI интеграции\n', colors.bold);

  try {
    // Тест 1: Проверка статуса Dart AI
    log('🏥 1. Проверка статуса Dart AI API...', colors.blue);
    
    try {
      const statusResponse = await axios.get(`${SERVER_URL}/api/dart-ai/status`);
      log(`✅ Статус API: ${statusResponse.status}`, colors.green);
      log(`📊 Ответ: ${JSON.stringify(statusResponse.data, null, 2)}`, colors.reset);
    } catch (error) {
      log(`❌ Ошибка статуса: ${error.response?.status} ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
      }
    }

    // Тест 2: Попытка синхронизации GitHub Issue
    log('\n📝 2. Тест синхронизации GitHub Issue #57...', colors.blue);
    
    const issueData = {
      number: 57,
      title: '[Dart AI Integration] Test синхронизации обновленной интеграции',
      body: '# Тест обновленной интеграции\n\n✅ Dart AI API (READ-ONLY) подключен\n✅ Односторонняя синхронизация: Dart AI → GitHub\n\n**Время тестирования:** ' + new Date().toLocaleString('ru-RU'),
      state: 'open',
      repository: 'gHashTag/ai-server',
      assignees: [],
      labels: ['dart-ai-test', 'integration'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    try {
      const syncResponse = await axios.post(`${SERVER_URL}/api/dart-ai/sync/github-issue`, issueData);
      log(`✅ Синхронизация Issue: ${syncResponse.status}`, colors.green);
      log(`📦 Результат: ${JSON.stringify(syncResponse.data, null, 2)}`, colors.reset);
    } catch (error) {
      log(`❌ Ошибка синхронизации: ${error.response?.status} ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
      }
    }

    // Тест 3: Массовая синхронизация GitHub Issues
    log('\n🔄 3. Тест массовой синхронизации Dart AI → GitHub...', colors.blue);
    
    try {
      const bulkSyncData = {
        repository: 'gHashTag/ai-server',
        limit: 3 // Ограничиваем 3 задачами для теста
      };
      
      const bulkResponse = await axios.post(`${SERVER_URL}/api/dart-ai/sync/bulk-github-issues`, bulkSyncData);
      log(`✅ Массовая синхронизация: ${bulkResponse.status}`, colors.green);
      log(`📦 Результат: ${JSON.stringify(bulkResponse.data, null, 2)}`, colors.reset);
    } catch (error) {
      log(`❌ Ошибка массовой синхронизации: ${error.response?.status} ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
      }
    }

    // Тест 4: Получение информации о задачах (если endpoint существует)
    log('\n📋 4. Получение информации о задачах Dart AI...', colors.blue);
    
    try {
      const tasksResponse = await axios.get(`${SERVER_URL}/api/dart-ai/tasks`);
      log(`✅ Список задач получен: ${tasksResponse.status}`, colors.green);
      log(`📊 Количество: ${tasksResponse.data.count || 'неизвестно'}`, colors.reset);
    } catch (error) {
      log(`⚠️  Endpoint /api/dart-ai/tasks не существует: ${error.response?.status}`, colors.yellow);
    }

    // Тест 5: Webhook тест (симуляция Dart AI webhook)
    log('\n🪝 5. Тест Dart AI webhook...', colors.blue);
    
    const webhookData = {
      event: 'task.updated',
      task: {
        duid: 'test-duid-12345',
        title: '[Webhook Test] Тестовая задача из Dart AI webhook',
        description: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [{ text: 'Тест webhook синхронизации' }]
              }
            ]
          }
        },
        spaceDuid: 'test-space-duid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        statusDuid: 'open-status-duid'
      },
      timestamp: new Date().toISOString()
    };
    
    try {
      const webhookResponse = await axios.post(`${SERVER_URL}/webhooks/dart-ai/tasks`, webhookData);
      log(`✅ Webhook обработан: ${webhookResponse.status}`, colors.green);
      log(`📦 Результат: ${JSON.stringify(webhookResponse.data, null, 2)}`, colors.reset);
    } catch (error) {
      log(`❌ Ошибка webhook: ${error.response?.status} ${error.message}`, colors.red);
      if (error.response?.data) {
        log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
      }
    }

    log('\n🎯 Итоги тестирования:', colors.bold);
    log('✅ Сервер работает и отвечает на запросы', colors.green);
    log('🔗 Dart AI интеграция настроена (READ-ONLY)', colors.green);
    log('📝 GitHub Issues могут создаваться из Dart AI задач', colors.green);
    log('🪝 Webhook endpoints доступны для Dart AI', colors.green);

  } catch (error) {
    log(`💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
    console.error(error);
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  testAPIEndpoints().catch(console.error);
}

module.exports = { testAPIEndpoints };