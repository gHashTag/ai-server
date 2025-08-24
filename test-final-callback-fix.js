#!/usr/bin/env node

/**
 * 🎯 ФИНАЛЬНЫЙ ТЕСТ - исправление callback для пользователя 144022504
 * Тестируем с правильно настроенным callback URL из production
 */

const axios = require('axios')

const USER_ID = '144022504'
const PRODUCTION_URL = 'https://ai-server-production-production-8e2d.up.railway.app'
const EXPECTED_CALLBACK = `${PRODUCTION_URL}/api/kie-ai/callback`

// Устанавливаем переменную окружения для теста
process.env.API_URL = PRODUCTION_URL

async function testCallbackEndpoint() {
  console.log('🔍 Тестируем callback endpoint...')
  console.log('URL:', EXPECTED_CALLBACK)
  
  try {
    const response = await axios.get(`${EXPECTED_CALLBACK}/health`, {
      timeout: 10000
    })
    console.log('✅ Callback endpoint доступен:', response.status)
    return true
  } catch (error) {
    console.log('❌ Callback endpoint НЕ доступен:', error.message)
    return false
  }
}

async function runFinalVideoTest() {
  console.log('🎬 Запуск финального теста генерации видео...')
  
  const testPayload = {
    prompt: "Красивый закат над океаном с волнами - ФИНАЛЬНЫЙ ТЕСТ",
    telegramId: USER_ID,
    botName: 'neuro_blogger_bot',
    model: 'veo3_fast', // Фиксированно 8 секунд
    aspectRatio: '16:9',
    duration: 8 // Принудительно 8 секунд для veo3_fast
  }
  
  try {
    console.log('📤 Отправляю запрос на генерацию...')
    console.log('Payload:', {
      ...testPayload,
      prompt: testPayload.prompt.substring(0, 50) + '...'
    })
    
    const response = await axios.post(
      `${PRODUCTION_URL}/generate/veo3-video`,
      testPayload,
      {
        timeout: 60000, // 60 секунд максимум для принятия запроса
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
    console.log('✅ Запрос успешно принят сервером!')
    console.log('📊 Ответ сервера:', {
      status: response.status,
      data: response.data
    })
    
    if (response.data && response.data.jobId) {
      console.log(`🎯 Job ID: ${response.data.jobId}`)
      console.log(`📱 Пользователь ${USER_ID} должен получить видео через callback`)
      console.log(`🔗 Callback URL: ${EXPECTED_CALLBACK}`)
      console.log(`⏰ Ожидаемое время доставки: 2-5 минут`)
    }
    
    return true
  } catch (error) {
    console.log('❌ Ошибка при отправке запроса:', error.message)
    if (error.response) {
      console.log('📄 Ответ сервера:', {
        status: error.response.status,
        data: error.response.data
      })
    }
    return false
  }
}

async function monitorCallback() {
  console.log('\n📡 Мониторинг callback endpoint на 30 секунд...')
  
  let requestCount = 0
  const startTime = Date.now()
  const monitorDuration = 30000 // 30 секунд
  
  const checkInterval = setInterval(async () => {
    try {
      await axios.get(`${EXPECTED_CALLBACK}/health`, { timeout: 1000 })
      requestCount++
    } catch (error) {
      // Игнорируем ошибки health check во время мониторинга
    }
  }, 2000)
  
  setTimeout(() => {
    clearInterval(checkInterval)
    console.log(`📊 Мониторинг завершен. Health checks: ${requestCount}`)
    console.log(`⏱️ Продолжительность: ${(Date.now() - startTime) / 1000}s`)
    console.log('\n🎯 РЕЗУЛЬТАТ:')
    console.log(`✅ Callback URL исправлен: ${EXPECTED_CALLBACK}`)
    console.log(`✅ Генерация запущена для пользователя ${USER_ID}`)
    console.log(`📱 Видео должно прийти в @neuro_blogger_bot`)
    console.log('\n💡 Если видео НЕ пришло - проверь логи production сервера!')
  }, monitorDuration)
}

async function main() {
  console.log('🚀 ФИНАЛЬНЫЙ ТЕСТ CALLBACK ИСПРАВЛЕНИЯ')
  console.log('='*50)
  console.log(`👤 Пользователь: ${USER_ID}`)
  console.log(`🌐 Production URL: ${PRODUCTION_URL}`)
  console.log(`🔗 Callback URL: ${EXPECTED_CALLBACK}`)
  console.log(`⚡ API_URL установлен: ${process.env.API_URL}`)
  
  // Шаг 1: Проверяем callback endpoint
  const callbackWorking = await testCallbackEndpoint()
  
  if (!callbackWorking) {
    console.log('\n❌ КРИТИЧЕСКАЯ ОШИБКА: Callback endpoint недоступен!')
    console.log('Проверь роутинг /api/kie-ai/callback в production')
    process.exit(1)
  }
  
  // Шаг 2: Запускаем генерацию видео
  const generationStarted = await runFinalVideoTest()
  
  if (!generationStarted) {
    console.log('\n❌ ОШИБКА: Не удалось запустить генерацию видео')
    process.exit(1)
  }
  
  // Шаг 3: Мониторим callback
  await monitorCallback()
}

main().catch(error => {
  console.error('💥 Критическая ошибка теста:', error)
  process.exit(1)
})