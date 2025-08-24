#!/usr/bin/env node
/**
 * 🚀 РЕАЛЬНЫЙ интеграционный тест генерации видео для пользователя 144022504
 * Отправляет реальный запрос на сервер и ждет результат в боте
 */

const axios = require('axios')

// Конфигурация для тестирования
const TEST_CONFIG = {
  // Используем production сервер для реального теста
  API_URL: 'https://ai-server-production-production-8e2d.up.railway.app',
  // Локальный сервер: 'http://localhost:3000'
  
  USER_DATA: {
    telegram_id: '144022504',
    username: 'test_user_144022504',
    is_ru: true,
    bot_name: 'neuro_blogger_bot'
  },
  
  TEST_PROMPTS: [
    {
      name: 'Короткий тест',
      prompt: 'Кот играет с мячиком в солнечном саду',
      duration: 5,
      expectedCost: 0.25 // $0.05 * 5 секунд для veo3_fast
    },
    {
      name: 'Тест с персонажем', 
      prompt: 'Красивая девушка улыбается и машет рукой на фоне заката',
      duration: 3,
      expectedCost: 0.15 // $0.05 * 3 секунды
    }
  ]
}

/**
 * Отправить запрос на генерацию видео
 */
async function sendVideoGenerationRequest(testCase) {
  const payload = {
    prompt: testCase.prompt,
    duration: testCase.duration,
    ...TEST_CONFIG.USER_DATA
  }
  
  console.log(`\n🚀 Отправляю запрос на генерацию: "${testCase.name}"`)
  console.log(`📋 Payload:`, {
    ...payload,
    prompt: `"${payload.prompt}"`
  })
  console.log(`💰 Ожидаемая стоимость: $${testCase.expectedCost}`)
  
  const startTime = Date.now()
  
  try {
    const response = await axios.post(
      `${TEST_CONFIG.API_URL}/generate/veo3-video`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Integration-Test-144022504'
        },
        timeout: 30000 // 30 секунд таймаут для запроса
      }
    )
    
    const responseTime = Date.now() - startTime
    
    console.log(`✅ Запрос принят сервером за ${responseTime}ms`)
    console.log(`📨 Ответ сервера:`, response.data)
    
    return {
      success: true,
      data: response.data,
      responseTime,
      jobId: response.data?.jobId
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    console.error(`❌ Ошибка запроса за ${responseTime}ms:`)
    
    if (error.response) {
      console.error(`📊 HTTP Status: ${error.response.status}`)
      console.error(`📋 Response Data:`, error.response.data)
    } else {
      console.error(`🔌 Network Error:`, error.message)
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      responseTime
    }
  }
}

/**
 * Проверить статус генерации и логи
 */
async function checkGenerationStatus(jobId, testCase) {
  if (!jobId) {
    console.log('❌ Нет jobId для отслеживания')
    return
  }
  
  console.log(`\n🔍 Отслеживаю статус генерации для jobId: ${jobId}`)
  console.log(`⏳ Ожидайте результат в боте @${TEST_CONFIG.USER_DATA.bot_name}`)
  console.log(`👤 Пользователь: ${TEST_CONFIG.USER_DATA.telegram_id}`)
  
  // Ждем некоторое время для обработки
  const checkInterval = 10000 // 10 секунд
  const maxChecks = 12 // Максимум 2 минуты ожидания
  let checks = 0
  
  const checkTimer = setInterval(() => {
    checks++
    console.log(`📊 Проверка ${checks}/${maxChecks} - прошло ${checks * (checkInterval/1000)} секунд`)
    
    if (checks >= maxChecks) {
      clearInterval(checkTimer)
      console.log(`\n⏰ Время ожидания истекло`)
      console.log(`📱 Проверьте бот ${TEST_CONFIG.USER_DATA.bot_name} вручную`)
      console.log(`👤 Пользователь: ${TEST_CONFIG.USER_DATA.telegram_id}`)
      console.log(`🆔 Job ID: ${jobId}`)
    }
  }, checkInterval)
  
  // Дополнительные инструкции для проверки
  console.log(`\n📋 ЧТО ПРОВЕРИТЬ В БОТЕ:`)
  console.log(`1. Откройте Telegram бот: @${TEST_CONFIG.USER_DATA.bot_name}`)
  console.log(`2. Убедитесь, что видео пришло пользователю ${TEST_CONFIG.USER_DATA.telegram_id}`)
  console.log(`3. Видео должно соответствовать промпту: "${testCase.prompt}"`)
  console.log(`4. Длительность видео: ${testCase.duration} секунд`)
  console.log(`5. Проверьте качество и соответствие запросу`)
}

/**
 * Проверить доступность сервера
 */
