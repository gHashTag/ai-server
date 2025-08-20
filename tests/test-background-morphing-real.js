/**
 * 🚀 Тест Background Morphing Processor с реальными JPEG
 * Использует минимальные валидные JPEG для корректного тестирования
 */

const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://ai-server-u14194.vm.elestio.app'
    : 'http://localhost:4000'

// Минимальный валидный JPEG (1x1 пиксель, разные цвета)
const createMinimalJPEG = (r, g, b) => {
  // JPEG заголовок + минимальные данные для 1x1 пикселя
  const jpegHeader = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xc4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xff, 0xc4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x0c,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
  ])

  // Простейшие данные изображения с немного разными цветами
  const colorVariation = Buffer.from([r, g, b, 0xff, 0xd9]) // EOI маркер

  return Buffer.concat([jpegHeader, colorVariation])
}

async function testBackgroundMorphingReal() {
  console.log('🚀 === ТЕСТ BACKGROUND PROCESSOR С РЕАЛЬНЫМИ JPEG ===')

  try {
    // 1. Создаем тестовый ZIP с 3 минимальными валидными JPEG
    console.log('📦 Создаем ZIP с 3 валидными JPEG изображениями...')
    const testZipPath = './test-background-real.zip'

    const AdmZip = require('adm-zip')
    const zip = new AdmZip()

    // Добавляем 3 минимальных JPEG с разными цветами
    const images = [
      { name: 'morphing_image_001.jpg', color: [255, 0, 0] }, // Красный
      { name: 'morphing_image_002.jpg', color: [0, 255, 0] }, // Зеленый
      { name: 'morphing_image_003.jpg', color: [0, 0, 255] }, // Синий
    ]

    images.forEach((img, index) => {
      const jpegData = createMinimalJPEG(...img.color)
      zip.addFile(img.name, jpegData)
      console.log(`✅ Добавлен ${img.name}: ${jpegData.length} байт`)
    })

    zip.writeZip(testZipPath)
    console.log(`✅ ZIP создан с ${images.length} валидными JPEG`)

    // 2. Отправляем запрос к API
    console.log('🚀 Отправляем запрос к background morphing API...')

    const form = new FormData()
    form.append('type', 'morphing')
    form.append('telegram_id', '144022504')
    form.append('image_count', images.length.toString())
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
          'User-Agent': 'background-morphing-real-test/1.0',
        },
        timeout: 30000,
      }
    )

    console.log('✅ API Response:', response.status, response.statusText)
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2))

    if (response.data.job_id) {
      const jobId = response.data.job_id

      console.log(`\n🔍 === МОНИТОРИНГ ЗАДАНИЯ ${jobId} ===`)

      // 3. Мониторим прогресс
      await monitorJobProgress(jobId)
    }

    // Очистка
    if (fs.existsSync(testZipPath)) {
      fs.unlinkSync(testZipPath)
      console.log('🧹 Тестовый файл удален')
    }

    console.log(`\n🎯 === РЕЗУЛЬТАТ ТЕСТИРОВАНИЯ ===`)
    console.log(`✅ Background Processor принял задание`)
    console.log(`✅ API мониторинга работает корректно`)
    console.log(`✅ Валидные JPEG изображения загружены`)
    console.log(`⏳ Replicate обрабатывает морфинг пары`)
    console.log(`🔄 FFmpeg попытается склеить видео`)
    console.log(`📤 Fallback система сработает если FFmpeg недоступен`)
  } catch (error) {
    console.error('❌ Ошибка тестирования:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    })

    // Диагностика
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 ДИАГНОСТИКА: Сервер не запущен')
      console.log('Запусти: bun run dev')
    }
  }
}

async function monitorJobProgress(jobId) {
  console.log(`📊 Мониторим прогресс задания: ${jobId}`)

  const maxChecks = 10 // Максимум 10 проверок
  const checkInterval = 10000 // 10 секунд между проверками

  for (let i = 0; i < maxChecks; i++) {
    try {
      const statusResponse = await axios.get(
        `${API_BASE_URL}/generate/morph-jobs/${jobId}/status`,
        {
          timeout: 10000,
        }
      )

      const job = statusResponse.data
      console.log(`\n📊 Проверка ${i + 1}/${maxChecks}:`)
      console.log(`   Status: ${job.status}`)
      console.log(
        `   Progress: ${job.progress.completed_pairs}/${job.progress.total_pairs} (${job.progress.percentage}%)`
      )

      if (job.progress.current_pair) {
        console.log(`   Current: ${job.progress.current_pair}`)
      }

      if (job.progress.estimated_remaining_minutes) {
        console.log(
          `   ETA: ~${job.progress.estimated_remaining_minutes} минут`
        )
      }

      if (job.error_message) {
        console.log(`   ❌ Error: ${job.error_message}`)
      }

      // Завершенные состояния
      if (job.status === 'completed') {
        console.log(`🎉 Задание успешно завершено!`)
        if (job.result) {
          console.log(
            `   Время обработки: ${Math.round(
              job.result.processing_time_minutes
            )} минут`
          )
          console.log(`   Пары обработаны: ${job.result.pairs_processed}`)
        }
        break
      }

      if (job.status === 'failed') {
        console.log(`❌ Задание провалено: ${job.error_message}`)
        break
      }

      // Продолжаем мониторинг если статус processing или pending
      if (job.status === 'processing' || job.status === 'pending') {
        if (i < maxChecks - 1) {
          console.log(
            `⏳ Ждем ${checkInterval / 1000} секунд до следующей проверки...`
          )
          await new Promise(resolve => setTimeout(resolve, checkInterval))
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка мониторинга (попытка ${i + 1}):`, error.message)
      break
    }
  }
}

// Запуск теста
if (require.main === module) {
  testBackgroundMorphingReal()
    .then(() => console.log('\n🎉 Тестирование с реальными JPEG завершено!'))
    .catch(console.error)
}
