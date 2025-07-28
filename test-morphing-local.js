const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

/**
 * 🧬 ЛОКАЛЬНЫЙ ТЕСТ МОРФИНГА (БЕЗ NGROK)
 *
 * Тестируем новую архитектуру:
 * - Распаковка ZIP в контроллере
 * - Передача путей файлов в Inngest
 * - Решение проблемы output_too_large
 */

async function testMorphingLocal() {
  console.log('🧬 === ЛОКАЛЬНЫЙ ТЕСТ НОВОЙ АРХИТЕКТУРЫ МОРФИНГА ===\n')

  if (!fs.existsSync('test_real_morphing.zip')) {
    console.error('❌ Файл test_real_morphing.zip не найден!')
    return
  }

  const formData = new FormData()

  // Добавляем параметры
  formData.append('type', 'morphing')
  formData.append('telegram_id', '144022504') // Твой ID
  formData.append('image_count', '3')
  formData.append('morphing_type', 'seamless')
  formData.append('model', 'kling-v1.6-pro')
  formData.append('is_ru', 'true')
  formData.append('bot_name', 'clip_maker_neuro_bot')
  formData.append('username', 'test_user')

  // Добавляем ZIP файл
  formData.append('images_zip', fs.createReadStream('test_real_morphing.zip'))

  try {
    console.log('📤 Отправляем запрос на локальный сервер...')
    console.log('🎯 URL: http://localhost:4000/generate/morph-images')
    console.log(
      '📊 Размер файла:',
      fs.statSync('test_real_morphing.zip').size,
      'байт'
    )

    const response = await axios.post(
      'http://localhost:4000/generate/morph-images',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Accept: 'application/json',
        },
        timeout: 30000, // 30 секунд
      }
    )

    console.log(
      '✅ УСПЕХ! API Response:',
      JSON.stringify(response.data, null, 2)
    )
    console.log(`🎯 Job ID: ${response.data.job_id}`)

    console.log('\n⏳ Ожидание обработки (30 секунд) для проверки Inngest...')
    console.log(
      '📋 Проверьте Inngest дашборд - теперь должно работать БЕЗ output_too_large!'
    )
    console.log(
      '🎉 Новая архитектура: ZIP распаковывается в контроллере, в Inngest передаются только пути!'
    )
  } catch (error) {
    if (error.response) {
      console.error(
        '❌ HTTP Error:',
        error.response.status,
        error.response.statusText
      )
      console.error('📄 Response:', error.response.data)
    } else if (error.request) {
      console.error('❌ Сеть недоступна:', error.message)
    } else {
      console.error('❌ Ошибка:', error.message)
    }
  }
}

testMorphingLocal()
