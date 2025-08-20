/**
 * 🧬 Тестовый скрипт для Inngest функции морфинга
 * Отправляет событие 'morph/images.requested' для тестирования Inngest функции
 */

const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')
const path = require('path')

// Конфигурация
const CONFIG = {
  SERVER_URL: process.env.SERVER_URL || 'http://localhost:4000',
  SECRET_KEY: process.env.SECRET_API_KEY || 'your-secret-key',
  INNGEST_DEV_URL: process.env.INNGEST_DEV_URL || 'http://localhost:8288',
}

// Данные для тестирования
const TEST_DATA = {
  telegram_id: '144022504',
  image_count: 3,
  morphing_type: 'seamless', // или 'loop'
  model: 'kling-v1.6-pro',
  is_ru: true,
  bot_name: 'ai_koshey_bot',
  zip_file_path: '/tmp/test_morphing_images.zip',
  job_id: `morph_test_${Date.now()}`,
}

/**
 * Создает тестовый ZIP файл с фиктивными данными
 */
function createTestZipFile() {
  const zipPath = TEST_DATA.zip_file_path
  const zipDir = path.dirname(zipPath)

  // Создаем директорию если не существует
  if (!fs.existsSync(zipDir)) {
    fs.mkdirSync(zipDir, { recursive: true })
  }

  // Создаем простой ZIP файл (в реальности нужен adm-zip, но для теста достаточно пустого файла)
  fs.writeFileSync(zipPath, 'PK\x03\x04') // Минимальная ZIP подпись

  console.log('✅ Тестовый ZIP файл создан:', zipPath)
  return zipPath
}

/**
 * Отправляет Inngest событие напрямую
 */
async function sendInngestEvent() {
  try {
    console.log('📡 Отправка Inngest события...')

    const eventData = {
      name: 'morph/images.requested',
      data: TEST_DATA,
    }

    const response = await axios.post(
      `${CONFIG.INNGEST_DEV_URL}/dev/events`,
      {
        events: [eventData],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    console.log('✅ Inngest событие отправлено успешно')
    console.log('📊 Ответ Inngest:', response.data)

    return response.data
  } catch (error) {
    console.error('❌ Ошибка отправки Inngest события:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    } else {
      console.error('Error:', error.message)
    }
    throw error
  }
}

/**
 * Тестирует REST API эндпоинт (альтернативный способ)
 */
async function testRestEndpoint() {
  try {
    console.log('🔄 Тестирование REST эндпоинта...')

    // Создаем фиктивный ZIP файл
    const testZipContent = Buffer.from('PK test zip content')
    const testZipPath = './test_images.zip'
    fs.writeFileSync(testZipPath, testZipContent)

    const form = new FormData()
    form.append('type', 'morphing')
    form.append('telegram_id', TEST_DATA.telegram_id)
    form.append('images_zip', fs.createReadStream(testZipPath))
    form.append('image_count', TEST_DATA.image_count.toString())
    form.append('morphing_type', TEST_DATA.morphing_type)
    form.append('model', TEST_DATA.model)
    form.append('is_ru', TEST_DATA.is_ru.toString())
    form.append('bot_name', TEST_DATA.bot_name)
    form.append('username', 'test_user')

    const response = await axios.post(
      `${CONFIG.SERVER_URL}/generate/morph-images`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-secret-key': CONFIG.SECRET_KEY,
        },
      }
    )

    console.log('✅ REST API вызов успешен')
    console.log('📊 Ответ сервера:', response.data)

    // Удаляем тестовый файл
    fs.unlinkSync(testZipPath)

    return response.data
  } catch (error) {
    console.error('❌ Ошибка REST API вызова:')
    if (error.response) {
      console.error('Status:', error.response.status)
      console.error('Data:', error.response.data)
    } else {
      console.error('Error:', error.message)
    }
    throw error
  }
}

/**
 * Проверяет статус сервера
 */
async function checkServerStatus() {
  try {
    console.log('🔍 Проверка статуса сервера...')

    const response = await axios.get(`${CONFIG.SERVER_URL}/health`, {
      timeout: 5000,
    })

    console.log('✅ Сервер доступен')
    return true
  } catch (error) {
    console.error('❌ Сервер недоступен:', error.message)
    return false
  }
}

/**
 * Проверяет статус Inngest Dev Server
 */
async function checkInngestStatus() {
  try {
    console.log('🔍 Проверка статуса Inngest Dev Server...')

    const response = await axios.get(`${CONFIG.INNGEST_DEV_URL}/dev`, {
      timeout: 5000,
    })

    console.log('✅ Inngest Dev Server доступен')
    return true
  } catch (error) {
    console.error('❌ Inngest Dev Server недоступен:', error.message)
    console.error('   Убедитесь, что запущен: npx inngest-cli@latest dev')
    return false
  }
}

/**
 * Основная функция
 */
async function main() {
  console.log('🧬 ТЕСТ INNGEST ФУНКЦИИ МОРФИНГА')
  console.log('='.repeat(50))

  // Показываем конфигурацию
  console.log('📋 Конфигурация:')
  console.log('  Server URL:', CONFIG.SERVER_URL)
  console.log('  Inngest URL:', CONFIG.INNGEST_DEV_URL)
  console.log('  Secret Key:', CONFIG.SECRET_KEY.substring(0, 10) + '...')
  console.log('')

  // Показываем тестовые данные
  console.log('📊 Тестовые данные:')
  console.log('  Telegram ID:', TEST_DATA.telegram_id)
  console.log('  Image Count:', TEST_DATA.image_count)
  console.log('  Morphing Type:', TEST_DATA.morphing_type)
  console.log('  Model:', TEST_DATA.model)
  console.log('  Job ID:', TEST_DATA.job_id)
  console.log('')

  const args = process.argv.slice(2)
  const testType = args[0] || 'inngest'

  if (testType === 'rest') {
    // Тестируем через REST API
    console.log('🔧 Режим: REST API тест')
    console.log('')

    const serverOk = await checkServerStatus()
    if (!serverOk) {
      console.error('❌ Сервер недоступен. Запустите: npm run dev')
      process.exit(1)
    }

    await testRestEndpoint()
  } else if (testType === 'inngest') {
    // Тестируем Inngest функцию напрямую
    console.log('🔧 Режим: Inngest событие')
    console.log('')

    const inngestOk = await checkInngestStatus()
    if (!inngestOk) {
      console.error(
        '❌ Inngest Dev Server недоступен. Запустите: npx inngest-cli@latest dev'
      )
      process.exit(1)
    }

    // Создаем тестовый ZIP файл
    createTestZipFile()

    await sendInngestEvent()
  } else {
    console.error(
      '❌ Неизвестный тип теста. Используйте: node test-morphing-inngest.js [rest|inngest]'
    )
    process.exit(1)
  }

  console.log('')
  console.log('🎉 Тест завершен успешно!')
  console.log('📱 Проверьте Telegram бота для получения результатов')
}

// Запуск
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Критическая ошибка:', error.message)
    process.exit(1)
  })
}

module.exports = {
  sendInngestEvent,
  testRestEndpoint,
  TEST_DATA,
}
