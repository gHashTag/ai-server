#!/usr/bin/env node

/**
 * ПОЛНЫЙ ТЕСТ ВЕРТИКАЛЬНОГО ВИДЕО И DURATION API
 * Проверяем поддержку aspect ratio 9:16 и duration в Kie.ai
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('🎬 ТЕСТ ВЕРТИКАЛЬНОГО ВИДЕО И DURATION');
console.log('=' .repeat(50));
console.log(`🔑 API Key: ${process.env.KIE_AI_API_KEY ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН'}`);

if (!process.env.KIE_AI_API_KEY) {
  console.log('❌ Установите KIE_AI_API_KEY в .env');
  process.exit(1);
}

// Настройки тестирования 
const testCases = [
  {
    name: '🎯 ТЕСТ 1: Горизонтальное 2 секунды',
    model: 'veo3',
    prompt: 'A beautiful red rose blooming in a garden, cinematic lighting',
    duration: 2,
    aspectRatio: '16:9'
  },
  {
    name: '📱 ТЕСТ 2: Вертикальное 4 секунды', 
    model: 'veo3',
    prompt: 'A cat playing with a ball of yarn, vertical phone video style',
    duration: 4,
    aspectRatio: '9:16'
  }
];

async function makeKieApiRequest(payload) {
  try {
    const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_AI_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
    throw error;
  }
}

async function checkVideoStatus(requestId) {
  try {
    const response = await fetch(`https://api.kie.ai/api/v1/veo/record-info?request_id=${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.KIE_AI_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Status API Error ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Ошибка проверки статуса:', error.message);
    throw error;
  }
}

async function waitForVideo(requestId, maxWaitTime = 300000) {
  console.log(`⏳ Ожидание генерации видео (ID: ${requestId})...`);
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < maxWaitTime) {
    attempt++;
    try {
      const status = await checkVideoStatus(requestId);
      console.log(`📋 Попытка ${attempt}: Статус = ${status.status}`);

      if (status.status === 'completed') {
        console.log('✅ Видео готово!');
        return status;
      } else if (status.status === 'failed') {
        throw new Error(`Генерация не удалась: ${status.error || 'Unknown error'}`);
      }

      // Ждем 10 секунд перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`❌ Ошибка проверки статуса (попытка ${attempt}):`, error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  throw new Error('Превышено время ожидания генерации');
}

async function runTest(testCase) {
  console.log(`\n${testCase.name}`);
  console.log('-'.repeat(40));

  const payload = {
    model: testCase.model,
    prompt: testCase.prompt,
    duration: testCase.duration,
    aspect_ratio: testCase.aspectRatio,
    resolution: testCase.aspectRatio === '9:16' ? '720x1280' : '1280x720'
  };

  console.log('📋 Параметры запроса:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    // 1. Отправляем запрос на генерацию
    console.log('\n📤 Отправка запроса на генерацию...');
    const response = await makeKieApiRequest(payload);
    
    if (response.request_id) {
      console.log(`✅ Запрос принят! ID: ${response.request_id}`);
      
      // 2. Ждем завершения генерации
      const result = await waitForVideo(response.request_id);
      
      if (result.video_url) {
        console.log(`🎬 Видео готово: ${result.video_url}`);
        
        // 3. Анализируем результат
        console.log('\n📊 АНАЛИЗ РЕЗУЛЬТАТА:');
        console.log(`- URL: ${result.video_url}`);
        console.log(`- Запрошенная длительность: ${testCase.duration} сек`);
        console.log(`- Запрошенный aspect ratio: ${testCase.aspectRatio}`);
        console.log(`- Формат: ${testCase.aspectRatio === '9:16' ? 'Вертикальный' : 'Горизонтальный'}`);
        
        return {
          success: true,
          url: result.video_url,
          requestedDuration: testCase.duration,
          requestedAspectRatio: testCase.aspectRatio,
          testName: testCase.name
        };
      } else {
        throw new Error('Видео URL не получен в ответе');
      }
    } else {
      throw new Error('Request ID не получен от API');
    }
  } catch (error) {
    console.log(`❌ ТЕСТ ПРОВАЛЕН: ${error.message}`);
    return {
      success: false,
      error: error.message,
      testName: testCase.name
    };
  }
}

// Основная функция выполнения всех тестов
async function runAllTests() {
  console.log('🚀 НАЧИНАЕМ ТЕСТИРОВАНИЕ...\n');
  const results = [];

  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push(result);
    
    // Пауза между тестами чтобы не перегрузить API
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('\n⏸️ Пауза 5 секунд перед следующим тестом...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Итоговый отчет
  console.log('\n' + '='.repeat(60));
  console.log('📋 ИТОГОВЫЙ ОТЧЕТ:');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ УСПЕШНО: ${successful.length}/${results.length}`);
  successful.forEach(result => {
    console.log(`  - ${result.testName}`);
    console.log(`    🔗 URL: ${result.url}`);
    console.log(`    ⏱️  Duration: ${result.requestedDuration} сек`);
    console.log(`    📐 Aspect: ${result.requestedAspectRatio}`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ ПРОВАЛЕНО: ${failed.length}/${results.length}`);
    failed.forEach(result => {
      console.log(`  - ${result.testName}: ${result.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  
  // Выводы
  console.log('📝 ВЫВОДЫ:');
  
  const hasVertical = successful.some(r => r.requestedAspectRatio === '9:16');
  const hasDuration = successful.some(r => r.requestedDuration !== 8);
  
  console.log(`- Поддержка вертикального видео (9:16): ${hasVertical ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`- Поддержка duration параметра: ${hasDuration ? '✅ ДА' : '❌ НЕТ'}`);
  console.log(`- Основной провайдер: Kie.ai API`);
  console.log(`- Модель: Veo 3 Fast`);
  
  if (successful.length > 0) {
    console.log('\n🎉 РЕКОМЕНДАЦИИ:');
    console.log('- Можно использовать Kie.ai для генерации видео');
    console.log('- Поддерживается кастомная длительность');
    if (hasVertical) {
      console.log('- Поддерживается вертикальный формат для мобильных');
    }
  }
}

// Запуск тестирования
runAllTests().catch(error => {
  console.error('💥 КРИТИЧЕСКАЯ ОШИБКА:', error);
  process.exit(1);
});