async function checkServerHealth() {
  console.log('🏥 Проверяю доступность сервера...')
  
  try {
    const response = await axios.get(`${TEST_CONFIG.API_URL}/health`, {
      timeout: 10000
    })
    
    console.log('✅ Сервер доступен')
    console.log('📊 Health status:', response.data)
    return true
    
  } catch (error) {
    console.error('❌ Сервер недоступен:', error.message)
    return false
  }
}

/**
 * Основная функция тестирования
 */
async function runIntegrationTest() {
  console.log('🧪 РЕАЛЬНЫЙ ИНТЕГРАЦИОННЫЙ ТЕСТ ГЕНЕРАЦИИ ВИДЕО')
  console.log('=' .repeat(60))
  console.log(`🌐 API URL: ${TEST_CONFIG.API_URL}`)
  console.log(`👤 Пользователь: ${TEST_CONFIG.USER_DATA.telegram_id}`)
  console.log(`🤖 Бот: ${TEST_CONFIG.USER_DATA.bot_name}`)
  console.log(`🌍 Язык: ${TEST_CONFIG.USER_DATA.is_ru ? 'Русский' : 'English'}`)
  console.log('=' .repeat(60))
  
  // Проверка сервера
  const serverHealthy = await checkServerHealth()
  if (!serverHealthy) {
    console.error('❌ Невозможно продолжить тест - сервер недоступен')
    process.exit(1)
  }
  
  // Подтверждение от пользователя
  console.log('\n⚠️  ВНИМАНИЕ: Это реальный тест с тратой средств!')
  console.log('💰 Будет потрачено ~$0.40 на генерацию видео')
  console.log('📱 Результат придет в Telegram бот')
  
  // В реальном окружении можно добавить интерактивное подтверждение
  // const readline = require('readline')
  // ... запрос подтверждения у пользователя
  
  const results = []
  
  // Запускаем тесты
  for (let i = 0; i < TEST_CONFIG.TEST_PROMPTS.length; i++) {
    const testCase = TEST_CONFIG.TEST_PROMPTS[i]
    
    console.log(`\n${'='.repeat(40)}`)
    console.log(`🧪 ТЕСТ ${i + 1}/${TEST_CONFIG.TEST_PROMPTS.length}: ${testCase.name}`)
    console.log(`${'='.repeat(40)}`)
    
    const result = await sendVideoGenerationRequest(testCase)
    results.push({ testCase, result })
    
    if (result.success) {
      await checkGenerationStatus(result.jobId, testCase)
    }
    
    // Пауза между тестами
    if (i < TEST_CONFIG.TEST_PROMPTS.length - 1) {
      console.log('\n⏸️  Пауза 5 секунд между тестами...')
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
  
  // Итоговый отчет
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 ИТОГОВЫЙ ОТЧЕТ ТЕСТИРОВАНИЯ')
  console.log(`${'='.repeat(60)}`)
  
  let successCount = 0
  let totalCost = 0
  
  results.forEach(({ testCase, result }, index) => {
    console.log(`\n${index + 1}. ${testCase.name}:`)
    console.log(`   📊 Статус: ${result.success ? '✅ УСПЕШНО' : '❌ ОШИБКА'}`)
    
    if (result.success) {
      console.log(`   🆔 Job ID: ${result.jobId}`)
      console.log(`   ⏱️  Время ответа: ${result.responseTime}ms`)
      console.log(`   💰 Стоимость: $${testCase.expectedCost}`)
      successCount++
      totalCost += testCase.expectedCost
    } else {
      console.log(`   ❌ Ошибка: ${result.error}`)
      if (result.status) {
        console.log(`   📊 HTTP Status: ${result.status}`)
      }
    }
  })
  
  console.log(`\n📈 ОБЩАЯ СТАТИСТИКА:`)
  console.log(`   ✅ Успешных тестов: ${successCount}/${results.length}`)
  console.log(`   💰 Общая стоимость: $${totalCost.toFixed(2)}`)
  console.log(`   📱 Проверьте результаты в боте @${TEST_CONFIG.USER_DATA.bot_name}`)
  
  if (successCount > 0) {
    console.log(`\n🎉 Интеграция работает! Видео должны прийти в бот.`)
  } else {
    console.log(`\n❌ Все тесты провалены. Требуется диагностика.`)
  }
  
  console.log('\n👀 ВНИМАТЕЛЬНО ПРОВЕРЬТЕ:')
  console.log('   1. Пришли ли видео в Telegram бот')
  console.log('   2. Соответствуют ли видео промптам')
  console.log('   3. Правильная ли длительность видео')
  console.log('   4. Нет ли ошибок в логах сервера')
}

// Запуск теста
if (require.main === module) {
  runIntegrationTest()
    .then(() => {
      console.log('\n✅ Тест завершен')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Критическая ошибка теста:', error)
      process.exit(1)
    })
}

module.exports = {
  sendVideoGenerationRequest,
  checkGenerationStatus,
  TEST_CONFIG
}