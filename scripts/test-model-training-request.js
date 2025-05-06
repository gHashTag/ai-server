const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

async function sendRequest() {
  const requestData = {
    filePath:
      '/Users/playra/999-multibots-telegraf/tmp/training_images_1746516597924.zip',
    triggerWord: 'NEURO_SAGE',
    modelName: 'neuro_sage',
    steps: 1000,
    telegram_id: '144022504',
    is_ru: true,
    botName: 'ai_koshey_bot',
    gender: 'male',
  }

  const formData = new FormData()
  formData.append('type', 'model')
  formData.append('telegram_id', requestData.telegram_id)
  formData.append('zipUrl', fs.createReadStream(requestData.filePath))
  formData.append('triggerWord', requestData.triggerWord)
  formData.append('modelName', requestData.modelName)
  formData.append('steps', requestData.steps.toString())
  formData.append('is_ru', requestData.is_ru.toString())
  formData.append('bot_name', requestData.botName)
  formData.append('gender', requestData.gender)

  try {
    const response = await axios.post(
      'http://localhost:3000/generate/create-model-training',
      formData,
      {
        headers: {
          'x-secret-key': 'your-secret-key-here',
          ...formData.getHeaders(),
        },
      }
    )
    console.log('Response:', response.data)
  } catch (error) {
    console.error(
      'Error:',
      error.response ? error.response.data : error.message
    )
  }
}

sendRequest()
