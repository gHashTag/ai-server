#!/usr/bin/env node

/**
 * 🧪 ТЕСТ простой функции helloWorld
 *
 * Проверяем работает ли Inngest система вообще
 */

// Загружаем переменные окружения
require('dotenv').config({ path: '.env.development.local' })

// Импортируем Inngest client
const { Inngest } = require('inngest')

console.log('🧪 ТЕСТ ПРОСТОЙ ФУНКЦИИ helloWorld')
console.log('===================================')
console.log('')

// Создаем Inngest client
const inngest = new Inngest({
  id: 'hello-test-client',
  name: 'Hello Test Client',
})

// Простое событие для тестовой функции
const helloEvent = {
  name: 'test/hello',
  data: {
    name: 'Пользователь 144022504',
  },
}

async function testHelloWorld() {
  try {
    console.log('👋 ТЕСТИРУЕМ ПРОСТУЮ ФУНКЦИЮ...')
    console.log('')
    console.log(`📋 Событие: ${helloEvent.name}`)
    console.log(`📋 Данные: ${helloEvent.data.name}`)
    console.log('')

    console.log('📤 Отправляем тестовое событие...')

    // Отправляем простое событие
    const result = await inngest.send(helloEvent)

    console.log('')
    console.log('🎉 ТЕСТОВОЕ СОБЫТИЕ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('⏳ Если эта функция работает:')
    console.log('   • Значит система Inngest функционирует')
    console.log('   • Проблема в функции instagramScraperV2')
    console.log('   • Нужно искать ошибки в логике функции')

    console.log('')
    console.log('❌ Если эта функция НЕ работает:')
    console.log('   • Значит проблема в настройке Inngest')
    console.log('   • Нужно проверить переменные окружения')
    console.log('   • Нужно проверить регистрацию функций')

    console.log('')
    console.log('⏱️  Проверяем через 10 секунд...')

    // Ждем 10 секунд и проверяем
    await new Promise(resolve => setTimeout(resolve, 10000))

    console.log('')
    console.log('✅ ТЕСТ ПРОСТОЙ ФУНКЦИИ ЗАВЕРШЕН!')
    console.log('Если никаких ошибок нет - значит система работает')
  } catch (error) {
    console.error('❌ Ошибка в тесте helloWorld:', error.message)
    console.error('')
    console.error('🔍 Это означает проблему в базовой настройке Inngest')
    process.exit(1)
  }
}

// Запускаем тест простой функции
testHelloWorld()
