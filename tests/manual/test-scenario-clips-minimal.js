/**
 * Minimal test for generateScenarioClips function
 * Минимальный тест с 1 сценой и 1 вариантом для быстрой проверки
 */

const { Inngest } = require('inngest')

// Создаем Inngest клиент
const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Минимальное тестовое событие
const minimalTestEvent = {
  id: 'scenario-clips-minimal-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    // Используем реальное фото 999-icon.jpg
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',

    // Простой промпт
    prompt:
      'Divine mystical scene with number 999, cosmic enlightenment, sacred coding wisdom',

    // Только 1 сцена для быстрого теста
    scene_count: 1,

    // Только 1 вариант
    variants_per_scene: 1,

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
      test: 'minimal-scenario-test',
      test_env: 'development',
      version: '1.0.0',
    },
  },
}

async function runMinimalTest() {
  console.log('🔥 Запуск минимального тестирования generateScenarioClips...')
  console.log('📸 Фото:', minimalTestEvent.data.photo_url)
  console.log('📜 Промпт:', minimalTestEvent.data.prompt)
  console.log('🎭 Сцены:', minimalTestEvent.data.scene_count)
  console.log('🎨 Варианты:', minimalTestEvent.data.variants_per_scene)

  const totalImages =
    minimalTestEvent.data.scene_count * minimalTestEvent.data.variants_per_scene
  const costStars = Math.round(((0.055 * totalImages) / 0.016) * 1.5)
  console.log(
    `💰 Примерная стоимость: ${costStars} звезд (${totalImages} изображений)`
  )

  try {
    console.log('\n📤 Отправляем минимальное событие в Inngest...')
    await inngest.send(minimalTestEvent)
    console.log('✅ Минимальное событие успешно отправлено!')
    console.log(
      '📊 Проверьте прогресс в Inngest Dashboard: http://localhost:8288'
    )
    console.log('⏱️ Ожидайте результаты примерно через 1-2 минуты')
    console.log('📁 Результаты будут сохранены в: ./output/')
    console.log(
      '🗂️ Архив будет создан как: ./output/*_scenario_clips_results.zip'
    )
  } catch (error) {
    console.error('❌ Ошибка при отправке минимального события:', error)
  }
}

// Запускаем минимальный тест
runMinimalTest()
