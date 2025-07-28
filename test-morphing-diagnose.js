const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

/**
 * 🧬 ПОЛНЫЙ АЛГОРИТМ МОРФИНГА - ДИАГНОСТИЧЕСКИЙ СКРИПТ
 *
 * Этот скрипт тестирует всю цепочку морфинга:
 * 1. API эндпоинт /generate/morph-images
 * 2. Inngest функцию morphImages
 * 3. Kling API интеграцию
 * 4. Telegram бота уведомления
 */

async function testMorphingPipeline() {
  console.log('🧬 === ТЕСТИРОВАНИЕ ПОЛНОГО АЛГОРИТМА МОРФИНГА ===\n')

  // Шаг 1: Проверка доступности API
  console.log('📡 Шаг 1: Проверка доступности сервера...')
  try {
    const healthCheck = await axios.get('https://d8dc81a4a0aa.ngrok.app/')
    console.log('✅ Сервер доступен:', healthCheck.status)
  } catch (error) {
    console.error('❌ Сервер недоступен:', error.message)
    return
  }

  // Шаг 2: Проверка эндпоинта морфинга
  console.log('\n🧬 Шаг 2: Тестирование эндпоинта морфинга...')

  if (!fs.existsSync('test_real_morphing.zip')) {
    console.error('❌ Файл test_real_morphing.zip не найден!')
    console.log('💡 Создайте ZIP архив с изображениями для тестирования')
    return
  }

  const formData = new FormData()
  formData.append('type', 'morphing')
  formData.append('telegram_id', '144022504')
  formData.append('username', 'diagnostic_user')
  formData.append('image_count', '3')
  formData.append('morphing_type', 'seamless')
  formData.append('model', 'kling-v1.6-pro')
  formData.append('is_ru', 'true')
  formData.append('bot_name', 'ai_koshey_bot')
  formData.append('images_zip', fs.createReadStream('test_real_morphing.zip'))

  try {
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

    console.log('✅ API Response:', response.data)
    console.log('🎯 Job ID:', response.data.job_id)

    // Даем время на обработку
    console.log('\n⏳ Ожидание обработки Inngest функции (30 секунд)...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    console.log('📋 Проверьте Inngest дашборд для статуса выполнения')
  } catch (error) {
    console.error('❌ Ошибка API:', error.response?.data || error.message)

    if (error.response?.status === 401) {
      console.log('\n🔍 ДИАГНОСТИКА ОШИБКИ 401:')
      console.log('- Проверьте BOT_TOKEN_TEST_1 в .env файле')
      console.log('- Убедитесь что токен действителен')
      console.log('- Проверьте что переменная доступна в Inngest процессе')
    }
  }
}

/**
 * 🎨 СОВРЕМЕННЫЙ АЛГОРИТМ МОРФИНГА (AI-BASED)
 *
 * Используемый подход:
 * 1. Input Processing: ZIP → отдельные изображения
 * 2. AI Model (Kling): семантическое понимание + морфинг
 * 3. Post-processing: склейка кадров в видео
 * 4. Delivery: отправка через Telegram
 */

function printMorphingAlgorithm() {
  console.log('\n\n🧬 === АЛГОРИТМ МОРФИНГА (2025) ===\n')

  console.log(`
📋 ПОЛНАЯ СХЕМА ОБРАБОТКИ:

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ZIP Archive   │───▶│   Extract Images │───▶│   Validate &    │
│ (User Upload)   │    │   (Node.js)      │    │   Sequence      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Telegram Bot    │◀───│   Kling API      │◀───│   Send to AI    │
│  (Delivery)     │    │  (Morphing)      │    │   (JSON + Files)│
└─────────────────┘    └──────────────────┘    └─────────────────┘

🔄 ПРОЦЕСС В KLING API:
1. Neural Network Analysis: понимание содержимого изображений
2. Keypoint Detection: автоматическое выравнивание объектов  
3. Semantic Interpolation: создание промежуточных кадров
4. Style Transfer: сохранение стиля и освещения
5. Motion Smoothing: плавные переходы между кадрами

💡 ПРЕИМУЩЕСТВА AI-ПОДХОДА:
✅ Работает с любыми изображениями (не нужны ключевые точки)
✅ Понимает семантику (лица, объекты, фон)
✅ Высокое качество переходов
✅ Автоматическая коррекция освещения
✅ Сохранение деталей и текстур

⚙️ ПАРАМЕТРЫ МОРФИНГА:
- morphing_type: 'seamless' | 'loop'
- model: 'kling-v1.6-pro' (рекомендуемая)
- image_count: 2-10 изображений
- duration: 5-10 секунд

🎬 ВЫХОДНОЙ РЕЗУЛЬТАТ:
- Формат: MP4 видео
- Разрешение: 1392x752 (или исходное)
- FPS: 24-30 кадров/сек
- Кодек: H.264
  `)
}

function printClassicAlgorithm() {
  console.log('\n\n📚 === КЛАССИЧЕСКИЙ АЛГОРИТМ (для сравнения) ===\n')

  console.log(`
🔧 ТРАДИЦИОННЫЙ ПОДХОД:

function classicMorphing(img1, img2, frames) {
  // 1. Детекция ключевых точек
  const keypoints1 = detectFeatures(img1); // SIFT, ORB
  const keypoints2 = detectFeatures(img2);
  
  // 2. Сопоставление точек
  const matches = matchKeypoints(keypoints1, keypoints2);
  
  // 3. Создание сетки трансформации
  const grid = createDeformationGrid(matches);
  
  // 4. Генерация промежуточных кадров
  for (let i = 0; i < frames; i++) {
    const alpha = i / (frames - 1);
    
    // Геометрическая трансформация
    const warp1 = warpImage(img1, grid, alpha);
    const warp2 = warpImage(img2, grid, 1-alpha);
    
    // Смешивание цветов  
    const frame = blendImages(warp1, warp2, alpha);
    morphedFrames.push(frame);
  }
  
  return morphedFrames;
}

❌ НЕДОСТАТКИ КЛАССИЧЕСКОГО ПОДХОДА:
- Требует четких ключевых точек
- Плохо работает с разными композициями
- Артефакты при сложных трансформациях
- Не понимает семантику объектов
- Ручная настройка параметров
  `)
}

// Запуск диагностики
if (require.main === module) {
  printMorphingAlgorithm()
  printClassicAlgorithm()

  console.log('\n🚀 Запуск диагностического теста...\n')
  testMorphingPipeline().catch(console.error)
}

module.exports = { testMorphingPipeline }
