/**
 * Отправка события для полноценного парсинга vyacheslav_nekludov
 * 30 конкурентов + 5 рилсов для каждого
 */

import { Inngest } from 'inngest'

// Создаем клиент Inngest
const inngest = new Inngest({
  id: 'full-parsing-vyacheslav',
  name: 'Full Parsing Vyacheslav',
  isDev: true,
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

async function sendFullParsingEvent() {
  console.log('🚀 Отправка события для полноценного парсинга...\n')

  // Событие для полноценного парсинга
  const event = {
    name: 'instagram/scraper-v2',
    data: {
      username_or_id: 'vyacheslav_nekludov', // ИСПРАВЛЕННЫЙ username
      requester_telegram_id: '289259562',
      project_id: 38,
      max_users: 30, // ПОЛНЫЙ ПАРСИНГ: 30 конкурентов
      max_reels_per_user: 5, // ПОЛНЫЙ ПАРСИНГ: 5 рилсов для каждого
      scrape_reels: true, // ВКЛЮЧАЕМ рилсы
      metadata: {
        source: 'full_parsing_test',
        timestamp: new Date().toISOString(),
        test_run: true,
        description: 'Full parsing test: 30 competitors + 5 reels each',
      },
    },
  }

  try {
    console.log('📤 Отправляем событие полноценного парсинга:')
    console.log('   Event:', event.name)
    console.log('   Username:', event.data.username_or_id)
    console.log('   Project ID:', event.data.project_id)
    console.log('   Max Users:', event.data.max_users)
    console.log('   Max Reels per User:', event.data.max_reels_per_user)
    console.log('   Scrape Reels:', event.data.scrape_reels)
    console.log('   Requester:', event.data.requester_telegram_id)

    // Отправляем событие
    const result = await inngest.send(event)

    console.log('\n✅ Событие успешно отправлено!')
    console.log('   Event ID:', result.ids[0])
    console.log('   Статус:', result.status)

    console.log('\n🎯 Мониторинг выполнения:')
    console.log('   - Inngest Dashboard: http://localhost:8288')
    console.log('   - Функция: instagram-scraper-v2')
    console.log('   - Event ID для отслеживания:', result.ids[0])

    console.log('\n⏱️ Ожидаемое время выполнения:')
    console.log('   - Парсинг пользователей: ~2-3 минуты')
    console.log('   - Парсинг рилсов: ~5-8 минут')
    console.log('   - Общее время: ~10-15 минут')

    console.log('\n📊 Ожидаемые результаты:')
    console.log('   - Пользователи: 30 записей в instagram_similar_users')
    console.log('   - Рилсы: ~150 записей в instagram_user_reels')
    console.log('   - Project ID: 38')
    console.log('   - Search Username: vyacheslav_nekludov')

    console.log('\n🔍 Проверка результатов:')
    console.log('   После завершения запустите:')
    console.log('   node scripts/check-database-results.js')

    return result
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error)
    console.error('   Детали:', error.message)
    throw error
  }
}

// Запускаем отправку события
if (require.main === module) {
  sendFullParsingEvent()
    .then(result => {
      console.log('\n🎉 Событие отправлено успешно!')
      console.log(
        '🔄 Теперь дождитесь завершения парсинга и проверьте результаты'
      )
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Критическая ошибка:', error)
      process.exit(1)
    })
}
