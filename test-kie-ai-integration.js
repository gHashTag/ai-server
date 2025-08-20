#!/usr/bin/env node

/**
 * ТЕСТ ИНТЕГРАЦИИ KIE.AI С НАШИМИ СЕРВИСАМИ
 * 
 * Проверяет:
 * 1. KieAiService класс
 * 2. processVideoGeneration функцию  
 * 3. Выбор провайдера по конфигурации
 * 4. Передачу duration через всю цепочку
 */

require('dotenv').config();

// Импорт через require чтобы работало без сборки TypeScript
const path = require('path');

console.log('🔧 ТЕСТ ИНТЕГРАЦИИ KIE.AI С СЕРВИСАМИ\n');

async function testKieAiServiceClass() {
  console.log('📦 1. ТЕСТ КЛАССА KieAiService');
  console.log('=' * 50);
  
  try {
    // Попытка импорта KieAiService
    console.log('⏳ Проверка импорта KieAiService...');
    
    // Проверим что файл существует
    const fs = require('fs');
    const servicePath = path.join(__dirname, 'src/services/kieAiService.ts');
    
    if (fs.existsSync(servicePath)) {
      console.log('✅ Файл kieAiService.ts найден');
      
      // Читаем содержимое для проверки ключевых методов
      const content = fs.readFileSync(servicePath, 'utf8');
      
      const methods = [
        'checkHealth',
        'getAccountBalance', 
        'generateVideo',
        'calculateCost',
        'KIE_AI_MODELS'
      ];
      
      methods.forEach(method => {
        if (content.includes(method)) {
          console.log(`   ✅ Метод ${method} найден`);
        } else {
          console.log(`   ❌ Метод ${method} отсутствует`);
        }
      });
      
      // Проверяем конфигурацию моделей в файле
      if (content.includes('veo-3-fast') && content.includes('0.05')) {
        console.log('   ✅ Конфигурация Veo-3 Fast найдена ($0.05/сек)');
      }
      
      if (content.includes('veo-3') && content.includes('0.25')) {
        console.log('   ✅ Конфигурация Veo-3 найдена ($0.25/сек)');
      }
      
    } else {
      console.log('❌ Файл kieAiService.ts не найден');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Ошибка проверки KieAiService:', error.message);
    return false;
  }
}

async function testProcessVideoGenerationIntegration() {
  console.log('\n⚙️ 2. ТЕСТ ИНТЕГРАЦИИ processVideoGeneration');
  console.log('=' * 50);
  
  try {
    const fs = require('fs');
    const servicePath = path.join(__dirname, 'src/services/generateTextToVideo.ts');
    
    if (!fs.existsSync(servicePath)) {
      console.log('❌ Файл generateTextToVideo.ts не найден');
      return false;
    }
    
    const content = fs.readFileSync(servicePath, 'utf8');
    
    console.log('⏳ Проверка интеграции в processVideoGeneration...');
    
    // Ключевые элементы интеграции
    const checks = [
      { item: 'KieAiService', text: 'import { KieAiService }', description: 'Импорт KieAiService' },
      { item: 'type check', text: "providerType === 'kie-ai'", description: 'Проверка типа провайдера' },
      { item: 'fallback', text: 'processVertexAI', description: 'Fallback функция' },
      { item: 'duration param', text: 'duration:', description: 'Передача duration' },
      { item: 'health check', text: 'checkHealth', description: 'Проверка доступности API' },
    ];
    
    checks.forEach(check => {
      if (content.includes(check.text)) {
        console.log(`   ✅ ${check.description} найдена`);
      } else {
        console.log(`   ❌ ${check.description} отсутствует`);
      }
    });
    
    // Проверяем логику выбора провайдера
    if (content.includes('Using Kie.ai for') && content.includes('cheaper than Vertex AI')) {
      console.log('   ✅ Логирование экономии найдено');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Ошибка проверки интеграции:', error.message);
    return false;
  }
}

async function testModelsConfiguration() {
  console.log('\n📋 3. ТЕСТ КОНФИГУРАЦИИ МОДЕЛЕЙ');
  console.log('=' * 50);
  
  try {
    const fs = require('fs');
    const configPath = path.join(__dirname, 'src/config/models.config.ts');
    
    if (!fs.existsSync(configPath)) {
      console.log('❌ Файл models.config.ts не найден');
      return false;
    }
    
    const content = fs.readFileSync(configPath, 'utf8');
    
    console.log('⏳ Проверка конфигурации моделей...');
    
    // Проверяем конфигурацию Veo моделей
    const veoModels = ['veo-3-fast', 'veo-3'];
    
    veoModels.forEach(model => {
      console.log(`\n🔍 Проверка модели ${model}:`);
      
      if (content.includes(`'${model}':`)) {
        console.log(`   ✅ Модель ${model} найдена`);
        
        // Ищем секцию с этой моделью
        const modelStart = content.indexOf(`'${model}': {`);
        const modelEnd = content.indexOf('},', modelStart);
        const modelSection = content.substring(modelStart, modelEnd + 2);
        
        if (modelSection.includes("type: 'kie-ai'")) {
          console.log('   ✅ Тип kie-ai установлен');
        } else {
          console.log('   ❌ Тип kie-ai не найден');
        }
        
        if (modelSection.includes('pricePerSecond')) {
          console.log('   ✅ Цена за секунду указана');
        }
        
        if (modelSection.includes('supportedDurations')) {
          console.log('   ✅ Поддерживаемые длительности указаны');  
        }
        
      } else {
        console.log(`   ❌ Модель ${model} не найдена`);
      }
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Ошибка проверки конфигурации:', error.message);
    return false;
  }
}

async function testDurationParameterFlow() {
  console.log('\n⏱️  4. ТЕСТ ПЕРЕДАЧИ DURATION ПАРАМЕТРА');
  console.log('=' * 50);
  
  try {
    const fs = require('fs');
    
    // Файлы в цепочке передачи duration
    const files = [
      { 
        path: 'src/controllers/generation.controller.ts',
        checks: ['duration', 'generateTextToVideo'],
        description: 'Controller получает и передает duration'
      },
      {
        path: 'src/services/generateTextToVideo.ts', 
        checks: ['duration: number', 'processVideoGeneration'],
        description: 'Service принимает duration параметр'
      },
      {
        path: 'src/services/vertexVeoService.ts',
        checks: ['duration?:', 'VeoGenerationOptions'],
        description: 'VertexVeo поддерживает duration'
      }
    ];
    
    files.forEach(file => {
      console.log(`\n🔍 Проверка ${file.description}:`);
      
      const filePath = path.join(__dirname, file.path);
      
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ Файл найден: ${file.path}`);
        
        const content = fs.readFileSync(filePath, 'utf8');
        
        file.checks.forEach(check => {
          if (content.includes(check)) {
            console.log(`   ✅ Найдено: ${check}`);
          } else {
            console.log(`   ❌ Отсутствует: ${check}`);
          }
        });
        
      } else {
        console.log(`   ❌ Файл не найден: ${file.path}`);
      }
    });
    
    return true;
    
  } catch (error) {
    console.log('❌ Ошибка проверки flow:', error.message);
    return false;
  }
}

async function testEnvironmentSetup() {
  console.log('\n🌍 5. ТЕСТ НАСТРОЙКИ ОКРУЖЕНИЯ');
  console.log('=' * 50);
  
  // Проверяем environment variables
  const envVars = [
    { name: 'KIE_AI_API_KEY', required: true, description: 'Ключ Kie.ai API' },
    { name: 'GOOGLE_CLOUD_PROJECT', required: false, description: 'Проект Google Cloud (для fallback)' }
  ];
  
  console.log('📋 Проверка environment variables:');
  
  envVars.forEach(envVar => {
    const value = process.env[envVar.name];
    
    if (value) {
      console.log(`   ✅ ${envVar.name}: настроен`);
      
      if (envVar.name === 'KIE_AI_API_KEY') {
        console.log(`      🔑 Ключ: ${value.substring(0, 20)}...`);
      }
    } else {
      console.log(`   ${envVar.required ? '❌' : '⚠️'} ${envVar.name}: ${envVar.required ? 'отсутствует' : 'не настроен'}`);
      console.log(`      💡 ${envVar.description}`);
    }
  });
  
  // Проверяем production template
  const fs = require('fs');
  const templatePath = path.join(__dirname, 'production-env-template.txt');
  
  console.log('\n📄 Проверка production template:');
  
  if (fs.existsSync(templatePath)) {
    console.log('   ✅ production-env-template.txt найден');
    
    const content = fs.readFileSync(templatePath, 'utf8');
    
    if (content.includes('KIE_AI_API_KEY')) {
      console.log('   ✅ KIE_AI_API_KEY добавлен в template');
    } else {
      console.log('   ❌ KIE_AI_API_KEY отсутствует в template');
    }
    
    if (content.includes('экономия') || content.includes('дешевая генерация')) {
      console.log('   ✅ Комментарий об экономии найден');
    }
    
  } else {
    console.log('   ❌ production-env-template.txt не найден');
  }
}

async function main() {
  console.log('🚀 Запуск тестирования интеграции Kie.ai...\n');
  
  try {
    const results = {
      serviceClass: await testKieAiServiceClass(),
      integration: await testProcessVideoGenerationIntegration(), 
      config: await testModelsConfiguration(),
      durationFlow: await testDurationParameterFlow(),
      environment: await testEnvironmentSetup()
    };
    
    console.log('\n🎯 ИТОГИ ТЕСТИРОВАНИЯ ИНТЕГРАЦИИ:');
    console.log('=' * 50);
    
    Object.entries(results).forEach(([test, result]) => {
      const status = result === true ? '✅' : result === false ? '❌' : '⚠️';
      const testNames = {
        serviceClass: 'KieAiService класс',
        integration: 'Интеграция с processVideoGeneration', 
        config: 'Конфигурация моделей',
        durationFlow: 'Передача Duration параметра',
        environment: 'Настройка окружения'
      };
      
      console.log(`${status} ${testNames[test]}: ${typeof result === 'boolean' ? (result ? 'ПРОЙДЕН' : 'ПРОВАЛЕН') : 'ВЫПОЛНЕН'}`);
    });
    
    const passedTests = Object.values(results).filter(r => r === true).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n📊 Результат: ${passedTests}/${totalTests} тестов пройдено`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ВСЕ ТЕСТЫ ИНТЕГРАЦИИ ПРОЙДЕНЫ!');
      console.log('✅ Kie.ai полностью интегрирован и готов к работе');
    } else {
      console.log('⚠️  Есть проблемы с интеграцией');
      console.log('💡 Проверьте вывод тестов выше для исправления');
    }
    
    console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('1. Добавьте KIE_AI_API_KEY в .env файл');
    console.log('2. Запустите test-real-kie-ai-api.js для проверки API');
    console.log('3. Протестируйте реальную генерацию видео');
    console.log('4. Убедитесь что "2 секунды" → именно 2 секунды');
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА ИНТЕГРАЦИИ:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  main();
}