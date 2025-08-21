/**
 * Проверка API apify-client версии 2.15.0
 */

try {
  const { ApifyClient } = require('apify-client');
  const client = new ApifyClient({ token: 'test-token' });
  
  console.log('✅ ApifyClient импортирован успешно');
  console.log('📋 Доступные методы клиента:');
  
  const methods = Object.getOwnPropertyNames(client.__proto__).filter(m => !m.startsWith('_'));
  methods.forEach(method => {
    console.log(`   • ${method}: ${typeof client[method]}`);
  });
  
  // Проверяем наличие метода actor
  if (typeof client.actor === 'function') {
    console.log('✅ client.actor() - метод существует');
  } else {
    console.log('❌ client.actor() - метод НЕ существует');
    console.log('🔍 Возможно нужно использовать другой API');
  }
  
  // Проверяем другие возможные методы
  console.log('\n🔍 Проверка альтернативных методов:');
  console.log(`   • client.actors: ${typeof client.actors}`);
  console.log(`   • client.acts: ${typeof client.acts}`);
  
  if (client.actors) {
    console.log('📋 Методы client.actors:');
    const actorMethods = Object.getOwnPropertyNames(client.actors.__proto__).filter(m => !m.startsWith('_'));
    actorMethods.forEach(method => {
      console.log(`   • actors.${method}: ${typeof client.actors[method]}`);
    });
  }
  
} catch (error) {
  console.error('❌ Ошибка при проверке API:', error.message);
}