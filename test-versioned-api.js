/**
 * Тестирование найденных версионированных API endpoints Dart AI
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.DART_AI_API_KEY;

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

async function testVersionedAPI() {
  log('\n🎯 Тестирование версионированных API endpoints\n', colors.bold);

  // Найденные в JavaScript endpoints
  const apiVersions = [
    'https://app.dartai.com/api/v0',
    'https://app.dartai.com/api/v1', 
    'https://app.dartai.com/api/v2'
  ];

  const testEndpoints = [
    '',
    '/health',
    '/status',
    '/tasks', 
    '/projects',
    '/spaces',
    '/me',
    '/user',
    '/workspaces'
  ];

  // Тестируем различные методы авторизации
  const authMethods = [
    { 'Authorization': `Bearer ${API_KEY}` },
    { 'Authorization': `Token ${API_KEY}` },
    { 'X-API-Key': API_KEY },
    { 'Authorization': API_KEY }
  ];

  let workingEndpoints = [];

  for (const baseAPI of apiVersions) {
    log(`\n📡 Тестируем базовый URL: ${baseAPI}`, colors.blue);
    
    for (const authHeaders of authMethods) {
      const authType = Object.keys(authHeaders)[0];
      log(`   🔑 Тестируем авторизацию: ${authType}`, colors.yellow);
      
      for (const endpoint of testEndpoints) {
        const fullURL = `${baseAPI}${endpoint}`;
        
        try {
          const response = await axios.get(fullURL, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'AI-Server-DartAI-Integration/1.0.0',
              ...authHeaders
            },
            timeout: 5000,
            validateStatus: () => true // Принимаем любой статус
          });

          const isJSON = response.headers['content-type']?.includes('application/json');
          
          if (isJSON && response.status < 500) {
            const statusColor = response.status === 200 ? colors.green : 
                              response.status < 400 ? colors.yellow : colors.red;
            
            log(`   ✅ ${endpoint || '/'}: ${response.status} (JSON!)`, statusColor);
            log(`      📦 ${JSON.stringify(response.data).slice(0, 300)}...`, colors.reset);
            
            workingEndpoints.push({
              url: fullURL,
              status: response.status,
              auth: authHeaders,
              data: response.data,
              isJSON: true
            });
            
            // Если нашли рабочий endpoint, пробуем создать задачу
            if (response.status === 200 && endpoint === '/tasks') {
              log(`\n🎯 Найден рабочий tasks endpoint! Пробуем создать задачу...`, colors.green);
              
              const taskData = {
                title: '[GitHub Integration] Тест создания задачи через API',
                description: `# Тест интеграции GitHub → Dart AI\n\n✅ Найден рабочий API endpoint: ${fullURL}\n✅ Авторизация работает: ${authType}\n\n**Время создания:** ${new Date().toLocaleString('ru-RU')}`,
                status: 'open',
                priority: 'medium',
                labels: ['github-integration', 'api-test']
              };

              try {
                const createResponse = await axios.post(fullURL, taskData, {
                  headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'AI-Server-DartAI-Integration/1.0.0',
                    ...authHeaders
                  },
                  timeout: 10000
                });

                log(`🎉 ЗАДАЧА СОЗДАНА! Status: ${createResponse.status}`, colors.green);
                log(`📦 Response: ${JSON.stringify(createResponse.data, null, 2)}`, colors.green);
                
                // Сохраняем успешный результат
                return {
                  success: true,
                  api_url: baseAPI,
                  endpoint: endpoint,
                  auth: authHeaders,
                  task_created: true,
                  task_id: createResponse.data.id || createResponse.data._id || 'unknown',
                  task_data: createResponse.data
                };

              } catch (createError) {
                log(`⚠️  Ошибка создания задачи: ${createError.response?.status} ${createError.message}`, colors.yellow);
                if (createError.response?.data) {
                  log(`📋 Error details: ${JSON.stringify(createError.response.data, null, 2)}`, colors.yellow);
                }
              }
            }
            
          } else {
            // Проверяем есть ли полезная информация в HTML ответе
            if (!isJSON && response.data && typeof response.data === 'string' && response.data.includes('api')) {
              log(`   📄 ${endpoint || '/'}: ${response.status} (HTML, но может содержать API info)`, colors.yellow);
            }
          }

        } catch (error) {
          if (error.code !== 'ECONNREFUSED' && error.code !== 'ENOTFOUND') {
            const status = error.response?.status;
            if (status === 401) {
              log(`   🔒 ${endpoint || '/'}: 401 Unauthorized (может быть правильный endpoint!)`, colors.yellow);
            } else if (status === 403) {
              log(`   🚫 ${endpoint || '/'}: 403 Forbidden (endpoint существует!)`, colors.yellow);  
            } else if (status && status < 500) {
              log(`   ⚠️  ${endpoint || '/'}: ${status} ${error.response?.statusText}`, colors.yellow);
            }
          }
        }
      }
      
      // Если нашли хотя бы один рабочий endpoint с этой авторизацией, прерываем
      if (workingEndpoints.length > 0) {
        log(`✅ Найдена рабочая авторизация: ${authType}`, colors.green);
        break;
      }
    }
    
    // Если нашли рабочие endpoints, не тестируем другие версии API
    if (workingEndpoints.length > 0) {
      break;
    }
  }

  // Результаты
  log('\n📊 Результаты тестирования:', colors.blue);
  
  if (workingEndpoints.length === 0) {
    log('❌ JSON API endpoints не найдены', colors.red);
    
    // Пробуем специфические endpoints из JavaScript кода
    log('\n🔍 Тестируем специфические endpoints из JS кода...', colors.blue);
    
    const specificEndpoints = [
      'https://app.dartai.com/api/v0/transactions/create',
      'https://app.dartai.com/api/v0/tracking/sentry',
      'https://app.dartai.com/api/v2/'
    ];
    
    for (const url of specificEndpoints) {
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 3000,
          validateStatus: () => true
        });
        
        const isJSON = response.headers['content-type']?.includes('application/json');
        if (isJSON) {
          log(`✅ ${url}: ${response.status} (JSON!)`, colors.green);
          log(`   📦 ${JSON.stringify(response.data)}`, colors.reset);
        }
      } catch (e) {
        // ignore
      }
    }
    
    return { success: false, workingEndpoints: [] };
  }

  log(`✅ Найдено ${workingEndpoints.length} рабочих JSON endpoints:`, colors.green);
  workingEndpoints.forEach((ep, index) => {
    log(`\n${index + 1}. ${ep.url}`, colors.bold);
    log(`   📊 Status: ${ep.status}`, colors.green);
    log(`   🔑 Auth: ${JSON.stringify(ep.auth)}`, colors.blue);
    if (ep.data) {
      log(`   📦 Sample data: ${JSON.stringify(ep.data).slice(0, 200)}...`, colors.reset);
    }
  });

  return {
    success: true,
    workingEndpoints,
    recommended_api_url: workingEndpoints[0]?.url.split('/tasks')[0] || workingEndpoints[0]?.url,
    recommended_auth: workingEndpoints[0]?.auth
  };
}

if (require.main === module) {
  testVersionedAPI()
    .then(result => {
      if (result && result.success) {
        log('\n🎉 Найден рабочий API! Можно настраивать интеграцию!', colors.bold + colors.green);
        
        if (result.recommended_api_url) {
          log(`\n🔧 Рекомендуемые настройки для .env:`, colors.blue);
          log(`DART_AI_API_URL=${result.recommended_api_url}`, colors.green);
          if (result.recommended_auth) {
            log(`# Auth method: ${JSON.stringify(result.recommended_auth)}`, colors.yellow);
          }
        }
      } else {
        log('\n💥 Не удалось найти рабочий JSON API', colors.bold + colors.red);
        log('📞 Возможно, нужно обратиться в техподдержку Dart AI за документацией', colors.yellow);
      }
    })
    .catch(error => {
      log(`\n💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
      console.error(error);
    });
}

module.exports = { testVersionedAPI };