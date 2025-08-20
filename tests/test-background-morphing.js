/**
 * 🚀 Тест Background Morphing Processor
 * Демонстрирует новую архитектуру без ограничений Inngest
 */

const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://ai-server-u14194.vm.elestio.app'
    : 'http://localhost:4000'

async function testBackgroundMorphing() {
  console.log('🚀 === ТЕСТ BACKGROUND MORPHING PROCESSOR ===')

  try {
    // 1. Создаем тестовый ZIP с 5 изображениями
    console.log('📦 Создаем тестовый ZIP архив...')
    const testZipPath = './test-background-morphing.zip'

    const AdmZip = require('adm-zip')
    const zip = new AdmZip()

    // Добавляем 5 тестовых изображений
    for (let i = 1; i <= 5; i++) {
      const paddedIndex = i.toString().padStart(3, '0')
      zip.addFile(
        `morphing_image_${paddedIndex}.jpg`,
        Buffer.from(`Test image ${i} content for background processor`)
      )
    }

    zip.writeZip(testZipPath)
    console.log('✅ ZIP создан с 5 изображениями')

    // 2. Отправляем запрос к новому API
    console.log('🚀 Отправляем запрос к background morphing API...')

    const form = new FormData()
    form.append('type', 'morphing')
    form.append('telegram_id', '144022504')
    form.append('image_count', '5')
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
          'User-Agent': 'background-morphing-test/1.0',
        },
        timeout: 30000,
      }
    )

    console.log('✅ API Response:', response.status, response.statusText)
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2))

    if (response.data.job_id) {
      const jobId = response.data.job_id

      console.log(`\n🔍 === МОНИТОРИНГ ЗАДАНИЯ ${jobId} ===`)

      // 3. Тестируем API мониторинга
      await testJobMonitoring(jobId)

      // 4. Тестируем статистику пользователя
      console.log('\n📊 === СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ===')
      const userJobsResponse = await axios.get(
        `${API_BASE_URL}/generate/morph-jobs/user/144022504`,
        {
          timeout: 10000,
        }
      )

      console.log(
        '📊 User Jobs:',
        JSON.stringify(userJobsResponse.data, null, 2)
      )

      // 5. Тестируем общую статистику очереди
      console.log('\n📊 === СТАТИСТИКА ОЧЕРЕДИ ===')
      const queueStatsResponse = await axios.get(
        `${API_BASE_URL}/generate/morph-queue/stats`,
        {
          timeout: 10000,
        }
      )

      console.log(
        '📊 Queue Stats:',
        JSON.stringify(queueStatsResponse.data, null, 2)
      )
    }

    // Очистка
    if (fs.existsSync(testZipPath)) {
      fs.unlinkSync(testZipPath)
      console.log('🧹 Тестовый файл удален')
    }

    console.log(`\n🎯 === КЛЮЧЕВЫЕ ПРЕИМУЩЕСТВА НОВОЙ АРХИТЕКТУРЫ ===`)
    console.log(`✅ Нет ограничений по времени выполнения (было: 2 часа max)`)
    console.log(`✅ Нет ограничений по количеству изображений (было: 6 max)`)
    console.log(`✅ Полный мониторинг прогресса через API`)
    console.log(`✅ Фоновая обработка без блокировки`)
    console.log(`✅ Устойчивость к сбоям сервера`)
    console.log(`✅ Масштабируемость (можно добавить Redis/PostgreSQL)`)
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

async function testJobMonitoring(jobId) {
  console.log(`📊 Тестируем мониторинг задания: ${jobId}`)

  try {
    const statusResponse = await axios.get(
      `${API_BASE_URL}/generate/morph-jobs/${jobId}/status`,
      {
        timeout: 10000,
      }
    )

    console.log('📊 Job Status:', JSON.stringify(statusResponse.data, null, 2))

    console.log(`\n💡 === ОБЪЯСНЕНИЕ СТАТУСОВ ===`)
    console.log(`📝 pending: Задание в очереди, ожидает обработки`)
    console.log(`⚡ processing: Активно обрабатывается (создаются пары видео)`)
    console.log(`✅ completed: Успешно завершено, видео доставлено`)
    console.log(`❌ failed: Произошла ошибка`)

    console.log(`\n📊 === ПРОГРЕСС ТРЕКИНГ ===`)
    console.log(`🎬 completed_pairs / total_pairs = процент готовности`)
    console.log(
      `⏱️ estimated_remaining_minutes = примерное время до завершения`
    )
    console.log(`🎯 current_pair = какая пара сейчас обрабатывается`)
  } catch (error) {
    console.error('❌ Ошибка мониторинга:', error.message)
  }
}

// Запуск теста
if (require.main === module) {
  testBackgroundMorphing()
    .then(() =>
      console.log('\n🎉 Тестирование background processor завершено!')
    )
    .catch(console.error)
}
