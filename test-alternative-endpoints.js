#!/usr/bin/env node

/**
 * ТЕСТ АЛЬТЕРНАТИВНЫХ ENDPOINTS И ФОРМАТОВ
 * Пробуем разные варианты API, которые могли работать ранее
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔬 ТЕСТ АЛЬТЕРНАТИВНЫХ ENDPOINTS');
console.log('=' .repeat(50));

const apiKey = process.env.KIE_AI_API_KEY;
console.log(`🔑 API Key: ${apiKey}`);

// Разные варианты endpoints и форматов
const testCases = [
  {
    name: '1. Текущий формат /veo/generate',
    url: 'https://api.kie.ai/api/v1/veo/generate',
    payload: {
      model: 'veo3',
      prompt: 'A red rose, 2 seconds',
      duration: 2,
      aspect_ratio: '16:9'
    }
  },
  {
    name: '2. Без aspect_ratio',
    url: 'https://api.kie.ai/api/v1/veo/generate',
    payload: {
      model: 'veo3',
      prompt: 'A red rose, 2 seconds', 
      duration: 2
    }
  },
  {
    name: '3. Старый формат с resolution',
    url: 'https://api.kie.ai/api/v1/veo/generate',
    payload: {
      model: 'veo3',
      prompt: 'A red rose, 2 seconds',
      duration: 2,
      resolution: '1280x720'
    }
  },
  {
    name: '4. Полный набор параметров',
    url: 'https://api.kie.ai/api/v1/veo/generate',
    payload: {
      model: 'veo3',
      prompt: 'A red rose blooming',
      duration: 2,
      aspect_ratio: '16:9',
      resolution: '1280x720',
      quality: 'high'
    }
  },
  {
    name: '5. Альтернативный endpoint /video/generate',
    url: 'https://api.kie.ai/api/v1/video/generate',
    payload: {
      model: 'veo3',
      prompt: 'A red rose, 2 seconds',
      duration: 2
    }
  },
  {
    name: '6. Другой model name - veo-3',
    url: 'https://api.kie.ai/api/v1/veo/generate',
    payload: {
      model: 'veo-3',
      prompt: 'A red rose, 2 seconds',
      duration: 2,
      aspect_ratio: '16:9'
    }
  },
  {
    name: '7. Model: veo3-fast',
    url: 'https://api.kie.ai/api/v1/veo/generate',
    payload: {
      model: 'veo3-fast',
      prompt: 'A red rose, 2 seconds',
      duration: 2,
      aspect_ratio: '16:9'
    }
  }
];

async function testEndpoint(testCase) {
  console.log(`\n${testCase.name}:`);
  console.log('-'.repeat(40));
  console.log('URL:', testCase.url);
  console.log('Payload:', JSON.stringify(testCase.payload, null, 2));

  try {
    const response = await fetch(testCase.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(testCase.payload)
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`Response: ${responseText}`);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      
      if (jsonResponse.request_id) {
        console.log(`🎉 УСПЕХ! Request ID: ${jsonResponse.request_id}`);
        return { success: true, requestId: jsonResponse.request_id };
      } else if (jsonResponse.code !== 402) {
        console.log(`🤔 Другая ошибка: ${jsonResponse.code} - ${jsonResponse.msg}`);
      } else {
        console.log(`❌ Все та же ошибка 402`);
      }
    } catch (e) {
      console.log('❌ Не JSON ответ');
    }

    return { success: false };

  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return { success: false };
  }
}

// Также проверим баланс через другой endpoint
async function checkBalance() {
  console.log('\n💰 ПРОВЕРКА БАЛАНСА ЧЕРЕЗ РАЗНЫЕ ENDPOINTS:');
  console.log('=' .repeat(50));
  
  const balanceEndpoints = [
    'https://api.kie.ai/api/v1/balance',
    'https://api.kie.ai/api/v1/credits',
    'https://api.kie.ai/api/v1/user/balance',
    'https://api.kie.ai/api/v1/account/credits',
    'https://api.kie.ai/api/v1/chat/credit'
  ];

  for (const endpoint of balanceEndpoints) {
    console.log(`\n🔍 Пробуем: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      console.log(`Status: ${response.status}`);
      const text = await response.text();
      console.log(`Response: ${text}`);
      
      if (response.status === 200) {
        try {
          const json = JSON.parse(text);
          console.log(`✅ НАЙДЕН РАБОЧИЙ ENDPOINT!`);
          console.log(`Баланс:`, JSON.stringify(json, null, 2));
        } catch (e) {
          // ignore
        }
      }
      
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 ТЕСТИРОВАНИЕ ВСЕХ ВАРИАНТОВ...\n');
  
  let successfulTests = [];
  
  for (const testCase of testCases) {
    const result = await testEndpoint(testCase);
    if (result.success) {
      successfulTests.push({ ...testCase, requestId: result.requestId });
    }
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  await checkBalance();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ ТЕСТИРОВАНИЯ:');
  console.log('='.repeat(60));
  
  if (successfulTests.length > 0) {
    console.log(`✅ НАЙДЕНО ${successfulTests.length} РАБОЧИХ ВАРИАНТОВ:`);
    successfulTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}`);
      console.log(`   Request ID: ${test.requestId}`);
      console.log(`   Payload:`, JSON.stringify(test.payload, null, 1));
    });
  } else {
    console.log('❌ НИ ОДИН ВАРИАНТ НЕ СРАБОТАЛ');
    console.log('🤔 Возможные причины:');
    console.log('- API ключ привязан к другому аккаунту');
    console.log('- Изменился формат API');
    console.log('- Нужны другие заголовки авторизации');
    console.log('- Кредиты заблокированы или не активны');
  }
}

runAllTests().catch(console.error);