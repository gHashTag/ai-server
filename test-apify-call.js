/**
 * Тестируем правильный вызов apify-client v2.15.0
 */

const { ApifyClient } = require('apify-client');

async function testApifyCall() {
  console.log('🧪 Тестируем apify-client v2.15.0...');
  
  const client = new ApifyClient({ token: process.env.APIFY_TOKEN || 'test-token' });
  
  try {
    // Вариант 1: Прямой вызов client.actor()
    console.log('\n1️⃣ Тестируем client.actor()...');
    const actorClient = client.actor('apify/instagram-scraper');
    console.log('✅ client.actor() вернул:', typeof actorClient);
    
    // Проверяем методы actorClient
    if (actorClient) {
      const methods = Object.getOwnPropertyNames(actorClient.__proto__).filter(m => !m.startsWith('_'));
      console.log('📋 Методы actorClient:');
      methods.forEach(method => {
        console.log(`   • ${method}: ${typeof actorClient[method]}`);
      });
      
      // Проверяем есть ли метод call
      if (typeof actorClient.call === 'function') {
        console.log('✅ actorClient.call() - метод существует!');
        console.log('🎯 Правильный способ: client.actor(id).call(input)');
      }
    }
    
    // Вариант 2: Через actors
    console.log('\n2️⃣ Тестируем client.actors...');
    const actorsClient = client.actors;
    console.log('✅ client.actors тип:', typeof actorsClient);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testApifyCall();