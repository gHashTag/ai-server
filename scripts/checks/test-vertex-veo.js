#!/usr/bin/env node

/**
 * Тест генерации видео через Vertex AI Veo API
 * Основано на официальной документации Google
 */

const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const dotenv = require('dotenv');
const path = require('path');

const execAsync = promisify(exec);

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Конфигурация
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'neuroblogger';
const LOCATION = 'us-central1';
const MODEL_ID = 'veo-3.0-generate-preview'; // или veo-2.0-generate-001

console.log('🎬 Тестирование Vertex AI Veo API\n');
console.log(`Project: ${PROJECT_ID}`);
console.log(`Model: ${MODEL_ID}`);
console.log(`Location: ${LOCATION}\n`);

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Получить токен доступа через gcloud
 */
async function getAccessToken() {
  try {
    const { stdout } = await execAsync('gcloud auth print-access-token');
    return stdout.trim();
  } catch (error) {
    console.error(`${colors.red}❌ Не удалось получить токен доступа${colors.reset}`);
    console.error('Убедитесь, что вы авторизованы: gcloud auth login');
    throw error;
  }
}

/**
 * Начать генерацию видео
 */
async function startVideoGeneration(prompt, aspectRatio = '16:9') {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;

  const requestBody = {
    instances: [
      {
        prompt: prompt
      }
    ],
    parameters: {
      aspectRatio: aspectRatio,
      sampleCount: 1
    }
  };

  // Если используем Veo 3, можем добавить resolution
  if (MODEL_ID.includes('veo-3')) {
    requestBody.parameters.resolution = '720p';
  }

  try {
    const accessToken = await getAccessToken();
    
    console.log(`${colors.cyan}📤 Отправляем запрос на генерацию видео...${colors.reset}`);
    console.log(`Промпт: "${prompt}"`);
    console.log(`Aspect ratio: ${aspectRatio}`);
    
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const operationName = response.data.name;
    console.log(`${colors.green}✅ Операция запущена!${colors.reset}`);
    console.log(`Operation ID: ${operationName}\n`);
    
    return operationName;
  } catch (error) {
    console.error(`${colors.red}❌ Ошибка при запуске генерации:${colors.reset}`);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      // Проверяем специфичные ошибки
      if (error.response.status === 403) {
        console.log(`\n${colors.yellow}⚠️ Возможные причины ошибки 403:${colors.reset}`);
        console.log('1. Vertex AI API не включен в проекте');
        console.log('2. У вас нет прав доступа к API');
        console.log('3. Квоты исчерпаны');
        console.log('\nПопробуйте выполнить:');
        console.log(`${colors.cyan}gcloud services enable aiplatform.googleapis.com${colors.reset}`);
      } else if (error.response.status === 404) {
        console.log(`\n${colors.yellow}⚠️ Модель ${MODEL_ID} не найдена${colors.reset}`);
        console.log('Проверьте доступные модели в вашем регионе');
      }
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

/**
 * Проверить статус операции
 */
async function checkOperationStatus(operationName) {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`;

  const requestBody = {
    operationName: operationName
  };

  try {
    const accessToken = await getAccessToken();
    
    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error(`${colors.red}❌ Ошибка при проверке статуса:${colors.reset}`);
    if (error.response) {
      console.error('Data:', error.response.data);
    }
    throw error;
  }
}

/**
 * Ждать завершения операции
 */
async function waitForCompletion(operationName, maxWaitTime = 300000) {
  const startTime = Date.now();
  const checkInterval = 5000; // проверяем каждые 5 секунд
  let attempts = 0;

  console.log(`${colors.cyan}⏳ Ожидаем завершения генерации...${colors.reset}\n`);

  while (Date.now() - startTime < maxWaitTime) {
    attempts++;
    
    try {
      const status = await checkOperationStatus(operationName);
      
      if (status.done) {
        if (status.response) {
          console.log(`\n${colors.green}✅ Видео успешно сгенерировано!${colors.reset}`);
          return status.response;
        } else if (status.error) {
          console.log(`\n${colors.red}❌ Ошибка генерации:${colors.reset}`);
          console.error(status.error);
          throw new Error(`Video generation failed: ${status.error.message}`);
        }
      }
      
      process.stdout.write(`\r⏳ Попытка ${attempts}: всё ещё обрабатывается...`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      console.error(`\n${colors.red}Ошибка при проверке статуса:${colors.reset}`, error.message);
      // Продолжаем ждать, возможно это временная ошибка
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  throw new Error('Timeout: видео не было сгенерировано за отведённое время');
}

/**
 * Основная функция тестирования
 */
async function testVeoGeneration() {
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   Vertex AI Veo - Тест генерации видео   ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);

  // Проверяем, установлен ли gcloud
  try {
    const { stdout } = await execAsync('gcloud --version');
    console.log(`${colors.green}✅ gcloud установлен${colors.reset}`);
    console.log(stdout.split('\n')[0] + '\n');
  } catch (error) {
    console.error(`${colors.red}❌ gcloud не установлен!${colors.reset}`);
    console.log('Установите Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
    return;
  }

  // Проверяем авторизацию
  try {
    const { stdout } = await execAsync('gcloud auth list --filter=status:ACTIVE --format="value(account)"');
    if (stdout.trim()) {
      console.log(`${colors.green}✅ Авторизован как: ${stdout.trim()}${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}⚠️ Не авторизован в gcloud${colors.reset}`);
      console.log('Выполните: gcloud auth login\n');
      return;
    }
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error.message);
  }

  // Промпты для тестирования
  const testPrompts = [
    "A serene beach at sunset with gentle waves",
    "A futuristic city with flying cars and neon lights",
    "A cat playing piano in a jazz club"
  ];

  console.log(`${colors.cyan}🎯 Тестовый промпт: "${testPrompts[0]}"${colors.reset}\n`);

  try {
    // 1. Запускаем генерацию
    const operationName = await startVideoGeneration(testPrompts[0]);
    
    // 2. Ждём результат
    const result = await waitForCompletion(operationName);
    
    // 3. Показываем результат
    console.log(`\n${colors.cyan}📹 Результат:${colors.reset}`);
    console.log('Количество видео:', result.videos?.length || 0);
    console.log('Отфильтровано (RAI):', result.raiMediaFilteredCount || 0);
    
    if (result.videos && result.videos.length > 0) {
      console.log('\nСгенерированные видео:');
      result.videos.forEach((video, index) => {
        console.log(`\n${colors.green}Видео ${index + 1}:${colors.reset}`);
        if (video.gcsUri) {
          console.log(`  GCS URI: ${video.gcsUri}`);
          console.log(`  Команда для скачивания:`);
          console.log(`  ${colors.cyan}gsutil cp "${video.gcsUri}" ./video_${index}.mp4${colors.reset}`);
        }
        if (video.bytesBase64Encoded) {
          console.log(`  Base64 закодировано (${video.bytesBase64Encoded.length} символов)`);
        }
        console.log(`  MIME тип: ${video.mimeType}`);
      });
    }
    
  } catch (error) {
    console.error(`\n${colors.red}Тест не пройден:${colors.reset}`, error.message);
  }
}

/**
 * Дополнительная информация
 */
function showInfo() {
  console.log(`\n${colors.cyan}📚 Полезная информация:${colors.reset}\n`);
  
  console.log(`${colors.yellow}Настройка проекта:${colors.reset}`);
  console.log('1. Включите Vertex AI API:');
  console.log(`   ${colors.cyan}gcloud services enable aiplatform.googleapis.com${colors.reset}`);
  console.log('\n2. Установите проект по умолчанию:');
  console.log(`   ${colors.cyan}gcloud config set project ${PROJECT_ID}${colors.reset}`);
  console.log('\n3. Создайте Cloud Storage bucket для видео:');
  console.log(`   ${colors.cyan}gsutil mb gs://veo-videos-${PROJECT_ID}${colors.reset}`);
  
  console.log(`\n${colors.yellow}Доступные модели:${colors.reset}`);
  console.log('• veo-3.0-generate-preview - Последняя версия Veo 3 (preview)');
  console.log('• veo-2.0-generate-001 - Стабильная версия Veo 2');
  
  console.log(`\n${colors.yellow}Цены:${colors.reset}`);
  console.log('• Veo 3: $0.40 за секунду видео');
  console.log('• Veo 2: $0.30 за секунду видео');
  
  console.log(`\n${colors.yellow}Ограничения:${colors.reset}`);
  console.log('• Максимум 8 секунд видео за раз');
  console.log('• До 4 видео за один запрос (sampleCount)');
  console.log('• Поддерживаемые форматы: 16:9, 9:16, 1:1');
}

// Запуск тестов
async function main() {
  await testVeoGeneration();
  showInfo();
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Тестирование завершено!${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
}

main().catch(console.error);
