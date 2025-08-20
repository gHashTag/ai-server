#!/usr/bin/env node

/**
 * ИСПРАВЛЕННЫЙ ТЕСТ KIE.AI API
 * 
 * Использует правильные endpoints:
 * • Veo 3: /api/v1/veo/generate
 * • Runway Aleph: /api/v1/aleph/generate
 * • Runway: /api/v1/runway/generate
 */

const axios = require('axios');

console.log('🔧 ИСПРАВЛЕННЫЙ ТЕСТ KIE.AI API\n');

class FixedKieApiTester {
  constructor() {
    this.apiKey = 'f52f224a92970aa6b7c7780104a00f71';
    this.baseUrl = 'https://api.kie.ai/api/v1';
    this.results = [];
  }

  async checkBalance() {
    console.log('💰 ПРОВЕРКА БАЛАНСА');
    console.log('='.repeat(40));
    
    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Баланс проверен успешно');
      console.log('📊 Кредиты:', response.data.data || response.data.credits);
      return true;
    } catch (error) {
      console.log('❌ Ошибка проверки баланса:', error.response?.data || error.message);
      return false;
    }
  }

  async testVideoGeneration(config) {
    console.log(`\n🎥 ТЕСТ: ${config.name}`);
    console.log('='.repeat(60));
    console.log(`📋 Endpoint: ${config.endpoint}`);
    console.log(`📋 Модель: ${config.model}`);
    console.log(`📋 Prompt: ${config.prompt}`);
    console.log(`📋 Duration: ${config.duration}s`);
    console.log(`📋 Aspect Ratio: ${config.aspectRatio}`);
    
    try {
      const requestBody = {
        model: config.model,
        prompt: config.prompt,
        duration: config.duration,
        aspectRatio: config.aspectRatio
      };
      
      console.log('\n⏳ Отправка запроса...');
      console.log('📤 Тело запроса:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(`${this.baseUrl}${config.endpoint}`, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 минут
      });
      
      console.log('✅ ЗАПРОС УСПЕШЕН!');
      console.log('📊 HTTP Status:', response.status);
      console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
      console.log('📊 Response:', JSON.stringify(response.data, null, 2));
      
      const result = {
        name: config.name,
        success: true,
        endpoint: config.endpoint,
        model: config.model,
        httpStatus: response.status,
        response: response.data,
        videoUrl: this.extractVideoUrl(response.data),
        actualDuration: this.extractDuration(response.data),
        cost: this.extractCost(response.data)
      };
      
      if (result.videoUrl) {
        console.log(`🎉 ВИДЕО СГЕНЕРИРОВАНО!`);
        console.log(`🔗 URL: ${result.videoUrl}`);
        console.log(`⏱️  Duration: ${result.actualDuration || 'неизвестно'}s`);
        console.log(`💰 Cost: $${result.cost || 'неизвестно'}`);
      }
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      console.log('❌ ОШИБКА:', error.message);
      
      if (error.response) {
        console.log('📋 HTTP Status:', error.response.status);
        console.log('📋 Headers:', JSON.stringify(error.response.headers, null, 2));
        console.log('📋 Error Data:', JSON.stringify(error.response.data, null, 2));
        
        // Анализ ошибок
        if (error.response.status === 404) {
          console.log('💡 Endpoint не найден - проверьте URL');
        } else if (error.response.status === 400) {
          console.log('💡 Неверные параметры запроса');
        } else if (error.response.status === 401) {
          console.log('💡 Неверный API ключ');
        } else if (error.response.status === 402) {
          console.log('💡 Недостаточно кредитов');
        } else if (error.response.status === 429) {
          console.log('💡 Превышен лимит запросов');
        }
      }
      
      const errorResult = {
        name: config.name,
        success: false,
        endpoint: config.endpoint,
        model: config.model,
        error: error.message,
        httpStatus: error.response?.status,
        errorData: error.response?.data
      };
      
      this.results.push(errorResult);
      return errorResult;
    }
  }

  extractVideoUrl(responseData) {
    return responseData.data?.videoUrl || 
           responseData.videoUrl ||
           responseData.data?.url ||
           responseData.url ||
           null;
  }

  extractDuration(responseData) {
    return responseData.data?.duration ||
           responseData.duration ||
           responseData.data?.actualDuration ||
           null;
  }

  extractCost(responseData) {
    return responseData.cost?.usd ||
           responseData.cost ||
           responseData.data?.cost?.usd ||
           responseData.data?.cost ||
           null;
  }

  async runAllTests() {
    console.log('🚀 Запуск всех тестов с правильными endpoints...\n');
    
    // Проверяем баланс
    const hasBalance = await this.checkBalance();
    
    // Конфигурации тестов с правильными endpoints
    const testConfigs = [
      {
        name: 'VEO 3 FAST - 2 секунды горизонтальное',
        endpoint: '/veo/generate',
        model: 'veo-3-fast',
        prompt: 'A cat playing with a red ball in a sunny garden',
        duration: 2,
        aspectRatio: '16:9'
      },
      {
        name: 'VEO 3 FAST - 4 секунды вертикальное',
        endpoint: '/veo/generate',
        model: 'veo-3-fast',
        prompt: 'A dog running through autumn leaves, cinematic',
        duration: 4,
        aspectRatio: '9:16'
      },
      {
        name: 'VEO 3 - качественное видео',
        endpoint: '/veo/generate',
        model: 'veo-3',
        prompt: 'Birds flying over mountains, peaceful scene',
        duration: 3,
        aspectRatio: '16:9'
      }
    ];
    
    if (!hasBalance) {
      console.log('\n⚠️ ВНИМАНИЕ: Возможны проблемы с кредитами!');
      console.log('Тесты помогут определить точные ошибки API.\n');
    }
    
    // Выполняем все тесты
    for (const config of testConfigs) {
      await this.testVideoGeneration(config);
      
      // Пауза между тестами
      console.log('\n⏳ Пауза 3 секунды...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  printSummary() {
    console.log('\n🎯 ИТОГОВЫЙ ОТЧЕТ');
    console.log('='.repeat(60));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`📊 Всего тестов: ${this.results.length}`);
    console.log(`✅ Успешных: ${successful.length}`);
    console.log(`❌ Неудачных: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 УСПЕШНЫЕ ГЕНЕРАЦИИ:');
      successful.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}`);
        console.log(`   🎯 Endpoint: ${result.endpoint}`);
        console.log(`   🔗 Video URL: ${result.videoUrl || 'отсутствует'}`);
        console.log(`   ⏱️  Duration: ${result.actualDuration || '?'}s`);
        console.log(`   💰 Cost: $${result.cost || '?'}`);
        console.log(`   📊 HTTP Status: ${result.httpStatus}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ НЕУДАЧНЫЕ ПОПЫТКИ:');
      failed.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name}`);
        console.log(`   🎯 Endpoint: ${result.endpoint}`);
        console.log(`   ❌ Error: ${result.error}`);
        console.log(`   📊 HTTP Status: ${result.httpStatus || 'неизвестно'}`);
      });
    }
    
    console.log('\n🔍 АНАЛИЗ:');
    
    // Анализ endpoints
    const endpointResults = {};
    this.results.forEach(result => {
      if (!endpointResults[result.endpoint]) {
        endpointResults[result.endpoint] = { success: 0, fail: 0 };
      }
      if (result.success) {
        endpointResults[result.endpoint].success++;
      } else {
        endpointResults[result.endpoint].fail++;
      }
    });
    
    console.log('\n📡 СТАТИСТИКА ENDPOINTS:');
    Object.keys(endpointResults).forEach(endpoint => {
      const stats = endpointResults[endpoint];
      const total = stats.success + stats.fail;
      const successRate = ((stats.success / total) * 100).toFixed(1);
      console.log(`   • ${endpoint}: ${stats.success}/${total} (${successRate}% успех)`);
    });
    
    // Анализ моделей
    const modelResults = {};
    this.results.forEach(result => {
      if (!modelResults[result.model]) {
        modelResults[result.model] = { success: 0, fail: 0 };
      }
      if (result.success) {
        modelResults[result.model].success++;
      } else {
        modelResults[result.model].fail++;
      }
    });
    
    console.log('\n🤖 СТАТИСТИКА МОДЕЛЕЙ:');
    Object.keys(modelResults).forEach(model => {
      const stats = modelResults[model];
      const total = stats.success + stats.fail;
      const successRate = ((stats.success / total) * 100).toFixed(1);
      console.log(`   • ${model}: ${stats.success}/${total} (${successRate}% успех)`);
    });
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    if (successful.length > 0) {
      console.log('✅ Найдены рабочие endpoints - можно использовать в production');
      console.log('✅ Kie.ai поддерживает video generation');
      if (successful.some(r => r.videoUrl)) {
        console.log('✅ Получены реальные видео ссылки для просмотра');
      }
    } else {
      console.log('❌ Ни один endpoint не работает');
      console.log('💡 Возможно нужна авторизация или другие параметры');
    }
  }
}

async function main() {
  const tester = new FixedKieApiTester();
  
  try {
    await tester.runAllTests();
    tester.printSummary();
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}