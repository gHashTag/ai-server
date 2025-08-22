/**
 * Test generateScenarioClips with black-forest-labs/flux-kontext-max
 * Тест с официальной моделью FLUX Kontext Max от Black Forest Labs
 */

const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Тест с моделью FLUX Kontext Max
const fluxKontextMaxEvent = {
  id: 'flux-kontext-max-test-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',
    prompt:
      'Divine mystical coding wisdom with sacred number 999, cosmic consciousness awakening, ethereal programming energy, transcendent technological enlightenment',

    // Тестируем с 2 сценами и 2 вариантами
    scene_count: 2,
    variants_per_scene: 2,

    // Квадратный формат
    aspect_ratio: '1:1',

    // ⭐ ОСНОВНАЯ МОДЕЛЬ: FLUX Kontext Max
    flux_model: 'black-forest-labs/flux-kontext-max',

    project_id: 1,
    requester_telegram_id: '144022504',
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'flux-kontext-max-test',
      model_type: 'flux_kontext_max',
      priority: 'high',
    },
  },
}

async function testFluxKontextMax() {
  console.log('🌟 Тест generateScenarioClips с FLUX Kontext Max')
  console.log('📝 Параметры:')
  console.log('  🎨 Модель:', 'black-forest-labs/flux-kontext-max')
  console.log('  🎭 Сцены:', fluxKontextMaxEvent.data.scene_count)
  console.log('  🖼️ Варианты:', fluxKontextMaxEvent.data.variants_per_scene)
  console.log('  📐 Формат:', fluxKontextMaxEvent.data.aspect_ratio)
  console.log('  📸 Фото:', fluxKontextMaxEvent.data.photo_url)

  const totalImages =
    fluxKontextMaxEvent.data.scene_count *
    fluxKontextMaxEvent.data.variants_per_scene
  const costStars = Math.round(((0.065 * totalImages) / 0.016) * 1.5)
  console.log(
    `  💰 Стоимость: ${costStars} звезд (${totalImages} изображений × $0.065)`
  )

  console.log('\n✨ Особенности FLUX Kontext Max:')
  console.log('  🎯 Лучшее понимание контекста и деталей')
  console.log('  🎨 Высокое качество генерации')
  console.log('  🧠 Продвинутая модель от Black Forest Labs')
  console.log('  💎 Премиум качество изображений')

  try {
    console.log('\n📤 Отправляем событие с FLUX Kontext Max...')
    await inngest.send(fluxKontextMaxEvent)

    console.log('✅ Событие отправлено! ID:', fluxKontextMaxEvent.id)
    console.log('📊 Статус: http://localhost:8288')
    console.log('⏱️ Ожидаемое время: ~40-90 секунд (премиум модель)')
    console.log(
      '🎨 Используется FLUX Kontext Max - лучшая модель для раскадровки!'
    )

    console.log('\n🔍 Ожидаемый результат:')
    console.log('1. Архив с высококачественными изображениями')
    console.log('2. HTML отчет с превью всех сцен')
    console.log('3. Детальная раскадровка для видеоконтента')
    console.log('4. Сохранение в ./output/*_scenario_clips_results.zip')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testFluxKontextMax()
