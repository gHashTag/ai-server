/**
 * Прямое тестирование сервиса competitor subscriptions без запуска сервера
 */

const { Pool } = require('pg')

async function testCompetitorService() {
  console.log('🧪 === ПРЯМОЕ ТЕСТИРОВАНИЕ COMPETITOR SERVICE ===\n')

  // Используем ту же строку подключения
  const dbPool = new Pool({
    connectionString:
      process.env.NEON_DATABASE_URL ||
      'postgresql://neondb_owner:npg_5RWzh7CwrXxE@ep-delicate-block-a1l1lt0p-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  })

  try {
    console.log('🔗 Подключение к базе данных...')
    const client = await dbPool.connect()

    try {
      // 1. Проверяем существование таблиц
      console.log('📋 Проверка таблиц...')
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'competitor%'
        ORDER BY table_name
      `)

      console.log('✅ Существующие таблицы competitor:')
      tablesResult.rows.forEach(row => {
        console.log(`   📊 ${row.table_name}`)
      })

      // 2. Создаем тестовую подписку
      console.log('\n✉️ Создание тестовой подписки...')
      const createResult = await client.query(
        `
        INSERT INTO competitor_subscriptions 
        (user_telegram_id, user_chat_id, bot_name, competitor_username, 
         competitor_display_name, max_reels, min_views, max_age_days, delivery_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          'test_user_123',
          'test_chat_123',
          'test_bot',
          'garyvee',
          'Gary Vaynerchuk',
          5,
          1000,
          7,
          'digest',
        ]
      )

      const subscription = createResult.rows[0]
      console.log('✅ Подписка создана:', {
        id: subscription.id,
        competitor: subscription.competitor_username,
        max_reels: subscription.max_reels,
      })

      // 3. Получаем подписки пользователя
      console.log('\n📋 Получение подписок пользователя...')
      const getResult = await client.query(
        `
        SELECT 
          cs.*,
          cp.display_name,
          cp.followers_count,
          cp.is_verified
        FROM competitor_subscriptions cs
        LEFT JOIN competitor_profiles cp ON cs.competitor_username = cp.username
        WHERE cs.user_telegram_id = $1 AND cs.bot_name = $2
        ORDER BY cs.created_at DESC
      `,
        ['test_user_123', 'test_bot']
      )

      console.log('✅ Подписки найдены:', getResult.rows.length)
      getResult.rows.forEach((sub, index) => {
        console.log(
          `   ${index + 1}. @${sub.competitor_username} (${
            sub.max_reels
          } рилз, ${sub.delivery_format})`
        )
      })

      // 4. Обновляем подписку
      console.log('\n🔄 Обновление подписки...')
      const updateResult = await client.query(
        `
        UPDATE competitor_subscriptions 
        SET max_reels = $1, delivery_format = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
        [8, 'individual', subscription.id]
      )

      if (updateResult.rows.length > 0) {
        console.log('✅ Подписка обновлена:', {
          max_reels: updateResult.rows[0].max_reels,
          delivery_format: updateResult.rows[0].delivery_format,
        })
      }

      // 5. Получаем статистику
      console.log('\n📊 Статистика подписок...')
      const statsResult = await client.query(`
        SELECT 
          COUNT(DISTINCT cs.user_telegram_id) as total_users,
          COUNT(cs.id) as total_subscriptions,
          COUNT(CASE WHEN cs.is_active THEN 1 END) as active_subscriptions,
          COUNT(DISTINCT cs.competitor_username) as unique_competitors,
          AVG(cs.max_reels) as avg_reels_per_subscription
        FROM competitor_subscriptions cs
      `)

      const stats = statsResult.rows[0]
      console.log('✅ Статистика:', {
        total_users: stats.total_users,
        total_subscriptions: stats.total_subscriptions,
        active_subscriptions: stats.active_subscriptions,
        unique_competitors: stats.unique_competitors,
        avg_reels: Math.round(stats.avg_reels_per_subscription * 100) / 100,
      })

      // 6. Топ конкуренты
      console.log('\n🏆 Топ конкуренты...')
      const topResult = await client.query(`
        SELECT 
          competitor_username,
          COUNT(*) as subscribers_count,
          MAX(created_at) as latest_subscription
        FROM competitor_subscriptions
        WHERE is_active = true
        GROUP BY competitor_username
        ORDER BY subscribers_count DESC
        LIMIT 5
      `)

      console.log('✅ Топ конкуренты:')
      topResult.rows.forEach((comp, index) => {
        console.log(
          `   ${index + 1}. @${comp.competitor_username} (${
            comp.subscribers_count
          } подписчиков)`
        )
      })

      // 7. Удаляем тестовую подписку
      console.log('\n🗑️ Удаление тестовой подписки...')
      const deleteResult = await client.query(
        `
        DELETE FROM competitor_subscriptions 
        WHERE id = $1 
        RETURNING competitor_username
      `,
        [subscription.id]
      )

      if (deleteResult.rows.length > 0) {
        console.log(
          '✅ Подписка удалена:',
          deleteResult.rows[0].competitor_username
        )
      }

      console.log('\n🎉 Все тесты прошли успешно!')
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message)
    console.error('Детали:', error)
  } finally {
    await dbPool.end()
  }

  console.log('\n🎯 === ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===')
}

// Запускаем тесты
testCompetitorService().catch(console.error)
