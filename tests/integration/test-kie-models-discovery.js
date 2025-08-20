#!/usr/bin/env node

/**
 * ПОИСК ДОСТУПНЫХ МОДЕЛЕЙ И ПРАВИЛЬНОГО ФОРМАТА
 * Пробуем найти рабочие модели через документацию и тесты
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔍 ПОИСК РАБОЧИХ МОДЕЛЕЙ KIE.AI');
console.log('=' .repeat(50));

const apiKey = process.env.KIE_AI_API_KEY;

// Пробуем разные модели, которые могли работать
const modelTests = [
  'veo3',
  'veo-3',
  'veo3-fast', 
  'veo-3-fast',
  'video-veo3',
  'google-veo3',
  'veo',
  'text-to-video',
  'runway',
  'runway-gen3',
  'stable-video',
  'cogvideo'
];

async function testModel(modelName) {
  console.log(`\n🧪 Тестируем модель: ${modelName}`);
  
  const payload = {
    model: modelName,
    prompt: 'A simple test video',
    duration: 2
  };

  try {
    const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log(`${modelName}: ${response.status} - ${responseText}`);
    
    try {
      const json = JSON.parse(responseText);
      if (json.request_id) {
        console.log(`🎉 МОДЕЛЬ ${modelName} РАБОТАЕТ! ID: ${json.request_id}`);
        return { model: modelName, success: true, requestId: json.request_id };
      } else if (json.code === 422 && json.msg === 'Invalid model') {
        console.log(`❌ ${modelName} - недоступна`);
      } else if (json.code === 402) {
        console.log(`💰 ${modelName} - нужно больше кредитов`);
      } else {
        console.log(`🤔 ${modelName} - ${json.code}: ${json.msg}`);
      }
    } catch (e) {
      // ignore parse errors
    }
    
    return { model: modelName, success: false };

  } catch (error) {
    console.log(`❌ ${modelName} - Network error: ${error.message}`);
    return { model: modelName, success: false };
  }
}

// Пробуем найти API docs endpoint
async function findApiDocs() {
  console.log('\n📚 ПОИСК API ДОКУМЕНТАЦИИ:');
  console.log('=' .repeat(40));
  
  const docsEndpoints = [
    'https://api.kie.ai/api/v1/models',
    'https://api.kie.ai/api/v1/models/list', 
    'https://api.kie.ai/docs',
    'https://api.kie.ai/api/v1/veo/models',
    'https://api.kie.ai/api/v1/info',
    'https://api.kie.ai/api/v1/status'
  ];

  for (const endpoint of docsEndpoints) {
    console.log(`🔍 Пробуем: ${endpoint}`);
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (response.status === 200) {
        const text = await response.text();
        console.log(`✅ НАЙДЕНО: ${endpoint}`);
        console.log(`Response: ${text.substring(0, 500)}...`);
        
        try {
          const json = JSON.parse(text);
          if (json.models || json.data) {
            console.log(`📋 Модели:`, JSON.stringify(json, null, 2));
          }
        } catch (e) {
          // ignore
        }
      } else {
        console.log(`❌ ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Ошибка: ${error.message}`);
    }
  }
}

// Проверяем разные credit endpoints
async function checkAllCredits() {
  console.log('\n💰 ДЕТАЛЬНАЯ ПРОВЕРКА КРЕДИТОВ:');
  console.log('=' .repeat(40));
  
  try {
    // Обычный баланс
    const chatResponse = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });
    
    const chatText = await chatResponse.text();
    console.log(`Chat Credits: ${chatText}`);
    
    // Пробуем получить детали аккаунта
    const accountEndpoints = [
      '/api/v1/user/profile',
      '/api/v1/account/info', 
      '/api/v1/billing/balance',
      '/api/v1/veo/balance'
    ];
    
    for (const endpoint of accountEndpoints) {
      try {
        const response = await fetch(`https://api.kie.ai${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.status === 200) {
          const text = await response.text();
          console.log(`✅ ${endpoint}: ${text}`);
        }
      } catch (e) {
        // ignore
      }
    }
    
  } catch (error) {
    console.log(`❌ Ошибка проверки кредитов: ${error.message}`);
  }
}

async function runDiscovery() {
  console.log('🚀 ЗАПУСК АНАЛИЗА KIE.AI API...\n');
  
  // 1. Проверяем кредиты
  await checkAllCredits();
  
  // 2. Ищем документацию 
  await findApiDocs();
  
  // 3. Тестируем модели
  console.log('\n🧪 ТЕСТИРОВАНИЕ МОДЕЛЕЙ:');
  console.log('=' .repeat(40));
  
  const workingModels = [];
  
  for (const model of modelTests) {
    const result = await testModel(model);
    if (result.success) {
      workingModels.push(result);
    }
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ФИНАЛЬНЫЙ ОТЧЕТ:');
  console.log('='.repeat(60));
  
  if (workingModels.length > 0) {
    console.log(`✅ НАЙДЕНО ${workingModels.length} РАБОЧИХ МОДЕЛЕЙ:`);
    workingModels.forEach(model => {
      console.log(`- ${model.model}: ${model.requestId}`);
    });
  } else {
    console.log('❌ НИ ОДНА МОДЕЛЬ НЕ РАБОТАЕТ');
    console.log('\n💡 ВОЗМОЖНЫЕ РЕШЕНИЯ:');
    console.log('1. Проверить правильность API ключа на kie.ai');
    console.log('2. Пополнить video credits (отдельно от chat credits)');
    console.log('3. Использовать другой endpoint для video API');
    console.log('4. Проверить документацию на https://docs.kie.ai');
  }
}

runDiscovery().catch(console.error);