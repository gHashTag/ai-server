/**
 * Test generateScenarioClips with custom ghashtag model
 * Тест с кастомной моделью ghashtag (возможно flux kontext max)
 */

const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Тест с кастомной моделью ghashtag
const customModelEvent = {
  id: 'custom-model-test-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',
    prompt:
      'Divine coding wisdom with number 999, neuro-coder style, mystical programming energy',
    scene_count: 1,
    variants_per_scene: 1,
    aspect_ratio: '1:1',

    // Используем кастомную модель ghashtag (возможно flux kontext max)
    flux_model:
      'ghashtag/neuro_coder_flux-dev-lora:5ff9ea5918427540563f09940bf95d6efc16b8ce9600e82bb17c2b188384e355',

    project_id: 1,
    requester_telegram_id: '144022504',
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'custom-ghashtag-model-test',
      model_type: 'neuro_coder_flux',
    },
  },
}

async function testCustomModel() {
  console.log('🧠 Тест generateScenarioClips с кастомной моделью ghashtag')
  console.log('📝 Параметры:')
  console.log(
    '  🎨 Модель:',
    customModelEvent.data.flux_model.split('/')[1].split(':')[0]
  )
  console.log('  🎭 Сцены:', customModelEvent.data.scene_count)
  console.log('  🖼️ Варианты:', customModelEvent.data.variants_per_scene)
  console.log('  📐 Формат:', customModelEvent.data.aspect_ratio)

  try {
    console.log('\n📤 Отправляем событие с кастомной моделью...')
    await inngest.send(customModelEvent)

    console.log('✅ Событие отправлено! ID:', customModelEvent.id)
    console.log('📊 Статус: http://localhost:8288')
    console.log('⏱️ Ожидаемое время: ~20-40 секунд')
    console.log('🎨 Используется ваша кастомная модель neuro_coder_flux!')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testCustomModel()
