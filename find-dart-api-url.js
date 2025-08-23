/**
 * Поиск правильного URL для Dart AI API
 * Тестируем различные варианты URL
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

async function findDartAIAPIURL() {
  log('\n🔍 Поиск правильного URL для Dart AI API\n', colors.bold);

  // Возможные варианты URL API
  const possibleURLs = [
    'https://api.dartai.com',
    'https://api.dart.ai', 
    'https://dartai.com/api',
    'https://app.dartai.com/api',
    'https://api.app.dartai.com',
    'https://www.dartai.com/api',
    'https://dartai.ai/api',
    'https://api.dartai.ai',
    'https://dashboard.dartai.com/api',
    'https://backend.dartai.com',
    'https://server.dartai.com/api',
    'https://prod.dartai.com/api'
  ];

  // Возможные endpoints для проверки
  const testEndpoints = [
    '/health',
    '/status', 
    '/ping',
    '/api/health',
    '/v1/health',
    '/',
    ''
  ];

  let workingURLs = [];

  log(`🔑 Тестируем с API ключом: ${API_KEY.slice(0, 20)}...`, colors.blue);
  
  for (const baseURL of possibleURLs) {
    log(`\n📡 Тестируем: ${baseURL}`, colors.blue);
    
    // Сначала проверяем базовую доступность
    try {
      const response = await axios.head(baseURL, { 
        timeout: 5000,
        validateStatus: () => true // Принимаем любой статус
      });
      
      log(`✅ Доступен (${response.status})`, colors.green);
      
      // Если базовый URL доступен, тестируем endpoints
      for (const endpoint of testEndpoints) {
        const fullURL = `${baseURL}${endpoint}`;
        
        try {
          // Тестируем без авторизации
          const noAuthResponse = await axios.get(fullURL, {
            timeout: 5000,
            validateStatus: () => true,
            headers: {
              'User-Agent': 'AI-Server-DartAI-Integration/1.0.0'
            }
          });
          
          log(`   📍 ${endpoint || '/'}: ${noAuthResponse.status} (без авторизации)`, colors.yellow);
          
          if (noAuthResponse.data && typeof noAuthResponse.data === 'object') {
            log(`      📦 ${JSON.stringify(noAuthResponse.data).slice(0, 100)}...`, colors.reset);
          }
          
          // Тестируем с авторизацией
          const authMethods = [
            { 'Authorization': `Bearer ${API_KEY}` },
            { 'Authorization': `Token ${API_KEY}` },
            { 'X-API-Key': API_KEY },
            { 'Dart-API-Key': API_KEY }
          ];
          
          for (const authHeader of authMethods) {
            try {
              const authResponse = await axios.get(fullURL, {
                timeout: 5000,
                validateStatus: () => true,
                headers: {
                  'User-Agent': 'AI-Server-DartAI-Integration/1.0.0',
                  ...authHeader
                }
              });
              
              if (authResponse.status !== noAuthResponse.status || 
                  JSON.stringify(authResponse.data) !== JSON.stringify(noAuthResponse.data)) {
                
                log(`      🔑 ${endpoint || '/'}: ${authResponse.status} (с ${Object.keys(authHeader)[0]})`, colors.green);
                
                if (authResponse.data && typeof authResponse.data === 'object') {
                  log(`         📦 ${JSON.stringify(authResponse.data).slice(0, 200)}...`, colors.green);
                }
                
                workingURLs.push({
                  baseURL,
                  endpoint,
                  authMethod: authHeader,
                  status: authResponse.status,
                  data: authResponse.data
                });
              }
              
            } catch (authError) {
              // Игнорируем ошибки авторизации пока
            }
          }
          
        } catch (error) {
          if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED') {
            log(`   ⚠️  ${endpoint || '/'}: ${error.message}`, colors.yellow);
          }
        }
      }
      
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        log(`❌ Не найден`, colors.red);
      } else if (error.code === 'ECONNREFUSED') {
        log(`❌ Отказано в соединении`, colors.red);
      } else {
        log(`⚠️  ${error.message}`, colors.yellow);
      }
    }
  }

  // Результаты
  log('\n📊 Результаты поиска:', colors.blue);
  
  if (workingURLs.length === 0) {
    log('❌ Рабочие API endpoints не найдены', colors.red);
    log('\n🔧 Возможные решения:', colors.yellow);
    log('   1. Проверьте, что API ключ активен в панели Dart AI', colors.yellow);
    log('   2. Убедитесь, что у ключа есть права доступа к API', colors.yellow);
    log('   3. API может использовать другой домен или поддомен', colors.yellow);
    log('   4. API может требовать специальных заголовков или параметров', colors.yellow);
    log('   5. Обратитесь в поддержку Dart AI за документацией к API', colors.yellow);
    
    return { success: false, workingURLs: [] };
  }

  log(`✅ Найдено ${workingURLs.length} рабочих endpoint(s):`, colors.green);
  workingURLs.forEach((url, index) => {
    log(`\n${index + 1}. ${url.baseURL}${url.endpoint}`, colors.bold);
    log(`   🔑 Авторизация: ${JSON.stringify(url.authMethod)}`, colors.blue);
    log(`   📊 Status: ${url.status}`, colors.green);
    if (url.data) {
      log(`   📦 Data: ${JSON.stringify(url.data, null, 2)}`, colors.reset);
    }
  });

  // Предлагаем обновить .env
  if (workingURLs.length > 0) {
    const bestURL = workingURLs[0];
    log(`\n🔧 Рекомендуемая настройка для .env:`, colors.blue);
    log(`DART_AI_API_URL=${bestURL.baseURL}`, colors.green);
    log(`DART_AI_ENDPOINT_PREFIX=${bestURL.endpoint}`, colors.green);
    log(`# Метод авторизации: ${JSON.stringify(bestURL.authMethod)}`, colors.yellow);
  }

  return { success: true, workingURLs };
}

// Также проверим веб-интерфейс
async function checkWebInterface() {
  log('\n🌐 Проверка веб-интерфейса Dart AI...', colors.blue);
  
  const webURLs = [
    'https://app.dartai.com',
    'https://dartai.com',
    'https://www.dartai.com'
  ];
  
  for (const url of webURLs) {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      log(`✅ ${url}: ${response.status}`, colors.green);
      
      // Ищем упоминания API в HTML
      if (response.data && typeof response.data === 'string') {
        const apiMatches = response.data.match(/api\.[^"'\s]+/gi) || [];
        const uniqueAPIs = [...new Set(apiMatches)];
        
        if (uniqueAPIs.length > 0) {
          log(`   🔍 Найденные API URLs в коде страницы:`, colors.yellow);
          uniqueAPIs.forEach(api => {
            log(`      • ${api}`, colors.reset);
          });
        }
      }
      
    } catch (error) {
      log(`❌ ${url}: ${error.message}`, colors.red);
    }
  }
}

// Запуск
if (require.main === module) {
  Promise.all([
    findDartAIAPIURL(),
    checkWebInterface()
  ]).then(([apiResult]) => {
    if (apiResult.success) {
      log('\n🎉 Поиск завершен успешно!', colors.bold + colors.green);
    } else {
      log('\n💥 API endpoints не найдены', colors.bold + colors.red);
      log('📞 Рекомендуется обратиться в поддержку Dart AI', colors.yellow);
    }
  }).catch(error => {
    log(`\n💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
  });
}

module.exports = { findDartAIAPIURL };