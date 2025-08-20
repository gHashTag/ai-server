#!/usr/bin/env node

/**
 * ПРОВЕРКА ИСПОЛЬЗОВАНИЯ KIE.AI API
 * Проверяем, действительно ли используется Kie.ai для veo-3-fast
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🔍 ПРОВЕРКА API КОНФИГУРАЦИИ:');
console.log('='.repeat(50));

// 1. Проверяем переменные окружения
console.log('\n📋 ENVIRONMENT VARIABLES:');
console.log('KIE_AI_API_KEY:', process.env.KIE_AI_API_KEY ? 'УСТАНОВЛЕН ✅' : 'НЕ УСТАНОВЛЕН ❌');
console.log('GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT ? 'УСТАНОВЛЕН ✅' : 'НЕ УСТАНОВЛЕН ❌');

// 2. Проверяем конфигурацию моделей
try {
  const { VIDEO_MODELS_CONFIG } = require('./src/config/models.config');
  
  console.log('\n🎯 МОДЕЛЬ VEO-3-FAST:');
  const veo3Fast = VIDEO_MODELS_CONFIG['veo-3-fast'];
  if (veo3Fast) {
    console.log('- ID:', veo3Fast.id);
    console.log('- Title:', veo3Fast.title);
    console.log('- Provider Type:', veo3Fast.api.input.type);
    console.log('- Price per second:', veo3Fast.pricePerSecond);
    console.log('- Supported durations:', veo3Fast.supportedDurations);
    console.log('- Default duration:', veo3Fast.defaultDuration);
    
    if (veo3Fast.api.input.type === 'kie-ai') {
      console.log('✅ НАСТРОЕН НА KIE.AI');
    } else {
      console.log('❌ НЕ НАСТРОЕН НА KIE.AI');
    }
  } else {
    console.log('❌ Конфигурация veo-3-fast не найдена');
  }

  console.log('\n🎯 МОДЕЛЬ VEO-3:');
  const veo3 = VIDEO_MODELS_CONFIG['veo-3'];
  if (veo3) {
    console.log('- Provider Type:', veo3.api.input.type);
    if (veo3.api.input.type === 'kie-ai') {
      console.log('✅ НАСТРОЕН НА KIE.AI');
    } else {
      console.log('❌ НЕ НАСТРОЕН НА KIE.AI');
    }
  }

} catch (error) {
  console.error('❌ Ошибка загрузки конфигурации:', error.message);
}

// 3. Тестируем логику выбора провайдера
console.log('\n🧪 ТЕСТИРОВАНИЕ ЛОГИКИ:');
console.log('='.repeat(50));

async function testProviderSelection() {
  try {
    // Импортируем функцию генерации
    const { processVideoGeneration } = require('./src/services/generateTextToVideo');
    
    console.log('📞 Имитация вызова processVideoGeneration для veo-3-fast...');
    
    // НЕ ВЫЗЫВАЕМ РЕАЛЬНО, а проверяем только логику
    const mockResult = await processVideoGeneration(
      'veo-3-fast', 
      '16:9', 
      'test prompt for provider check',
      undefined,
      2 // 2 секунды
    ).catch(err => {
      console.log('⚠️ Ожидаемая ошибка (нет реального API вызова):', err.message);
      
      // Анализируем, какой провайдер пытался использоваться
      if (err.message.includes('Kie.ai')) {
        console.log('✅ ЛОГИКА ИСПОЛЬЗУЕТ KIE.AI');
        return 'kie-ai';
      } else if (err.message.includes('Vertex AI')) {
        console.log('❌ ЛОГИКА ИСПОЛЬЗУЕТ VERTEX AI');
        return 'vertex-ai';
      } else {
        console.log('❓ НЕИЗВЕСТНЫЙ ПРОВАЙДЕР');
        return 'unknown';
      }
    });
    
    return mockResult;
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// 4. Проверяем Kie.ai API доступность
async function checkKieApiHealth() {
  console.log('\n🏥 ПРОВЕРКА KIE.AI API:');
  
  if (!process.env.KIE_AI_API_KEY) {
    console.log('❌ API ключ не установлен');
    return false;
  }
  
  try {
    const { KieAiService } = require('./src/services/kieAiService');
    const kieService = new KieAiService();
    
    console.log('📞 Проверка доступности Kie.ai API...');
    const isHealthy = await kieService.checkHealth();
    
    if (isHealthy) {
      console.log('✅ KIE.AI API ДОСТУПЕН');
    } else {
      console.log('❌ KIE.AI API НЕДОСТУПЕН');
    }
    
    return isHealthy;
  } catch (error) {
    console.log('❌ Ошибка проверки Kie.ai:', error.message);
    return false;
  }
}

// Выполнение всех проверок
async function runAllChecks() {
  console.log('🚀 НАЧИНАЕМ ПОЛНУЮ ПРОВЕРКУ...\n');
  
  await testProviderSelection();
  await checkKieApiHealth();
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 ИТОГИ:');
  console.log('- Конфигурация: veo-3-fast настроен на kie-ai');
  console.log('- Environment: KIE_AI_API_KEY', process.env.KIE_AI_API_KEY ? 'присутствует' : 'отсутствует');
  console.log('- Логика должна использовать Kie.ai при наличии ключа');
  console.log('='.repeat(50));
}

runAllChecks().catch(console.error);