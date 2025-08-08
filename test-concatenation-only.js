/**
 * 🔧 Тест только этапа склейки видео (concatenation)
 * Использует реальные PNG изображения из assets для прохождения Replicate API
 */

const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://ai-server-u14194.vm.elestio.app'
    : 'http://localhost:4000'

async function testConcatenationStage() {
  console.log('🔧 === ТЕСТ ЭТАПА СКЛЕЙКИ ВИДЕО ===')

  try {
    // 1. Создаем ZIP с 3 реальными изображениями
    console.log('📦 Создаем ZIP с реальными PNG изображениями...')
    const testZipPath = './test-concatenation.zip'

    const AdmZip = require('adm-zip')
    const zip = new AdmZip()

    // Используем реальные изображения из assets
    const realImages = [
      'assets/bible_vibecoder/01.png',
      'assets/bible_vibecoder/02.png',
      'assets/bible_vibecoder/03.png',
    ]

    // Проверяем что файлы существуют
    for (let i = 0; i < realImages.length; i++) {
      const imagePath = realImages[i]
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Изображение не найдено: ${imagePath}`)
      }

      const imageBuffer = fs.readFileSync(imagePath)
      const imageName = `morphing_image_${String(i + 1).padStart(3, '0')}.png`

      zip.addFile(imageName, imageBuffer)
      console.log(
        `✅ Добавлено ${imageName}: ${(imageBuffer.length / 1024).toFixed(
          1
        )} KB`
      )
    }

    zip.writeZip(testZipPath)
    console.log(`✅ ZIP создан с ${realImages.length} реальными изображениями`)

    // 2. Отправляем запрос к API
    console.log('🚀 Отправляем запрос для теста склейки...')

    const form = new FormData()
    form.append('type', 'morphing')
    form.append('telegram_id', '144022504')
    form.append('image_count', realImages.length.toString())
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
          'User-Agent': 'concatenation-test/1.0',
        },
        timeout: 30000,
      }
    )

    console.log('✅ API Response:', response.status, response.statusText)
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2))

    if (response.data.job_id) {
      const jobId = response.data.job_id

      console.log(`\n🔍 === МОНИТОРИНГ ЭТАПА СКЛЕЙКИ ${jobId} ===`)

      // 3. Особый мониторинг - ждем именно этапа склейки
      await monitorConcatenationStage(jobId)
    }

    // Очистка
    if (fs.existsSync(testZipPath)) {
      fs.unlinkSync(testZipPath)
      console.log('🧹 Тестовый файл удален')
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования склейки:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    })
  }
}

async function monitorConcatenationStage(jobId) {
  console.log(`🔧 Мониторим ИМЕННО этап склейки для: ${jobId}`)

  const maxChecks = 30 // Увеличиваем до 30 проверок (15 минут)
  const checkInterval = 30000 // 30 секунд между проверками

  let lastStatus = null
  let concatenationStarted = false

  for (let i = 0; i < maxChecks; i++) {
    try {
      const statusResponse = await axios.get(
        `${API_BASE_URL}/generate/morph-jobs/${jobId}/status`,
        {
          timeout: 10000,
        }
      )

      const job = statusResponse.data

      // Проверяем изменения в статусе
      if (job.status !== lastStatus) {
        console.log(`\n🔄 ИЗМЕНЕНИЕ СТАТУСА: ${lastStatus} → ${job.status}`)
        lastStatus = job.status
      }

      console.log(`\n📊 Проверка ${i + 1}/${maxChecks}:`)
      console.log(`   Status: ${job.status}`)
      console.log(
        `   Progress: ${job.progress.completed_pairs}/${job.progress.total_pairs} (${job.progress.percentage}%)`
      )

      if (job.progress.current_pair) {
        console.log(`   Current: ${job.progress.current_pair}`)
      }

      // 🎯 ОПРЕДЕЛЯЕМ КОГДА НАЧИНАЕТСЯ СКЛЕЙКА
      if (
        job.progress.completed_pairs === job.progress.total_pairs &&
        job.status === 'processing'
      ) {
        if (!concatenationStarted) {
          console.log(`\n🔧 === ЭТАП СКЛЕЙКИ НАЧАЛСЯ! ===`)
          console.log(
            `✅ Все пары обработаны (${job.progress.completed_pairs}/${job.progress.total_pairs})`
          )
          console.log(`🎬 Началась склейка видео в финальное...`)
          concatenationStarted = true
        } else {
          console.log(`🔧 Склейка продолжается...`)
        }
      }

      if (job.error_message) {
        console.log(`   ❌ Error: ${job.error_message}`)

        // 🔍 АНАЛИЗИРУЕМ ОШИБКИ СКЛЕЙКИ
        if (job.error_message.includes('ffmpeg')) {
          console.log(`\n🔧 === ОБНАРУЖЕНА ОШИБКА FFMPEG ===`)
          console.log(`❌ FFmpeg Error: ${job.error_message}`)
          console.log(`🔄 Должна сработать fallback система...`)
        }
      }

      // Завершенные состояния
      if (job.status === 'completed') {
        console.log(`\n🎉 === СКЛЕЙКА ЗАВЕРШЕНА УСПЕШНО! ===`)
        if (job.result) {
          console.log(
            `   Время обработки: ${Math.round(
              job.result.processing_time_minutes
            )} минут`
          )
          console.log(`   Пары обработаны: ${job.result.pairs_processed}`)
          console.log(`   ✅ FFmpeg склейка работает корректно`)
        }
        break
      }

      if (job.status === 'failed') {
        console.log(`\n❌ === СКЛЕЙКА ПРОВАЛЕНА ===`)
        console.log(`Error: ${job.error_message}`)

        // Анализируем причину провала
        if (job.error_message.includes('ffmpeg')) {
          console.log(`\n🔧 ДИАГНОСТИКА FFMPEG:`)
          console.log(`- Проблема с установкой FFmpeg в Docker`)
          console.log(`- Fallback система должна была сработать`)
          console.log(
            `- Проверьте логи: docker-compose logs ai-server | grep ffmpeg`
          )
        }
        break
      }

      // Продолжаем мониторинг
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

  console.log(`\n🔧 === ЗАКЛЮЧЕНИЕ ПО СКЛЕЙКЕ ===`)
  if (concatenationStarted) {
    console.log(`✅ Этап склейки был достигнут`)
    console.log(`📊 Можно анализировать работу FFmpeg`)
  } else {
    console.log(`❌ Этап склейки не был достигнут`)
    console.log(`⚠️ Ошибка произошла на более раннем этапе (Replicate API)`)
  }
}

// Запуск теста
if (require.main === module) {
  testConcatenationStage()
    .then(() => console.log('\n🎉 Тест этапа склейки завершен!'))
    .catch(console.error)
}
