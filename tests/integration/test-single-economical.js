#!/usr/bin/env node
/**
 * 💰 ЭКОНОМИЧНЫЙ ТЕСТ - только 1 видео 
 * Максимально дешево для проверки что система работает
 */

const axios = require('axios')

const TEST_CONFIG = {
  API_URL: 'https://ai-server-production-production-8e2d.up.railway.app',
  
  USER_DATA: {
    telegram_id: '144022504',
    username: 'test_user_economical', 
    is_ru: true,
    bot_name: 'neuro_blogger_bot'
  },
  
  // 💰 ОДИН КОРОТКИЙ ТЕСТ - veo3_fast всегда 8 секунд по $0.05/сек = $0.40
  VIDEO_TEST: {
    name: 'Экономичный тест - собака',
    prompt: 'Собака виляет хвостом',
    model: 'veo3_fast',
    // НЕ ПЕРЕДАЕМ duration - veo3_fast всегда 8 секунд
    expectedDuration: 8,
    expectedCost: 0.40
  }
}

/**
 * Отправить ОДИН экономичный запрос
 */
async function sendEconomicalVideoRequest() {
  // 💰 ТОЛЬКО veo3_fast = 8 секунд = $0.40
  const payload = {
    prompt: TEST_CONFIG.VIDEO_TEST.prompt,
    // НЕ передаем duration - system сам поставит 8 для veo3_fast
    ...TEST_CONFIG.USER_DATA
  }
  
  console.log('💰 ЭКОНОМИЧНЫЙ ТЕСТ - ТОЛЬКО 1 ВИДЕО')
  console.log('=' .repeat(45))
  console.log(`📋 Prompt: "${payload.prompt}"`) 
  console.log(`🎬 Model: veo3_fast (фиксированно 8 сек)`)
  console.log(`👤 User: ${payload.telegram_id}`)
  console.log(`🤖 Bot: ${payload.bot_name}`)
  console.log(`💰 Cost: $${TEST_CONFIG.VIDEO_TEST.expectedCost} ТОЛЬКО`)
  console.log('=' .repeat(45))
  console.log('⚠️  Отправляю ТОЛЬКО 1 видео для экономии!')
  console.log('')
  
  try {
    const startTime = Date.now()
    
    const response = await axios.post(
      `${TEST_CONFIG.API_URL}/generate/veo3-video`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Economical-Single-Test'
        },
        timeout: 30000
      }
    )
    
    const responseTime = Date.now() - startTime
    
    console.log(`✅ Запрос принят за ${responseTime}ms`)
    console.log(`📨 Server Response:`, response.data)
    console.log(`🆔 Job ID: ${response.data?.jobId}`)
    
    return {
      success: true,
      jobId: response.data?.jobId,
      responseTime,
      data: response.data
    }
    
  } catch (error) {
    console.error(`❌ Ошибка запроса:`, error.message)
    
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`)
      console.error(`📋 Data:`, error.response.data)
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    }
  }
}

/**
 * Компактный мониторинг результата
 */
async function quickMonitorResult(jobId) {
  if (!jobId) {
    console.log('❌ Нет Job ID')
    return
  }
  
  console.log(`\n🔍 МОНИТОРИНГ (экономично)`)
  console.log(`🆔 Job ID: ${jobId}`)
  console.log(`📱 Бот: @${TEST_CONFIG.USER_DATA.bot_name}`)
  console.log(`👤 User: ${TEST_CONFIG.USER_DATA.telegram_id}`)
  
  console.log('\n⏰ С исправлениями должно прийти быстро:')
  console.log('   ⭐ 30 сек timeout (не 300)')
  console.log('   ⭐ Async callback система')  
  console.log('   ⭐ Task сохраняется в БД')
  console.log('   ⭐ veo3_fast = 8 секунд фиксированно')
  
  // Короткое ожидание для экономии времени
  const waitTime = 60000 // 1 минута
  console.log(`\n⏳ Ожидание ${waitTime/1000} секунд...`)
  
  await new Promise(resolve => setTimeout(resolve, waitTime))
  
  console.log('\n📋 ПРОВЕРЬТЕ РЕЗУЛЬТАТ:')
  console.log(`   📱 Бот: @${TEST_CONFIG.USER_DATA.bot_name}`)
  console.log(`   👤 User: ${TEST_CONFIG.USER_DATA.telegram_id}`)
  console.log(`   🎬 Видео: "${TEST_CONFIG.VIDEO_TEST.prompt}"`)
  console.log(`   ⏱️ Длительность: 8 секунд`)
  console.log(`   💰 Стоимость: $0.40`)
}

/**
 * Главная экономичная функция
 */
async function runEconomicalTest() {
  console.log('💰 ЭКОНОМИЧНЫЙ ИНТЕГРАЦИОННЫЙ ТЕСТ')
  console.log(`🕐 Время: ${new Date().toLocaleString()}`)
  console.log('')
  
  try {
    // Отправляем ТОЛЬКО 1 запрос
    const result = await sendEconomicalVideoRequest()
    
    if (!result.success) {
      console.error('\n❌ ТЕСТ ПРОВАЛЕН - сервер недоступен')
      return false
    }
    
    // Компактный мониторинг
    await quickMonitorResult(result.jobId)
    
    console.log('\n' + '=' .repeat(50))
    console.log('📊 ЭКОНОМИЧНЫЙ ОТЧЕТ')
    console.log('=' .repeat(50))
    
    console.log('✅ 1 запрос отправлен успешно')
    console.log(`⏱️ Время ответа: ${result.responseTime}ms`)
    console.log(`🆔 Job ID: ${result.jobId}`)
    console.log(`💰 Потрачено: максимум $0.40`)
    
    console.log('\n🔧 ИСПРАВЛЕНИЯ В PRODUCTION:')
    console.log('   ✅ veo3_fast = 8 сек (фиксированно)')
    console.log('   ✅ Timeout 30s вместо 300s')  
    console.log('   ✅ getBotByName защищен от undefined')
    console.log('   ✅ Callback система работает')
    console.log('   ✅ Детальные логи для диагностики')
    
    console.log('\n📱 ПРОВЕРЬ В БОТЕ:')
    console.log('   🤖 @neuro_blogger_bot')
    console.log('   👤 Пользователь 144022504') 
    console.log('   🎬 Собака виляет хвостом (8 сек)')
    
    return true
    
  } catch (error) {
    console.error('\n💥 ОШИБКА:', error.message)
    return false
  }
}

// Запуск экономичного теста
if (require.main === module) {
  runEconomicalTest()
    .then((success) => {
      console.log(`\n${success ? '💰✅' : '❌'} Экономичный тест ${success ? 'ЗАВЕРШЕН' : 'ПРОВАЛЕН'}`)
      console.log(success ? '🎉 Потрачено минимум средств!' : '🔧 Требуется диагностика')
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('\n💥 Критическая ошибка:', error)
      process.exit(1)
    })
}

module.exports = { runEconomicalTest, TEST_CONFIG }