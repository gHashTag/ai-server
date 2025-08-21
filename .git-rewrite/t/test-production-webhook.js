const axios = require('axios')

async function checkWebhook() {
  const url = 'https://ai-server-production-production-8e2d.up.railway.app/webhooks/replicate'
  const payload = {
    id: 'test-from-script',
    status: 'succeeded',
    // Можно добавить другие минимально необходимые поля, если они известны
  }

  console.log(`Отправка POST-запроса на: ${url}`)
  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    })
    console.log(`Статус код ответа: ${response.status}`)
    console.log('Данные ответа:', response.data)
  } catch (error) {
    if (error.response) {
      console.error(`Ошибка! Статус код: ${error.response.status}`)
      console.error('Данные ответа (ошибка):', error.response.data)
    } else if (error.request) {
      console.error('Ошибка: Запрос был сделан, но ответ не получен.')
    } else {
      console.error('Ошибка при настройке запроса:', error.message)
    }
  }
}

checkWebhook()
