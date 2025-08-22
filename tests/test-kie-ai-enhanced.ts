/**
 * Тестовый скрипт для проверки расширенной интеграции Kie.ai
 * Проверяет поддержку всех новых полей API
 */

// Используем require для обхода проблем с алиасами в ts-node
const path = require('path');
const dotenv = require('dotenv');

// Настраиваем пути модулей перед импортом
require('module-alias/register');

// Альтернативный способ - прямой импорт без алиасов
import { KieAiService } from '../src/services/kieAiService';

// Загружаем переменные окружения
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testKieAiEnhanced() {
  const kieAi = new KieAiService();
  
  console.log('🚀 Начинаем тестирование расширенной интеграции Kie.ai...\n');
  
  // 1. Проверка здоровья API
  console.log('1️⃣ Проверка доступности API...');
  const isHealthy = await kieAi.checkHealth();
  if (!isHealthy) {
    console.error('❌ Kie.ai API недоступен. Проверьте KIE_AI_API_KEY');
    return;
  }
  console.log('✅ API доступен\n');
  
  // 2. Проверка баланса
  console.log('2️⃣ Проверка баланса...');
  try {
    const balance = await kieAi.getAccountBalance();
    console.log(`💰 Баланс: ${balance.credits} кредитов\n`);
  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error.message);
  }
  
  // 3. Тест генерации с базовыми параметрами
  console.log('3️⃣ Тест генерации видео с базовыми параметрами...');
  try {
    const basicResult = await kieAi.generateVideo({
      model: 'veo3_fast',
      prompt: 'A beautiful sunset over mountains, cinematic shot',
      duration: 5,
      aspectRatio: '16:9',
      userId: 'test-user-123',
      projectId: 1
    });
    
    console.log('✅ Базовая генерация запущена:');
    console.log(`   • Task ID: ${basicResult.taskId}`);
    console.log(`   • Стоимость: $${basicResult.cost.toFixed(3)}`);
    console.log(`   • Статус: ${basicResult.status}\n`);
  } catch (error) {
    console.error('❌ Ошибка базовой генерации:', error.message);
  }
  
  // 4. Тест с массивом изображений
  console.log('4️⃣ Тест генерации с массивом изображений...');
  try {
    const imageUrls = [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg'
    ];
    
    const imageResult = await kieAi.generateVideo({
      model: 'veo3',
      prompt: 'Smooth transition between images with cinematic effects',
      duration: 8,
      aspectRatio: '9:16',
      imageUrls: imageUrls,
      userId: 'test-user-123',
      projectId: 2
    });
    
    console.log('✅ Генерация с изображениями запущена:');
    console.log(`   • Task ID: ${imageResult.taskId}`);
    console.log(`   • Количество изображений: ${imageUrls.length}`);
    console.log(`   • Стоимость: $${imageResult.cost.toFixed(3)}\n`);
  } catch (error) {
    console.error('❌ Ошибка генерации с изображениями:', error.message);
  }
  
  // 5. Тест со всеми расширенными параметрами
  console.log('5️⃣ Тест со всеми расширенными параметрами...');
  try {
    const webhookUrl = process.env.WEBHOOK_BASE_URL 
      ? `${process.env.WEBHOOK_BASE_URL}/webhook/kie-ai`
      : 'https://your-server.com/webhook/kie-ai';
    
    const fullResult = await kieAi.generateVideo({
      model: 'veo3',
      prompt: 'Epic cinematic scene with watermark',
      duration: 10,
      aspectRatio: '16:9',
      imageUrls: ['https://example.com/reference.jpg'],
      watermark: 'MyBrand',
      callBackUrl: webhookUrl,
      seeds: 12345,
      enableFallback: true,
      userId: 'test-user-123',
      projectId: 3,
      botName: 'test-bot',
      isRu: false
    });
    
    console.log('✅ Полная генерация запущена:');
    console.log(`   • Task ID: ${fullResult.taskId}`);
    console.log(`   • Водяной знак: MyBrand`);
    console.log(`   • Callback URL: ${webhookUrl}`);
    console.log(`   • Seed: 12345`);
    console.log(`   • Fallback: включен`);
    console.log(`   • Стоимость: $${fullResult.cost.toFixed(3)}\n`);
  } catch (error) {
    console.error('❌ Ошибка полной генерации:', error.message);
  }
  
  // 6. Тест расчета стоимости
  console.log('6️⃣ Тест расчета стоимости...');
  const models = ['veo3_fast', 'veo3', 'runway-aleph'];
  const duration = 10;
  
  console.log(`Стоимость генерации ${duration} секунд видео:`);
  for (const model of models) {
    const costUSD = kieAi.calculateCost(model, duration);
    const costStars = kieAi.calculateCostInStars(model, duration);
    const modelInfo = kieAi.getModelInfo(model);
    
    console.log(`   • ${modelInfo?.name}: $${costUSD.toFixed(3)} (${costStars} звезд)`);
  }
  
  console.log('\n7️⃣ Информация о моделях:');
  const allModels = kieAi.getAllModels();
  for (const [modelId, modelInfo] of Object.entries(allModels)) {
    console.log(`   • ${modelInfo.name} (${modelId}):`);
    console.log(`     - ${modelInfo.description}`);
    console.log(`     - Цена: $${modelInfo.pricePerSecond}/сек`);
    console.log(`     - Макс. длительность: ${modelInfo.maxDuration} сек`);
    console.log(`     - Форматы: ${modelInfo.supportedFormats.join(', ')}`);
  }
  
  console.log('\n✅ Тестирование завершено!');
  console.log('⚠️  Примечание: Видео генерируется асинхронно.');
  console.log('    Результаты будут доступны через webhook или проверку статуса.');
}

// Запуск тестов
testKieAiEnhanced().catch(console.error);
