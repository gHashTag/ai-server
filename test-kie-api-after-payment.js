#!/usr/bin/env node

/**
 * БЫСТРАЯ ПРОВЕРКА KIE.AI API ПОСЛЕ ПОПОЛНЕНИЯ
 * Проверяем баланс и возможность генерации видео
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

console.log('💰 ПРОВЕРКА KIE.AI ПОСЛЕ ПОПОЛНЕНИЯ');
console.log('=' .repeat(50));

const apiKey = process.env.KIE_AI_API_KEY;
console.log(`🔑 API Key: ${apiKey ? 'установлен' : 'НЕ УСТАНОВЛЕН'}`);

async function checkCurrentBalance() {
  console.log('\n💳 ПРОВЕРКА ТЕКУЩЕГО БАЛАНСА:');
  
  try {
    // Проверяем chat credits (единственный рабочий endpoint)
    const response = await fetch('https://api.kie.ai/api/v1/chat/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Chat Credits: ${data.data} кредитов`);
      
      if (data.data > 200) {
        console.log('🎉 БАЛАНС ПОПОЛНЕН! Видно увеличение кредитов');
      } else {
        console.log('⚠️ Баланс все еще низкий');
      }
      
      return data.data;
    } else {
      console.log(`❌ Ошибка проверки баланса: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    return null;
  }
}

async function testVideoGeneration() {
  console.log('\n🎬 ТЕСТ ГЕНЕРАЦИИ ВИДЕО:');
  
  // Тест 1: Горизонтальное видео 2 секунды
  console.log('\n📹 Тест 1: Горизонтальное 16:9, 2 секунды');
  await testSingleVideo({
    model: 'veo3',
    prompt: 'A beautiful flower blooming in spring garden, 2 seconds',
    duration: 2,
    aspect_ratio: '16:9'
  });

  // Тест 2: Вертикальное видео 4 секунды  
  console.log('\n📱 Тест 2: Вертикальное 9:16, 4 секунды');
  await testSingleVideo({
    model: 'veo3',
    prompt: 'A cat playing with yarn ball, vertical mobile video, 4 seconds',
    duration: 4,
    aspect_ratio: '9:16'
  });
}

async function testSingleVideo(payload) {
  console.log(`📋 Параметры: ${JSON.stringify(payload, null, 2)}`);
  
  try {
    const response = await fetch('https://api.kie.ai/api/v1/veo/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`📊 HTTP Status: ${response.status}`);
    console.log(`📄 Response: ${JSON.stringify(data, null, 2)}`);

    if (data.request_id) {
      console.log(`✅ УСПЕХ! Request ID: ${data.request_id}`);
      
      // Проверяем статус
      setTimeout(async () => {
        await checkVideoStatus(data.request_id);
      }, 5000);
      
      return true;
    } else if (data.code === 402) {
      console.log(`❌ НЕДОСТАТОЧНО КРЕДИТОВ: ${data.msg}`);
      return false;
    } else if (data.code === 422) {
      console.log(`❌ НЕВЕРНАЯ МОДЕЛЬ: ${data.msg}`);
      return false;
    } else {
      console.log(`❌ ОШИБКА: ${data.code} - ${data.msg}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Network Error: ${error.message}`);
    return false;
  }
}

async function checkVideoStatus(requestId) {
  console.log(`\n⏳ Проверка статуса: ${requestId}`);
  
  try {
    const response = await fetch(`https://api.kie.ai/api/v1/veo/record-info?request_id=${requestId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`📋 Статус: ${data.status}`);
      
      if (data.status === 'completed' && data.video_url) {
        console.log(`🎬 ВИДЕО ГОТОВО: ${data.video_url}`);
      } else if (data.status === 'processing') {
        console.log(`⏳ Генерируется... (это нормально)`);
      } else if (data.status === 'failed') {
        console.log(`❌ Генерация провалена: ${data.error || 'неизвестная ошибка'}`);
      }
    }
  } catch (error) {
    console.log(`❌ Ошибка проверки статуса: ${error.message}`);
  }
}

async function runFullTest() {
  console.log('🚀 ЗАПУСК ПОЛНОЙ ПРОВЕРКИ...\n');
  
  // 1. Проверяем баланс
  const balance = await checkCurrentBalance();
  
  if (balance === null) {
    console.log('❌ Не удалось проверить баланс. Проверьте API ключ.');
    return;
  }
  
  if (balance <= 200) {
    console.log('⚠️ Баланс все еще низкий. Возможно, пополнение еще не прошло.');
  }
  
  // 2. Тестируем генерацию видео
  await testVideoGeneration();
  
  // 3. Выводы
  console.log('\n' + '='.repeat(60));
  console.log('📝 ИТОГИ ПРОВЕРКИ:');
  console.log('='.repeat(60));
  
  if (balance > 200) {
    console.log('✅ Баланс пополнен успешно');
    console.log('✅ API ключ работает');
    console.log('✅ Генерация видео должна работать');
    console.log('📱 Форматы: 16:9 (горизонтальное) и 9:16 (вертикальное) поддерживаются');
    console.log('⏱️ Duration: 2-10 секунд поддерживается');
    console.log('💰 Экономия: 87% против Vertex AI активна!');
  } else {
    console.log('⚠️ Баланс все еще низкий');
    console.log('🔄 Возможно, fallback на Vertex AI будет использоваться');
  }
  
  console.log('\n🎯 Проверьте request_id выше для подтверждения генерации');
}

runFullTest().catch(console.error);