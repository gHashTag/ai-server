#!/usr/bin/env node

/**
 * 🧪 СУПЕР-ПРОСТАЯ функция для теста Inngest
 */

require('dotenv').config({ path: '.env' })
const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'super-simple-test',
  name: 'Super Simple Test',
})

async function testSuperSimple() {
  try {
    console.log('🧪 СУПЕР-ПРОСТОЙ ТЕСТ INNGEST')
    console.log('============================')
    console.log('')

    const testEvent = {
      name: 'test/hello',
      data: {
        message: 'Super simple test',
        telegram_id: '144022504',
      },
    }

    console.log('🚀 Отправляем событие test/hello...')
    const result = await inngest.send(testEvent)

    console.log(`✅ Событие отправлено! Event ID: ${result.ids?.[0]}`)
    console.log('')
    console.log('🎯 ОЖИДАЕМ:')
    console.log('   • Hello World функция должна выполниться')
    console.log(
      '   • Должно прийти сообщение в Telegram: "👋 Hello World Test"'
    )
    console.log('   • Если НЕ РАБОТАЕТ - Inngest сломан')
    console.log('   • Если РАБОТАЕТ - проблема в Instagram функции')
    console.log('')
    console.log('⏱️  Ждем 15 секунд...')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testSuperSimple()
