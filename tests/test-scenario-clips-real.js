/**
 * Real test for generateScenarioClips function
 * Реальный тест с фото 999-icon.jpg
 */

const { Inngest } = require('inngest')

// Создаем Inngest клиент
const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Тестовое событие для функции generateScenarioClips
const generateScenarioClipsTestEvent = {
  id: 'scenario-clips-test-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    // Используем реальное фото 999-icon.jpg из assets
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',

    // Библейская мудрость из dharma coding
    prompt:
      'Epic divine creation story with the mystical number 999, cosmic consciousness awakening, sacred geometry manifestation, digital dharma coding wisdom, transcendent technological enlightenment',

    // 4 сцены для начального теста
    scene_count: 4,

    // 2 варианта каждой сцены
    variants_per_scene: 2,

    // Вертикальный формат
    aspect_ratio: '9:16',

    // FLUX модель
    flux_model: 'black-forest-labs/flux-1.1-pro',

    // Параметры проекта
    project_id: 1,
    requester_telegram_id: '144022504',

    // Метаданные
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'guru-999-dharma-creation-test',
      test_env: 'development',
      version: '1.0.0',
      theme: 'DIVINE_CREATION',
    },
  },
}

async function runTest() {
  console.log('🎬 Запуск тестирования generateScenarioClips...')
  console.log('📸 Фото:', generateScenarioClipsTestEvent.data.photo_url)
  console.log('📜 Промпт:', generateScenarioClipsTestEvent.data.prompt)
  console.log('🎭 Сцены:', generateScenarioClipsTestEvent.data.scene_count)
  console.log(
    '🎨 Варианты:',
    generateScenarioClipsTestEvent.data.variants_per_scene
  )

  const totalImages =
    generateScenarioClipsTestEvent.data.scene_count *
    generateScenarioClipsTestEvent.data.variants_per_scene
  const costStars = Math.round(((0.055 * totalImages) / 0.016) * 1.5)
  console.log(
    `💰 Примерная стоимость: ${costStars} звезд (${totalImages} изображений)`
  )

  try {
    console.log('\n📤 Отправляем событие в Inngest...')
    await inngest.send(generateScenarioClipsTestEvent)
    console.log('✅ Событие успешно отправлено!')
    console.log(
      '📊 Проверьте прогресс в Inngest Dashboard: http://localhost:8288'
    )
    console.log('📁 Результаты будут сохранены в: ./output/')
    console.log(
      '🗂️ Архив будет создан как: ./output/*_scenario_clips_results.zip'
    )
  } catch (error) {
    console.error('❌ Ошибка при отправке события:', error)
  }
}

// Запускаем тест
runTest()
