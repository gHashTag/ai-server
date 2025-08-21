const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

/**
 * 🧬 ТЕСТ МОРФИНГА С РАБОЧИМ БОТОМ
 *
 * Используем clip_maker_neuro_bot вместо ai_koshey_bot
 * поскольку его токен действителен
 */

async function testMorphingWithWorkingBot() {
  console.log('🧬 === ТЕСТИРОВАНИЕ МОРФИНГА С РАБОЧИМ БОТОМ ===\n')

  if (!fs.existsSync('test_real_morphing.zip')) {
    console.error('❌ Файл test_real_morphing.zip не найден!')
    return
  }

  const formData = new FormData()
  formData.append('type', 'morphing')
  formData.append('telegram_id', '144022504')
  formData.append('username', 'test_working_bot')
  formData.append('image_count', '3')
  formData.append('morphing_type', 'seamless')
  formData.append('model', 'kling-v1.6-pro')
  formData.append('is_ru', 'true')
  formData.append('bot_name', 'clip_maker_neuro_bot') // Используем РАБОЧИЙ бот!
  formData.append('images_zip', fs.createReadStream('test_real_morphing.zip'))

  try {
    console.log('📤 Отправляем запрос с рабочим ботом...')

    const response = await axios.post(
      'https://d8dc81a4a0aa.ngrok.app/generate/morph-images',
      formData,
      {
        headers: {
          'x-secret-key': 'test-secret-key',
          ...formData.getHeaders(),
        },
        timeout: 30000,
      }
    )

    console.log('✅ УСПЕХ! API Response:', response.data)
    console.log('🎯 Job ID:', response.data.job_id)

    console.log('\n⏳ Ожидание обработки (30 секунд) для проверки Inngest...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    console.log('📋 Проверьте Inngest дашборд - теперь должно работать!')
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message)
  }
}

if (require.main === module) {
  testMorphingWithWorkingBot().catch(console.error)
}

module.exports = { testMorphingWithWorkingBot }
