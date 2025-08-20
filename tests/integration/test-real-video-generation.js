#!/usr/bin/env node

/**
 * РЕАЛЬНАЯ ГЕНЕРАЦИЯ ВИДЕО ЧЕРЕЗ KIE.AI API
 * 
 * Тестирует:
 * 1. Видео 2 секунды горизонтальное (16:9) 
 * 2. Видео 4 секунды вертикальное (9:16)
 * 3. Поддержку duration в Veo3 Fast
 * 4. Поддержку aspect ratio
 */

const axios = require('axios');

console.log('🎬 РЕАЛЬНАЯ ГЕНЕРАЦИЯ ВИДЕО ЧЕРЕЗ KIE.AI\n');

class VideoGenerationTest {
  constructor() {
    this.apiKey = 'f52f224a92970aa6b7c7780104a00f71';
    this.baseUrl = 'https://api.kie.ai/api/v1';
    this.generatedVideos = [];
  }

  async checkBalance() {
    console.log('💰 ПРОВЕРКА БАЛАНСА');
    console.log('=' * 40);
    
    try {
      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Баланс проверен успешно');
      console.log('📊 Ответ API:', JSON.stringify(response.data, null, 2));
      
      const credits = response.data.data || response.data.credits || 0;
      console.log(`💎 Доступно кредитов: ${credits}`);
      
      return credits > 0;
      
    } catch (error) {
      console.log('❌ Ошибка проверки баланса:', error.response?.data || error.message);
      return false;
    }
  }

