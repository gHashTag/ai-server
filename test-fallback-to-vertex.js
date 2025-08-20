#!/usr/bin/env node

/**
 * ТЕСТ FALLBACK НА VERTEX AI
 * Проверяем, работает ли переключение на Vertex AI когда Kie.ai недоступен
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔄 ТЕСТ FALLBACK МЕХАНИЗМА');
console.log('=' .repeat(50));

async function testFallbackLogic() {
  try {
    // Импортируем KieAiService
    const { KieAiService } = require('./src/services/kieAiService.ts');
    
    console.log('\n🏥 ТЕСТИРОВАНИЕ HEALTH CHECK:');
    console.log('='.repeat(40));
    
    const kieService = new KieAiService();
    
    // 1. Проверяем health check
    console.log('📞 Проверка доступности Kie.ai...');
    const isHealthy = await kieService.checkHealth();
    
    if (isHealthy) {
      console.log('✅ Kie.ai доступен - fallback НЕ нужен');
    } else {
      console.log('❌ Kie.ai НЕдоступен - fallback ДОЛЖЕН сработать');
    }
    
    console.log('\n🎬 ТЕСТИРОВАНИЕ ЛОГИКИ ГЕНЕРАЦИИ:');
    console.log('='.repeat(40));
    
    // 2. Тестируем логику выбора провайдера
    const { processVideoGeneration } = require('./src/services/generateTextToVideo.ts');
    
    console.log('📞 Имитация вызова processVideoGeneration...');
    
    try {
      const result = await processVideoGeneration(
        'veo-3-fast', // модель с type: 'kie-ai'
        '16:9',
        'Test fallback: a simple flower blooming',
        undefined,
        2 // 2 секунды
      );
      
      console.log('✅ ГЕНЕРАЦИЯ УСПЕШНА:', result);
      
      // Анализируем какой провайдер использовался
      if (typeof result === 'string' && result.startsWith('data:video/mp4;base64,')) {
        console.log('🎯 Использовался VERTEX AI (base64 результат)');
      } else if (typeof result === 'string' && result.startsWith('http')) {
        console.log('🎯 Использовался KIE.AI (HTTP URL результат)');
      } else {
        console.log('🤔 Неизвестный формат результата');
      }
      
    } catch (error) {
      console.log('❌ ГЕНЕРАЦИЯ ПРОВАЛЕНА:', error.message);
      
      // Анализируем ошибку
      if (error.message.includes('Kie.ai')) {
        console.log('🎯 Ошибка от KIE.AI - fallback НЕ сработал');
      } else if (error.message.includes('Vertex')) {
        console.log('🎯 Ошибка от VERTEX AI - fallback сработал, но Vertex недоступен');
      } else if (error.message.includes('GOOGLE_CLOUD_PROJECT')) {
        console.log('🎯 Fallback сработал, но Vertex AI не настроен (нет GOOGLE_CLOUD_PROJECT)');
      } else {
        console.log('🤔 Неизвестная ошибка');
      }
    }
    
  } catch (importError) {
    console.error('❌ Ошибка импорта сервисов:', importError.message);
    
    // Альтернативный тест через прямое тестирование логики
    await testLogicDirectly();
  }
}

async function testLogicDirectly() {
  console.log('\n🔬 ПРЯМОЕ ТЕСТИРОВАНИЕ ЛОГИКИ:');
  console.log('='.repeat(40));
  
  // Имитируем логику из processVideoGeneration
  const modelConfig = {
    api: {
      input: {
        type: 'kie-ai'
      }
    }
  };
  
  const providerType = modelConfig.api?.input?.type;
  console.log(`🎯 Конфигурация модели veo-3-fast: type = "${providerType}"`);
  
  if (providerType === 'kie-ai') {
    console.log('✅ Логика ДОЛЖНА использовать Kie.ai');
    console.log('✅ При недоступности Kie.ai ДОЛЖЕН сработать fallback на Vertex AI');
  } else {
    console.log('❌ Логика НЕ настроена на Kie.ai');
  }
  
  // Проверяем environment variables для Vertex AI fallback
  console.log('\n🔧 ПРОВЕРКА VERTEX AI FALLBACK:');
  console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT ? '✅ УСТАНОВЛЕН' : '❌ НЕ УСТАНОВЛЕН');
  
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    console.log('⚠️ VERTEX AI fallback не будет работать без GOOGLE_CLOUD_PROJECT');
  }
}

// Создаем mock тест для демонстрации ожидаемого поведения
async function demonstrateExpectedBehavior() {
  console.log('\n📋 ОЖИДАЕМОЕ ПОВЕДЕНИЕ:');
  console.log('='.repeat(40));
  console.log('1. Запрос на генерацию veo-3-fast (type: kie-ai)');
  console.log('2. processVideoGeneration проверяет провайдер = kie-ai');
  console.log('3. Вызывается kieAiService.checkHealth()');
  console.log('4. checkHealth() возвращает false (недостаточно кредитов)');
  console.log('5. ДОЛЖЕН сработать fallback: processVertexAI()');
  console.log('6. Vertex AI генерирует видео с правильным duration');
  
  console.log('\n❓ ТЕКУЩАЯ ПРОБЛЕМА:');
  console.log('- Kie.ai недоступен (код 402: недостаточно кредитов)');
  console.log('- checkHealth() корректно возвращает false');  
  console.log('- Fallback НЕ срабатывает из-за недостающего GOOGLE_CLOUD_PROJECT');
  console.log('- Результат: ошибка вместо генерации через Vertex AI');
}

// Запуск всех тестов
async function runTests() {
  console.log('🚀 ЗАПУСК ТЕСТОВ FALLBACK...\n');
  
  await testFallbackLogic();
  await demonstrateExpectedBehavior();
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 РЕКОМЕНДАЦИИ:');
  console.log('1. Пополнить баланс Kie.ai ИЛИ');
  console.log('2. Настроить GOOGLE_CLOUD_PROJECT для Vertex AI fallback');
  console.log('3. Проверить duration API работает в обоих провайдерах');
  console.log('='.repeat(50));
}

runTests().catch(console.error);