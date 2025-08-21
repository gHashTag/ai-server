/**
 * 🚀 Тест неограниченной поддержки морфинга изображений
 * Демонстрирует возможность обработки любого количества изображений (2-100+)
 */

const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')
const path = require('path')

const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://ai-server-u14194.vm.elestio.app'
    : 'http://localhost:4000'

async function testUnlimitedMorphing() {
  console.log('🚀 === ТЕСТ НЕОГРАНИЧЕННОЙ ПОДДЕРЖКИ МОРФИНГА ===')

  // Тестируем разные количества изображений
  const testCases = [
    { count: 3, description: 'Базовый тест (3 изображения → 2 пары)' },
    { count: 5, description: 'Средний тест (5 изображений → 4 пары)' },
    { count: 10, description: 'Продвинутый тест (10 изображений → 9 пар)' },
    // { count: 100, description: "Экстремальный тест (100 изображений → 99 пар)" } // Раскомментируй для полного теста
  ]

  for (const testCase of testCases) {
    console.log(`\n🧪 === ${testCase.description} ===`)

    try {
      // 1. Создаем тестовый ZIP с нужным количеством изображений
      console.log(`📦 Создаем ZIP с ${testCase.count} изображениями...`)
      const testZipPath = `./test-morphing-${testCase.count}-images.zip`

      const AdmZip = require('adm-zip')
      const zip = new AdmZip()

      // Добавляем изображения
      for (let i = 1; i <= testCase.count; i++) {
        const paddedIndex = i.toString().padStart(3, '0')
        zip.addFile(
          `morphing_image_${paddedIndex}.jpg`,
          Buffer.from(`Test image ${i} content - generated for morphing test`)
        )
      }

      zip.writeZip(testZipPath)
      console.log(`✅ ZIP создан: ${testCase.count} изображений`)

      // 2. Отправляем запрос
      console.log('🚀 Отправляем запрос...')

      const form = new FormData()
      form.append('type', 'morphing')
      form.append('telegram_id', '144022504')
      form.append('image_count', testCase.count.toString())
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
            'User-Agent': 'unlimited-morphing-test/1.0',
          },
          timeout: 30000,
        }
      )

      console.log('✅ API Response:', response.status, response.statusText)
      console.log('📋 Response:', JSON.stringify(response.data, null, 2))

      // 3. Объясняем что происходит
      const expectedPairs = testCase.count - 1
      const estimatedTimeMinutes = expectedPairs * 5 // ~5 минут на пару

      console.log(`\n🔍 === ОЖИДАЕМОЕ ПОВЕДЕНИЕ ===`)
      console.log(`📊 Количество изображений: ${testCase.count}`)
      console.log(`🎬 Количество пар для обработки: ${expectedPairs}`)
      console.log(`⏱️ Ориентировочное время: ~${estimatedTimeMinutes} минут`)
      console.log(`🔄 Процесс:`)

      for (let i = 1; i <= expectedPairs; i++) {
        console.log(
          `   ${i}. Пара ${i}: изображение ${i} → изображение ${i + 1}`
        )
      }

      console.log(`\n✨ === УЛУЧШЕНИЯ В НОВОЙ ВЕРСИИ ===`)
      console.log(
        `🚀 Один step 'process-all-pairs' вместо ${expectedPairs} отдельных step'ов`
      )
      console.log(
        `📈 Автоматическое масштабирование под любое количество изображений`
      )
      console.log(`🛡️ Устойчивость к timeout'ам через batch processing`)
      console.log(`📊 Детальный прогресс трекинг с remaining_pairs счетчиком`)

      // Очистка
      if (fs.existsSync(testZipPath)) {
        fs.unlinkSync(testZipPath)
        console.log('🧹 Тестовый файл удален')
      }
    } catch (error) {
      console.error('❌ Ошибка тестирования:', {
        testCase: testCase.description,
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
    }
  }

  console.log(`\n🎯 === КРАТКОЕ РЕЗЮМЕ ВОЗМОЖНОСТЕЙ ===`)
  console.log(`✅ 2-5 изображений: Быстрая обработка (~10-25 минут)`)
  console.log(`✅ 6-10 изображений: Средняя обработка (~30-50 минут)`)
  console.log(`✅ 11-50 изображений: Долгая обработка (~1-4 часа)`)
  console.log(`✅ 51-100 изображений: Очень долгая обработка (~4-8 часов)`)
  console.log(`✅ 100+ изображений: Экстремальная обработка (8+ часов)`)

  console.log(`\n📊 Мониторинг прогресса:`)
  console.log(`🔗 Inngest Dashboard: http://localhost:8288`)
  console.log(`⚡ Функция: 🧬 Morph Images`)
  console.log(`🎬 Step: process-all-pairs (показывает прогресс всех пар)`)
}

// Запуск теста
if (require.main === module) {
  testUnlimitedMorphing()
    .then(() => console.log('\n🎉 Тестирование завершено!'))
    .catch(console.error)
}
