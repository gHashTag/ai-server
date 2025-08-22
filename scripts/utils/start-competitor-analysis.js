/**
 * Запуск анализа конкурента для получения рилсов прямо сейчас
 */

const { inngest } = require('./dist/core/inngest/clients')

async function startCompetitorAnalysis() {
  console.log('🚀 Запуск анализа конкурента @yacheslav_nekludov...')

  try {
    // Запуск 1: Прямой RILS парсинг
    console.log('\n1️⃣ Запускаем прямой RILS парсинг...')
    
    const rilsResult = await inngest.send({
      name: 'instagram/apify-scrape',
      data: {
        username_or_hashtag: 'yacheslav_nekludov',
        project_id: 1,
        source_type: 'competitor',
        max_reels: 15, // Больше рилсов для анализа
        min_views: 500, // Снижаем порог для большего количества
        max_age_days: 14, // Последние 2 недели
        requester_telegram_id: '144022504',
        bot_name: 'neuro_blogger_bot'
      }
    })
    
    console.log('✅ RILS парсинг запущен:', rilsResult.ids[0])

    // Запуск 2: Автоматический парсинг системы подписок
    console.log('\n2️⃣ Запускаем автоматический парсинг системы...')
    
    const autoResult = await inngest.send({
      name: 'competitor/trigger-auto-parse',
      data: {
        triggered_by: 'manual_start',
        immediate: true
      }
    })
    
    console.log('✅ Автопарсинг системы запущен:', autoResult.ids[0])

    // Информация о том что будет происходить
    console.log('\n📋 Что происходит сейчас:')
    console.log('   1. RILS парсер обращается к Apify')
    console.log('   2. Получает свежие рилсы @yacheslav_nekludov')
    console.log('   3. Сохраняет их в Supabase')
    console.log('   4. Система автопарсинга находит подписку')
    console.log('   5. Доставляет дайджест в Telegram')

    console.log('\n⏰ Ожидаемое время выполнения: 2-5 минут')
    console.log('📱 Результаты придут в Telegram: @neuro_blogger_bot')

    // Проверяем статус подписки
    const { Pool } = require('pg')
    const dbPool = new Pool({
      connectionString: process.env.SUPABASE_URL,
      ssl: { rejectUnauthorized: false }
    })

    const client = await dbPool.connect()
    
    try {
      const subscription = await client.query(`
        SELECT * FROM competitor_subscriptions 
        WHERE user_telegram_id = '144022504' 
          AND competitor_username = 'yacheslav_nekludov'
          AND is_active = true
      `)

      if (subscription.rows.length > 0) {
        const sub = subscription.rows[0]
        console.log('\n✅ Активная подписка найдена:')
        console.log(`   • Формат доставки: ${sub.delivery_format}`)
        console.log(`   • Максимум рилсов: ${sub.max_reels}`)
        console.log(`   • Минимум просмотров: ${sub.min_views}`)
        console.log(`   • Создана: ${new Date(sub.created_at).toLocaleString('ru-RU')}`)
      } else {
        console.log('\n⚠️  Подписка не найдена, создаем...')
        
        const newSub = await client.query(`
          INSERT INTO competitor_subscriptions 
          (user_telegram_id, bot_name, competitor_username, competitor_display_name, 
           max_reels, min_views, max_age_days, delivery_format)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_telegram_id, competitor_username, bot_name) DO NOTHING
          RETURNING *
        `, [
          '144022504',
          'neuro_blogger_bot', 
          'yacheslav_nekludov',
          'Ячеслав Неклюдов',
          15,
          500,
          14,
          'digest'
        ])

        if (newSub.rows.length > 0) {
          console.log('✅ Подписка создана!')
        } else {
          console.log('✅ Подписка уже существовала')
        }
      }

    } finally {
      client.release()
      await dbPool.end()
    }

    console.log('\n🎯 Готово! Ожидайте результаты в Telegram!')
    console.log('\n📊 Для отслеживания прогресса:')
    console.log('   • Inngest Dashboard: http://localhost:8288')
    console.log('   • Логи сервера: pm2 logs ai-server-main')

  } catch (error) {
    console.error('❌ Ошибка запуска:', error.message)
  }
}

// Запуск анализа
startCompetitorAnalysis()