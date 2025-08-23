/**
 * Быстрая проверка доступности Kie.ai API
 */

const https = require('https');

// API Key из переменной окружения (попробуем разные варианты)
const apiKey = process.env.KIE_AI_API_KEY || '';

console.log('🔍 Проверяем доступность Kie.ai API...\n');

if (!apiKey) {
  console.log('❌ API ключ не найден');
  console.log('Проверьте переменную окружения KIE_AI_API_KEY');
  process.exit(1);
}

console.log(`✅ API ключ найден (длина: ${apiKey.length} символов)`);
console.log(`   Начало ключа: ${apiKey.substring(0, 8)}...`);

// Функция для выполнения HTTP-запроса
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function checkAPI() {
  console.log('\n🌐 Проверяем соединение с api.kie.ai...');
  
  try {
    // 1. Проверка базовой доступности домена
    const pingOptions = {
      hostname: 'api.kie.ai',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 5000
    };
    
    console.log('📡 Пингуем домен...');
    const pingResult = await makeRequest(pingOptions);
    console.log(`   Ответ: ${pingResult.status}`);
    
    // 2. Проверка endpoint'а баланса
    console.log('\n💰 Проверяем endpoint баланса...');
    
    const balanceOptions = {
      hostname: 'api.kie.ai',
      port: 443,
      path: '/api/v1/chat/credit',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Veo3-Client/1.0'
      },
      timeout: 10000
    };
    
    const balanceResult = await makeRequest(balanceOptions);
    
    console.log(`   HTTP статус: ${balanceResult.status}`);
    console.log(`   Данные: ${balanceResult.data}`);
    
    if (balanceResult.status === 200) {
      try {
        const balanceData = JSON.parse(balanceResult.data);
        console.log(`   ✅ Баланс: ${balanceData.credits || 'неизвестно'} кредитов`);
      } catch (e) {
        console.log(`   ⚠️ Не удалось разобрать JSON: ${balanceResult.data}`);
      }
    } else if (balanceResult.status === 401) {
      console.log('   ❌ Неверный API ключ');
    } else if (balanceResult.status === 403) {
      console.log('   ❌ Доступ запрещен');
    } else {
      console.log(`   ⚠️ Неожиданный статус: ${balanceResult.status}`);
    }
    
    // 3. Проверка endpoint'а генерации (только структура запроса)
    console.log('\n🎬 Проверяем endpoint генерации видео...');
    
    const testRequest = {
      model: 'veo3_fast',
      prompt: 'test connection',
      aspectRatio: '16:9'
    };
    
    const generateOptions = {
      hostname: 'api.kie.ai',
      port: 443,
      path: '/api/v1/veo/generate',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Veo3-Client/1.0'
      },
      timeout: 15000
    };
    
    console.log(`   Отправляем тестовый запрос...`);
    console.log(`   Данные: ${JSON.stringify(testRequest, null, 2)}`);
    
    const generateResult = await makeRequest(generateOptions, JSON.stringify(testRequest));
    
    console.log(`   HTTP статус: ${generateResult.status}`);
    console.log(`   Данные: ${generateResult.data.substring(0, 500)}${generateResult.data.length > 500 ? '...' : ''}`);
    
    if (generateResult.status === 200) {
      try {
        const responseData = JSON.parse(generateResult.data);
        if (responseData.code === 200 && responseData.data?.taskId) {
          console.log(`   ✅ API работает! Task ID: ${responseData.data.taskId}`);
        } else {
          console.log(`   ⚠️ Неожиданный формат ответа: ${responseData.msg || 'неизвестная ошибка'}`);
        }
      } catch (e) {
        console.log(`   ⚠️ Не удалось разобрать JSON ответа`);
      }
    } else {
      console.log(`   ❌ Ошибка генерации: статус ${generateResult.status}`);
    }
    
  } catch (error) {
    console.error(`\n💥 Ошибка соединения: ${error.message}`);
    
    if (error.message === 'Request timeout') {
      console.log('   • Возможные причины: медленное соединение, блокировка файрволом');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   • Возможные причины: проблемы с DNS, отсутствие интернета');  
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   • Возможные причины: сервис недоступен, неверный порт');
    }
  }
}

// Запускаем проверку
checkAPI().then(() => {
  console.log('\n🏁 Проверка завершена');
}).catch(error => {
  console.error('\n💥 Критическая ошибка:', error.message);
  process.exit(1);
});