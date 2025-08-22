const axios = require('axios');

const KIE_API_KEY = 'f52f224a92970aa6b7c7780104a00f71';
const BASE_URL = 'https://api.kie.ai/api/v1';

async function debugKieApi() {
  console.log('🔍 ДЕТАЛЬНАЯ ДИАГНОСТИКА KIE.AI API\n');
  console.log('=' * 50);
  
  // 1. Проверяем баланс
  console.log('\n1️⃣ ПРОВЕРКА БАЛАНСА');
  try {
    const creditResponse = await axios.get(`${BASE_URL}/chat/credit`, {
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Баланс получен:');
    console.log(JSON.stringify(creditResponse.data, null, 2));
  } catch (error) {
    console.error('❌ Ошибка получения баланса:', error.message);
  }
  
  // 2. Создаем задачу генерации
  console.log('\n2️⃣ СОЗДАНИЕ ЗАДАЧИ ГЕНЕРАЦИИ');
  
  const requestBody = {
    model: 'veo3_fast',
    prompt: 'Beautiful ocean waves at sunset, vertical video',
    duration: 4,
    aspectRatio: '9:16'
  };
  
  console.log('📋 Запрос:');
  console.log(JSON.stringify(requestBody, null, 2));
  
  let taskId = null;
  
  try {
    const response = await axios.post(`${BASE_URL}/veo/generate`, requestBody, {
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ Ответ API:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.taskId) {
      taskId = response.data.data.taskId;
      console.log(`\n📌 Task ID: ${taskId}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания задачи:', error.message);
    if (error.response) {
      console.error('Ответ сервера:', error.response.data);
    }
    return;
  }
  
  if (!taskId) {
    console.log('❌ Не получен taskId');
    return;
  }
  
  // 3. Проверяем статус задачи
  console.log('\n3️⃣ ПРОВЕРКА СТАТУСА ЗАДАЧИ');
  console.log('⏳ Ждем 10 секунд перед проверкой...');
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Пробуем разные варианты URL для статуса
  const statusUrls = [
    `${BASE_URL}/task/status/${taskId}`,
    `${BASE_URL}/veo/status/${taskId}`,
    `${BASE_URL}/tasks/${taskId}`,
    `${BASE_URL}/video/status/${taskId}`
  ];
  
  for (const url of statusUrls) {
    console.log(`\n🔍 Пробуем URL: ${url}`);
    
    try {
      const statusResponse = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Ответ получен:');
      console.log(JSON.stringify(statusResponse.data, null, 2));
      
      // Анализируем структуру ответа
      if (statusResponse.data.data) {
        const data = statusResponse.data.data;
        console.log('\n📊 Анализ данных:');
        console.log(`  - status: ${data.status || 'не найден'}`);
        console.log(`  - videoUrl: ${data.videoUrl || 'не найден'}`);
        console.log(`  - progress: ${data.progress || 'не найден'}`);
        console.log(`  - error: ${data.error || 'нет ошибок'}`);
      }
      
      break; // Если получили ответ, прекращаем проверку
      
    } catch (error) {
      console.log(`❌ Ошибка для ${url}: ${error.message}`);
      if (error.response && error.response.status !== 404) {
        console.log('Детали:', error.response.data);
      }
    }
  }
  
  // 4. Ждем еще и проверяем снова
  console.log('\n4️⃣ ПОВТОРНАЯ ПРОВЕРКА ЧЕРЕЗ 20 СЕКУНД');
  console.log('⏳ Ждем еще 20 секунд...');
  
  await new Promise(resolve => setTimeout(resolve, 20000));
  
  // Пробуем получить статус еще раз
  for (const url of statusUrls) {
    try {
      const statusResponse = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${KIE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`\n✅ Статус от ${url}:`);
      console.log(JSON.stringify(statusResponse.data, null, 2));
      
      // Проверяем, готово ли видео
      if (statusResponse.data.data) {
        const data = statusResponse.data.data;
        
        if (data.status === 'completed' && data.videoUrl) {
          console.log('\n🎉 ВИДЕО ГОТОВО!');
          console.log(`📹 URL: ${data.videoUrl}`);
          console.log(`⏱️ Время генерации: ~30 секунд`);
          return;
        } else if (data.status === 'failed') {
          console.log('\n❌ ГЕНЕРАЦИЯ ПРОВАЛИЛАСЬ');
          console.log(`Причина: ${data.error || 'неизвестно'}`);
          return;
        } else {
          console.log(`\n⏳ Статус: ${data.status || 'processing'}`);
          console.log('Видео все еще генерируется...');
        }
      }
      
      break;
    } catch (error) {
      // Молча пропускаем 404 ошибки
      if (error.response && error.response.status !== 404) {
        console.log(`Ошибка: ${error.message}`);
      }
    }
  }
  
  // 5. Проверяем альтернативные методы
  console.log('\n5️⃣ ПРОВЕРКА АЛЬТЕРНАТИВНЫХ API МЕТОДОВ');
  
  // Пробуем получить список задач
  try {
    const tasksResponse = await axios.get(`${BASE_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📋 Список задач:');
    console.log(JSON.stringify(tasksResponse.data, null, 2));
  } catch (error) {
    console.log('❌ Не удалось получить список задач');
  }
  
  console.log('\n' + '=' * 50);
  console.log('📊 ИТОГИ ДИАГНОСТИКИ:');
  console.log('1. API ключ работает ✅');
  console.log('2. Задачи создаются ✅');
  console.log(`3. Task ID генерируется: ${taskId}`);
  console.log('4. Нужно выяснить правильный endpoint для статуса');
  console.log('5. Возможно, нужно ждать дольше для генерации');
}

// Запускаем тест
debugKieApi().catch(console.error);
