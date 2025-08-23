/**
 * Тест подключения к реальному Dart AI API
 * Проверяем различные endpoints и методы
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.DART_AI_API_KEY;
const API_URL = process.env.DART_AI_API_URL || 'https://api.dartai.com';

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

async function testDartAIAPI() {
  log('\n🚀 Тест подключения к реальному Dart AI API\n', colors.bold);

  if (!API_KEY || API_KEY === 'your_dart_ai_api_key_here') {
    log('❌ API ключ не настроен!', colors.red);
    return;
  }

  log(`🔑 API Key: ${API_KEY.slice(0, 20)}...`, colors.blue);
  log(`🌐 API URL: ${API_URL}`, colors.blue);

  // Различные варианты заголовков для авторизации
  const authHeaders = [
    { 'Authorization': `Bearer ${API_KEY}` },
    { 'Authorization': `Token ${API_KEY}` },
    { 'X-API-Key': API_KEY },
    { 'Authorization': API_KEY },
    { 'Dart-API-Key': API_KEY }
  ];

  // Возможные endpoints
  const endpoints = [
    '/health',
    '/status',
    '/ping',
    '/api/health',
    '/api/status',
    '/v1/health',
    '/v1/status',
    '/tasks',
    '/api/tasks',
    '/v1/tasks',
    '/projects',
    '/api/projects',
    '/v1/projects',
    '/spaces',
    '/api/spaces',
    '/v1/spaces'
  ];

  let workingEndpoints = [];
  let workingAuth = null;

  // Тест 1: Найти рабочий endpoint и метод авторизации
  log('📡 Тест 1: Поиск рабочих endpoints...', colors.blue);

  for (const headers of authHeaders) {
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_URL}${endpoint}`, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Server-DartAI-Integration/1.0.0',
            ...headers
          },
          timeout: 5000
        });

        log(`✅ ${endpoint}: ${response.status} ${response.statusText}`, colors.green);
        log(`📦 Response: ${JSON.stringify(response.data, null, 2).slice(0, 200)}...`, colors.reset);
        
        workingEndpoints.push({
          endpoint,
          status: response.status,
          data: response.data,
          headers
        });

        if (!workingAuth) {
          workingAuth = headers;
        }

      } catch (error) {
        if (error.response) {
          log(`⚠️  ${endpoint}: ${error.response.status} ${error.response.statusText}`, colors.yellow);
          if (error.response.data) {
            log(`📋 Error data: ${JSON.stringify(error.response.data, null, 2).slice(0, 200)}...`, colors.yellow);
          }
        } else {
          log(`❌ ${endpoint}: ${error.message}`, colors.red);
        }
      }
    }
    
    if (workingEndpoints.length > 0) {
      log(`✅ Найден рабочий метод авторизации: ${JSON.stringify(headers)}`, colors.green);
      break;
    }
  }

  if (workingEndpoints.length === 0) {
    log('\n❌ Не удалось найти рабочие endpoints!', colors.red);
    log('🔧 Возможные причины:', colors.yellow);
    log('   • Неправильный API URL', colors.yellow);
    log('   • Недействительный API ключ', colors.yellow);
    log('   • API использует другой метод авторизации', colors.yellow);
    log('   • Требуется активация ключа в панели управления', colors.yellow);
    return;
  }

  log(`\n✅ Найдено ${workingEndpoints.length} рабочих endpoints:`, colors.green);
  workingEndpoints.forEach(ep => {
    log(`   • ${ep.endpoint} (${ep.status})`, colors.reset);
  });

  // Тест 2: Попытка создать задачу
  if (workingAuth) {
    log('\n📝 Тест 2: Попытка создать задачу...', colors.blue);

    const taskData = {
      title: '[GitHub Integration Test] Тестовая задача для синхронизации',
      description: `# Тест интеграции с GitHub

Эта задача создана автоматически для тестирования интеграции между GitHub Issues и Dart AI Task Manager.

## Детали
- **Источник:** GitHub Issue #57
- **Репозиторий:** gHashTag/ai-server  
- **Время создания:** ${new Date().toLocaleString('ru-RU')}
- **API Key:** ${API_KEY.slice(0, 10)}...

## Следующие шаги
- [ ] Проверить создание в Dart AI
- [ ] Протестировать обновление статуса
- [ ] Синхронизировать обратно в GitHub`,
      status: 'open',
      priority: 'medium',
      project: 'GitHub Integration',
      labels: ['integration', 'test', 'github-sync'],
      metadata: {
        source: 'github-integration-test',
        github_issue: 57,
        repository: 'gHashTag/ai-server',
        created_by: 'api-test'
      }
    };

    const createEndpoints = ['/tasks', '/api/tasks', '/v1/tasks'];

    for (const endpoint of createEndpoints) {
      try {
        const response = await axios.post(`${API_URL}${endpoint}`, taskData, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Server-DartAI-Integration/1.0.0',
            ...workingAuth
          },
          timeout: 10000
        });

        log(`✅ Задача создана через ${endpoint}:`, colors.green);
        log(`📦 Response: ${JSON.stringify(response.data, null, 2)}`, colors.reset);
        
        // Сохраняем ID созданной задачи для дальнейших тестов
        const taskId = response.data.id || response.data.task_id || response.data._id;
        
        if (taskId) {
          log(`🆔 Task ID: ${taskId}`, colors.blue);
          
          // Тест 3: Попытка получить созданную задачу
          log('\n🔍 Тест 3: Получение созданной задачи...', colors.blue);
          
          try {
            const getResponse = await axios.get(`${API_URL}${endpoint}/${taskId}`, {
              headers: {
                'Content-Type': 'application/json',
                ...workingAuth
              }
            });
            
            log('✅ Задача успешно получена:', colors.green);
            log(`📦 Task data: ${JSON.stringify(getResponse.data, null, 2)}`, colors.reset);
            
          } catch (getError) {
            log(`⚠️  Не удалось получить задачу: ${getError.message}`, colors.yellow);
          }
        }

        return {
          success: true,
          working_endpoint: endpoint,
          auth_method: workingAuth,
          task_created: true,
          task_data: response.data
        };

      } catch (error) {
        log(`⚠️  Создание через ${endpoint}: ${error.message}`, colors.yellow);
        if (error.response?.data) {
          log(`📋 Error: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
        }
      }
    }
  }

  // Тест 4: Получение списка проектов/spaces
  log('\n🏗️  Тест 4: Получение списка проектов...', colors.blue);
  
  const projectEndpoints = ['/projects', '/api/projects', '/v1/projects', '/spaces', '/api/spaces', '/v1/spaces'];
  
  for (const endpoint of projectEndpoints) {
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...workingAuth
        },
        timeout: 5000
      });

      log(`✅ Проекты получены через ${endpoint}:`, colors.green);
      log(`📦 Projects: ${JSON.stringify(response.data, null, 2).slice(0, 500)}...`, colors.reset);
      
      break;

    } catch (error) {
      log(`⚠️  ${endpoint}: ${error.message}`, colors.yellow);
    }
  }

  return {
    success: workingEndpoints.length > 0,
    working_endpoints: workingEndpoints,
    auth_method: workingAuth,
    api_accessible: true
  };
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  testDartAIAPI()
    .then(result => {
      if (result && result.success) {
        log('\n🎉 Тест Dart AI API завершен успешно!', colors.bold + colors.green);
        log('🔗 API подключение настроено и готово к использованию', colors.green);
      } else {
        log('\n💥 Тест завершился с проблемами', colors.bold + colors.red);
        log('📞 Обратитесь к документации Dart AI или в поддержку', colors.yellow);
      }
    })
    .catch(error => {
      log(`\n💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
      console.error(error);
    });
}

module.exports = { testDartAIAPI };