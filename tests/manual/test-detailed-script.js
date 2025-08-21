/**
 * Test generateDetailedScript function
 * Тест новой функции генерации детальных скриптов раскадровки
 */

const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'ai-server-dev',
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Тест генерации детального скрипта
const detailedScriptEvent = {
  id: 'detailed-script-test-' + Date.now(),
  name: 'content/generate-detailed-script',
  data: {
    photo_url: '/Users/playra/ai-server/assets/999-icon.jpg',
    base_prompt:
      'Divine coding wisdom with number 999, mystical programming energy, cosmic consciousness',
    scene_count: 4,
    project_id: 1,
    requester_telegram_id: '144022504',
    theme: 'CREATION', // Библейская тема
    style: 'CINEMATIC', // Кинематографический стиль
    metadata: {
      timestamp: new Date().toISOString(),
      test: 'detailed-script-test',
      version: '1.0.0',
    },
  },
}

async function testDetailedScript() {
  console.log(
    '📝 Тест generateDetailedScript - Генерация детального скрипта раскадровки'
  )
  console.log('\n📋 Параметры:')
  console.log('  📸 Фото:', detailedScriptEvent.data.photo_url)
  console.log('  📜 Базовый промпт:', detailedScriptEvent.data.base_prompt)
  console.log('  🎭 Количество сцен:', detailedScriptEvent.data.scene_count)
  console.log('  🎨 Тема:', detailedScriptEvent.data.theme)
  console.log('  🎬 Стиль:', detailedScriptEvent.data.style)

  console.log('\n✨ Что будет создано:')
  console.log('  🎯 Детальные промпты для каждой сцены')
  console.log('  📹 Положение и движение камеры')
  console.log('  💡 Настройки освещения')
  console.log('  🎨 Цветовые палитры')
  console.log('  📐 Композиционные правила')
  console.log('  ⚙️ Технические параметры рендера')

  try {
    console.log('\n📤 Отправляем событие генерации детального скрипта...')
    await inngest.send(detailedScriptEvent)

    console.log('✅ Событие отправлено! ID:', detailedScriptEvent.id)
    console.log('📊 Следите за прогрессом: http://localhost:8288')
    console.log(
      '⏱️ Ожидаемое время: ~30-60 секунд (генерация через OpenAI GPT-4)'
    )
    console.log('💾 Результат сохранится в базе данных detailed_scripts')

    console.log('\n🔍 После завершения:')
    console.log('1. Скрипт будет сохранен в БД с детальными сценами')
    console.log('2. Каждая сцена будет содержать технические параметры съемки')
    console.log('3. Скрипт можно будет использовать для generateScenarioClips')
  } catch (error) {
    console.error('❌ Ошибка:', error.message)
  }
}

testDetailedScript()
