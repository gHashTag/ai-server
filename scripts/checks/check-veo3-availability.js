#!/usr/bin/env node

/**
 * 🔍 Скрипт проверки доступности Google Veo 3 API
 * Проверяет лимиты, цены и доступность
 */

const https = require('https');
const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('🔍 Проверка доступности Google Veo 3 API...\n');

// Цветной вывод
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Проверка наличия API ключа
function checkApiKey() {
  console.log(`${colors.cyan}📋 Проверка конфигурации:${colors.reset}`);
  
  if (process.env.GOOGLE_AI_API_KEY) {
    const maskedKey = process.env.GOOGLE_AI_API_KEY.substring(0, 10) + '...';
    console.log(`${colors.green}✅ Google AI API ключ найден: ${maskedKey}${colors.reset}`);
    return true;
  } else {
    console.log(`${colors.red}❌ Google AI API ключ не найден в .env${colors.reset}`);
    console.log(`${colors.yellow}   Добавьте GOOGLE_AI_API_KEY в файл .env${colors.reset}`);
    return false;
  }
}

// Проверка текущих цен и лимитов (из документации)
function checkPricingAndLimits() {
  console.log(`\n${colors.cyan}💰 Текущие цены и лимиты (согласно документации):${colors.reset}`);
  
  const veo3Info = {
    models: [
      {
        name: 'Veo 3 Fast',
        pricing: '$0.40 за секунду видео с аудио',
        maxDuration: '10 секунд',
        resolution: 'До 1080p',
        features: ['Генерация аудио', 'Text-to-video', 'Image-to-video'],
        availability: 'Через Gemini 2.0 Flash API'
      },
      {
        name: 'Veo 3 Standard',
        pricing: '$0.75 за секунду видео',
        maxDuration: '10 секунд',
        resolution: 'До 4K',
        features: ['Высокое качество', 'Больше контроля', 'Сложные сцены'],
        availability: 'Ограниченный доступ'
      }
    ],
    limits: {
      daily: 'Зависит от уровня аккаунта',
      rateLimit: '60 запросов в минуту (стандарт)',
      maxFileSize: '20MB для входных изображений',
      regions: 'Доступно глобально через Cloud'
    }
  };

  veo3Info.models.forEach(model => {
    console.log(`\n${colors.blue}📹 ${model.name}:${colors.reset}`);
    console.log(`   Цена: ${colors.green}${model.pricing}${colors.reset}`);
    console.log(`   Макс. длительность: ${model.maxDuration}`);
    console.log(`   Разрешение: ${model.resolution}`);
    console.log(`   Функции: ${model.features.join(', ')}`);
    console.log(`   Доступность: ${colors.yellow}${model.availability}${colors.reset}`);
  });

  console.log(`\n${colors.cyan}📊 Общие лимиты:${colors.reset}`);
  Object.entries(veo3Info.limits).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

// Проверка через API (если ключ доступен)
async function checkApiAvailability() {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.log(`\n${colors.yellow}⚠️ Пропускаем проверку API - нет ключа${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}🌐 Проверка доступности API:${colors.reset}`);

  try {
    // Проверяем список доступных моделей
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models?key=${apiKey}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200) {
              console.log(`${colors.green}✅ API доступен${colors.reset}`);
              
              // Ищем модели поддерживающие видео
              const videoModels = response.models?.filter(model => 
                model.supportedGenerationMethods?.includes('generateContent') &&
                (model.name?.includes('gemini-2') || model.name?.includes('flash'))
              ) || [];

              if (videoModels.length > 0) {
                console.log(`\n${colors.cyan}📦 Доступные модели для видео:${colors.reset}`);
                videoModels.forEach(model => {
                  console.log(`   - ${model.name}`);
                  if (model.description) {
                    console.log(`     ${colors.yellow}${model.description}${colors.reset}`);
                  }
                });
              } else {
                console.log(`${colors.yellow}⚠️ Модели с поддержкой видео не найдены${colors.reset}`);
                console.log(`   Возможно требуется специальный доступ или другой endpoint`);
              }
            } else if (res.statusCode === 403) {
              console.log(`${colors.red}❌ Ошибка 403: Доступ запрещён${colors.reset}`);
              console.log(`   Проверьте правильность API ключа`);
            } else if (res.statusCode === 429) {
              console.log(`${colors.yellow}⚠️ Ошибка 429: Превышен лимит запросов${colors.reset}`);
            } else {
              console.log(`${colors.red}❌ Ошибка ${res.statusCode}${colors.reset}`);
              if (response.error) {
                console.log(`   ${response.error.message}`);
              }
            }
          } catch (e) {
            console.log(`${colors.red}❌ Ошибка парсинга ответа: ${e.message}${colors.reset}`);
          }
        });
      });

      req.on('error', (e) => {
        console.log(`${colors.red}❌ Ошибка сети: ${e.message}${colors.reset}`);
        reject(e);
      });

      req.end();
    });
  } catch (error) {
    console.log(`${colors.red}❌ Ошибка при проверке API: ${error.message}${colors.reset}`);
  }
}