  async generateVideo(testConfig) {
    console.log(`\n🎥 ГЕНЕРАЦИЯ: ${testConfig.name}`);
    console.log('=' * 60);
    console.log('📋 Параметры:');
    console.log(`   • Модель: ${testConfig.model}`);
    console.log(`   • Длительность: ${testConfig.duration} секунд`);
    console.log(`   • Соотношение: ${testConfig.aspectRatio}`);
    console.log(`   • Промпт: ${testConfig.prompt}`);
    
    try {
      console.log('\n⏳ Отправка запроса...');
      
      const requestBody = {
        model: testConfig.model,
        prompt: testConfig.prompt,
        duration: testConfig.duration,
        aspectRatio: testConfig.aspectRatio,
        // Дополнительные параметры для тестирования
        ...testConfig.extraParams
      };
      
      console.log('📤 Тело запроса:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios.post(`${this.baseUrl}/video/generate`, requestBody, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 минут
      });
      
      console.log('✅ Запрос отправлен успешно!');
      console.log('📊 Статус ответа:', response.status);
      console.log('📋 Заголовки ответа:', JSON.stringify(response.headers, null, 2));
      console.log('📊 Тело ответа:', JSON.stringify(response.data, null, 2));
      
      const result = {
        testName: testConfig.name,
        success: true,
        requestParams: requestBody,
        response: response.data,
        videoUrl: response.data.data?.videoUrl || response.data.videoUrl,
        actualDuration: response.data.data?.duration || response.data.duration,
        cost: response.data.cost || response.data.data?.cost
      };
      
      if (result.videoUrl) {
        console.log(`🎉 ВИДЕО СГЕНЕРИРОВАНО!`);
        console.log(`🔗 URL: ${result.videoUrl}`);
        console.log(`⏱️  Длительность: ${result.actualDuration || 'неизвестно'} сек`);
        console.log(`💰 Стоимость: $${result.cost?.usd || result.cost || 'неизвестно'}`);
      } else {
        console.log('⚠️ Видео не сгенерировано или URL отсутствует');
      }
      
      this.generatedVideos.push(result);
      return result;
      
    } catch (error) {
      console.log('❌ Ошибка генерации:', error.message);
      
      if (error.response) {
        console.log('📋 HTTP статус:', error.response.status);
        console.log('📋 Заголовки ошибки:', JSON.stringify(error.response.headers, null, 2));
        console.log('📋 Тело ошибки:', JSON.stringify(error.response.data, null, 2));
        
        if (error.response.status === 402) {
          console.log('💡 Недостаточно кредитов - нужно пополнить баланс');
        } else if (error.response.status === 400) {
          console.log('💡 Неверные параметры запроса - возможно модель не поддерживает duration');
        } else if (error.response.status === 429) {
          console.log('💡 Превышен лимит запросов - подождите');
        }
      }
      
      const errorResult = {
        testName: testConfig.name,
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        errorData: error.response?.data
      };
      
      this.generatedVideos.push(errorResult);
      return errorResult;
    }
  }

  async runTests() {
    console.log('🚀 Запуск реальных тестов генерации видео...\n');
    
    // Сначала проверяем баланс
    const hasBalance = await this.checkBalance();
    
    // Конфигурации тестов
    const testConfigs = [
      {
        name: 'ТЕСТ 1: 2 секунды горизонтальное (16:9)',
        model: 'veo-3-fast',
        prompt: 'A cat playing with a red ball in a sunny garden, beautiful lighting',
        duration: 2,
        aspectRatio: '16:9'
      },
      {
        name: 'ТЕСТ 2: 4 секунды вертикальное (9:16)', 
        model: 'veo-3-fast',
        prompt: 'A dog running through autumn leaves, slow motion, cinematic',
        duration: 4,
        aspectRatio: '9:16'
      },
      {
        name: 'ТЕСТ 3: Без duration параметра (проверка дефолта)',
        model: 'veo-3-fast', 
        prompt: 'Birds flying over mountains, peaceful scene',
        // duration не указываем намеренно
        aspectRatio: '16:9'
      }
    ];
    
    if (!hasBalance) {
      console.log('\n⚠️ ВНИМАНИЕ: Недостаточно кредитов!');
      console.log('Тесты будут выполнены, но могут завершиться ошибкой.');
      console.log('Это поможет понять какие ошибки возвращает API.\n');
    }
    
    // Выполняем тесты
    for (const config of testConfigs) {
      await this.generateVideo(config);
      
      // Небольшая пауза между запросами
      console.log('\n⏳ Ожидание 3 секунды перед следующим тестом...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  printSummary() {
    console.log('\n🎯 ИТОГИ ТЕСТИРОВАНИЯ');
    console.log('=' * 60);
    
    const successful = this.generatedVideos.filter(v => v.success);
    const failed = this.generatedVideos.filter(v => !v.success);
    
    console.log(`📊 Всего тестов: ${this.generatedVideos.length}`);
    console.log(`✅ Успешных: ${successful.length}`);
    console.log(`❌ Неудачных: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 УСПЕШНЫЕ ГЕНЕРАЦИИ:');
      successful.forEach((video, index) => {
        console.log(`\n${index + 1}. ${video.testName}`);
        console.log(`   🔗 URL: ${video.videoUrl}`);
        console.log(`   ⏱️  Duration: ${video.actualDuration || 'неизвестно'} сек`);
        console.log(`   📐 Aspect Ratio: ${video.requestParams?.aspectRatio || 'неизвестно'}`);
        console.log(`   💰 Стоимость: $${video.cost?.usd || video.cost || 'неизвестно'}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ НЕУДАЧНЫЕ ПОПЫТКИ:');
      failed.forEach((video, index) => {
        console.log(`\n${index + 1}. ${video.testName}`);
        console.log(`   ❌ Ошибка: ${video.error}`);
        console.log(`   📋 HTTP статус: ${video.httpStatus || 'неизвестно'}`);
        
        if (video.errorData) {
          console.log(`   💡 Детали: ${JSON.stringify(video.errorData, null, 2)}`);
        }
      });
    }
    
    console.log('\n🔍 АНАЛИЗ ПОДДЕРЖКИ ФУНКЦИЙ:');
    
    // Анализируем поддержку duration
    const durationTests = this.generatedVideos.filter(v => v.requestParams?.duration);
    if (durationTests.length > 0) {
      const durationSupported = durationTests.some(v => v.success);
      console.log(`⏱️  Duration параметр: ${durationSupported ? '✅ ПОДДЕРЖИВАЕТСЯ' : '❌ НЕ ПОДДЕРЖИВАЕТСЯ'}`);
      
      if (durationSupported) {
        durationTests.filter(v => v.success).forEach(v => {
          console.log(`   • Запрошено: ${v.requestParams.duration}с → Получено: ${v.actualDuration || '?'}с`);
        });
      }
    }
    
    // Анализируем поддержку aspect ratio
    const aspectRatios = [...new Set(this.generatedVideos.map(v => v.requestParams?.aspectRatio).filter(Boolean))];
    console.log(`📐 Aspect Ratio поддержка:`);
    aspectRatios.forEach(ratio => {
      const ratioTests = this.generatedVideos.filter(v => v.requestParams?.aspectRatio === ratio);
      const supported = ratioTests.some(v => v.success);
      console.log(`   • ${ratio}: ${supported ? '✅ ПОДДЕРЖИВАЕТСЯ' : '❌ НЕ ПОДДЕРЖИВАЕТСЯ'}`);
    });
    
    console.log('\n💡 РЕКОМЕНДАЦИИ:');
    if (failed.some(v => v.httpStatus === 402)) {
      console.log('• Пополните баланс на https://kie.ai для реальной генерации');
    }
    if (failed.some(v => v.httpStatus === 400)) {
      console.log('• Проверьте поддерживаемые параметры модели veo-3-fast');
    }
    if (successful.length > 0) {
      console.log('• Сохраните ссылки на видео - они могут быть временными');
    }
  }
}

async function main() {
  const tester = new VideoGenerationTest();
  
  try {
    await tester.runTests();
    tester.printSummary();
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}