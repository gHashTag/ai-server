/**
 * Проверка доступности Kie.ai API без API ключа
 */

const https = require('https');

console.log('🔍 Проверяем доступность api.kie.ai без ключа...\n');

// Функция для выполнения HTTP-запроса
function makeRequest(options) {
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
    
    req.end();
  });
}

async function checkConnectivity() {
  console.log('🌐 Проверяем соединение с api.kie.ai...');
  
  try {
    // 1. Проверка базовой доступности домена
    const options = {
      hostname: 'api.kie.ai',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Veo3-Client/1.0'
      },
      timeout: 10000
    };
    
    console.log('📡 Подключаемся к api.kie.ai:443...');
    
    const result = await makeRequest(options);
    
    console.log(`✅ Соединение установлено!`);
    console.log(`   HTTP статус: ${result.status}`);
    console.log(`   Заголовки:`, Object.keys(result.headers).slice(0, 5).join(', '));
    console.log(`   Размер ответа: ${result.data.length} байт`);
    
    if (result.status === 404 || result.status === 200 || result.status === 403) {
      console.log('   ✅ Сервер отвечает (это хорошо!)');
    }
    
    // 2. Попробуем получить информацию о API без ключа
    console.log('\n🔍 Проверяем endpoint без авторизации...');
    
    const apiOptions = {
      hostname: 'api.kie.ai',
      port: 443,
      path: '/api/v1/chat/credit',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Veo3-Client/1.0'
      },
      timeout: 10000
    };
    
    const apiResult = await makeRequest(apiOptions);
    
    console.log(`   HTTP статус: ${apiResult.status}`);
    console.log(`   Ответ: ${apiResult.data.substring(0, 200)}${apiResult.data.length > 200 ? '...' : ''}`);
    
    if (apiResult.status === 401) {
      console.log('   ✅ API работает! (требует авторизацию, что нормально)');
    } else if (apiResult.status === 200) {
      console.log('   ✅ API работает! (неожиданно доступен без ключа)');
    } else {
      console.log(`   ⚠️ Неожиданный ответ от API`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Ошибка соединения: ${error.message}`);
    
    if (error.message === 'Request timeout') {
      console.log('   • Тайм-аут соединения - возможно, сервис медленный или недоступен');
      console.log('   • Это может объяснить ошибку "Unable to connect" на клиенте');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   • DNS не может найти api.kie.ai');
      console.log('   • Проверьте интернет-соединение');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   • Сервер отклонил соединение');
      console.log('   • Возможно, сервис недоступен');
    } else if (error.code === 'ECONNRESET') {
      console.log('   • Соединение сброшено сервером');
      console.log('   • Возможно, блокировка или перегрузка');
    }
    
    return false;
  }
}

// Запускаем проверку
checkConnectivity().then((success) => {
  console.log('\n' + '='.repeat(50));
  
  if (success) {
    console.log('✅ РЕЗУЛЬТАТ: api.kie.ai доступен');
    console.log('');
    console.log('Возможные причины ошибки на клиенте:');
    console.log('• Отсутствует KIE_AI_API_KEY в переменных окружения');
    console.log('• Неверный API ключ');
    console.log('• Проблемы с конфигурацией на production');
  } else {
    console.log('❌ РЕЗУЛЬТАТ: api.kie.ai недоступен');
    console.log('');
    console.log('Это объясняет ошибку "Unable to connect" на клиенте');
  }
  
  console.log('\n🏁 Проверка завершена');
}).catch(error => {
  console.error('\n💥 Критическая ошибка:', error.message);
  process.exit(1);
});