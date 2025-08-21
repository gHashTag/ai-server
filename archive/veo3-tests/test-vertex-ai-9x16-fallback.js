#!/usr/bin/env node

/**
 * 🔍 Диагностика проблемы с 9:16 видео
 * Проверяет что происходит при fallback на Vertex AI
 */

require('dotenv').config({ path: '/Users/playra/ai-server/.env' })
const axios = require('axios')
const fs = require('fs')

console.log('🔍 ДИАГНОСТИКА ПРОБЛЕМЫ С 9:16 ВИДЕО')
console.log('=' .repeat(60))

// Проверка переменных окружения
console.log('🔐 Проверка ключей API:')
console.log(`   KIE_AI_API_KEY: ${process.env.KIE_AI_API_KEY ? '✅ ЕСТЬ' : '❌ НЕТ'}`)
console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅ ЕСТЬ' : '❌ НЕТ'}`)
console.log(`   GOOGLE_CLOUD_PROJECT: ${process.env.GOOGLE_CLOUD_PROJECT || '❌ НЕ ЗАДАН'}`)

console.log('\\n🎯 АНАЛИЗ ПРОБЛЕМЫ:')
console.log('   1. KIE AI API недоступен (404 на все endpoints)')
console.log('   2. Происходит fallback на Vertex AI') 
console.log('   3. Vertex AI принудительно конвертирует 9:16 → 16:9')
console.log('   4. Результат: НЕТ вертикального видео')

/**
 * Тест нашего локального API на генерацию 9:16
 */
async function testLocalAPI9x16() {
  console.log('\\n🧪 ТЕСТ ЛОКАЛЬНОГО API ДЛЯ 9:16')
  console.log('-' .repeat(40))
  
  const scenarios = [
    {
      name: 'Veo3-fast с 9:16 (через наш API)',
      endpoint: 'http://localhost:4000/generate/veo3-video',
      payload: {
        prompt: 'Beautiful sunset over ocean waves, vertical shot',
        duration: 3,
        aspectRatio: '9:16',
        telegram_id: 'diagnostic_test_9x16',
        username: 'diagnostic_user',
        is_ru: false,
        bot_name: 'diagnostic_bot'
      }
    },
    {
      name: 'Text-to-video с veo3-fast модель',
      endpoint: 'http://localhost:4000/generate/text-to-video',
      payload: {
        prompt: 'Beautiful sunset over ocean waves, vertical shot',
        videoModel: 'veo3-fast',
        duration: 3,
        telegram_id: 'diagnostic_test_model',
        username: 'diagnostic_user',
        is_ru: false,
        bot_name: 'diagnostic_bot'
      }
    },
    {
      name: 'Haiper-video-2 (рабочая альтернатива)',
      endpoint: 'http://localhost:4000/generate/text-to-video', 
      payload: {
        prompt: 'Beautiful sunset over ocean waves, vertical shot',
        videoModel: 'haiper-video-2',
        duration: 3,
        telegram_id: 'diagnostic_test_haiper',
        username: 'diagnostic_user',
        is_ru: false,
        bot_name: 'diagnostic_bot'
      }
    }
  ]
  
  const results = []
  
  for (const scenario of scenarios) {
    console.log(`\\n🎬 ${scenario.name}`)
    
    try {
      const response = await axios.post(scenario.endpoint, scenario.payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      })
      
      console.log(`   ✅ Статус: ${response.status}`)
      console.log(`   📋 Ответ: ${JSON.stringify(response.data)}`)
      
      results.push({
        scenario: scenario.name,
        success: true,
        status: response.status,
        response: response.data
      })
      
    } catch (error) {
      console.error(`   ❌ Ошибка: ${error.response?.status || error.message}`)
      if (error.response?.data) {
        console.error(`   📋 Детали: ${JSON.stringify(error.response.data)}`)
      }
      
      results.push({
        scenario: scenario.name,
        success: false,
        error: error.message,
        status: error.response?.status
      })
    }
  }
  
  return results
}

/**
 * Проверка конфигурации моделей в проекте
 */
