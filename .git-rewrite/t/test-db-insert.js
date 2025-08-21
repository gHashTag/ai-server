/**
 * Тест прямой вставки данных в таблицу instagram_similar_users
 */

const { Pool } = require('pg')

async function testDirectInsert() {
  console.log('🔍 Тестируем прямую вставку данных...')

  const connectionString = process.env.NEON_DATABASE_URL

  if (!connectionString) {
    console.error('❌ NEON_DATABASE_URL не установлена')
    process.exit(1)
  }

  const dbPool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  const client = await dbPool.connect()

  try {
    // Вставляем тестовые данные
    console.log('💾 Вставляем тестовые данные...')

    const testUsers = [
      {
        search_username: 'test_search',
        user_pk: '123456789',
        username: 'test_user_1',
        full_name: 'Test User 1',
        is_private: false,
        is_verified: true,
        profile_pic_url: 'https://example.com/pic1.jpg',
        profile_url: 'https://instagram.com/test_user_1',
        project_id: 1,
      },
      {
        search_username: 'test_search',
        user_pk: '987654321',
        username: 'test_user_2',
        full_name: 'Test User 2',
        is_private: true,
        is_verified: false,
        profile_pic_url: 'https://example.com/pic2.jpg',
        profile_url: 'https://instagram.com/test_user_2',
        project_id: 1,
      },
    ]

    for (const user of testUsers) {
      await client.query(
        `INSERT INTO instagram_similar_users 
         (search_username, user_pk, username, full_name, is_private, is_verified, 
          profile_pic_url, profile_url, project_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (search_username, user_pk) DO NOTHING`,
        [
          user.search_username,
          user.user_pk,
          user.username,
          user.full_name,
          user.is_private,
          user.is_verified,
          user.profile_pic_url,
          user.profile_url,
          user.project_id,
        ]
      )
      console.log(`✅ Вставлен пользователь: ${user.username}`)
    }

    // Проверяем результат
    const result = await client.query(
      'SELECT COUNT(*) as total FROM instagram_similar_users'
    )
    console.log(`📊 Всего записей в таблице: ${result.rows[0].total}`)

    // Выводим данные
    const dataResult = await client.query(`
      SELECT username, full_name, is_verified, project_id, created_at 
      FROM instagram_similar_users 
      ORDER BY created_at DESC
    `)

    console.log('\n📋 Данные в таблице:')
    dataResult.rows.forEach((row, index) => {
      console.log(
        `${index + 1}. ${row.username} (${row.full_name}) - Verified: ${
          row.is_verified
        } - Project: ${row.project_id}`
      )
    })
  } catch (error) {
    console.error('❌ Ошибка при вставке данных:', error.message)
    console.error('Детали:', error)
    throw error
  } finally {
    client.release()
    await dbPool.end()
  }
}

// Запускаем тест
if (require.main === module) {
  testDirectInsert()
    .then(() => {
      console.log('\n🎉 Тест прямой вставки завершен успешно!')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Тест провалился:', error)
      process.exit(1)
    })
}

module.exports = { testDirectInsert }
