#!/usr/bin/env node

/**
 * ОТЛАДКА KIE.AI API - ДЕТАЛЬНЫЙ АНАЛИЗ ОТВЕТА
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔬 ОТЛАДКА KIE.AI API');
console.log('='.repeat(50));
console.log(`🔑 API Key: ${process.env.KIE_AI_API_KEY?.substring(0, 10)}...`);

async function debugKieApi() {
  const payload = {
    model: 'veo3',
    prompt: 'A simple test video of a flower',
    duration: 2,
    aspect_ratio: '16:9'
  };

  console.log('\n📋 Payload:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    console.log('\n📤 Отправка запроса...');
    const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_AI_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log(`📊 HTTP Status: ${response.status} ${response.statusText}`);
    
    // Выводим все заголовки ответа
    console.log('\n📋 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const responseText = await response.text();
    console.log(`\n📄 Raw Response (${responseText.length} chars):`);
    console.log(responseText);

    // Пытаемся распарсить как JSON
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('\n🔧 Parsed JSON Response:');
      console.log(JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.error) {
        console.log(`\n❌ API Error: ${jsonResponse.error}`);
      }
      
      if (jsonResponse.message) {
        console.log(`\n💬 API Message: ${jsonResponse.message}`);
      }
    } catch (parseError) {
      console.log('\n❌ Response не является валидным JSON');
    }

  } catch (networkError) {
    console.error('\n💥 Network Error:', networkError.message);
  }
}

async function testCreditsBalance() {
  console.log('\n💰 ПРОВЕРКА БАЛАНСА КРЕДИТОВ:');
  
  try {
    const response = await fetch('https://api.kie.ai/api/v1/credits/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.KIE_AI_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    console.log(`📊 Balance Status: ${response.status}`);
    
    const balanceText = await response.text();
    console.log(`📄 Balance Response: ${balanceText}`);
    
    try {
      const balanceJson = JSON.parse(balanceText);
      console.log('💳 Баланс:', JSON.stringify(balanceJson, null, 2));
    } catch (e) {
      console.log('❌ Не удалось распарсить ответ баланса');
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки баланса:', error.message);
  }
}

async function testHealthCheck() {
  console.log('\n🏥 ПРОВЕРКА ЗДОРОВЬЯ API:');
  
  try {
    const response = await fetch('https://api.kie.ai/health', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log(`📊 Health Status: ${response.status}`);
    
    const healthText = await response.text();
    console.log(`📄 Health Response: ${healthText}`);
    
  } catch (error) {
    console.error('❌ Ошибка health check:', error.message);
  }
}

// Запуск всех проверок
async function runDebug() {
  await debugKieApi();
  await testCreditsBalance();
  await testHealthCheck();
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 ЗАКЛЮЧЕНИЕ:');
  console.log('Проверьте ответы выше для диагностики проблем с API');
  console.log('='.repeat(50));
}

runDebug().catch(console.error);