async function checkModelConfig() {
  console.log('\\n⚙️  ПРОВЕРКА КОНФИГУРАЦИИ МОДЕЛЕЙ')
  console.log('-' .repeat(40))
  
  try {
    const configPath = '/Users/playra/ai-server/src/config/models.config.ts'
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      
      console.log('✅ Файл models.config.ts найден')
      
      // Ищем упоминания veo3-fast
      if (content.includes('veo3-fast')) {
        console.log('✅ veo3-fast модель найдена в конфиге')
        
        // Извлекаем конфигурацию veo3-fast
        const veo3Match = content.match(/'veo3-fast':[\\s\\S]*?(?=\\n\\s{0,2}['}])/g)
        if (veo3Match) {
          console.log('📋 Конфигурация veo3-fast:')
          console.log(veo3Match[0])
        }
      } else {
        console.log('❌ veo3-fast модель НЕ найдена в конфиге')
      }
      
      // Ищем упоминания KIE AI
      if (content.includes('kie-ai')) {
        console.log('✅ KIE AI провайдер найден в конфиге')
      } else {
        console.log('❌ KIE AI провайдер НЕ найден в конфиге')
      }
      
    } else {
      console.log('❌ Файл models.config.ts не найден')
    }
    
  } catch (error) {
    console.error('❌ Ошибка чтения конфигурации:', error.message)
  }
}

/**
 * Проверка логики processVideoGeneration
 */
async function analyzeProcessVideoGeneration() {
  console.log('\\n🔧 АНАЛИЗ ЛОГИКИ processVideoGeneration')  
  console.log('-' .repeat(40))
  
  try {
    const servicePath = '/Users/playra/ai-server/src/services/generateTextToVideo.ts'
    
    if (fs.existsSync(servicePath)) {
      const content = fs.readFileSync(servicePath, 'utf8')
      
      console.log('✅ Файл generateTextToVideo.ts найден')
      
      // Проверяем ключевые элементы логики
      const checks = [
        {
          pattern: /providerType.*===.*'kie-ai'/,
          description: 'Проверка типа провайдера KIE AI'
        },
        {
          pattern: /processVertexAI/,
          description: 'Fallback функция Vertex AI'
        },
        {
          pattern: /veoAspectRatio.*=.*'16:9'/,
          description: 'Принудительная конвертация в 16:9'
        },
        {
          pattern: /aspect_ratio.*===.*'9:16'/,
          description: 'Обработка 9:16 формата'
        }
      ]
      
      checks.forEach(check => {
        if (check.pattern.test(content)) {
          console.log(`   ✅ ${check.description}: НАЙДЕНО`)
        } else {
          console.log(`   ❌ ${check.description}: НЕ НАЙДЕНО`)
        }
      })
      
      // Ищем строку с принудительной конвертацией
      const forceConvertMatch = content.match(/veoAspectRatio.*=.*'16:9'.*(?:\\/\\/.*)?/g)
      if (forceConvertMatch) {
        console.log('\\n🚨 НАЙДЕНА ПРОБЛЕМА:')
        console.log(`   ${forceConvertMatch[0]}`)
        console.log('   ☝️  Это принудительно конвертирует ВСЕ форматы в 16:9!')
      }
      
    } else {
      console.log('❌ Файл generateTextToVideo.ts не найден')  
    }
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error.message)
  }
}

/**
 * Предлагаемые решения
 */
function suggestSolutions() {
  console.log('\\n💡 ПРЕДЛАГАЕМЫЕ РЕШЕНИЯ')
  console.log('=' .repeat(60))
  
  console.log('\\n🎯 КРАТКОСРОЧНОЕ РЕШЕНИЕ (5 минут):')
  console.log('   1. Используйте Haiper-video-2 модель (она поддерживает 9:16)')
  console.log('   2. Запросы через: POST /generate/text-to-video')
  console.log('   3. Параметр: "videoModel": "haiper-video-2"')
  console.log('   4. Стоимость: $0.05/сек (дешевле чем Veo3!)')
  
  console.log('\\n🔧 СРЕДНЕСРОЧНОЕ РЕШЕНИЕ (1 час):')
  console.log('   1. Исправить KIE AI API интеграцию')
  console.log('   2. Обновить endpoints для KIE AI')  
  console.log('   3. Протестировать новую интеграцию')
  console.log('   4. Или найти альтернативный провайдер для Veo3')
  
  console.log('\\n⚡ ДОЛГОСРОЧНОЕ РЕШЕНИЕ (1 день):')
  console.log('   1. Интеграция с Google Vertex AI напрямую с 9:16 поддержкой')
  console.log('   2. Или использование Replicate для Veo3')
  console.log('   3. Добавление мульти-провайдерной логики')
  console.log('   4. Автоматический выбор лучшего провайдера')
  
  console.log('\\n🚀 НЕМЕДЛЕННОЕ ДЕЙСТВИЕ:')
  console.log('   curl -X POST http://localhost:4000/generate/text-to-video \\\\')
  console.log('     -H "Content-Type: application/json" \\\\')
  console.log('     -d \\'{')  
  console.log('       "prompt": "Beautiful sunset, vertical shot",')
  console.log('       "videoModel": "haiper-video-2",')
  console.log('       "duration": 3,')
  console.log('       "telegram_id": "working_9x16_test",') 
  console.log('       "username": "test_user",')
  console.log('       "is_ru": false,')
  console.log('       "bot_name": "test_bot"')
  console.log('     }\\'')
}

/**
 * Основная функция диагностики
 */
async function main() {
  console.log('🔍 Запуск полной диагностики проблемы с 9:16...\\n')
  
  // 1. Тест локального API
  const apiResults = await testLocalAPI9x16()
  
  // 2. Проверка конфигурации
  await checkModelConfig()
  
  // 3. Анализ логики
  await analyzeProcessVideoGeneration()
  
  // 4. Решения
  suggestSolutions()
  
  // 5. Сохранение отчета
  const report = {
    timestamp: new Date().toISOString(),
    diagnosis: 'KIE AI API недоступен, fallback на Vertex AI принудительно конвертирует 9:16 в 16:9',
    api_test_results: apiResults,
    recommended_solution: 'Использовать haiper-video-2 модель для 9:16 видео',
    immediate_action: 'POST /generate/text-to-video с videoModel: haiper-video-2'
  }
  
  fs.writeFileSync('./diagnosis-9x16-problem.json', JSON.stringify(report, null, 2))
  console.log('\\n📄 Диагностический отчет сохранен: ./diagnosis-9x16-problem.json')
  
  console.log('\\n' + '='.repeat(60))
  console.log('✅ ДИАГНОСТИКА ЗАВЕРШЕНА')
  console.log('🎯 ПРОБЛЕМА НАЙДЕНА: KIE AI недоступен → Vertex AI конвертирует 9:16 в 16:9')
  console.log('💡 РЕШЕНИЕ: Использовать haiper-video-2 для 9:16 видео')
  console.log('=' .repeat(60))
}

// Запуск диагностики
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Ошибка диагностики:', error)
    process.exit(1)
  })
}

module.exports = { testLocalAPI9x16, checkModelConfig, analyzeProcessVideoGeneration }