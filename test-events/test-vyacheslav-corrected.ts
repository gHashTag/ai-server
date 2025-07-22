/**
 * Тестовое событие для исправленного username vyacheslav_nekludov
 * Отправляет событие instagram/scraper-v2 с правильным username
 */

import { Inngest } from 'inngest'

// Создаем клиент Inngest
const inngest = new Inngest({
  id: 'test-vyacheslav-corrected',
  name: 'Test Vyacheslav Corrected Username',
  isDev: true,
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

async function testVyacheslavCorrected() {
  console.log('🧪 Тестирование исправленного username vyacheslav_nekludov...\n')

  // Тестовое событие с исправленным username
  const testEvent = {
    name: 'instagram/scraper-v2',
    data: {
      username_or_id: 'vyacheslav_nekludov', // ИСПРАВЛЕНО: с буквой "v"
      requester_telegram_id: '289259562',
      project_id: 38,
      max_users: 5, // Небольшое количество для теста
      max_reels_per_user: 3,
      scrape_reels: false, // Отключаем рилсы для быстрого теста
      metadata: {
        source: 'test_corrected_username',
        timestamp: new Date().toISOString(),
        test_run: true,
      },
    },
    user: {
      id: 'test-corrected-vyacheslav',
    },
    ts: Date.now(),
  }

  try {
    console.log('📤 Отправляем событие:')
    console.log('   Event:', testEvent.name)
    console.log('   Username:', testEvent.data.username_or_id)
    console.log('   Project ID:', testEvent.data.project_id)
    console.log('   Max Users:', testEvent.data.max_users)
    console.log('   Scrape Reels:', testEvent.data.scrape_reels)

    // Отправляем событие
    const result = await inngest.send(testEvent)

    console.log('\n✅ Событие успешно отправлено!')
    console.log('   Event ID:', result.ids[0])
    console.log('   Статус:', result.status)
    console.log('   Результат:', result)

    console.log('\n🎯 Проверьте результаты:')
    console.log('   - Inngest Dashboard: http://localhost:8288')
    console.log('   - Функция: instagram-scraper-v2')
    console.log('   - Event ID:', result.ids[0])
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error)
    console.error('   Детали:', error.message)
  }
}

// Запускаем тест
if (require.main === module) {
  testVyacheslavCorrected()
    .then(() => {
      console.log('\n🎉 Тест завершен!')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error)
      process.exit(1)
    })
}
