/**
 * ТЕСТ INNGEST ФУНКЦИИ для vyacheslav_nekludov
 * ТОЛЬКО отправляет событие в Instagram Scraper V2
 */

const { Inngest } = require('inngest')

async function testVyacheslavInngest() {
  console.log(
    '🚀 Тестируем INNGEST функцию Instagram Scraper V2 для @vyacheslav_nekludov'
  )
  console.log('📊 Project ID: 37, Max Users: 30')

  const inngest = new Inngest({ id: 'vyacheslav-test-app' })

  try {
    // Отправляем событие в INNGEST функцию
    const result = await inngest.send({
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: 'vyacheslav_nekludov',
        project_id: 37,
        max_users: 30,
        max_reels_per_user: 10,
        scrape_reels: true,
        requester_telegram_id: 'vyacheslav_client_123',
      },
    })

    console.log('✅ Событие отправлено в INNGEST функцию:', result.ids[0])
    console.log('📋 Event ID для проверки дашборда:', result.ids[0])

    return result
  } catch (error) {
    console.error('❌ Ошибка отправки события в INNGEST:', error.message)
    throw error
  }
}

// Запуск
if (require.main === module) {
  testVyacheslavInngest()
    .then(result => {
      console.log('\n🎉 СОБЫТИЕ ОТПРАВЛЕНО В INNGEST!')
      console.log('⏳ Ждите 2-3 минуты и проверяйте базу данных')
      console.log('🔍 Event ID:', result.ids[0])
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Ошибка:', error)
      process.exit(1)
    })
}

module.exports = { testVyacheslavInngest }
