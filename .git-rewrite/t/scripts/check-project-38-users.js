/**
 * Проверка пользователей в проекте 38
 */

require('dotenv').config()
const { Client } = require('pg')

const PROJECT_ID = 38

async function checkProject38Users() {
  console.log('🔍 Проверка пользователей в проекте 38...\n')

  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    await client.connect()
    console.log('✅ Подключение к базе данных установлено')

    // Проверяем всех пользователей для проекта 38
    const usersQuery = `
      SELECT 
        search_username,
        COUNT(*) as users_count,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created
      FROM instagram_similar_users 
      WHERE project_id = $1
      GROUP BY search_username 
      ORDER BY users_count DESC
    `

    const usersResult = await client.query(usersQuery, [PROJECT_ID])

    if (usersResult.rows.length === 0) {
      console.log('❌ Пользователи не найдены в проекте 38')
    } else {
      console.log(
        `✅ Найдено ${usersResult.rows.length} поисковых пользователей в проекте 38:`
      )
      usersResult.rows.forEach((user, index) => {
        console.log(
          `   ${index + 1}. "${user.search_username}" - ${
            user.users_count
          } конкурентов`
        )
        console.log(`      Первый: ${user.first_created}`)
        console.log(`      Последний: ${user.last_created}`)
        console.log('')
      })
    }

    // Проверяем рилсы для проекта 38
    const reelsQuery = `
      SELECT 
        COUNT(*) as total_reels,
        COUNT(DISTINCT scraped_for_user_pk) as unique_users,
        MIN(created_at) as first_reel,
        MAX(created_at) as last_reel
      FROM instagram_user_reels 
      WHERE project_id = $1
      GROUP BY project_id
    `

    const reelsResult = await client.query(reelsQuery, [PROJECT_ID])

    if (reelsResult.rows.length > 0) {
      const reels = reelsResult.rows[0]
      console.log(`🎬 Рилсы в проекте 38:`)
      console.log(`   Всего рилсов: ${reels.total_reels}`)
      console.log(`   Уникальных пользователей: ${reels.unique_users}`)
      console.log(`   Первый рилс: ${reels.first_reel}`)
      console.log(`   Последний рилс: ${reels.last_reel}`)
    }

    // Проверяем последние рилсы
    const latestReelsQuery = `
      SELECT 
        owner_username,
        scraped_for_user_pk,
        created_at
      FROM instagram_user_reels 
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `

    const latestReelsResult = await client.query(latestReelsQuery, [PROJECT_ID])

    if (latestReelsResult.rows.length > 0) {
      console.log('\n📅 Последние рилсы:')
      latestReelsResult.rows.forEach((reel, index) => {
        console.log(
          `   ${index + 1}. @${reel.owner_username} (scraped_for: ${
            reel.scraped_for_user_pk
          }) - ${reel.created_at}`
        )
      })
    }

    console.log('\n🎯 ИТОГ:')
    console.log(
      `   Проект 38: ${usersResult.rows.length} поисковых пользователей`
    )
    console.log(
      `   Рилсы: ${
        reelsResult.rows.length > 0 ? reelsResult.rows[0].total_reels : 0
      }`
    )

    if (usersResult.rows.length === 0 && reelsResult.rows.length > 0) {
      console.log(
        '   ⚠️ Есть рилсы, но нет пользователей - возможно проблема с парсингом пользователей'
      )
    }
  } catch (error) {
    console.error('❌ Ошибка проверки:', error.message)
  } finally {
    await client.end()
    console.log('\n🔚 Проверка завершена')
  }
}

checkProject38Users().catch(console.error)
