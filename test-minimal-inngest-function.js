#!/usr/bin/env node

/**
 * 🧪 МИНИМАЛЬНАЯ ФУНКЦИЯ для диагностики
 *
 * Самая простая функция которая отправляет в Telegram
 */

require('dotenv').config({ path: '.env' })
const { Inngest } = require('inngest')

console.log('🧪 СОЗДАЕМ МИНИМАЛЬНУЮ ФУНКЦИЮ')
console.log('==============================')
console.log('')

const inngest = new Inngest({
  id: 'minimal-function-client',
  name: 'Minimal Function Client',
})

// Создаем МИНИМАЛЬНУЮ функцию прямо здесь
const minimalTestFunction = inngest.createFunction(
  {
    id: 'minimal-test-function',
    name: '🧪 Minimal Test Function',
  },
  { event: 'test/minimal' },
  async ({ event, step }) => {
    console.log('🧪 МИНИМАЛЬНАЯ ФУНКЦИЯ ЗАПУЩЕНА!')
    console.log('Данные события:', event.data)

    // Step 1: Простая проверка
    const step1 = await step.run('simple-check', async () => {
      console.log('✅ Step 1: Простая проверка прошла')
      return { success: true, message: 'Step 1 completed' }
    })

    // Step 2: Отправка в Telegram
    const step2 = await step.run('send-telegram', async () => {
      try {
        console.log('📱 Step 2: Пытаемся отправить в Telegram...')

        // Импортируем Telegram бота
        const { Telegraf } = require('telegraf')
        const bot = new Telegraf(process.env.BOT_TOKEN_1)

        const message = `🧪 МИНИМАЛЬНАЯ ФУНКЦИЯ РАБОТАЕТ!

✅ Event ID: ${event.data.eventId || 'unknown'}
✅ Timestamp: ${new Date().toISOString()}
✅ User ID: ${event.data.userId || 'unknown'}

🎯 Это означает что:
• Inngest система функционирует
• Функции регистрируются правильно
• Telegram отправка работает

💡 Проблема в сложной логике Instagram функций!`

        await bot.telegram.sendMessage('144022504', message)

        console.log('✅ Step 2: Сообщение отправлено в Telegram!')
        return {
          success: true,
          telegram_sent: true,
          message: 'Telegram message sent successfully',
        }
      } catch (error) {
        console.error('❌ Step 2: Ошибка отправки в Telegram:', error.message)
        return {
          success: false,
          telegram_sent: false,
          error: error.message,
        }
      }
    })

    console.log('🎉 МИНИМАЛЬНАЯ ФУНКЦИЯ ЗАВЕРШЕНА!')

    return {
      success: true,
      step1_result: step1,
      step2_result: step2,
      completed_at: new Date().toISOString(),
    }
  }
)

// Регистрируем функцию (это нужно для локального тестирования)
console.log('📋 Минимальная функция создана!')

// Отправляем событие для тестирования
async function testMinimalFunction() {
  try {
    console.log('🚀 ОТПРАВЛЯЕМ СОБЫТИЕ ДЛЯ МИНИМАЛЬНОЙ ФУНКЦИИ...')

    const testEvent = {
      name: 'test/minimal',
      data: {
        eventId: `minimal-${Date.now()}`,
        userId: '144022504',
        source: 'minimal-function-test',
      },
    }

    const result = await inngest.send(testEvent)

    console.log('')
    console.log('🎉 СОБЫТИЕ ДЛЯ МИНИМАЛЬНОЙ ФУНКЦИИ ОТПРАВЛЕНО!')
    console.log(`📋 Event ID: ${result.ids?.[0] || 'unknown'}`)

    console.log('')
    console.log('🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:')
    console.log('   • Минимальная функция должна выполниться быстро')
    console.log('   • Должно прийти сообщение в Telegram на 144022504')
    console.log('   • Если НЕ РАБОТАЕТ - проблема в базовой настройке')
    console.log('   • Если РАБОТАЕТ - проблема в Instagram функциях')

    console.log('')
    console.log('⏱️  Ожидаем результат 30 секунд...')
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message)
  }
}

// Запускаем тест
testMinimalFunction()
