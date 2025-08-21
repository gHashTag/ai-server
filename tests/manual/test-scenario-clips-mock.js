/**
 * Mock test for generateScenarioClips function
 * Тест с моками для проверки основной логики без внешних API
 */

const { Inngest } = require('inngest')

// Создаем Inngest клиент
const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Тестовое событие с моками
const mockTestEvent = {
  id: 'scenario-clips-mock-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    // Используем реальное фото 999-icon.jpg
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',

    // Простой промпт для проверки
    prompt: 'Test scene with number 999',

    // Только 1 сцена
    scene_count: 1,

    // Только 1 вариант
    variants_per_scene: 1,

    // Квадратный формат для простоты
    aspect_ratio: '1:1',

    // Используем mock режим
    flux_model: 'mock-test-model',

    // Параметры проекта
    project_id: 1,
    requester_telegram_id: '144022504',

    // Метаданные с флагом mock
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'mock-scenario-test',
      test_env: 'development',
      version: '1.0.0',
      mock_mode: true, // Флаг для обхода внешних API
    },
  },
}

async function runMockTest() {
  console.log('🧪 Запуск Mock тестирования generateScenarioClips...')
  console.log('📸 Фото:', mockTestEvent.data.photo_url)
  console.log('📜 Промпт:', mockTestEvent.data.prompt)
  console.log('🎭 Сцены:', mockTestEvent.data.scene_count)
  console.log('🎨 Варианты:', mockTestEvent.data.variants_per_scene)
  console.log('🔧 Mock режим: Включен')

  try {
    console.log('\n📤 Отправляем mock событие в Inngest...')
    await inngest.send(mockTestEvent)
    console.log('✅ Mock событие успешно отправлено!')
    console.log(
      '📊 Проверьте прогресс в Inngest Dashboard: http://localhost:8288'
    )
    console.log('⏱️ Mock тест должен завершиться быстро (без внешних API)')
    console.log('📁 Результаты будут сохранены в: ./output/')
  } catch (error) {
    console.error('❌ Ошибка при отправке mock события:', error)
  }
}

// Запускаем mock тест
runMockTest()
