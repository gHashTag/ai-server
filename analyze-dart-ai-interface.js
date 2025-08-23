/**
 * Анализ веб-интерфейса Dart AI для поиска реальных API endpoints
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

async function analyzeWebInterface() {
  log('\n🔍 Анализ веб-интерфейса Dart AI для поиска API endpoints\n', colors.bold);

  try {
    // Загружаем главную страницу
    const response = await axios.get('https://app.dartai.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    log('✅ Веб-интерфейс загружен', colors.green);
    
    // Ищем JavaScript файлы
    const jsFiles = response.data.match(/src="([^"]*\.js[^"]*)"/g) || [];
    const uniqueJS = [...new Set(jsFiles.map(match => match.match(/src="([^"]*)"/)[1]))];

    log(`📦 Найдено ${uniqueJS.length} JavaScript файлов:`, colors.blue);
    uniqueJS.forEach(js => log(`   • ${js}`, colors.reset));

    // Ищем возможные API endpoints в HTML
    const possibleAPIs = [
      ...response.data.matchAll(/["']([^"']*api[^"']*)/gi),
      ...response.data.matchAll(/["']([^"']*\/v\d+[^"']*)/gi),
      ...response.data.matchAll(/fetch\(["']([^"']+)["']/gi),
      ...response.data.matchAll(/axios\.[a-z]+\(["']([^"']+)["']/gi)
    ];

    const uniqueAPIEndpoints = [...new Set(
      Array.from(possibleAPIs).map(match => match[1]).filter(url => 
        url.includes('api') || url.includes('/v') || url.startsWith('/')
      )
    )];

    if (uniqueAPIEndpoints.length > 0) {
      log('\n🎯 Возможные API endpoints найденные в HTML:', colors.yellow);
      uniqueAPIEndpoints.forEach(endpoint => log(`   • ${endpoint}`, colors.reset));
    }

    // Загружаем основной JS файл для поиска API endpoints
    if (uniqueJS.length > 0) {
      const mainJS = uniqueJS.find(js => js.includes('index') || js.includes('main')) || uniqueJS[0];
      const fullJSUrl = mainJS.startsWith('http') ? mainJS : `https://app.dartai.com${mainJS}`;
      
      log(`\n📥 Загружаем главный JS файл: ${fullJSUrl}`, colors.blue);
      
      try {
        const jsResponse = await axios.get(fullJSUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        });

        // Ищем API endpoints в JS коде
        const apiPatterns = [
          /["']([^"']*\/api\/[^"']*)/gi,
          /["']([^"']*\/v\d+\/[^"']*)/gi,
          /baseURL:\s*["']([^"']+)["']/gi,
          /apiUrl:\s*["']([^"']+)["']/gi,
          /endpoint:\s*["']([^"']+)["']/gi
        ];

        const foundAPIs = new Set();
        
        apiPatterns.forEach(pattern => {
          const matches = jsResponse.data.matchAll(pattern);
          Array.from(matches).forEach(match => foundAPIs.add(match[1]));
        });

        if (foundAPIs.size > 0) {
          log('\n🚀 API endpoints найденные в JavaScript:', colors.green);
          Array.from(foundAPIs).forEach(api => log(`   • ${api}`, colors.reset));

          // Тестируем найденные endpoints
          log('\n🧪 Тестируем найденные API endpoints...', colors.blue);
          
          for (const endpoint of foundAPIs) {
            if (endpoint.length < 100 && (endpoint.includes('/api/') || endpoint.includes('/v'))) {
              const testUrl = endpoint.startsWith('http') ? endpoint : `https://app.dartai.com${endpoint}`;
              
              try {
                const testResponse = await axios.get(testUrl, {
                  headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'AI-Server-DartAI-Integration/1.0.0'
                  },
                  timeout: 5000,
                  validateStatus: () => true
                });

                const isJSON = testResponse.headers['content-type']?.includes('application/json');
                const statusColor = testResponse.status === 200 ? colors.green : colors.yellow;
                
                log(`   ${isJSON ? '✅' : '⚠️'} ${endpoint}: ${testResponse.status} ${isJSON ? '(JSON)' : '(HTML)'}`, statusColor);
                
                if (isJSON && testResponse.data) {
                  log(`      📦 ${JSON.stringify(testResponse.data).slice(0, 200)}...`, colors.reset);
                }

              } catch (error) {
                log(`   ❌ ${endpoint}: ${error.message}`, colors.red);
              }
            }
          }
        } else {
          log('\n❌ API endpoints не найдены в JavaScript', colors.red);
        }

      } catch (jsError) {
        log(`❌ Ошибка загрузки JS: ${jsError.message}`, colors.red);
      }
    }

    // Попробуем стандартные API patterns
    log('\n🔄 Тестируем стандартные API patterns...', colors.blue);
    
    const standardAPIs = [
      'https://api.dartai.com',
      'https://api.dart.ai',
      'https://app.dartai.com/api/v1',
      'https://app.dartai.com/api/v2',
      'https://dartai.com/api',
      'https://backend.dartai.com/api',
      'https://server.dartai.com/api'
    ];

    for (const apiUrl of standardAPIs) {
      try {
        const testResponse = await axios.get(`${apiUrl}/health`, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 3000,
          validateStatus: () => true
        });

        const isJSON = testResponse.headers['content-type']?.includes('application/json');
        if (isJSON) {
          log(`✅ Найден JSON API: ${apiUrl} (${testResponse.status})`, colors.green);
          log(`   📦 ${JSON.stringify(testResponse.data)}`, colors.reset);
        }

      } catch (error) {
        // Игнорируем ошибки для стандартных тестов
      }
    }

  } catch (error) {
    log(`❌ Ошибка анализа: ${error.message}`, colors.red);
  }

  // Предложения по решению
  log('\n💡 Возможные решения:', colors.yellow);
  log('   1. API может требовать специального User-Agent', colors.reset);
  log('   2. Возможно нужна авторизация через cookies/session', colors.reset);
  log('   3. API может быть доступен только после входа в веб-интерфейс', colors.reset);
  log('   4. Проверьте документацию Dart AI или обратитесь в поддержку', colors.reset);
  log('   5. API ключ может требовать активации в панели управления', colors.reset);
}

if (require.main === module) {
  analyzeWebInterface().catch(console.error);
}