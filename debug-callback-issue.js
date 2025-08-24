#!/usr/bin/env node

/**
 * 🐛 Диагностика проблемы с callback для пользователя 144022504
 * Проверяем все возможные причины, почему видео не приходит
 */

const axios = require('axios')

const DEBUG_STEPS = {
  1: 'Проверка переменных окружения для callback URL',
  2: 'Проверка доступности callback endpoint',
  3: 'Проверка статуса активных задач в базе данных',
  4: 'Тест полного цикла: создание задачи → callback',
  5: 'Проверка работы getBotByName для отправки сообщений'
}

const USER_ID = '144022504'
const BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function debugStep1() {
  console.log('\n🔍 Шаг 1: Переменные окружения')
  console.log('API_URL:', process.env.API_URL)
  console.log('CALLBACK_BASE_URL:', process.env.CALLBACK_BASE_URL)
  console.log('API_BASE_URL:', process.env.API_BASE_URL)
  
  const expectedCallback = `${BASE_URL}/api/kie-ai/callback`
  console.log('Ожидаемый callback URL:', expectedCallback)
  
  return {
    hasCallbackUrl: !!(process.env.CALLBACK_BASE_URL || process.env.API_BASE_URL),
    expectedCallback
  }
}

async function debugStep2(callbackUrl) {
  console.log('\n🔍 Шаг 2: Доступность callback endpoint')
  
  try {
    // Проверяем health check
    const response = await axios.get(`${callbackUrl}/health`, {
      timeout: 5000
    })
    console.log('✅ Health check прошел:', response.data)
    return { accessible: true, health: response.data }
  } catch (error) {
    console.log('❌ Callback endpoint недоступен:', error.message)
    return { accessible: false, error: error.message }
  }
}

async function debugStep3() {
  console.log('\n🔍 Шаг 3: Проверка активных задач')
  
  try {
    // Тестовый запрос к нашему API для проверки задач
    const testResponse = await axios.post(`${BASE_URL}/api/video/generate/veo3-video`, {
      prompt: "ТЕСТ - НЕ ГЕНЕРИРОВАТЬ",
      telegramId: USER_ID,
      botName: 'neuro_blogger_bot',
      model: 'veo3_fast',
      aspectRatio: '16:9',
      test: true // Флаг для тестирования
    }, {
      timeout: 10000,
      validateStatus: () => true // Принимать любые коды
    })
    
    console.log('📊 Ответ сервера:', {
      status: testResponse.status,
      data: testResponse.data
    })
    
    return { success: testResponse.status < 400, response: testResponse.data }
  } catch (error) {
    console.log('❌ Ошибка проверки задач:', error.message)
    return { success: false, error: error.message }
  }
}

async function debugStep4(callbackUrl) {
  console.log('\n🔍 Шаг 4: Тест callback endpoint')
  
  const testCallbackData = {
    taskId: 'test_task_' + Date.now(),
    status: 'completed',
    videoUrl: 'https://example.com/test-video.mp4',
    duration: 8,
    cost: 0.40,
    metadata: {
      model: 'veo3_fast',
      aspectRatio: '16:9',
      prompt: 'Тестовое видео для пользователя 144022504'
    }
  }
  
  try {
    const response = await axios.post(callbackUrl, testCallbackData, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
    
    console.log('✅ Callback тест успешен:', response.data)
    return { success: true, response: response.data }
  } catch (error) {
    console.log('❌ Callback тест провалился:', error.message)
    return { success: false, error: error.message }
  }
}

async function debugStep5() {
  console.log('\n🔍 Шаг 5: Проверка getBotByName')
  
  // Этот шаг требует доступа к внутренней функции сервера
  console.log('🔸 Проверяем, какой bot_name используется для пользователя', USER_ID)
  console.log('🔸 По умолчанию должен быть: neuro_blogger_bot')
  console.log('🔸 Если getBotByName возвращает undefined - видео не отправится')
  
  return {
    expectedBotName: 'neuro_blogger_bot',
    userId: USER_ID
  }
}

async function main() {
  console.log('🚀 Диагностика проблемы доставки видео пользователю', USER_ID)
  console.log('📋 Всего шагов:', Object.keys(DEBUG_STEPS).length)
  
  const results = {}
  
  // Шаг 1: Переменные окружения
  results.step1 = await debugStep1()
  
  // Шаг 2: Доступность callback
  if (results.step1.hasCallbackUrl) {
    results.step2 = await debugStep2(results.step1.expectedCallback)
  } else {
    results.step2 = { accessible: false, error: 'No callback URL configured' }
  }
  
  // Шаг 3: Проверка API
  results.step3 = await debugStep3()
  
  // Шаг 4: Тест callback
  if (results.step1.hasCallbackUrl) {
    results.step4 = await debugStep4(results.step1.expectedCallback)
  } else {
    results.step4 = { success: false, error: 'No callback URL configured' }
  }
  
  // Шаг 5: getBotByName
  results.step5 = await debugStep5()
  
  // Итоговый отчет
  console.log('\n\n📊 ИТОГОВЫЙ ОТЧЕТ')
  console.log('==================')
  
  console.log('\n🔧 Конфигурация:')
  console.log(`  Callback URL настроен: ${results.step1.hasCallbackUrl ? '✅' : '❌'}`)
  console.log(`  Callback доступен: ${results.step2.accessible ? '✅' : '❌'}`)
  
  console.log('\n🎯 API функциональность:')
  console.log(`  Endpoint работает: ${results.step3.success ? '✅' : '❌'}`)
  console.log(`  Callback обработка: ${results.step4.success ? '✅' : '❌'}`)
  
  console.log('\n🤖 Bot интеграция:')
  console.log(`  Ожидаемый bot: ${results.step5.expectedBotName}`)
  console.log(`  Пользователь: ${results.step5.userId}`)
  
  // Диагноз проблем
  console.log('\n🩺 ДИАГНОЗ ПРОБЛЕМ:')
  
  if (!results.step1.hasCallbackUrl) {
    console.log('❌ КРИТИЧНО: Нет callback URL в переменных окружения')
    console.log('   Решение: Установить CALLBACK_BASE_URL или API_BASE_URL')
  }
  
  if (!results.step2.accessible) {
    console.log('❌ КРИТИЧНО: Callback endpoint недоступен')
    console.log('   Решение: Проверить роутинг /api/kie-ai/callback')
  }
  
  if (!results.step3.success) {
    console.log('❌ ПРОБЛЕМА: API endpoint не работает')
    console.log('   Решение: Проверить сервер и роутинг')
  }
  
  if (!results.step4.success && results.step1.hasCallbackUrl) {
    console.log('❌ ПРОБЛЕМА: Callback не обрабатывает данные')
    console.log('   Решение: Проверить controller и getBotByName')
  }
  
  console.log('\n💡 РЕКОМЕНДАЦИИ:')
  console.log('1. Установить переменные окружения для callback')
  console.log('2. Проверить логи сервера на наличие ошибок getBotByName')
  console.log('3. Убедиться что Kie.ai может достучаться до webhook URL')
  console.log('4. Проверить права доступа к базе данных video_tasks')
  
  console.log('\n✅ Диагностика завершена!')
}

// Запускаем диагностику
main().catch(console.error)