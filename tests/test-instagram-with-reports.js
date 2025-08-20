#!/usr/bin/env node

/**
 * Тест Instagram Scraper V2 с генерацией отчётов
 * Отправляет события на vyacheslav_nekludov с 3 конкурентами для быстрого тестирования
 */

const { Inngest } = require('inngest')

async function testInstagramWithReports() {
  console.log('🧪 Запуск тестирования Instagram Scraper V2 с отчётами...\n')

  const inngest = new Inngest({ id: 'reports-test-app' })

  const testEvent = {
    name: 'instagram/scraper-v2',
    data: {
      username_or_id: 'vyacheslav_nekludov',
      project_id: 37,
      max_users: 3, // Только 3 конкурента для быстрого теста
      max_reels_per_user: 5, // 5 рилсов на конкурента
      scrape_reels: true, // Включаем рилсы
      requester_telegram_id: 'test_reports_user_123',
    },
  }

  try {
    console.log('📊 Параметры теста:', {
      target: testEvent.data.username_or_id,
      project: testEvent.data.project_id,
      competitors: testEvent.data.max_users,
      reels: testEvent.data.scrape_reels,
    })

    console.log('\n🚀 Отправляем событие в Inngest...')

    const result = await inngest.send(testEvent)

    console.log('✅ Событие отправлено успешно!')
    console.log('📋 Event ID:', result.ids[0])

    console.log('\n⏳ Ожидаемый результат через 3-5 минут:')
    console.log('• 📊 Найдены 3 конкурента для vyacheslav_nekludov')
    console.log('• 🎬 Собраны рилсы конкурентов (если доступны)')
    console.log('• 📄 Создан красивый HTML отчёт с дизайном')
    console.log('• 📈 Создан Excel файл с тремя листами:')
    console.log('  - Конкуренты (список со всеми данными)')
    console.log('  - Рилсы (если найдены)')
    console.log('  - Аналитика (статистика)')
    console.log('• 📦 Создан ZIP архив с README инструкцией')

    console.log('\n🔍 Проверить результаты можно:')
    console.log('1. В Inngest Dashboard - результат функции')
    console.log('2. В папке ./output - созданные файлы')
    console.log('3. В базе данных - таблицы:')
    console.log('   - instagram_similar_users')
    console.log('   - instagram_user_reels (если включен parsing)')

    console.log(
      '\n💡 Важно: В результате функции должен быть объект "reports" с путями к файлам'
    )
    console.log('   { reports: { generated: true, archivePath: "...", ... }}')
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message)

    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Возможные причины:')
      console.log('• Inngest dev server не запущен')
      console.log('• Порт 8288 заблокирован')
      console.log('• Проблема с подключением к серверу')
    }
  }
}

// Запуск
testInstagramWithReports()
  .then(() => {
    console.log('\n🏁 Тест завершён')
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error)
    process.exit(1)
  })
