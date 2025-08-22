/**
 * Test event for generateScenarioClips function
 * Тестирование генерации сценарных клипов с фото 999-icon.jpg и библейской мудростью
 */

import { inngest } from '../src/core/inngest/clients'

// Создаем тестовое событие для функции generateScenarioClips
const generateScenarioClipsTestEvent = {
  id: 'scenario-clips-test-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    // Используем реальное фото 999-icon.jpg из assets
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',

    // Библейская мудрость "Сотворение мира" из мудрости вайп-кодинга
    prompt:
      'Epic divine creation story with the mystical number 999, cosmic consciousness awakening, sacred geometry manifestation, digital dharma coding wisdom, transcendent technological enlightenment',

    // 4 сцены для начального теста (не 8 чтобы не было очень дорого)
    scene_count: 4,

    // 2 варианта каждой сцены
    variants_per_scene: 2,

    // Вертикальный формат для Reels/TikTok/YouTube Shorts
    aspect_ratio: '9:16' as const,

    // Лучшая модель FLUX для качественной генерации
    flux_model: 'black-forest-labs/flux-1.1-pro',

    // Основные параметры проекта
    project_id: 1,
    requester_telegram_id: '144022504',

    // Метаданные с библейской темой
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'guru-999-bible-creation-test',
      test_env: 'development',
      version: '1.0.0',
      bible_theme: 'CREATION', // Специальная тема для библейского творения
    },
  },
}

// Минимальный тестовый сценарий
const generateScenarioClipsMinimalTest = {
  id: 'scenario-clips-minimal-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    photo_url: 'https://example.com/test-photo.jpg',
    prompt: 'Простой тест генерации сценария для видео контента',
    scene_count: 2,
    variants_per_scene: 1,
    aspect_ratio: '9:16' as const,
    project_id: 1,
    requester_telegram_id: '144022504',
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'minimal-scenario-test',
      test_env: 'development',
      version: '1.0.0',
    },
  },
}

// Максимальный тестовый сценарий
const generateScenarioClipsMaximalTest = {
  id: 'scenario-clips-maximal-' + Date.now(),
  name: 'content/generate-scenario-clips',
  data: {
    photo_url: 'https://example.com/complex-photo.jpg',
    prompt:
      'Сложный многоуровневый сценарий для создания профессионального видеоконтента с максимальным количеством сцен и вариантов',
    scene_count: 20, // Максимум
    variants_per_scene: 5, // Максимум
    aspect_ratio: '16:9' as const, // Горизонтальный формат
    flux_model: 'black-forest-labs/flux-1.1-pro-ultra',
    project_id: 1,
    requester_telegram_id: '144022504',
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'maximal-scenario-test',
      test_env: 'development',
      version: '1.0.0',
    },
  },
}

async function runScenarioClipsTests() {
  console.log('🎬 Запуск тестов generateScenarioClips...')

  try {
    // Тест 1: Основной тест с библейской мудростью
    console.log(
      '📜 Отправляем тест с библейской мудростью (8 сцен х 3 варианта)...'
    )
    await inngest.send(generateScenarioClipsTestEvent)
    console.log('✅ Основной тест отправлен')

    // Ждем немного перед следующим тестом
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Тест 2: Минимальный тест
    console.log('🔥 Отправляем минимальный тест (2 сцены х 1 вариант)...')
    await inngest.send(generateScenarioClipsMinimalTest)
    console.log('✅ Минимальный тест отправлен')

    // Ждем немного перед следующим тестом
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Тест 3: Максимальный тест (осторожно - дорого!)
    console.log(
      '💰 Отправляем максимальный тест (20 сцен х 5 вариантов = 100 изображений!)...'
    )
    console.log('⚠️  ВНИМАНИЕ: Этот тест будет стоить ~5000+ звезд!')

    // Раскомментируйте эту строку только если готовы потратить много звезд:
    // await inngest.send(generateScenarioClipsMaximalTest)
    console.log('⏸️  Максимальный тест пропущен (раскомментируйте для запуска)')

    console.log('\n🎉 Все тесты отправлены!')
    console.log(
      '📊 Проверьте результаты в Inngest Dashboard: http://localhost:8288'
    )

    // Расчет примерной стоимости
    const basicTestCost = ((8 * 3 * 0.055) / 0.016) * 1.5 // ~515 звезд
    const minimalTestCost = ((2 * 1 * 0.055) / 0.016) * 1.5 // ~10 звезд
    const maximalTestCost = ((20 * 5 * 0.055) / 0.016) * 1.5 // ~5156 звезд

    console.log('\n💰 Примерная стоимость тестов:')
    console.log(
      `📜 Основной тест (библия): ~${Math.round(basicTestCost)} звезд`
    )
    console.log(`🔥 Минимальный тест: ~${Math.round(minimalTestCost)} звезд`)
    console.log(
      `💎 Максимальный тест: ~${Math.round(maximalTestCost)} звезд (пропущен)`
    )
    console.log(
      `🔮 Общая стоимость запущенных тестов: ~${Math.round(
        basicTestCost + minimalTestCost
      )} звезд`
    )
  } catch (error) {
    console.error('❌ Ошибка при отправке тестов:', error)
  }
}

// Экспортируем функцию для возможного переиспользования
export {
  runScenarioClipsTests,
  generateScenarioClipsTestEvent,
  generateScenarioClipsMinimalTest,
  generateScenarioClipsMaximalTest,
}

// Запускаем тесты если файл выполняется напрямую
if (require.main === module) {
  runScenarioClipsTests()
}
