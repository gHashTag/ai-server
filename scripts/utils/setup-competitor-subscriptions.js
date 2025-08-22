/**
 * Скрипт для создания таблиц системы подписок на конкурентов
 */

require('dotenv').config()
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function setupCompetitorSubscriptions() {
  console.log('🏗️  Настройка системы подписок на конкурентов...')
  
  const pool = new Pool({
    connectionString: process.env.SUPABASE_URL,
    ssl: process.env.SUPABASE_URL ? { rejectUnauthorized: false } : false
  })

  try {
    const client = await pool.connect()

    console.log('✅ Подключение к базе данных установлено')

    // Читаем SQL скрипт
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'src/db/migrations/create_competitor_subscriptions.sql'),
      'utf8'
    )

    // Выполняем скрипт
    await client.query(sqlScript)
    
    console.log('✅ Таблицы созданы успешно:')
    console.log('   • competitor_subscriptions')
    console.log('   • competitor_delivery_history')  
    console.log('   • competitor_profiles')

    // Проверяем созданные таблицы
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('competitor_subscriptions', 'competitor_delivery_history', 'competitor_profiles')
      ORDER BY table_name
    `)
    
    console.log('\n📋 Подтверждение созданных таблиц:')
    tables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`)
    })

    // Создаем тестовую подписку для демонстрации
    const testSubscription = await client.query(`
      INSERT INTO competitor_subscriptions 
      (user_telegram_id, bot_name, competitor_username, competitor_display_name, max_reels, min_views, max_age_days, delivery_format)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_telegram_id, competitor_username, bot_name) DO NOTHING
      RETURNING id, competitor_username
    `, [
      '144022504', // Ваш Telegram ID
      'neuro_blogger_bot',
      'yacheslav_nekludov',
      'Ячеслав Неклюдов',
      10,
      1000,
      7,
      'digest'
    ])

    if (testSubscription.rows.length > 0) {
      console.log('\n🎯 Создана тестовая подписка:')
      console.log(`   • Конкурент: @${testSubscription.rows[0].competitor_username}`)
      console.log(`   • ID подписки: ${testSubscription.rows[0].id}`)
    } else {
      console.log('\n📌 Тестовая подписка уже существует')
    }

    // Показываем статистику
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN is_active THEN 1 END) as active_subscriptions,
        COUNT(DISTINCT competitor_username) as unique_competitors,
        COUNT(DISTINCT user_telegram_id) as total_users
      FROM competitor_subscriptions
    `)

    console.log('\n📊 Текущая статистика:')
    const stat = stats.rows[0]
    console.log(`   • Всего подписок: ${stat.total_subscriptions}`)
    console.log(`   • Активных подписок: ${stat.active_subscriptions}`)
    console.log(`   • Уникальных конкурентов: ${stat.unique_competitors}`)
    console.log(`   • Всего пользователей: ${stat.total_users}`)

    client.release()

    console.log('\n🎉 Система подписок на конкурентов готова!')
    console.log('\n🚀 Следующие шаги:')
    console.log('   1. Запустите сервер: bun dev')
    console.log('   2. Cron будет работать каждые 24 часа в 08:00 UTC')
    console.log('   3. Используйте API /api/competitor-subscriptions для управления')
    console.log('   4. Для тестирования: POST /trigger-competitor-auto-parse')

  } catch (error) {
    console.error('❌ Ошибка настройки:', error.message)
    throw error
  } finally {
    await pool.end()
  }
}

// Запуск настройки
setupCompetitorSubscriptions()
  .then(() => {
    console.log('\n✅ Настройка завершена успешно!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Ошибка:', error.message)
    process.exit(1)
  })