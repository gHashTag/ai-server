/**
 * Реальный тест вызова Instagram Apify Scraper через Inngest
 */

const { inngest } = require('./dist/core/inngest/clients');

async function testRealInstagramApify() {
  console.log('🧪 Реальный тест Instagram Apify Scraper через Inngest...');
  
  try {
    // Отправляем событие в Inngest как в реальной ситуации
    const result = await inngest.send({
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: 'cristiano',
        project_id: 1,
        source_type: 'competitor',
        max_reels: 1,
        min_views: 0,
        requester_telegram_id: '144022504',
        bot_name: 'neuro_blogger_bot'
      }
    });
    
    console.log('✅ Событие отправлено в Inngest:', result.ids[0]);
    console.log('⏳ Ожидайте выполнения... (проверьте логи через pm2 logs)');
    
    // Информация для мониторинга
    console.log('\n📊 Для отслеживания:');
    console.log('   • pm2 logs ai-server-main');
    console.log('   • http://localhost:8288 (Inngest dashboard)');
    
    console.log('\n🎯 Если есть ошибка "actor is not a function" - значит проблема подтверждена');
    console.log('🎯 Если ошибки нет - значит проблема была временная');
    
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message);
  }
}

// Запуск теста
testRealInstagramApify();