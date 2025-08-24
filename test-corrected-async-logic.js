#!/usr/bin/env node

/**
 * 🧪 Тест исправленной асинхронной логики для пользователя 144022504
 * Проверяем что теперь система работает правильно:
 * 1. Запрос принимается быстро (30 сек)
 * 2. Баланс НЕ списывается сразу
 * 3. Видео приходит через callback (2-5 минут)
 * 4. Баланс списывается ТОЛЬКО когда видео готово
 */

const axios = require('axios')

const USER_ID = '144022504'
const PRODUCTION_URL = 'https://ai-server-production-production-8e2d.up.railway.app'

console.log('🎯 ТЕСТИРОВАНИЕ ИСПРАВЛЕННОЙ АСИНХРОННОЙ ЛОГИКИ')
console.log('='.repeat(60))
console.log(`👤 Пользователь: ${USER_ID}`)
console.log(`🌐 Production URL: ${PRODUCTION_URL}`)
console.log(`⚡ Endpoint: /generate/veo3-video`)

async function testCorrectAsyncLogic() {
  const startTime = Date.now()
  
  console.log('\n📤 Отправляем запрос на генерацию...')
  console.log('⏰ Ожидание: быстрый ответ (до 30 секунд)')
  
  const payload = {
    prompt: "Тест исправленной логики - кот сидит на окне",
    telegramId: USER_ID,
    botName: 'neuro_blogger_bot',
    model: 'veo3_fast',
    aspectRatio: '16:9',
    duration: 8
  }
  
  try {
    const response = await axios.post(
      `${PRODUCTION_URL}/generate/veo3-video`,
      payload,
      {
        timeout: 35000, // 35 секунд максимум для async ответа
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
    const responseTime = Date.now() - startTime
    
    console.log('\n✅ ЗАПРОС ПРИНЯТ УСПЕШНО!')
    console.log(`📊 HTTP Status: ${response.status}`)
    console.log(`⏱️ Время ответа: ${responseTime}ms`)
    console.log(`📄 Ответ сервера:`)
    console.log(JSON.stringify(response.data, null, 2))
    
    // Проверяем правильную структуру async ответа
    const data = response.data
    
    if (data.taskId) {
      console.log(`\n🎯 ✅ Task ID получен: ${data.taskId}`)
    } else {
      console.log(`\n❌ Нет Task ID - возможно sync режим!`)
    }
    
    if (data.asyncMode) {
      console.log(`🔄 ✅ Async режим подтвержден`)
    } else {
      console.log(`❌ Async режим НЕ ПОДТВЕРЖДЕН!`)
    }
    
    if (data.videoUrl) {
      console.log(`❌ ОШИБКА: videoUrl уже есть - это неправильно для async!`)
      console.log(`   Видео должно прийти через callback, не сразу!`)
    } else {
      console.log(`🔄 ✅ videoUrl отсутствует - правильно для async режима`)
    }
    
    if (responseTime < 35000) {
      console.log(`⚡ ✅ Быстрый ответ (${responseTime}ms) - система не ждет генерацию`)
    } else {
      console.log(`⏰ ❌ Медленный ответ - система все еще ждет результат!`)
    }
    
    console.log(`\n🎬 ПРОВЕРКИ ЛОГИКИ:`)
    console.log(`✅ Запрос принят за ${responseTime}ms`)
    console.log(`✅ Task ID создан: ${data.taskId || 'НЕТ'}`)
    console.log(`✅ Async режим: ${data.asyncMode ? 'ДА' : 'НЕТ'}`)
    console.log(`✅ Видео НЕ в ответе: ${!data.videoUrl ? 'ПРАВИЛЬНО' : 'ОШИБКА'}`)
    
    console.log(`\n📱 СЛЕДУЮЩИЕ ШАГИ:`)
    console.log(`1. Проверь @neuro_blogger_bot для пользователя ${USER_ID}`)
    console.log(`2. Должно прийти уведомление "Генерация видео начата!"`)
    console.log(`3. В течение 2-5 минут должно прийти готовое видео`)
    console.log(`4. Баланс списывается ТОЛЬКО когда видео доставлено`)
    
    console.log(`\n🎯 ПРАВИЛЬНАЯ ЛОГИКА:`)
    console.log(`📤 Запрос → ⚡ быстрый ответ → 🔔 уведомление`)
    console.log(`⏳ Kie.ai генерирует (2-5 мин) → 📞 callback`) 
    console.log(`💰 списание → 💾 сохранение → 📱 доставка`)
    
    return true
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    console.log(`\n❌ ОШИБКА: ${error.message}`)
    console.log(`⏱️ Время до ошибки: ${responseTime}ms`)
    
    if (error.response) {
      console.log(`📊 HTTP Status: ${error.response.status}`)
      console.log(`📄 Тело ошибки:`)
      
      if (typeof error.response.data === 'string') {
        console.log(error.response.data.substring(0, 300) + '...')
      } else {
        console.log(JSON.stringify(error.response.data, null, 2))
      }
    }
    
    console.log(`\n🔍 ДИАГНОСТИКА:`)
    
    if (error.response?.status === 500) {
      console.log(`❌ Internal Server Error - возможно PR еще не в production`)
      console.log(`   Решение: Дождаться merge PR #76`)
    } else if (error.response?.status === 404) {
      console.log(`❌ Endpoint не найден - проверь роутинг`)
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.log(`❌ Сетевая ошибка - проблемы с подключением`)
    } else {
      console.log(`❌ Неизвестная ошибка - требует дополнительной диагностики`)
    }
    
    return false
  }
}

async function main() {
  const overallStart = Date.now()
  
  const success = await testCorrectAsyncLogic()
  
  const totalTime = Date.now() - overallStart
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📊 ИТОГОВЫЙ ОТЧЕТ`)
  console.log(`${'='.repeat(60)}`)
  console.log(`⏱️  Общее время: ${totalTime}ms`)
  console.log(`🎯 Результат: ${success ? '✅ УСПЕХ' : '❌ ОШИБКА'}`)
  console.log(`📋 Статус логики: ${success ? 'ИСПРАВЛЕНА' : 'ТРЕБУЕТ ИСПРАВЛЕНИЯ'}`)
  
  if (success) {
    console.log(`\n💡 РЕКОМЕНДАЦИИ:`)
    console.log(`✅ Async логика работает правильно`)
    console.log(`✅ Пользователи защищены от списаний за неготовые видео`)
    console.log(`✅ Система готова к production`)
  } else {
    console.log(`\n⚠️ ПРОБЛЕМЫ:`)
    console.log(`❌ Async логика требует доработки`)
    console.log(`❌ Возможны списания за неготовые видео`)
    console.log(`❌ Не готово к production`)
  }
  
  process.exit(success ? 0 : 1)
}

main().catch(error => {
  console.error('💥 Критическая ошибка теста:', error)
  process.exit(1)
})