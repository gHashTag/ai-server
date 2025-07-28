/**
 * Real scenario clips test with actual FLUX image generation
 * Реальный тест с настоящей генерацией изображений через BFL API
 */

const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Проверяем настройки API
function checkAPIKeys() {
  const replicateToken = process.env.REPLICATE_API_TOKEN

  console.log('🔐 Проверка API ключей:')
  console.log(
    `REPLICATE_API_TOKEN: ${replicateToken ? '✅ Настроен' : '❌ Отсутствует'}`
  )

  if (!replicateToken) {
    console.log('⚠️  ВНИМАНИЕ: REPLICATE_API_TOKEN не настроен!')
    console.log('   Без этого токена изображения генерироваться не будут.')
    console.log(
      '   Настройте переменную окружения REPLICATE_API_TOKEN для работы с FLUX через Replicate.'
    )
    return false
  }

  return true
}

// Реальное тестовое событие с генерацией изображений
const realGenerationEvent = {
  id: 'real-scenario-clips-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    // Реальное фото для основы
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',

    // Простой промпт для быстрой генерации
    prompt:
      'Mystical number 999 with divine cosmic energy, sacred geometry patterns',

    // Минимальные параметры для тестирования
    scene_count: 1,
    variants_per_scene: 1,

    // Квадратный формат (быстрее генерируется)
    aspect_ratio: '1:1',

    // Используем FLUX Pro модель
    flux_model: 'black-forest-labs/flux-1.1-pro',

    // Параметры проекта
    project_id: 1,
    requester_telegram_id: '144022504',

    // Метаданные
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'real-flux-generation-test',
      test_env: 'development',
      version: '1.0.0',
      real_generation: true,
    },
  },
}

async function runRealGenerationTest() {
  console.log('🎬 Запуск РЕАЛЬНОГО тестирования generateScenarioClips с FLUX!')

  // Проверяем API ключи
  if (!checkAPIKeys()) {
    console.log('\n💡 Чтобы настроить Replicate API токен:')
    console.log('1. Зарегистрируйтесь на https://replicate.com/')
    console.log('2. Получите API токен в настройках')
    console.log('3. Добавьте в .env: REPLICATE_API_TOKEN=your_api_token_here')
    console.log('4. Перезапустите сервер: pm2 restart all')
    return
  }

  console.log('\n📸 Параметры генерации:')
  console.log('📸 Фото:', realGenerationEvent.data.photo_url)
  console.log('📜 Промпт:', realGenerationEvent.data.prompt)
  console.log('🎭 Сцены:', realGenerationEvent.data.scene_count)
  console.log('🎨 Варианты:', realGenerationEvent.data.variants_per_scene)
  console.log('📐 Формат:', realGenerationEvent.data.aspect_ratio)
  console.log('🤖 Модель:', realGenerationEvent.data.flux_model)

  const totalImages =
    realGenerationEvent.data.scene_count *
    realGenerationEvent.data.variants_per_scene
  const costStars = Math.round(((0.055 * totalImages) / 0.016) * 1.5)
  console.log(`💰 Стоимость: ${costStars} звезд (${totalImages} изображений)`)

  try {
    console.log('\n📤 Отправляем событие с реальной генерацией...')
    await inngest.send(realGenerationEvent)

    console.log('✅ Событие успешно отправлено!')
    console.log('📊 Следите за прогрессом: http://localhost:8288')
    console.log('⏱️ Генерация изображения займет ~30-60 секунд')
    console.log('📁 Результаты сохранятся в: ./output/')
    console.log(
      '🗂️ Архив с РЕАЛЬНЫМИ изображениями: ./output/*_scenario_clips_results.zip'
    )

    console.log('\n🔍 Как проверить результат:')
    console.log('1. Дождитесь завершения функции в Inngest Dashboard')
    console.log('2. Проверьте папку ./output/ на новые архивы')
    console.log('3. Распакуйте архив и откройте HTML отчет')
    console.log('4. В отчете должны быть РЕАЛЬНЫЕ изображения из FLUX!')
  } catch (error) {
    console.error('❌ Ошибка при отправке события:', error)
  }
}

// Запускаем реальный тест
runRealGenerationTest()
