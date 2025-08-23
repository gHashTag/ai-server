/**
 * Правильный тест отправки события в Inngest
 */

const { inngest } = require('../../dist/core/inngest/clients')

async function testSendEvent() {
  console.log('🧪 Тестируем отправку события в Inngest с mock bot...')

  const testEvent = {
    name: 'neuro-image/generation',
    data: {
      prompt: 'Beautiful landscape with mountains',
      num_images: 1,
      model_url: 'test_model',
      telegram_id: 123456789,
      bot_name: 'neuro_blogger_bot',
    },
  }

  try {
    console.log('📤 Отправляем событие:', testEvent.name)

    const result = await inngest.send(testEvent)

    console.log('✅ Событие успешно отправлено!')
    console.log('📋 Результат:', result)

    return result
  } catch (error) {
    console.log('❌ Ошибка отправки события:', error.message)
    console.log('📋 Детали:', error)
    throw error
  }
}

// Запускаем тест
testSendEvent()
  .then(() => {
    console.log('🎉 Тест завершен успешно')
    process.exit(0)
  })
  .catch(error => {
    console.log('💥 Тест завершен с ошибкой:', error.message)
    process.exit(1)
  })
