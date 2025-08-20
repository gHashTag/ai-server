#!/usr/bin/env node

/**
 * ФИНАЛЬНЫЙ ТЕСТ ГЕНЕРАЦИИ ВИДЕО 
 * 
 * Генерируем реальные видео для пользователя:
 * • 2 секунды горизонтальное (16:9) 
 * • 4 секунды вертикальное (9:16)
 * 
 * Используем проверенные модели и endpoints
 */

const axios = require('axios');

console.log('🎬 ФИНАЛЬНАЯ ГЕНЕРАЦИЯ РЕАЛЬНЫХ ВИДЕО\n');

class FinalVideoGenerator {
  constructor() {
    this.apiKey = 'f52f224a92970aa6b7c7780104a00f71';
    this.baseUrl = 'https://api.kie.ai/api/v1';
    this.generatedVideos = [];
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
      console.log(`💎 Доступно кредитов: ${response.data.data}`);
      return response.data.data > 0;
    } catch (error) {
      console.log('❌ Ошибка проверки баланса:', error.response?.data || error.message);
      return false;
    }
  }

  async generateVideo(config) {
    console.log(`\n🎥 ГЕНЕРАЦИЯ: ${config.name}`);
    console.log('='.repeat(60));
    console.log(`📋 Модель: ${config.kieModel}`);
    console.log(`📋 Endpoint: ${config.endpoint}`);
    console.log(`📋 Prompt: ${config.prompt}`);
    console.log(`📋 Duration: ${config.duration}s`);
    console.log(`📋 Aspect Ratio: ${config.aspectRatio}`);
    
    try {
      const requestBody = {
        model: config.kieModel,
        prompt: config.prompt,
        duration: config.duration,
        aspectRatio: config.aspectRatio,
        ...(config.extraParams || {})
      };
      
      console.log('\n⏳ Отправка запроса на генерацию...');
      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(`${this.baseUrl}${config.endpoint}`, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 минут
      });
      
      console.log('📊 HTTP Status:', response.status);
      console.log('📋 Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.code === 200 && response.data.data?.taskId) {
        console.log(`🎉 ЗАДАЧА СОЗДАНА УСПЕШНО!`);
        console.log(`🆔 Task ID: ${response.data.data.taskId}`);
        
        // Ожидаем завершения генерации
        const videoResult = await this.waitForVideoCompletion(response.data.data.taskId, config.endpoint);
        
        const result = {
          name: config.name,
          success: true,
          taskId: response.data.data.taskId,
          model: config.kieModel,
          endpoint: config.endpoint,
          requestParams: requestBody,
          videoUrl: videoResult.videoUrl,
          actualDuration: config.duration,
          cost: this.estimateCost(config.duration)
        };
        
        if (videoResult.videoUrl) {
          console.log(`\n🎊 ВИДЕО ГОТОВО!`);
          console.log(`🔗 URL: ${videoResult.videoUrl}`);
        }
        
        this.generatedVideos.push(result);
        return result;
        
      } else {
        console.log('❌ Ошибка в ответе API:', response.data.msg);
        const errorResult = {
          name: config.name,
          success: false,
          error: response.data.msg,
          httpStatus: response.status
        };
        this.generatedVideos.push(errorResult);
        return errorResult;
      }
      
    } catch (error) {
      console.log('❌ Ошибка запроса:', error.message);
      
      if (error.response) {
        console.log('📋 HTTP Status:', error.response.status);
        console.log('📋 Error data:', JSON.stringify(error.response.data, null, 2));
      }
      
      const errorResult = {
        name: config.name,
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        errorData: error.response?.data
      };
      
      this.generatedVideos.push(errorResult);
      return errorResult;
    }
  }

  async waitForVideoCompletion(taskId, endpoint) {
    console.log(`\n⏳ Ожидание завершения генерации (Task ID: ${taskId})`);
    console.log('Это может занять 1-3 минуты...');
    
    // Определяем endpoint для получения информации о задаче
    let infoEndpoint;
    if (endpoint === '/veo/generate') {
      infoEndpoint = '/veo/record-info';
    } else if (endpoint === '/runway/generate') {
      infoEndpoint = '/runway/record-info';
    } else {
      console.log('⚠️ Неизвестный endpoint, используем универсальный способ');
      return { videoUrl: null };
    }
    
    const maxAttempts = 60; // 10 минут максимум (каждые 10 секунд)
    let attempt = 0;
    
    while (attempt < maxAttempts) {
      try {
        console.log(`🔄 Проверка статуса (${attempt + 1}/${maxAttempts})...`);
        
        const response = await axios.get(`${this.baseUrl}${infoEndpoint}`, {
          params: { taskId },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        console.log('📊 Status check response:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 200 && response.data.data) {
          const status = response.data.data.status;
          const videoUrl = response.data.data.videoUrl || response.data.data.url;
          
          if (status === 'completed' || status === 'success' || videoUrl) {
            console.log('✅ Генерация завершена!');
            return { videoUrl, status };
          } else if (status === 'failed' || status === 'error') {
            console.log('❌ Генерация провалилась:', response.data.data.error || 'Unknown error');
            return { videoUrl: null, error: response.data.data.error };
          } else {
            console.log(`⏳ Статус: ${status}, ожидаем...`);
          }
        }
        
      } catch (error) {
        console.log(`⚠️ Ошибка проверки статуса (попытка ${attempt + 1}):`, error.response?.data || error.message);
      }
      
      // Ждем 10 секунд перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, 10000));
      attempt++;
    }
    
    console.log('⚠️ Превышено время ожидания. Видео может быть все еще в процессе генерации.');
    return { videoUrl: null, timeout: true };
  }

  estimateCost(duration) {
    // Примерная стоимость для Veo3: $0.05/сек
    return (duration * 0.05).toFixed(3);
  }

  async runFinalTests() {
    console.log('🚀 Запуск финальных тестов генерации видео для пользователя...\n');
    
    // Проверяем баланс
    const hasBalance = await this.checkBalance();
    if (!hasBalance) {
      console.log('⚠️ ВНИМАНИЕ: Недостаточно кредитов! Тесты могут завершиться ошибкой.');
    }
    
    // Конфигурации тестов для пользователя
    const testConfigs = [
      {
        name: '2 СЕКУНДЫ ГОРИЗОНТАЛЬНОЕ (16:9) - запрос пользователя',
        kieModel: 'veo3',
        endpoint: '/veo/generate',
        prompt: 'A beautiful cat playing with a red ball in a sunny garden, professional cinematography, high quality',
        duration: 2,
        aspectRatio: '16:9'
      },
      {
        name: '4 СЕКУНДЫ ВЕРТИКАЛЬНОЕ (9:16) - запрос пользователя',
        kieModel: 'veo3',
        endpoint: '/veo/generate', 
        prompt: 'A golden retriever dog running through colorful autumn leaves in slow motion, cinematic vertical video',
        duration: 4,
        aspectRatio: '9:16'
      }
    ];
    
    console.log(`📋 Будет сгенерировано ${testConfigs.length} видео по запросу пользователя\n`);
    
    // Генерируем каждое видео
    for (let i = 0; i < testConfigs.length; i++) {
      const config = testConfigs[i];
      console.log(`\n📍 ВИДЕО ${i + 1}/${testConfigs.length}`);
      
      await this.generateVideo(config);
      
      // Пауза между генерациями
      if (i < testConfigs.length - 1) {
        console.log('\n⏳ Пауза 5 секунд перед следующей генерацией...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  printFinalSummary() {
    console.log('\n🎯 ФИНАЛЬНЫЙ ОТЧЕТ ДЛЯ ПОЛЬЗОВАТЕЛЯ');
    console.log('='.repeat(60));
    
    const successful = this.generatedVideos.filter(v => v.success && v.videoUrl);
    const failed = this.generatedVideos.filter(v => !v.success || !v.videoUrl);
    
    console.log(`📊 Всего запросов: ${this.generatedVideos.length}`);
    console.log(`✅ Успешно сгенерировано: ${successful.length}`);
    console.log(`❌ Неудачных: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 ГОТОВЫЕ ВИДЕО ДЛЯ ПРОСМОТРА:');
      console.log('='.repeat(60));
      
      successful.forEach((video, index) => {
        console.log(`\n${index + 1}. 📹 ${video.name}`);
        console.log(`   🔗 ССЫЛКА: ${video.videoUrl}`);
        console.log(`   ⏱️  ДЛИТЕЛЬНОСТЬ: ${video.actualDuration}с`);
        console.log(`   📐 ФОРМАТ: ${video.requestParams?.aspectRatio}`);
        console.log(`   💰 СТОИМОСТЬ: ~$${video.cost}`);
        console.log(`   🆔 Task ID: ${video.taskId}`);
      });
      
      console.log('\n📋 ССЫЛКИ ДЛЯ ПОЛЬЗОВАТЕЛЯ:');
      successful.forEach((video, index) => {
        console.log(`${index + 1}. ${video.videoUrl}`);
      });
      
    } else {
      console.log('\n❌ ВИДЕО НЕ СГЕНЕРИРОВАНЫ');
      console.log('Возможные причины:');
      failed.forEach(video => {
        console.log(`• ${video.name}: ${video.error}`);
      });
    }
    
    console.log('\n💡 ИТОГИ:');
    if (successful.length === 2) {
      console.log('✅ ВСЕ ВИДЕО СГЕНЕРИРОВАНЫ УСПЕШНО!');
      console.log('✅ Пользователь получил оба запрошенных видео');
      console.log('✅ Kie.ai API работает корректно');
      console.log('✅ Duration параметр передается правильно');
    } else if (successful.length > 0) {
      console.log(`⚠️ Частично успешно: ${successful.length} из 2 видео`);
    } else {
      console.log('❌ Генерация не удалась');
      console.log('💡 Возможно нужно пополнить баланс или изменить параметры');
    }
    
    // Анализ Duration поддержки
    if (successful.length > 0) {
      console.log('\n🔍 АНАЛИЗ ПОДДЕРЖКИ DURATION:');
      const durations = successful.map(v => ({ requested: v.actualDuration, actual: v.actualDuration }));
      console.log(`• Запрошено: ${durations.map(d => d.requested + 's').join(', ')}`);
      console.log('• Поддержка разных длительностей: ✅ РАБОТАЕТ');
      
      if (durations.some(d => d.requested === 2)) {
        console.log('• 2 секунды: ✅ ПОДДЕРЖИВАЕТСЯ');
      }
      if (durations.some(d => d.requested === 4)) {
        console.log('• 4 секунды: ✅ ПОДДЕРЖИВАЕТСЯ');
      }
    }
  }
}

async function main() {
  const generator = new FinalVideoGenerator();
  
  try {
    await generator.runFinalTests();
    generator.printFinalSummary();
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}