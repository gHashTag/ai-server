/**
 * Simple debug test for generateScenarioClips
 * Простой отладочный тест
 */

const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Максимально простое событие
const simpleTestEvent = {
  id: 'scenario-debug-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',
    prompt: 'Simple test with number 999',
    scene_count: 1,
    variants_per_scene: 1,
    aspect_ratio: '1:1',
    flux_model: 'black-forest-labs/flux-schnell', // Быстрая модель
    project_id: 1,
    requester_telegram_id: '144022504',
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'simple-debug-test',
      debug: true,
    },
  },
}

async function runSimpleTest() {
  console.log('🔧 Простой отладочный тест generateScenarioClips')
  console.log('📝 Параметры:', {
    scenes: simpleTestEvent.data.scene_count,
    variants: simpleTestEvent.data.variants_per_scene,
    model: simpleTestEvent.data.flux_model,
  })

  try {
    console.log('📤 Отправляем простое событие...')
    await inngest.send(simpleTestEvent)
    console.log('✅ Событие отправлено! ID:', simpleTestEvent.id)
    console.log('📊 Проверьте: http://localhost:8288')
    console.log('⚡ Используется быстрая модель flux-schnell (~5-10 секунд)')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

runSimpleTest()
