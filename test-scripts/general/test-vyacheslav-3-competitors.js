/**
 * ТЕСТ INNGEST функции для vyacheslav_nekludov
 * ТОЛЬКО 3 КОНКУРЕНТА - для быстрой проверки
 */

const { Inngest } = require('inngest')

async function testVyacheslav3Competitors() {
  console.log('🎯 Тестируем Instagram Scraper V2 для @vyacheslav_nekludov')
  console.log('📊 Project ID: 37, Max Users: 3 (только для проверки)')

  const inngest = new Inngest({ id: 'vyacheslav-3-test' })

  try {
    // Отправляем событие с минимальными параметрами
    const result = await inngest.send({
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: 'vyacheslav_nekludov',
        project_id: 37,
        max_users: 3, // Только 3 конкурента
        max_reels_per_user: 5, // По 5 рилсов каждому
        scrape_reels: true, // Включаем парсинг рилсов
        requester_telegram_id: 'vyacheslav_test_client',
      },
    })

    console.log('✅ Событие отправлено успешно!')
    console.log('🔍 Event ID:', result.ids[0])

    return result
  } catch (error) {
    console.error('❌ Ошибка отправки события:', error.message)
    throw error
  }
}

// Запуск
if (require.main === module) {
  testVyacheslav3Competitors()
    .then(result => {
      console.log('\n🎉 СОБЫТИЕ ОТПРАВЛЕНО В INNGEST!')
      console.log('⏳ Ожидайте 1-2 минуты для обработки')
      console.log('📋 Event ID для дашборда:', result.ids[0])
      console.log('\n🔍 Для проверки результата:')
      console.log('- Откройте дашборд Inngest')
      console.log('- Или проверьте базу данных через несколько минут')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Ошибка:', error)
      process.exit(1)
    })
}

module.exports = { testVyacheslav3Competitors }
