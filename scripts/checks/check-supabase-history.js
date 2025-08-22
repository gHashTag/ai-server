/**
 * Проверка сохранения истории парсинга в Supabase
 */

require('dotenv').config()
const { Pool } = require('pg')

async function checkSupabaseHistory() {
  console.log('🔍 Проверка истории парсинга в Supabase...')
  
  const connectionString = process.env.SUPABASE_URL
  console.log('🔗 Подключение к БД:', connectionString ? 'настроено' : 'НЕ НАСТРОЕНО')
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  })

  try {
    const client = await pool.connect()

    // Проверяем существование таблицы
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'instagram_apify_reels'
      )
    `)
    
    console.log(`📋 Таблица instagram_apify_reels существует: ${tableCheck.rows[0].exists}`)

    if (tableCheck.rows[0].exists) {
      // Получаем структуру таблицы
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'instagram_apify_reels'
        ORDER BY ordinal_position
      `)
      
      console.log('\n📊 Структура таблицы:')
      console.table(structure.rows)

      // Проверяем количество записей
      const count = await client.query('SELECT COUNT(*) FROM instagram_apify_reels')
      console.log(`\n📈 Всего записей: ${count.rows[0].count}`)

      // Последние записи
      if (parseInt(count.rows[0].count) > 0) {
        const recent = await client.query(`
          SELECT 
            reel_id, 
            owner_username, 
            views_count, 
            likes_count,
            project_id,
            scraped_at,
            created_at
          FROM instagram_apify_reels 
          ORDER BY created_at DESC 
          LIMIT 5
        `)
        
        console.log('\n📊 Последние 5 записей:')
        console.table(recent.rows)

        // Статистика по проектам
        const projectStats = await client.query(`
          SELECT 
            project_id,
            COUNT(*) as reels_count,
            MAX(scraped_at) as last_scraped,
            COUNT(DISTINCT owner_username) as unique_users
          FROM instagram_apify_reels 
          GROUP BY project_id 
          ORDER BY reels_count DESC
        `)
        
        console.log('\n📊 Статистика по проектам:')
        console.table(projectStats.rows)
      }
    }

    client.release()
    console.log('\n✅ Проверка завершена!')

  } catch (error) {
    console.error('❌ Ошибка при проверке:', error.message)
  } finally {
    await pool.end()
  }
}

// Запуск проверки
checkSupabaseHistory()