#!/usr/bin/env node

/**
 * ПОИСК VIDEO CREDITS В KIE.AI
 * Проверяем все возможные endpoints для получения video баланса
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🎬 ПОИСК VIDEO CREDITS');
console.log('=' .repeat(50));

const apiKey = process.env.KIE_AI_API_KEY;

// Максимально полный список возможных endpoints
const creditEndpoints = [
  // Основные endpoints
  { name: 'Chat Credits', url: '/api/v1/chat/credit', method: 'GET' },
  { name: 'Video Credits', url: '/api/v1/veo/credit', method: 'GET' },
  { name: 'Video Credits Alt', url: '/api/v1/video/credit', method: 'GET' },
  { name: 'All Credits', url: '/api/v1/credit', method: 'GET' },
  { name: 'Credits Balance', url: '/api/v1/credits/balance', method: 'GET' },
  
  // User/Account endpoints
  { name: 'User Info', url: '/api/v1/user', method: 'GET' },
  { name: 'User Profile', url: '/api/v1/user/profile', method: 'GET' },
  { name: 'User Balance', url: '/api/v1/user/balance', method: 'GET' },
  { name: 'User Credits', url: '/api/v1/user/credits', method: 'GET' },
  { name: 'Account Info', url: '/api/v1/account', method: 'GET' },
  { name: 'Account Balance', url: '/api/v1/account/balance', method: 'GET' },
  
  // Billing endpoints
  { name: 'Billing Info', url: '/api/v1/billing', method: 'GET' },
  { name: 'Billing Balance', url: '/api/v1/billing/balance', method: 'GET' },
  { name: 'Billing Credits', url: '/api/v1/billing/credits', method: 'GET' },
  
  // Balance endpoints
  { name: 'Balance', url: '/api/v1/balance', method: 'GET' },
  { name: 'Balance Detail', url: '/api/v1/balance/detail', method: 'GET' },
  
  // Service-specific
  { name: 'Veo Balance', url: '/api/v1/veo/balance', method: 'GET' },
  { name: 'Video Balance', url: '/api/v1/video/balance', method: 'GET' },
  { name: 'Generation Credits', url: '/api/v1/generation/credits', method: 'GET' },
  
  // API Info endpoints  
  { name: 'API Info', url: '/api/v1/info', method: 'GET' },
  { name: 'API Status', url: '/api/v1/status', method: 'GET' },
  { name: 'API Limits', url: '/api/v1/limits', method: 'GET' },
  
  // Wallet/Payment endpoints
  { name: 'Wallet', url: '/api/v1/wallet', method: 'GET' },
  { name: 'Wallet Balance', url: '/api/v1/wallet/balance', method: 'GET' },
  { name: 'Payment Info', url: '/api/v1/payment/info', method: 'GET' },
  
  // Alternative paths
  { name: 'Me', url: '/api/v1/me', method: 'GET' },
  { name: 'Profile', url: '/api/v1/profile', method: 'GET' },
  { name: 'Dashboard', url: '/api/v1/dashboard', method: 'GET' }
];

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`https://api.kie.ai${endpoint.url}`, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    const text = await response.text();
    
    if (response.status === 200) {
      console.log(`✅ ${endpoint.name}: ${text}`);
      
      // Пытаемся найти video credits в ответе
      if (text.includes('video') || text.includes('veo') || text.includes('100000') || text.includes('credits')) {
        console.log(`🎯 ВОЗМОЖНО СОДЕРЖИТ VIDEO CREDITS!`);
        try {
          const json = JSON.parse(text);
          console.log(`   Parsed:`, JSON.stringify(json, null, 2));
        } catch (e) {
          console.log(`   Raw response: ${text}`);
        }
      }
      
      return { name: endpoint.name, success: true, data: text };
    } else if (response.status === 404) {
      console.log(`❌ ${endpoint.name}: Not Found`);
    } else {
      console.log(`⚠️ ${endpoint.name}: ${response.status} - ${text}`);
    }
    
    return { name: endpoint.name, success: false };
    
  } catch (error) {
    console.log(`💥 ${endpoint.name}: ${error.message}`);
    return { name: endpoint.name, success: false };
  }
}

// Также проверим POST запросы для получения детальной информации
async function testPostEndpoints() {
  console.log('\n📤 ТЕСТИРОВАНИЕ POST ENDPOINTS:');
  console.log('=' .repeat(40));
  
  const postEndpoints = [
    { name: 'User Info POST', url: '/api/v1/user/info', body: {} },
    { name: 'Credits Info POST', url: '/api/v1/credits/info', body: {} },
    { name: 'Balance Info POST', url: '/api/v1/balance/info', body: {} },
    { name: 'Account Info POST', url: '/api/v1/account/info', body: {} }
  ];
  
  for (const endpoint of postEndpoints) {
    try {
      const response = await fetch(`https://api.kie.ai${endpoint.url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(endpoint.body)
      });

      const text = await response.text();
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint.name}: ${text}`);
        if (text.includes('video') || text.includes('veo')) {
          console.log(`🎯 CONTAINS VIDEO INFO!`);
        }
      } else {
        console.log(`❌ ${endpoint.name}: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`💥 ${endpoint.name}: ${error.message}`);
    }
  }
}

async function searchForVideoCredits() {
  console.log('🔍 ПОИСК VIDEO CREDITS ВО ВСЕХ ENDPOINTS...\n');
  
  const successfulEndpoints = [];
  const potentialVideoEndpoints = [];
  
  for (const endpoint of creditEndpoints) {
    const result = await testEndpoint(endpoint);
    
    if (result.success) {
      successfulEndpoints.push(result);
      
      // Проверяем на наличие video-related keywords
      const data = result.data.toLowerCase();
      if (data.includes('video') || data.includes('veo') || data.includes('generation')) {
        potentialVideoEndpoints.push(result);
      }
    }
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await testPostEndpoints();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 РЕЗУЛЬТАТЫ ПОИСКА:');
  console.log('='.repeat(60));
  
  console.log(`\n✅ РАБОЧИЕ ENDPOINTS (${successfulEndpoints.length}):`);
  successfulEndpoints.forEach(ep => {
    console.log(`- ${ep.name}`);
  });
  
  if (potentialVideoEndpoints.length > 0) {
    console.log(`\n🎯 ПОТЕНЦИАЛЬНЫЕ VIDEO ENDPOINTS (${potentialVideoEndpoints.length}):`);
    potentialVideoEndpoints.forEach(ep => {
      console.log(`- ${ep.name}: ${ep.data}`);
    });
  } else {
    console.log('\n❌ VIDEO CREDITS НЕ НАЙДЕНЫ');
    console.log('\n💡 ВОЗМОЖНЫЕ ПРИЧИНЫ:');
    console.log('1. Video credits в отдельном API endpoint');
    console.log('2. API ключ не имеет доступа к video сервису');
    console.log('3. Нужна активация video API отдельно');
    console.log('4. Video credits показываются только в web интерфейсе');
  }
  
  console.log('\n🎯 РЕКОМЕНДАЦИИ:');
  console.log('1. Проверьте https://kie.ai dashboard для video credits');
  console.log('2. Убедитесь что API key имеет video permissions');
  console.log('3. Возможно нужен другой API key для video сервиса');
}

searchForVideoCredits().catch(console.error);