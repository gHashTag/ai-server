/**
 * 🧬 Тест Морфинг Эндпоинта
 * Простой скрипт для тестирования /generate/morph-images
 */

const FormData = require('form-data')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

// Конфигурация
const SERVER_URL = 'http://localhost:4000'
const SECRET_KEY = process.env.SECRET_API_KEY || 'your-secret-key-here'

// Тестовые данные
const TEST_DATA = {
  type: 'morphing',
  telegram_id: '144022504',
  image_count: '3',
  morphing_type: 'seamless',
  model: 'kling-v1.6-pro',
  is_ru: 'true',
  bot_name: 'ai_koshey_bot',
  username: 'test_user', // Для валидации
}

/**
 * Создает тестовый ZIP архив с изображениями
 */
function createTestZipFile() {
  console.log('🧬 Создание тестового ZIP архива...')

  // Для простоты, создадим пустой ZIP файл
  // В реальном тесте здесь должны быть настоящие изображения
  const zipPath = path.join(__dirname, 'test_morphing_images.zip')

  if (fs.existsSync(zipPath)) {
    console.log('🧬 Используем существующий тестовый ZIP:', zipPath)
    return zipPath
  }

  // Создаем пустой файл как заглушку
  fs.writeFileSync(zipPath, 'PK\x03\x04\x14\x00\x00\x00\x08\x00') // Минимальная ZIP структура
  console.log('🧬 Создан тестовый ZIP файл:', zipPath)

  return zipPath
}

/**
 * Отправляет запрос к морфинг эндпоинту
 */
async function testMorphingEndpoint() {
  console.log('🧬 Начинаем тест морфинг эндпоинта...')

  try {
    // Создаем тестовый ZIP файл
    const zipPath = createTestZipFile()

    // Создаем FormData
    const form = new FormData()

    // Добавляем все поля
    Object.entries(TEST_DATA).forEach(([key, value]) => {
      form.append(key, value)
    })

    // Добавляем ZIP файл
    form.append('images_zip', fs.createReadStream(zipPath))

    console.log('🧬 Отправляем запрос к эндпоинту...')
    console.log('🧬 URL:', `${SERVER_URL}/generate/morph-images`)
    console.log('🧬 Headers:', {
      'x-secret-key': SECRET_KEY ? '[HIDDEN]' : '[NOT SET]',
      'Content-Type': 'multipart/form-data',
    })
    console.log('🧬 Данные:', TEST_DATA)

    const response = await axios.post(
      `${SERVER_URL}/generate/morph-images`,
      form,
      {
        headers: {
          'x-secret-key': SECRET_KEY,
          ...form.getHeaders(),
        },
        timeout: 30000,
        validateStatus: () => true, // Не бросать ошибку для любого статуса
      }
    )

    console.log('🧬 Ответ получен:')
    console.log('Status:', response.status)
    console.log('Headers:', response.headers)
    console.log('Data:', JSON.stringify(response.data, null, 2))

    // Проверяем результат
    if (response.status === 200) {
      console.log('✅ Тест ПРОШЕЛ УСПЕШНО!')
      console.log('📋 Детали успеха:')
      console.log('  - Статус: 200 OK')
      console.log('  - Получен job_id:', response.data.job_id)
      console.log('  - Статус обработки:', response.data.status)
      console.log('  - Сообщение:', response.data.message)
    } else {
      console.log('❌ Тест НЕ ПРОШЕЛ')
      console.log('📋 Детали ошибки:')
      console.log('  - HTTP Статус:', response.status)
      console.log('  - Сообщение:', response.data?.message || 'Нет сообщения')
      console.log('  - Ошибка:', response.data?.error || 'Нет описания ошибки')
    }
  } catch (error) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА в тесте:')
    console.error('Тип:', error.constructor.name)
    console.error('Сообщение:', error.message)

    if (error.response) {
      console.error('HTTP Статус:', error.response.status)
      console.error('HTTP Данные:', error.response.data)
    }

    if (error.code) {
      console.error('Код ошибки:', error.code)
    }

    console.error('Stack trace:', error.stack)
  }
}

/**
 * Проверяет, запущен ли сервер
 */
async function checkServerStatus() {
  console.log('🧬 Проверяем статус сервера...')

  try {
    const response = await axios.get(`${SERVER_URL}/`, {
      timeout: 5000,
      validateStatus: () => true,
    })

    console.log('✅ Сервер доступен:', response.status, response.statusText)
    return true
  } catch (error) {
    console.error('❌ Сервер недоступен:', error.message)
    console.error('💡 Убедитесь, что сервер запущен на порту 4000')
    console.error('   Команда для запуска: bun run dev')
    return false
  }
}

/**
 * Основная функция теста
 */
async function main() {
  console.log('🧬='.repeat(50))
  console.log('🧬 ТЕСТ МОРФИНГ ЭНДПОИНТА')
  console.log('🧬='.repeat(50))

  // Проверяем переменные окружения
  if (!SECRET_KEY || SECRET_KEY === 'your-secret-key-here') {
    console.warn('⚠️ SECRET_API_KEY не установлен!')
    console.warn(
      '   Экспортируйте переменную: export SECRET_API_KEY=your_actual_key'
    )
  }

  // Проверяем сервер
  const serverRunning = await checkServerStatus()
  if (!serverRunning) {
    process.exit(1)
  }

  // Запускаем тест
  await testMorphingEndpoint()

  console.log('🧬='.repeat(50))
  console.log('🧬 ТЕСТ ЗАВЕРШЕН')
  console.log('🧬='.repeat(50))
}

// Запускаем тест
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Неперехваченная ошибка:', error)
    process.exit(1)
  })
}

module.exports = { testMorphingEndpoint, checkServerStatus }
