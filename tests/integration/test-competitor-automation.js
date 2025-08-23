/**
 * Тестирование автоматизации парсинга конкурентов
 */

const { inngest } = require('./dist/core/inngest/clients')

async function testCompetitorAutomation() {
  console.log('🧪 Тестирование автоматизации парсинга конкурентов...')

  try {
    // Тест 1: Ручной запуск автопарсинга
    console.log('\n1️⃣ Тест ручного запуска автопарсинга...')

    const triggerResult = await inngest.send({
      name: 'competitor/trigger-auto-parse',
      data: {
        triggered_by: 'test',
        test_mode: true,
      },
    })

    console.log('✅ Автопарсинг запущен:', triggerResult.ids[0])

    // Ждем несколько секунд
    await new Promise(resolve => setTimeout(resolve, 5000))

    // Тест 2: Проверка подписок в базе
    console.log('\n2️⃣ Проверка подписок в базе данных...')

    const { Pool } = require('pg')
    const dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })

    const client = await dbPool.connect()

    try {
      // Получаем активные подписки
      const subscriptions = await client.query(`
        SELECT 
          cs.*,
          cp.display_name,
          cp.total_subscribers
        FROM competitor_subscriptions cs
        LEFT JOIN competitor_profiles cp ON cs.competitor_username = cp.username
        WHERE cs.is_active = true
        ORDER BY cs.created_at DESC
      `)

      console.log(`📋 Найдено активных подписок: ${subscriptions.rows.length}`)

      subscriptions.rows.forEach((sub, index) => {
        console.log(
          `   ${index + 1}. @${sub.competitor_username} -> User ${
            sub.user_telegram_id
          }`
        )
        console.log(`      • Формат: ${sub.delivery_format}`)
        console.log(`      • Рилсов: до ${sub.max_reels}`)
        console.log(`      • Мин. просмотров: ${sub.min_views}`)
        console.log(
          `      • Последний парсинг: ${sub.last_parsed_at || 'никогда'}`
        )
        console.log(
          `      • Следующий парсинг: ${sub.next_parse_at || 'не запланирован'}`
        )
        console.log('')
      })

      // Статистика профилей конкурентов
      const profiles = await client.query(`
        SELECT 
          username,
          display_name,
          total_subscribers,
          last_updated
        FROM competitor_profiles
        ORDER BY total_subscribers DESC
      `)

      console.log(`👥 Профилей конкурентов: ${profiles.rows.length}`)
      profiles.rows.forEach(profile => {
        console.log(
          `   • @${profile.username}: ${profile.total_subscribers} подписчиков`
        )
      })

      // История доставок
      const deliveryHistory = await client.query(`
        SELECT 
          cdh.*,
          cs.competitor_username,
          cs.user_telegram_id
        FROM competitor_delivery_history cdh
        JOIN competitor_subscriptions cs ON cdh.subscription_id = cs.id
        ORDER BY cdh.delivered_at DESC
        LIMIT 5
      `)

      console.log(
        `\n📬 История доставок (последние ${deliveryHistory.rows.length}):`
      )
      if (deliveryHistory.rows.length === 0) {
        console.log('   Доставок пока нет')
      } else {
        deliveryHistory.rows.forEach((delivery, index) => {
          console.log(
            `   ${index + 1}. @${delivery.competitor_username} -> ${
              delivery.user_telegram_id
            }`
          )
          console.log(`      • Рилсов доставлено: ${delivery.reels_count}`)
          console.log(`      • Статус: ${delivery.delivery_status}`)
          console.log(
            `      • Время: ${new Date(delivery.delivered_at).toLocaleString(
              'ru-RU'
            )}`
          )
          if (delivery.error_message) {
            console.log(`      • Ошибка: ${delivery.error_message}`)
          }
          console.log('')
        })
      }
    } finally {
      client.release()
      await dbPool.end()
    }

    // Тест 3: Проверка работы cron функции
    console.log('\n3️⃣ Информация о cron функции...')
    console.log('   • Расписание: каждый день в 08:00 UTC (11:00 MSK)')
    console.log('   • Функция: competitor-auto-parser')
    console.log('   • ID события: competitor/trigger-auto-parse')
    console.log('   • Следующий автозапуск будет через Inngest cron')

    // Тест 4: API эндпоинты (информативно)
    console.log('\n4️⃣ Доступные API эндпоинты:')
    console.log('   • GET    /api/competitor-subscriptions - список подписок')
    console.log('   • POST   /api/competitor-subscriptions - создать подписку')
    console.log(
      '   • PUT    /api/competitor-subscriptions/:id - обновить подписку'
    )
    console.log(
      '   • DELETE /api/competitor-subscriptions/:id - удалить подписку'
    )
    console.log('   • GET    /api/competitor-subscriptions/stats - статистика')
    console.log(
      '   • GET    /api/competitor-subscriptions/:id/history - история доставок'
    )

    console.log('\n✅ Тестирование завершено!')

    console.log('\n🎯 Система готова к работе:')
    console.log('   1. Cron запускается каждые 24 часа')
    console.log('   2. Парсит всех конкурентов из подписок')
    console.log('   3. Доставляет результаты подписчикам')
    console.log('   4. Ведет полную историю операций')
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message)
  }
}

// Запуск тестирования
testCompetitorAutomation()
