/**
 * Изучение структуры Dart AI API и поиск endpoint для создания задач
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.DART_AI_API_KEY;
const API_URL = process.env.DART_AI_API_URL;

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

async function makeAPIRequest(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Server-DartAI-Integration/1.0.0'
      },
      timeout: 10000
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

async function exploreAPI() {
  log('\n🔍 Исследование структуры Dart AI API\n', colors.bold);

  // 1. Получаем задачи и изучаем структуру
  log('📋 1. Изучение структуры задач...', colors.blue);
  
  const tasksResponse = await makeAPIRequest('/tasks');
  if (tasksResponse.success) {
    const tasks = tasksResponse.data.results || [];
    log(`✅ Получено ${tasksResponse.data.count} задач`, colors.green);
    
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      log('\n📦 Структура первой задачи:', colors.yellow);
      log(JSON.stringify(firstTask, null, 2).slice(0, 1000) + '...', colors.reset);
      
      // Ключевые поля для создания задачи
      const importantFields = ['title', 'description', 'status', 'priority', 'spaceDuid', 'kind', 'duid'];
      log('\n🔑 Важные поля для создания задач:', colors.yellow);
      importantFields.forEach(field => {
        if (firstTask[field] !== undefined) {
          log(`   • ${field}: ${JSON.stringify(firstTask[field])}`, colors.reset);
        }
      });
    }
  } else {
    log(`❌ Ошибка получения задач: ${tasksResponse.error}`, colors.red);
    return;
  }

  // 2. Получаем spaces для понимания где создавать задачи
  log('\n🏢 2. Изучение пространств (spaces)...', colors.blue);
  
  const spacesResponse = await makeAPIRequest('/spaces');
  if (spacesResponse.success) {
    const spaces = spacesResponse.data.results || [];
    log(`✅ Получено ${spacesResponse.data.count} пространств`, colors.green);
    
    if (spaces.length > 0) {
      log('\n🏢 Доступные пространства:', colors.yellow);
      spaces.forEach((space, index) => {
        log(`   ${index + 1}. "${space.title}" (${space.duid}) - ${space.kind}`, colors.reset);
        if (space.description) {
          log(`      📝 ${space.description}`, colors.reset);
        }
      });
      
      // Сохраняем DUID первого пространства для тестов
      global.TEST_SPACE_DUID = spaces[0].duid;
      log(`\n📌 Будем использовать пространство: "${spaces[0].title}" (${spaces[0].duid})`, colors.green);
    }
  }

  // 3. Пробуем различные endpoints для создания
  log('\n🔨 3. Поиск endpoint для создания задач...', colors.blue);
  
  const createEndpoints = [
    '/tasks',
    '/tasks/create', 
    '/task',
    '/task/create',
    '/items',
    '/items/create',
    '/spaces/{spaceDuid}/tasks',
    '/spaces/{spaceDuid}/items'
  ];

  const testTaskData = {
    title: '[TEST] GitHub Integration Test Task',
    description: '# Тестовая задача\n\nСоздана для тестирования интеграции GitHub → Dart AI',
    kind: 'Task', // Из структуры существующих задач
    spaceDuid: global.TEST_SPACE_DUID,
    status: 'open',
    priority: 'medium'
  };

  for (let endpoint of createEndpoints) {
    // Подставляем реальный spaceDuid если нужно
    if (endpoint.includes('{spaceDuid}') && global.TEST_SPACE_DUID) {
      endpoint = endpoint.replace('{spaceDuid}', global.TEST_SPACE_DUID);
    }
    
    log(`\n🧪 Тестируем POST ${endpoint}...`, colors.yellow);
    
    const createResponse = await makeAPIRequest(endpoint, 'POST', testTaskData);
    
    if (createResponse.success) {
      log(`🎉 УСПЕХ! Задача создана через ${endpoint}`, colors.green);
      log(`📦 Response: ${JSON.stringify(createResponse.data, null, 2)}`, colors.green);
      
      // Пробуем удалить созданную задачу для чистоты
      if (createResponse.data.duid) {
        const deleteResponse = await makeAPIRequest(`/tasks/${createResponse.data.duid}`, 'DELETE');
        if (deleteResponse.success) {
          log(`🗑️  Тестовая задача удалена`, colors.yellow);
        }
      }
      
      return {
        success: true,
        working_endpoint: endpoint,
        task_structure: testTaskData,
        response_structure: createResponse.data
      };
      
    } else {
      const statusColor = createResponse.status === 405 ? colors.yellow : colors.red;
      log(`   ${createResponse.status}: ${createResponse.error}`, statusColor);
      if (createResponse.data) {
        log(`   📋 ${JSON.stringify(createResponse.data)}`, colors.reset);
      }
    }
  }

  // 4. Изучаем OPTIONS для понимания доступных методов
  log('\n🔍 4. Изучение доступных HTTP методов...', colors.blue);
  
  try {
    const optionsResponse = await axios.options(`${API_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'User-Agent': 'AI-Server-DartAI-Integration/1.0.0'
      }
    });
    
    const allowedMethods = optionsResponse.headers.allow || optionsResponse.headers.Allow;
    if (allowedMethods) {
      log(`✅ Разрешенные методы для /tasks: ${allowedMethods}`, colors.green);
    }
    
  } catch (error) {
    log(`⚠️  OPTIONS запрос не поддерживается`, colors.yellow);
  }

  // 5. Проверяем можно ли обновлять существующие задачи
  if (tasksResponse.success && tasksResponse.data.results.length > 0) {
    const firstTask = tasksResponse.data.results[0];
    log(`\n📝 5. Тестируем обновление задачи ${firstTask.duid}...`, colors.blue);
    
    const updateData = {
      title: firstTask.title + ' [UPDATED by API Test]'
    };
    
    const updateResponse = await makeAPIRequest(`/tasks/${firstTask.duid}`, 'PATCH', updateData);
    if (updateResponse.success) {
      log(`✅ Задача обновлена через PATCH`, colors.green);
      
      // Возвращаем обратно
      const revertResponse = await makeAPIRequest(`/tasks/${firstTask.duid}`, 'PATCH', { title: firstTask.title });
      if (revertResponse.success) {
        log(`↩️  Изменения отменены`, colors.yellow);
      }
    } else {
      log(`❌ PATCH не работает: ${updateResponse.error}`, colors.red);
    }
  }

  return {
    success: false,
    message: 'Не найден способ создания задач через API'
  };
}

if (require.main === module) {
  exploreAPI()
    .then(result => {
      if (result && result.success) {
        log('\n🎉 Найден рабочий endpoint для создания задач!', colors.bold + colors.green);
        log(`\n🔧 Рекомендации для интеграции:`, colors.blue);
        log(`Endpoint: ${result.working_endpoint}`, colors.green);
        log(`Структура задачи: ${JSON.stringify(result.task_structure, null, 2)}`, colors.reset);
      } else {
        log('\n💡 Возможные варианты:', colors.yellow);
        log('   1. API только для чтения (read-only)', colors.reset);
        log('   2. Создание через веб-интерфейс с последующей синхронизацией', colors.reset);
        log('   3. Использование webhooks для получения изменений', colors.reset);
        log('   4. Обращение в техподдержку за документацией к API', colors.reset);
      }
    })
    .catch(error => {
      log(`\n💥 Ошибка исследования: ${error.message}`, colors.bold + colors.red);
      console.error(error);
    });
}

module.exports = { exploreAPI };