/**
 * Тест генерации нейро-изображений с mock bot
 */

const axios = require('axios')

async function testNeuroImageGeneration() {
  console.log('🧪 Тестируем генерацию нейро-изображений с mock bot...')

  const testData = {
    prompt: 'Beautiful landscape with mountains',
    num_images: 1,
    model_url: 'test_model',
    telegram_id: 123456789,
    bot_name: 'neuro_blogger_bot',
  }

  try {
    const response = await axios.post(
      'http://localhost:4000/api/inngest',
      {
        name: 'neuro-image/generation',
        data: testData,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    )

    console.log('✅ Статус ответа:', response.status)
    console.log('✅ Ответ сервера:', response.data)

    if (response.data.success) {
      console.log('✅ Событие успешно отправлено в Inngest')
      console.log('🔄 Job ID:', response.data.jobId)
    } else {
      console.log('❌ Ошибка в ответе сервера:', response.data)
    }
  } catch (error) {
    if (error.response) {
      console.log('❌ HTTP ошибка:', error.response.status, error.response.data)
    } else if (error.request) {
      console.log('❌ Нет ответа от сервера')
    } else {
      console.log('❌ Ошибка запроса:', error.message)
    }
  }
}

// Запускаем тест
testNeuroImageGeneration().catch(console.error)
