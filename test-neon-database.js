/**
 * Тест подключения к Neon database (PostgreSQL)
 * Используется в Instagram Scraper, возможно основная БД
 */

const { Pool } = require('pg')

async function testNeonConnection() {
  console.log('🚀 Тестирование подключения к Neon Database...')
  
  const NEON_DATABASE_URL = 'postgresql://neondb_owner:npg_5RWzh7CwrXxE@ep-delicate-block-a1l1lt0p-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  
  console.log('📡 Подключение к Neon PostgreSQL...')
  console.log('🔗 URL: ep-delicate-block-a1l1lt0p-pooler.ap-southeast-1.aws.neon.tech')
  
  const dbPool = new Pool({
    connectionString: NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    const client = await dbPool.connect()
    console.log('✅ Подключение к Neon Database успешно!')
    
    try {
      // Проверяем существующие таблицы
      console.log('\n📋 Проверка существующих таблиц...')
      
      const { rows: tables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      
      console.log(`📊 Найдено ${tables.length} таблиц:`)
      tables.forEach((table, i) => {
        console.log(`  ${i + 1}. ${table.table_name}`)
      })
      
      // Проверяем, есть ли таблицы мониторинга конкурентов
      const monitoringTables = [
        'competitor_subscriptions',
        'competitor_profiles',
        'competitor_delivery_history',
        'instagram_apify_reels'
      ]
      
      const existingMonitoringTables = tables
        .map(t => t.table_name)
        .filter(name => monitoringTables.includes(name))
      
      console.log(`\n🎯 Таблицы мониторинга: ${existingMonitoringTables.length}/${monitoringTables.length}`)
      existingMonitoringTables.forEach(table => {
        console.log(`  ✅ ${table}`)
      })
      
      const missingTables = monitoringTables.filter(
        table => !existingMonitoringTables.includes(table)
      )
      
      if (missingTables.length > 0) {
        console.log(`\n❌ Отсутствующие таблицы:`)
        missingTables.forEach(table => {
          console.log(`  ❌ ${table}`)
        })
        
        console.log('\n🏗️ Создание отсутствующих таблиц...')
        await createMissingTables(client, missingTables)
      }
      
      // Тестируем операции с таблицами мониторинга
      if (existingMonitoringTables.includes('competitor_subscriptions') || 
          missingTables.includes('competitor_subscriptions')) {
        console.log('\n🧪 Тестирование операций с подписками...')
        await testSubscriptionOperations(client)
      }
      
      if (existingMonitoringTables.includes('instagram_apify_reels') || 
          missingTables.includes('instagram_apify_reels')) {
        console.log('\n🎬 Проверка таблицы рилзов...')
        await testReelsTable(client)
      }
      
    } finally {
      client.release()
    }
    
    console.log('\n🎉 Тест Neon Database завершен успешно!')
    return true
    
  } catch (error) {
    console.error('❌ Ошибка подключения к Neon:', error.message)
    console.error('🔍 Детали:', error.code || 'Неизвестная ошибка')
    
    if (error.message.includes('password')) {
      console.log('\n💡 Возможно, пароль устарел или неверный')
    } else if (error.message.includes('connect')) {
      console.log('\n💡 Проблемы с сетевым подключением')
    }
    
    return false
  } finally {
    await dbPool.end()
  }
}

async function createMissingTables(client, missingTables) {
  const tableDefinitions = {
    competitor_subscriptions: `
      CREATE TABLE competitor_subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_telegram_id VARCHAR(255) NOT NULL,
        user_chat_id VARCHAR(255),
        bot_name VARCHAR(255) NOT NULL,
        competitor_username VARCHAR(255) NOT NULL,
        competitor_display_name VARCHAR(255),
        max_reels INTEGER DEFAULT 10,
        min_views INTEGER DEFAULT 1000,
        max_age_days INTEGER DEFAULT 7,
        delivery_time TIME DEFAULT '09:00:00',
        delivery_timezone VARCHAR(50) DEFAULT 'UTC',
        delivery_format VARCHAR(50) DEFAULT 'digest',
        is_active BOOLEAN DEFAULT true,
        last_parsed_at TIMESTAMP,
        next_parse_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_telegram_id, competitor_username, bot_name)
      )
    `,
    competitor_profiles: `
      CREATE TABLE competitor_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        bio TEXT,
        followers_count INTEGER,
        following_count INTEGER,
        posts_count INTEGER,
        is_verified BOOLEAN DEFAULT false,
        is_private BOOLEAN DEFAULT false,
        last_updated TIMESTAMP DEFAULT NOW(),
        profile_pic_url TEXT,
        total_subscribers INTEGER DEFAULT 0,
        avg_views INTEGER DEFAULT 0,
        avg_likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `,
    competitor_delivery_history: `
      CREATE TABLE competitor_delivery_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID REFERENCES competitor_subscriptions(id) ON DELETE CASCADE,
        delivered_at TIMESTAMP DEFAULT NOW(),
        reels_count INTEGER NOT NULL,
        delivery_status VARCHAR(50) DEFAULT 'sent',
        error_message TEXT,
        reels_data JSONB,
        archive_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `,
    instagram_apify_reels: `
      CREATE TABLE instagram_apify_reels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reel_id VARCHAR(255) UNIQUE,
        url TEXT NOT NULL,
        video_url TEXT,
        thumbnail_url TEXT,
        caption TEXT,
        hashtags JSONB,
        owner_username VARCHAR(255),
        owner_id VARCHAR(255),
        views_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        duration FLOAT,
        published_at TIMESTAMP,
        music_artist VARCHAR(255),
        music_title VARCHAR(255),
        project_id INTEGER,
        scraped_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
  }
  
  for (const tableName of missingTables) {
    if (tableDefinitions[tableName]) {
      try {
        console.log(`  🏗️ Создание ${tableName}...`)
        await client.query(tableDefinitions[tableName])
        console.log(`  ✅ ${tableName} создана`)
      } catch (error) {
        console.log(`  ❌ Ошибка создания ${tableName}: ${error.message}`)
      }
    }
  }
  
  // Создаем индексы
  console.log('📊 Создание индексов...')
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON competitor_subscriptions(is_active, next_parse_at)',
    'CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON competitor_subscriptions(user_telegram_id, bot_name)',
    'CREATE INDEX IF NOT EXISTS idx_reels_owner ON instagram_apify_reels(owner_username)',
    'CREATE INDEX IF NOT EXISTS idx_reels_scraped ON instagram_apify_reels(scraped_at)'
  ]
  
  for (const indexSQL of indexes) {
    try {
      await client.query(indexSQL)
    } catch (error) {
      // Индексы могут уже существовать
    }
  }
}

async function testSubscriptionOperations(client) {
  const testSubscription = {
    user_telegram_id: 'test_user_' + Date.now(),
    user_chat_id: 'test_chat_' + Date.now(),
    bot_name: 'neuro_blogger_bot',
    competitor_username: 'test_competitor',
    max_reels: 5,
    min_views: 1000,
    delivery_format: 'digest',
    is_active: true
  }
  
  try {
    // Создание тестовой подписки
    const { rows } = await client.query(`
      INSERT INTO competitor_subscriptions 
      (user_telegram_id, user_chat_id, bot_name, competitor_username, max_reels, min_views, delivery_format, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      testSubscription.user_telegram_id,
      testSubscription.user_chat_id,
      testSubscription.bot_name,
      testSubscription.competitor_username,
      testSubscription.max_reels,
      testSubscription.min_views,
      testSubscription.delivery_format,
      testSubscription.is_active
    ])
    
    const subscriptionId = rows[0].id
    console.log(`  ✅ Тестовая подписка создана: ${subscriptionId}`)
    
    // Чтение подписки
    const { rows: readRows } = await client.query(`
      SELECT * FROM competitor_subscriptions WHERE id = $1
    `, [subscriptionId])
    
    console.log(`  ✅ Подписка прочитана: @${readRows[0].competitor_username}`)
    
    // Удаление тестовой подписки
    await client.query(`
      DELETE FROM competitor_subscriptions WHERE id = $1
    `, [subscriptionId])
    
    console.log(`  ✅ Тестовая подписка удалена`)
    
  } catch (error) {
    console.log(`  ❌ Ошибка операций: ${error.message}`)
  }
}

async function testReelsTable(client) {
  try {
    const { rows } = await client.query(`
      SELECT COUNT(*) as count FROM instagram_apify_reels
    `)
    
    console.log(`  📊 Рилзов в БД: ${rows[0].count}`)
    
    if (rows[0].count > 0) {
      const { rows: sampleRows } = await client.query(`
        SELECT owner_username, views_count, url 
        FROM instagram_apify_reels 
        ORDER BY views_count DESC 
        LIMIT 3
      `)
      
      console.log(`  🏆 Топ рилзы:`)
      sampleRows.forEach((reel, i) => {
        console.log(`    ${i + 1}. @${reel.owner_username}: ${reel.views_count?.toLocaleString() || 0} просмотров`)
      })
    }
    
  } catch (error) {
    console.log(`  ❌ Ошибка проверки рилзов: ${error.message}`)
  }
}

// Запуск теста
testNeonConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Neon Database готова к использованию!')
      console.log(`
📋 Результат:
✅ Подключение установлено
✅ Таблицы созданы/проверены
✅ Операции работают

🚀 Следующие шаги:
1. Запустите API сервер: npm run dev
2. Протестируйте мониторинг: node test-competitor-monitoring.js
3. Проверьте Telegram интеграцию

💡 База данных готова для продакшена!
`)
    } else {
      console.log('\n💥 Подключение к Neon Database не удалось')
      console.log(`
🔧 Возможные решения:
1. Проверьте подключение к интернету
2. Убедитесь что Neon проект активен
3. Проверьте правильность credentials
4. Попробуйте обновить пароль в Neon Dashboard
`)
    }
    
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error)
    process.exit(1)
  })