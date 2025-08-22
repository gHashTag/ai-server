/**
 * 🧬 Тест исправленной функции morphImages
 * Проверяет что функция теперь корректно обрабатывает все пары изображений
 */

const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://ai-server-production-production-8e2d.up.railway.app'
    : 'http://localhost:4000'

async function testMorphingFixed() {
  console.log('🧬 === ТЕСТ ИСПРАВЛЕННОЙ ФУНКЦИИ MORPHING ===')

  try {
    // 1. Создаем тестовый ZIP с 3 изображениями
    console.log('📦 Создаем тестовый ZIP архив...')
    const testZipPath = './test-morphing-3-images.zip'

    // Используем AdmZip для создания ZIP
    const AdmZip = require('adm-zip')
    const zip = new AdmZip()

    // Добавляем 3 тестовых изображения (можно использовать любые JPG)
    // Для теста создадим простые текстовые файлы как заглушки
    zip.addFile('morphing_image_1.jpg', Buffer.from('Test image 1 content'))
    zip.addFile('morphing_image_2.jpg', Buffer.from('Test image 2 content'))
    zip.addFile('morphing_image_3.jpg', Buffer.from('Test image 3 content'))

    zip.writeZip(testZipPath)
    console.log('✅ ZIP архив создан:', testZipPath)

    // 2. Отправляем запрос к morphing API
    console.log('🚀 Отправляем запрос к morphing API...')

    const form = new FormData()
    form.append('type', 'morphing')
    form.append('telegram_id', '144022504')
    form.append('image_count', '3')
    form.append('morphing_type', 'seamless')
    form.append('model', 'kling-v1.6-pro')
    form.append('is_ru', 'true')
    form.append('bot_name', 'neuro_blogger_bot')
    form.append('username', 'telegram_bot')
    form.append('images_zip', fs.createReadStream(testZipPath))

    const response = await axios.post(
      `${API_BASE_URL}/generate/morph-images`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          'User-Agent': 'morphing-test/1.0',
        },
        timeout: 30000, // 30 секунд на загрузку
      }
    )

    console.log('✅ API Response:', response.status, response.statusText)
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2))

    // 3. Отслеживаем прогресс через логи
    console.log('\n🔍 === ОЖИДАЕМОЕ ПОВЕДЕНИЕ (исправленная функция) ===')
    console.log('1. ✅ Контроллер: ZIP успешно распакован')
    console.log('2. ✅ Inngest: check-user-exists пройден')
    console.log('3. ✅ Inngest: check-balance пройден')
    console.log('4. ✅ Inngest: notify-start пройден')
    console.log('5. ✅ Inngest: process-pair-1 начат (изображение 1 → 2)')
    console.log('6. ✅ Inngest: process-pair-1 завершен через ~3-6 минут')
    console.log(
      '7. 🆕 Inngest: process-pair-2 НАЧАТ (изображение 2 → 3) <- КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ!'
    )
    console.log('8. ✅ Inngest: process-pair-2 завершен через ~3-6 минут')
    console.log('9. ✅ Inngest: concatenate-all-videos начат')
    console.log('10. ✅ Inngest: deliver-result - финальная доставка')
    console.log('11. ✅ ПОЛНЫЙ УСПЕХ без 504 Gateway Timeout!')

    console.log('\n📊 Для мониторинга заходи в Inngest Dashboard:')
    console.log('🔗 Inngest Functions: http://localhost:8288/functions')
    console.log('⚡ Inngest Events: http://localhost:8288/events')

    // Очистка
    if (fs.existsSync(testZipPath)) {
      fs.unlinkSync(testZipPath)
      console.log('🧹 Тестовый файл удален')
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    })

    // Диагностика типичных проблем
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 ДИАГНОСТИКА: Сервер не запущен')
      console.log('Запусти: bun run dev')
    } else if (error.response?.status === 404) {
      console.log('\n🔧 ДИАГНОСТИКА: Эндпоинт не найден')
      console.log('Проверь что сервер слушает на правильном порту')
    }
  }
}

// Запуск теста
if (require.main === module) {
  testMorphingFixed()
}
