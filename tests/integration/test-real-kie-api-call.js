#!/usr/bin/env node

/**
 * РЕАЛЬНЫЙ ТЕСТ KIE.AI API ВЫЗОВА
 * Используем ТОЧНО те же параметры, что работали ранее
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔥 РЕАЛЬНЫЙ ТЕСТ KIE.AI API');
console.log('=' .repeat(50));
console.log(`🔑 API Key: ${process.env.KIE_AI_API_KEY}`);

async function makeRealKieApiCall() {
  const apiKey = process.env.KIE_AI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ Нет API ключа');
    return;
  }

  // ТОЧНЫЕ параметры как в рабочем коде
  const payload = {
    model: 'veo3',
    prompt: 'A beautiful red rose blooming in a garden, 2 seconds duration',
    duration: 2,
    aspect_ratio: '16:9'
  };

  console.log('\n📋 Payload для запроса:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    console.log('\n📤 Делаю РЕАЛЬНЫЙ запрос к Kie.ai...');
    
    const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'ai-server/1.0'
      },
      body: JSON.stringify(payload)
    });

    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log(`📄 Raw Response (${responseText.length} chars):`);
    console.log(responseText);

    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('\n🔧 Parsed Response:');
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.request_id) {
        console.log(`\n✅ ЗАПРОС ПРИНЯТ! Request ID: ${jsonResponse.request_id}`);
        
        // Проверяем статус
        await checkVideoStatus(jsonResponse.request_id, apiKey);
      } else if (jsonResponse.code) {
        console.log(`\n❌ API Error Code: ${jsonResponse.code}`);
        console.log(`💬 Message: ${jsonResponse.msg}`);
      }
      
    } catch (parseError) {
      console.log('\n❌ Ответ не JSON:', parseError.message);
    }

  } catch (networkError) {
    console.error('\n💥 Network Error:', networkError.message);
  }
}

async function checkVideoStatus(requestId, apiKey) {
  console.log(`\n⏳ Проверяем статус видео: ${requestId}`);
  
  try {
    const response = await fetch(`https://api.kie.ai/api/v1/veo/record-info?request_id=${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'User-Agent': 'ai-server/1.0'
      }
    });

    console.log(`📊 Status Response: ${response.status}`);
    
    const statusText = await response.text();
    console.log(`📄 Status Data: ${statusText}`);
    
    try {
      const statusJson = JSON.parse(statusText);
      console.log('\n📋 Status Details:');
      console.log(JSON.stringify(statusJson, null, 2));
      
      if (statusJson.status === 'processing') {
        console.log('⏳ Видео генерируется... (это нормально)');
      } else if (statusJson.status === 'completed') {
        console.log('✅ Видео готово!');
        if (statusJson.video_url) {
          console.log(`🔗 Video URL: ${statusJson.video_url}`);
        }
      }
      
    } catch (e) {
      console.log('❌ Status не JSON');
    }
    
  } catch (error) {
    console.log(`❌ Ошибка проверки статуса: ${error.message}`);
  }
}

// Также тест с вертикальным видео
async function testVerticalVideo() {
  console.log('\n📱 ТЕСТ ВЕРТИКАЛЬНОГО ВИДЕО:');
  console.log('=' .repeat(40));
  
  const payload = {
    model: 'veo3',
    prompt: 'A cat playing with yarn, vertical mobile video, 4 seconds',
    duration: 4,
    aspect_ratio: '9:16'
  };

  console.log('📋 Vertical Payload:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_AI_API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'ai-server/1.0'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log(`📱 Vertical Response (${response.status}): ${responseText}`);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.request_id) {
        console.log(`✅ Вертикальное видео принято: ${jsonResponse.request_id}`);
      }
    } catch (e) {
      // ignore
    }

  } catch (error) {
    console.log(`❌ Ошибка вертикального теста: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 ЗАПУСКАЕМ РЕАЛЬНЫЕ ТЕСТЫ...\n');
  
  await makeRealKieApiCall();
  await new Promise(resolve => setTimeout(resolve, 2000)); // пауза
  await testVerticalVideo();
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 РЕЗУЛЬТАТ:');
  console.log('Проверьте логи выше - если есть request_id, то API работает');
  console.log('Если ошибка - найдем причину в коде');
  console.log('='.repeat(50));
}

runTests().catch(console.error);