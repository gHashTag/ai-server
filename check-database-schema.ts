/**
 * 🔍 ПРОВЕРКА СХЕМЫ БАЗЫ ДАННЫХ
 * Посмотрим какие таблицы есть и создадим недостающие
 */

import pkg from 'pg'
const { Pool } = pkg

async function checkDatabaseSchema() {
  console.log('🔍 === ПРОВЕРКА СХЕМЫ БАЗЫ ДАННЫХ ===\n')

  const connectionString = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_5RWzh7CwrXxE@ep-delicate-block-a1l1lt0p-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  })

  try {
    const client = await pool.connect()
    
    try {
      // Проверяем существующие таблицы
      console.log('📋 Шаг 1: Проверка существующих таблиц...')
      const tablesResult = await client.query(`
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)

      console.log('✅ Существующие таблицы:')
      tablesResult.rows.forEach(table => {
        console.log(`   📊 ${table.table_name}`)
      })

      if (tablesResult.rows.length === 0) {
        console.log('⚠️ Таблицы не найдены в схеме public')
      }

      // Создаем недостающие таблицы для Instagram анализа
      console.log('\n🏗️ Шаг 2: Создание таблиц для Instagram анализа...')

      // Таблица проектов (если не существует)
      console.log('📁 Создаем таблицу projects...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // Вставляем тестовый проект
      await client.query(`
        INSERT INTO projects (id, name, description) 
        VALUES (1, 'Instagram Analysis Project', 'Main project for Instagram competitor analysis')
        ON CONFLICT (id) DO NOTHING
      `)

      // Таблица конкурентов
      console.log('👥 Создаем таблицу competitors...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS competitors (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          query_username TEXT NOT NULL,
          comp_username TEXT NOT NULL,
          followers_count INTEGER,
          category TEXT,
          bio TEXT,
          ig_url TEXT,
          project_id INTEGER REFERENCES projects(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(query_username, comp_username)
        )
      `)

      // Таблица анализа рилз
      console.log('🎬 Создаем таблицу reels_analysis...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS reels_analysis (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comp_username TEXT NOT NULL,
          reel_id TEXT NOT NULL,
          ig_reel_url TEXT,
          caption TEXT,
          views_count INTEGER,
          likes_count INTEGER,
          comments_count INTEGER,
          created_at_instagram TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          project_id INTEGER REFERENCES projects(id),
          UNIQUE(reel_id, project_id)
        )
      `)

      // Таблица контент-скриптов
      console.log('📝 Создаем таблицу content_scripts...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS content_scripts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reel_id TEXT NOT NULL,
          orig_caption TEXT,
          orig_transcript TEXT,
          script_v1 TEXT,
          script_v2 TEXT,
          script_v3 TEXT,
          ig_reel_url TEXT,
          project_id INTEGER REFERENCES projects(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(reel_id, project_id)
        )
      `)

      // Таблица памяти Telegram
      console.log('💬 Создаем таблицу telegram_memory...')
      await client.query(`
        CREATE TABLE IF NOT EXISTS telegram_memory (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          message_text TEXT NOT NULL,
          message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'bot')),
          context_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `)

      // Создаем индексы для производительности
      console.log('⚡ Создаем индексы для производительности...')
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reels_analysis_username ON reels_analysis(comp_username)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reels_analysis_views ON reels_analysis(views_count DESC)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reels_analysis_date ON reels_analysis(created_at_instagram DESC)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_competitors_query ON competitors(query_username)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_telegram_memory_user ON telegram_memory(user_id, created_at DESC)`)

      console.log('✅ Схема базы данных создана успешно!')

      // Вставляем тестовые данные для демонстрации
      console.log('\n🧪 Шаг 3: Добавляем тестовые данные...')
      
      // Тестовые конкуренты
      await client.query(`
        INSERT INTO competitors (query_username, comp_username, followers_count, category, bio, ig_url, project_id) 
        VALUES 
          ('alexyanovsky', 'garyvee', 12500000, 'Business', 'Entrepreneur and motivational speaker', 'https://instagram.com/garyvee', 1),
          ('alexyanovsky', 'mkbhd', 5200000, 'Tech', 'Tech reviewer and YouTuber', 'https://instagram.com/mkbhd', 1),
          ('alexyanovsky', 'cristiano', 620000000, 'Sports', 'Professional footballer', 'https://instagram.com/cristiano', 1)
        ON CONFLICT (query_username, comp_username) DO NOTHING
      `)

      // Тестовые рилз (имитируем реальные данные)
      await client.query(`
        INSERT INTO reels_analysis (comp_username, reel_id, ig_reel_url, caption, views_count, likes_count, comments_count, created_at_instagram, project_id) 
        VALUES 
          ('garyvee', 'test_reel_001', 'https://instagram.com/p/ABC123/', 'Motivation Monday: Stop making excuses and start taking action! 💪 #motivation #business', 2500000, 85000, 3200, NOW() - INTERVAL '3 days', 1),
          ('garyvee', 'test_reel_002', 'https://instagram.com/p/DEF456/', 'The key to success is patience and persistence. Here is why... 🔑', 1800000, 72000, 2800, NOW() - INTERVAL '5 days', 1),
          ('mkbhd', 'test_reel_003', 'https://instagram.com/p/GHI789/', 'iPhone 15 Pro review in 60 seconds! Is it worth the upgrade? 📱', 3200000, 125000, 8500, NOW() - INTERVAL '2 days', 1),
          ('mkbhd', 'test_reel_004', 'https://instagram.com/p/JKL012/', 'Tesla Model S Plaid vs Lucid Air Dream Edition 🏎️⚡', 2900000, 98000, 5600, NOW() - INTERVAL '1 week', 1),
          ('cristiano', 'test_reel_005', 'https://instagram.com/p/MNO345/', 'Training session before the big match! Siuuuu! ⚽', 15000000, 1200000, 45000, NOW() - INTERVAL '1 day', 1),
          ('cristiano', 'test_reel_006', 'https://instagram.com/p/PQR678/', 'Family time is the best time ❤️👨‍👩‍👧‍👦', 18000000, 1500000, 62000, NOW() - INTERVAL '4 days', 1)
        ON CONFLICT (reel_id, project_id) DO NOTHING
      `)

      console.log('✅ Тестовые данные добавлены!')

      // Проверяем результат
      console.log('\n📊 Шаг 4: Проверка созданных данных...')
      
      const reelsCount = await client.query('SELECT COUNT(*) FROM reels_analysis')
      const competitorsCount = await client.query('SELECT COUNT(*) FROM competitors')
      
      console.log(`📹 Рилз в базе: ${reelsCount.rows[0].count}`)
      console.log(`👥 Конкурентов в базе: ${competitorsCount.rows[0].count}`)

      // Показываем примеры данных
      const sampleReels = await client.query(`
        SELECT comp_username, caption, views_count, likes_count, comments_count
        FROM reels_analysis 
        ORDER BY views_count DESC 
        LIMIT 3
      `)

      console.log('\n🎬 Примеры рилз:')
      sampleReels.rows.forEach((reel, index) => {
        console.log(`${index + 1}. ${reel.comp_username}:`)
        console.log(`   👀 ${reel.views_count?.toLocaleString()} просмотров`)
        console.log(`   👍 ${reel.likes_count?.toLocaleString()} лайков`) 
        console.log(`   💬 ${reel.comments_count?.toLocaleString()} комментариев`)
        console.log(`   📝 ${reel.caption}`)
      })

    } finally {
      client.release()
    }

    console.log('\n🎉 === СХЕМА БАЗЫ ДАННЫХ ГОТОВА! ===')
    console.log('✅ Все таблицы созданы')
    console.log('✅ Индексы настроены')
    console.log('✅ Тестовые данные загружены')
    console.log('')
    console.log('🚀 Теперь можно тестировать функции анализа рилз!')

  } catch (error) {
    console.error('❌ Ошибка проверки схемы:', error)
    throw error
  } finally {
    await pool.end()
  }
}

checkDatabaseSchema()
  .then(() => {
    console.log('\n🎯 Схема базы данных успешно проверена и настроена!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Ошибка настройки схемы:', error.message)
    process.exit(1)
  })