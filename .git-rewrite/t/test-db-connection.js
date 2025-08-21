/**
 * Тест подключения к базе данных Neon
 */

const { Pool } = require('pg')

async function testDatabaseConnection() {
  console.log('🔍 Тестируем подключение к базе данных...')

  const connectionString = process.env.NEON_DATABASE_URL
  console.log('Connection String:', connectionString ? 'FOUND' : 'NOT FOUND')

  if (!connectionString) {
    console.error('❌ NEON_DATABASE_URL не установлена')
    process.exit(1)
  }

  // Создаем пул подключений
  const dbPool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  const client = await dbPool.connect()

  try {
    // Тестовый запрос
    const result = await client.query('SELECT NOW() as current_time')
    console.log('✅ Подключение к базе данных успешно!')
    console.log('Current time:', result.rows[0].current_time)

    // Проверяем существующие таблицы
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log('\n📊 Существующие таблицы:')
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })

    // Попробуем создать таблицу как в функции
    console.log('\n🔨 Создаём тестовую таблицу...')
    await client.query(`
      CREATE TABLE IF NOT EXISTS instagram_similar_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        search_username VARCHAR(255) NOT NULL,
        user_pk VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        is_private BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        profile_pic_url TEXT,
        profile_url TEXT,
        profile_chaining_secondary_label VARCHAR(255),
        social_context VARCHAR(255),
        project_id INTEGER,
        scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(search_username, user_pk)
      );
    `)

    console.log('✅ Таблица instagram_similar_users создана успешно!')

    // Проверяем, появилась ли таблица
    const newTablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log('\n📊 Таблицы после создания:')
    newTablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
  } catch (error) {
    console.error('❌ Ошибка при работе с базой данных:', error.message)
    console.error('Детали:', error)
    throw error
  } finally {
    client.release()
    await dbPool.end()
  }
}

// Запускаем тест
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('\n🎉 Тест завершен успешно!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Тест провалился:', error)
      process.exit(1)
    })
}

module.exports = { testDatabaseConnection }
