#!/usr/bin/env node

/**
 * ЭКСПЕРИМЕНТАЛЬНЫЙ ТЕСТ НАЗВАНИЙ МОДЕЛЕЙ KIE.AI
 * 
 * Пробуем различные варианты названий моделей для выяснения
 * какие модели поддерживаются в Kie.ai API
 */

const axios = require('axios');

console.log('🔬 ЭКСПЕРИМЕНТАЛЬНЫЙ ТЕСТ НАЗВАНИЙ МОДЕЛЕЙ\n');

class ModelNameTester {
  constructor() {
    this.apiKey = 'f52f224a92970aa6b7c7780104a00f71';
    this.baseUrl = 'https://api.kie.ai/api/v1';
    this.results = [];
  }

  async testModel(modelName, endpoint = '/veo/generate') {
    console.log(`🧪 Тестируем модель: ${modelName} на ${endpoint}`);
    
    try {
      const requestBody = {
        model: modelName,
        prompt: "A simple test video",
        duration: 2,
        aspectRatio: "16:9"
      };
      
      const response = await axios.post(`${this.baseUrl}${endpoint}`, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      
      // Если запрос прошел без ошибок
      console.log(`✅ ${modelName} - УСПЕХ! Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      // Проверяем что в ответе нет ошибок
      if (response.data.code && response.data.code !== 200) {
        console.log(`   ⚠️ Ответ содержит ошибку: ${response.data.msg}`);
        return { modelName, success: false, error: response.data.msg, httpStatus: response.status };
      }
      
      return { modelName, success: true, httpStatus: response.status, data: response.data };
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${modelName} - Ошибка: ${error.response.status} ${error.response.data?.msg || error.response.data?.message || ''}`);
        return { 
          modelName, 
          success: false, 
          error: error.response.data?.msg || error.message, 
          httpStatus: error.response.status,
          errorData: error.response.data
        };
      } else {
        console.log(`❌ ${modelName} - Сетевая ошибка: ${error.message}`);
        return { modelName, success: false, error: error.message };
      }
    }
  }

  async runAllModelTests() {
    console.log('🚀 Тестируем различные названия моделей...\n');
    
    // Популярные варианты названий моделей для видео
    const modelNamesVeo = [
      // Google Veo варианты
      'google-veo-3',
      'veo3',
      'veo-3.0',
      'veo_3',
      'google-veo-3-fast',
      'veo3-fast',
      'veo-3.0-fast',
      'veo_3_fast',
      
      // Общие варианты
      'veo',
      'google-veo',
      'veo-fast',
      'veo-quality',
      
      // Возможные внутренние названия
      'google/veo-3',
      'google/veo-3-fast',
      'veo-3-preview',
      'veo-3-generate',
      'veo-3-turbo'
    ];
    
    console.log(`📋 Тестируем ${modelNamesVeo.length} вариантов названий для Veo endpoint`);
    
    for (const modelName of modelNamesVeo) {
      const result = await this.testModel(modelName, '/veo/generate');
      this.results.push({ ...result, endpoint: '/veo/generate' });
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Также протестируем runway модели
    console.log('\n📋 Тестируем модели для Runway endpoint');
    const modelNamesRunway = [
      'runway-gen3',
      'gen3',
      'runway-gen-3',
      'gen-3-alpha',
      'gen3-turbo',
      'runway-turbo',
      'runway',
      'gen3-alpha-turbo'
    ];
    
    for (const modelName of modelNamesRunway) {
      const result = await this.testModel(modelName, '/runway/generate');
      this.results.push({ ...result, endpoint: '/runway/generate' });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  printResults() {
    console.log('\n🎯 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ МОДЕЛЕЙ');
    console.log('='.repeat(60));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`📊 Всего протестировано: ${this.results.length} моделей`);
    console.log(`✅ Рабочие: ${successful.length}`);
    console.log(`❌ Нерабочие: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 НАЙДЕННЫЕ РАБОЧИЕ МОДЕЛИ:');
      successful.forEach((result, index) => {
        console.log(`\n${index + 1}. ✅ ${result.modelName}`);
        console.log(`   🎯 Endpoint: ${result.endpoint}`);
        console.log(`   📊 HTTP Status: ${result.httpStatus}`);
        if (result.data) {
          console.log(`   📋 Response: ${JSON.stringify(result.data, null, 2)}`);
        }
      });
    }
    
    console.log('\n📊 СТАТИСТИКА ОШИБОК:');
    const errorStats = {};
    failed.forEach(result => {
      const errorKey = `${result.error} (HTTP ${result.httpStatus || '?'})`;
      if (!errorStats[errorKey]) {
        errorStats[errorKey] = [];
      }
      errorStats[errorKey].push(result.modelName);
    });
    
    Object.keys(errorStats).forEach(errorKey => {
      const models = errorStats[errorKey];
      console.log(`\n❌ ${errorKey}:`);
      console.log(`   Модели (${models.length}): ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`);
    });
    
    console.log('\n💡 ВЫВОДЫ:');
    if (successful.length > 0) {
      console.log('✅ Найдены рабочие модели для Kie.ai!');
      console.log('✅ Можно использовать в production коде');
      console.log('✅ Обновите KieAiService с правильными названиями моделей');
    } else {
      console.log('❌ Рабочие модели не найдены');
      console.log('💡 Возможно требуется другой формат запроса или параметры');
      console.log('💡 Свяжитесь с поддержкой Kie.ai для получения актуальной документации');
    }
  }
}

async function main() {
  const tester = new ModelNameTester();
  
  try {
    await tester.runAllModelTests();
    tester.printResults();
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  }
}

if (require.main === module) {
  main();
}