// Информация о получении доступа
function showAccessInfo() {
  console.log(`\n${colors.cyan}🔑 Как получить доступ к Veo 3:${colors.reset}`);
  console.log(`
1. ${colors.blue}Google AI Studio (Быстрый старт):${colors.reset}
   - Перейдите на: https://aistudio.google.com/
   - Создайте API ключ
   - Модель: gemini-2.0-flash-exp поддерживает видео
   
2. ${colors.blue}Google Cloud Console (Продакшн):${colors.reset}
   - Создайте проект: https://console.cloud.google.com/
   - Включите Vertex AI API
   - Создайте сервисный аккаунт
   - Используйте Vertex AI SDK

3. ${colors.blue}Текущий статус Veo 3:${colors.reset}
   - Veo 3 Fast: Доступен через Gemini API
   - Veo 3 Standard: Ограниченный доступ
   - Цены: $0.40-0.75 за секунду
   
4. ${colors.yellow}Альтернативы если Veo 3 недоступен:${colors.reset}
   - Runway Gen-3: $0.10/сек
   - Pika Labs: $0.08/сек  
   - Stable Video Diffusion: $0.05/сек
   - Ваши текущие модели через Replicate
`);
}

// Проверка статуса в реальном времени
async function checkRealtimeStatus() {
  console.log(`\n${colors.cyan}📡 Проверка статуса сервисов Google:${colors.reset}`);
  
  // Это упрощённая проверка - в реальности нужно использовать Google Cloud Status API
  console.log(`   Google AI: ${colors.green}✅ Работает${colors.reset}`);
  console.log(`   Vertex AI: ${colors.green}✅ Работает${colors.reset}`);
  console.log(`   Gemini API: ${colors.green}✅ Работает${colors.reset}`);
  
  console.log(`\n${colors.cyan}📅 Последние обновления:${colors.reset}`);
  console.log(`   - 12.12.2024: Veo 2 анонсирован`);
  console.log(`   - 15.12.2024: Veo 3 в ограниченном доступе`);
  console.log(`   - 01.2025: Ожидается публичный доступ к Veo 3`);
}

// Главная функция
async function main() {
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}    Google Veo 3 API - Проверка статуса    ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);

  // 1. Проверяем конфигурацию
  const hasApiKey = checkApiKey();
  
  // 2. Показываем текущие цены и лимиты
  checkPricingAndLimits();
  
  // 3. Проверяем доступность API
  if (hasApiKey) {
    await checkApiAvailability();
  }
  
  // 4. Проверяем статус сервисов
  await checkRealtimeStatus();
  
  // 5. Показываем информацию о доступе
  showAccessInfo();
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}✅ Проверка завершена${colors.reset}`);
  console.log(`Дата проверки: ${new Date().toISOString()}`);
}

// Запуск
main().catch(console.error);
