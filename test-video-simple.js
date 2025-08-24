#!/usr/bin/env node

/**
 * 🧪 Простой тест генерации видео для пользователя 144022504
 * Проверяем что система теперь работает без ошибок
 */

const axios = require('axios')

const USER_ID = '144022504'
const PRODUCTION_URL = 'https://ai-server-production-production-8e2d.up.railway.app'

async function testVideoGeneration() {
  console.log('🎬 ТЕСТ ГЕНЕРАЦИИ ВИДЕО')
  console.log('='.repeat(50))
  console.log(`👤 Пользователь: ${USER_ID}`)
  console.log(`🌐 Сервер: ${PRODUCTION_URL}`)
  console.log(`🎯 Endpoint: /generate/veo3-video`)
  
  const payload = {
    prompt: "Тест системы - собака виляет хвостом",
    telegramId: USER_ID,
    botName: 'neuro_blogger_bot',
    model: 'veo3_fast',
    aspectRatio: '16:9',
    duration: 8
  }
  
  console.log(`\n📤 Отправляю запрос...`)
  console.log(`📝 Промпт: "${payload.prompt}"`)
  
  try {
    const response = await axios.post(
      `${PRODUCTION_URL}/generate/veo3-video`,
      payload,
      {
        timeout: 45000, // 45 секунд
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
    console.log(`\n✅ УСПЕХ! Сервер принял запрос`)
    console.log(`📊 HTTP Status: ${response.status}`)
    console.log(`📄 Ответ:`, JSON.stringify(response.data, null, 2))
    
    if (response.data.jobId) {
      console.log(`\n🎯 Job ID: ${response.data.jobId}`)
      console.log(`📱 Видео должно прийти пользователю ${USER_ID}`)
      console.log(`⏰ Ожидаемое время: 2-5 минут`)
      console.log(`🤖 Бот: @neuro_blogger_bot`)
    }
    
    console.log(`\n🎉 ТЕСТ ПРОЙДЕН - Система работает корректно!`)
    return true
    
  } catch (error) {
    console.log(`\n❌ ОШИБКА: ${error.message}`)
    
    if (error.response) {
      console.log(`📊 HTTP Status: ${error.response.status}`)
      console.log(`📄 Тело ошибки:`)
      
      if (typeof error.response.data === 'string') {
        console.log(error.response.data.substring(0, 500) + '...')
      } else {
        console.log(JSON.stringify(error.response.data, null, 2))
      }
    }
    
    console.log(`\n🚨 ТЕСТ ПРОВАЛЕН - Нужна дополнительная диагностика`)
    return false
  }
}

async function main() {
  const startTime = Date.now()
  
  const success = await testVideoGeneration()
  
  const duration = Date.now() - startTime
  
  console.log(`\n📊 ИТОГОВЫЙ ОТЧЕТ`)
  console.log('='.repeat(50))
  console.log(`⏱️  Время выполнения: ${duration}ms`)
  console.log(`🎯 Результат: ${success ? 'УСПЕХ ✅' : 'ОШИБКА ❌'}`)
  
  if (success) {
    console.log(`\n💡 ИНСТРУКЦИЯ:`)
    console.log(`1. Проверь @neuro_blogger_bot для пользователя ${USER_ID}`)
    console.log(`2. Видео должно прийти в течение 2-5 минут`)
    console.log(`3. Если не пришло - проверь логи сервера`)
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 Критическая ошибка теста:', error)
  process.exit(1)
})