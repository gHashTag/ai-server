/**
 * 🎬 Test generateScenarioClips with FLUX Kontext Max in 9:16 format
 * Тест с FLUX Kontext Max в вертикальном формате для реального использования
 */

const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Тест с FLUX Kontext Max в формате 9:16 (вертикальный)
const verticalScenarioEvent = {
  id: 'vertical-flux-kontext-max-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    // 🖼️ Используем реальное фото 999
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',

    // 📜 Библейский промпт с мистическим числом 999
    prompt:
      'Divine mystical coding wisdom with sacred number 999, cosmic consciousness awakening, ethereal programming energy, transcendent technological enlightenment, sacred geometry manifestation',

    // 🎭 Параметры генерации для реального использования
    scene_count: 3,
    variants_per_scene: 2,

    // 📱 ВЕРТИКАЛЬНЫЙ ФОРМАТ 9:16 для реального использования!
    aspect_ratio: '9:16',

    // ⭐ FLUX Kontext Max - лучшая модель
    flux_model: 'black-forest-labs/flux-kontext-max',

    project_id: 1,
    requester_telegram_id: '144022504',
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'vertical-kontext-max-test',
      format: '9x16_vertical',
      purpose: 'real_usage',
      model_type: 'flux_kontext_max',
    },
  },
}

async function testVerticalKontextMax() {
  console.log(
    '📱 Тест generateScenarioClips с FLUX Kontext Max в вертикальном формате'
  )
  console.log('📝 Параметры:')
  console.log('  🎨 Модель:', 'black-forest-labs/flux-kontext-max')
  console.log('  🎭 Сцены:', verticalScenarioEvent.data.scene_count)
  console.log('  🖼️ Варианты:', verticalScenarioEvent.data.variants_per_scene)
  console.log('  📐 Формат:', '9:16 (ВЕРТИКАЛЬНЫЙ)')
  console.log('  📸 Фото:', verticalScenarioEvent.data.photo_url)

  const totalImages =
    verticalScenarioEvent.data.scene_count *
    verticalScenarioEvent.data.variants_per_scene
  const costStars = Math.round(((0.065 * totalImages) / 0.016) * 1.5)
  console.log(
    `  💰 Стоимость: ${costStars} звезд (${totalImages} изображений × $0.065)`
  )

  console.log('\n📱 Преимущества формата 9:16:')
  console.log('  📺 Идеально для Stories в Instagram/TikTok')
  console.log('  📲 Оптимизировано для мобильных устройств')
  console.log('  🎬 Готово для видеоконтента')
  console.log('  💎 Профессиональное качество FLUX Kontext Max')

  try {
    console.log('\n📤 Отправляем событие с вертикальным форматом...')
    await inngest.send(verticalScenarioEvent)

    console.log('✅ Событие отправлено! ID:', verticalScenarioEvent.id)
    console.log('📊 Статус: http://localhost:8288')
    console.log('⏱️ Ожидаемое время: ~40-90 секунд (премиум модель)')
    console.log('🎨 Используется FLUX Kontext Max в формате 9:16!')

    console.log('\n🔍 Ожидаемый результат:')
    console.log('1. Архив с вертикальными изображениями 9:16')
    console.log('2. HTML отчет с превью всех сцен')
    console.log('3. Готовые изображения для Stories/TikTok')
    console.log('4. Сохранение в ./output/*_scenario_clips_results.zip')
    console.log('\n📁 Изображения будут оптимизированы для:')
    console.log('  📱 Instagram Stories')
    console.log('  🎵 TikTok видео')
    console.log('  📺 YouTube Shorts')
    console.log('  💫 Другие вертикальные форматы')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testVerticalKontextMax()
