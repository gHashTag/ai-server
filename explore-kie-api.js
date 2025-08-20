#!/usr/bin/env node

/**
 * ИССЛЕДОВАНИЕ РЕАЛЬНОГО KIE.AI API
 * 
 * Выясняем:
 * 1. Какие endpoints доступны
 * 2. Правильная структура запросов
 * 3. Поддержка video generation
 */

const axios = require('axios');

console.log('🔍 ИССЛЕДОВАНИЕ РЕАЛЬНОГО KIE.AI API\n');

class KieApiExplorer {
  constructor() {
    this.apiKey = 'f52f224a92970aa6b7c7780104a00f71';
    this.baseUrl = 'https://api.kie.ai';
    this.endpoints = [];
  }

  async exploreEndpoints() {
    console.log('📋 ИССЛЕДОВАНИЕ ДОСТУПНЫХ ENDPOINTS');
    console.log('=' * 50);
    
    // Известные endpoints для тестирования
    const potentialEndpoints = [
      '/api/v1/chat/credit',
      '/api/v1/video/generate',
      '/api/v1/generate/video',
      '/api/v1/models',
      '/api/v1/video',
      '/v1/video/generate',
      '/v1/generate',
      '/api/video/generate',
      '/video/generate',
      '/generate/video',
      '/api/v1/chat/completions',
      '/api/v1/generations',
      '/api/v1/tasks'
    ];

    const workingEndpoints = [];
    const notFoundEndpoints = [];

    for (const endpoint of potentialEndpoints) {
      console.log(`⏳ Тестирую: ${endpoint}`);
      
      try {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log(`✅ РАБОТАЕТ: ${endpoint} (статус: ${response.status})`);
        workingEndpoints.push({
          endpoint,
          status: response.status,
          data: response.data
        });
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ НЕ НАЙДЕН: ${endpoint}`);
          notFoundEndpoints.push(endpoint);
        } else if (error.response?.status === 401) {
          console.log(`🔐 ТРЕБУЕТ АВТОРИЗАЦИЮ: ${endpoint}`);
          workingEndpoints.push({
            endpoint,
            status: 401,
            requiresAuth: true
          });
        } else if (error.response?.status === 405) {
          console.log(`⚠️ МЕТОД НЕ РАЗРЕШЕН: ${endpoint} (возможно нужен POST)`);
          workingEndpoints.push({
            endpoint,
            status: 405,
            needsPost: true
          });
        } else {
          console.log(`⚠️ ОШИБКА: ${endpoint} - ${error.response?.status} ${error.message}`);
        }
      }
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n📊 РЕЗУЛЬТАТЫ ИССЛЕДОВАНИЯ:');
    console.log(`✅ Рабочие endpoints: ${workingEndpoints.length}`);
    console.log(`❌ Не найдены: ${notFoundEndpoints.length}`);
    
    return workingEndpoints;
  }

  async testVideoEndpoints() {
    console.log('\n🎬 ТЕСТИРОВАНИЕ VIDEO ENDPOINTS С POST');
    console.log('=' * 50);
    
    const videoEndpoints = [
      '/api/v1/video/generate',
      '/api/v1/generate/video', 
      '/v1/video/generate',
      '/api/video/generate',
      '/video/generate'
    ];

    const testPayload = {
      model: 'veo-3-fast',
      prompt: 'A simple test video of a cat',
      duration: 2
    };

    for (const endpoint of videoEndpoints) {
      console.log(`\n⏳ POST тест: ${endpoint}`);
      console.log(`📤 Payload: ${JSON.stringify(testPayload, null, 2)}`);
      
      try {
        const response = await axios.post(`${this.baseUrl}${endpoint}`, testPayload, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        
        console.log(`✅ УСПЕХ: ${endpoint}`);
        console.log(`📊 Статус: ${response.status}`);
        console.log(`📋 Ответ: ${JSON.stringify(response.data, null, 2)}`);
        
        return { endpoint, success: true, data: response.data };
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ НЕ НАЙДЕН: ${endpoint}`);
        } else if (error.response?.status === 400) {
          console.log(`⚠️ НЕВЕРНЫЙ ЗАПРОС: ${endpoint}`);
          console.log(`💡 Ошибка: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.response?.status === 401) {
          console.log(`🔐 НЕ АВТОРИЗОВАН: ${endpoint}`);
        } else {
          console.log(`❌ ОШИБКА: ${endpoint} - ${error.response?.status}`);
          if (error.response?.data) {
            console.log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return null;
  }

  async checkDocumentation() {
    console.log('\n📚 ПРОВЕРКА ДОКУМЕНТАЦИИ');
    console.log('=' * 50);
    
    // Попробуем найти информацию о доступных моделях и endpoints
    const infoEndpoints = [
      '/api/v1/models',
      '/api/v1/info',
      '/api/v1/health',
      '/api/v1/status',
      '/health',
      '/status',
      '/info'
    ];

    for (const endpoint of infoEndpoints) {
      try {
        console.log(`⏳ Проверяю: ${endpoint}`);
        
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        console.log(`✅ НАЙДЕНО: ${endpoint}`);
        console.log(`📊 Данные: ${JSON.stringify(response.data, null, 2)}`);
        
      } catch (error) {
        if (error.response?.status !== 404) {
          console.log(`⚠️ ${endpoint}: ${error.response?.status} - ${error.message}`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async analyzeKnownEndpoint() {
    console.log('\n🔍 АНАЛИЗ РАБОТАЮЩЕГО ENDPOINT');
    console.log('=' * 50);
    
    // Анализируем работающий endpoint /api/v1/chat/credit
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/chat/credit`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Работающий endpoint: /api/v1/chat/credit');
      console.log('📊 Структура ответа:', JSON.stringify(response.data, null, 2));
      console.log('📋 Заголовки:', JSON.stringify(response.headers, null, 2));
      
      console.log('\n💡 ВЫВОДЫ:');
      console.log('• API работает с Bearer токенами');
      console.log('• Базовый URL корректный: https://api.kie.ai');
      console.log('• API возвращает JSON ответы');
      console.log('• Структура: { code, msg, data }');
      
    } catch (error) {
      console.log('❌ Неожиданная ошибка с известным endpoint');
    }
  }
}

async function main() {
  const explorer = new KieApiExplorer();
  
  try {
    // 1. Анализируем известный рабочий endpoint
    await explorer.analyzeKnownEndpoint();
    
    // 2. Исследуем доступные endpoints
    const workingEndpoints = await explorer.exploreEndpoints();
    
    // 3. Тестируем video endpoints с POST
    const videoResult = await explorer.testVideoEndpoints();
    
    // 4. Проверяем документацию
    await explorer.checkDocumentation();
    
    console.log('\n🎯 ИТОГИ ИССЛЕДОВАНИЯ:');
    console.log('=' * 50);
    
    if (videoResult && videoResult.success) {
      console.log(`✅ Найден рабочий video endpoint: ${videoResult.endpoint}`);
      console.log('🎉 Можно генерировать видео!');
    } else {
      console.log('❌ Рабочие video endpoints не найдены');
      console.log('💡 Возможные причины:');
      console.log('   • API изменился или endpoint другой');
      console.log('   • Нужны другие параметры запроса');
      console.log('   • Требуется другая авторизация');
      console.log('   • Video generation недоступно в вашем плане');
    }
    
    console.log('\n📋 РЕКОМЕНДАЦИИ:');
    console.log('1. Проверьте официальную документацию Kie.ai');
    console.log('2. Свяжитесь с поддержкой для получения правильных endpoints');
    console.log('3. Возможно нужен другой API провайдер');
    
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  }
}

if (require.main === module) {
  main();
}