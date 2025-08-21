import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
// import path from 'path' // Not strictly needed for this version

// Configuration
const API_URL = 'https://02bcd79606b5.ngrok.app/generate/create-model-training' // ❗ Используйте ваш актуальный NGROK URL
const SECRET_KEY = 'your_actual_secret_key' // ❗ ЗАМЕНИТЕ НА ВАШ КЛЮЧ
const filePath = '/Users/playra/ai-server/tmp/training_images_1747392094942.zip' // ❗ УБЕДИТЕСЬ, ЧТО ПУТЬ ВЕРНЫЙ И ФАЙЛ СУЩЕСТВУЕТ

// Create FormData
const formData = new FormData()

// СНАЧАЛА добавляем все текстовые поля
formData.append('telegram_id', '144022504') // Пример, используйте актуальный ID
formData.append('modelName', 'testOrderChange')
formData.append('bot_name', 'test_bot_order')
formData.append('triggerWord', 'testTriggerOrder')
formData.append('steps', '150')
formData.append('is_ru', 'true')
formData.append('gender', 'person_order')
formData.append('type', 'model')

// ПОТОМ добавляем файл
if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
  formData.append('zipUrl', fs.createReadStream(filePath))
} else {
  console.error(
    `FATAL: File at ${filePath} is missing or empty. FormData will not include the file.`
  )
  // Решите, хотите ли вы прерывать скрипт здесь или отправлять без файла для теста
  // process.exit(1) // Раскомментируйте для прерывания
}

async function testCreateModelTraining() {
  // Проверка файла уже сделана выше при добавлении в formData
  // if (!fs.existsSync(filePath)) {
  //   console.error(`FATAL: File not found at ${filePath}. Please provide a correct path.`)
  //   return
  // }
  // if (fs.statSync(filePath).size === 0) {
  //   console.error(`FATAL: File at ${filePath} is empty. Please provide a non-empty file.`)
  //   return
  // }

  try {
    console.log(
      `Attempting to upload with file ${filePath} (if exists and not empty) to ${API_URL}`
    )
    const response = await axios.post(API_URL, formData, {
      headers: {
        ...formData.getHeaders(), // Crucial for Content-Type with boundary
        'x-secret-key': SECRET_KEY,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    })
    console.log('Response Status:', response.status)
    console.log('Response Data:', response.data)
  } catch (error) {
    if (error.response) {
      console.error('Error Response Status:', error.response.status)
      console.error('Error Response Data:', error.response.data)
    } else if (error.request) {
      console.error(
        'Error Request details (no response received):',
        error.request
      )
    } else {
      console.error('Error Message:', error.message)
    }
  }
}

testCreateModelTraining()
