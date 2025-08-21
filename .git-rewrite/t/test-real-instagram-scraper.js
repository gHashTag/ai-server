/**
 * Тестовый скрипт для запуска реальной Instagram Scraper V2 функции
 */

const { Inngest } = require('inngest')

// Создаем клиент Inngest
const inngest = new Inngest({ id: 'test-app' })

async function testInstagramScrapperV2() {
  console.log('🚀 Запускаем тест Instagram Scraper V2...')

  try {
    // Отправляем событие в Inngest функцию
    const result = await inngest.send({
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: 'instagram', // Тестируем на официальном аккаунте Instagram
        max_users: 10,
        max_reels_per_user: 5,
        scrape_reels: true,
        requester_telegram_id: '123456789',
        project_id: 1, // Тестовый project_id
      },
    })

    console.log('✅ Событие отправлено в Inngest:', result)
    console.log('🔍 Event IDs:', result.ids)

    return result
  } catch (error) {
    console.error('❌ Ошибка при отправке события:', error.message)
    console.error('Детали ошибки:', error)
    throw error
  }
}

// Запускаем тест
if (require.main === module) {
  testInstagramScrapperV2()
    .then(result => {
      console.log('🎉 Тест завершен успешно!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Тест провалился:', error)
      process.exit(1)
    })
}

module.exports = { testInstagramScrapperV2 }
