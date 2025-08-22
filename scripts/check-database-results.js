/**
 * Скрипт для проверки результатов в базе данных
 * Показывает сохраненные данные для vyacheslav_nekludov
 * ПОЛНАЯ ПРОВЕРКА: пользователи + рилсы
 */

require('dotenv').config()
const { Client } = require('pg')

const PROJECT_ID = 38
const USERNAME = 'vyacheslav_nekludov'

async function checkDatabaseResults() {
  console.log('🔍 Проверка результатов в базе данных...\n')

  const client = new Client({
    connectionString: process.env.SUPABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    await client.connect()
    console.log('✅ Подключение к базе данных установлено')

    // ===== ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ =====
    console.log('\n📊 ПРОВЕРКА ПОЛЬЗОВАТЕЛЕЙ:')

    const statsQuery = `
      SELECT 
        COUNT(*) as total_users,
        search_username,
        project_id,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created
      FROM instagram_similar_users 
      WHERE search_username = $1 AND project_id = $2
      GROUP BY search_username, project_id
    `

    const statsResult = await client.query(statsQuery, [USERNAME, PROJECT_ID])

    if (statsResult.rows.length === 0) {
      console.log('❌ Пользователи не найдены в базе данных')
      console.log(`   Username: ${USERNAME}`)
      console.log(`   Project ID: ${PROJECT_ID}`)

      // Проверяем, есть ли данные для другого project_id
      const otherProjectQuery = `
        SELECT DISTINCT project_id, COUNT(*) as count
        FROM instagram_similar_users 
        WHERE search_username = $1
        GROUP BY project_id
      `
      const otherResult = await client.query(otherProjectQuery, [USERNAME])

      if (otherResult.rows.length > 0) {
        console.log('\n⚠️ Найдены пользователи для других project_id:')
        otherResult.rows.forEach(row => {
          console.log(
            `   Project ID ${row.project_id}: ${row.count} пользователей`
          )
        })
      }
    } else {
      const stats = statsResult.rows[0]

      console.log(`   ✅ Найдено пользователей: ${stats.total_users}`)
      console.log(`   Search Username: ${stats.search_username}`)
      console.log(`   Project ID: ${stats.project_id}`)
      console.log(`   Первое создание: ${stats.first_created}`)
      console.log(`   Последнее создание: ${stats.last_created}`)

      // Проверяем корректность данных
      if (stats.project_id !== PROJECT_ID) {
        console.log(
          `   ❌ Неверный project_id: ожидался ${PROJECT_ID}, получен ${stats.project_id}`
        )
      }

      if (stats.search_username !== USERNAME) {
        console.log(
          `   ❌ Неверный username: ожидался ${USERNAME}, получен ${stats.search_username}`
        )
      }
    }

    // ===== ПРОВЕРКА РИЛСОВ =====
    console.log('\n🎬 ПРОВЕРКА РИЛСОВ:')

    const reelsStatsQuery = `
      SELECT 
        COUNT(*) as total_reels,
        COUNT(DISTINCT scraped_for_user_pk) as unique_users,
        project_id,
        MIN(created_at) as first_reel_created,
        MAX(created_at) as last_reel_created
      FROM instagram_user_reels 
      WHERE project_id = $1
      GROUP BY project_id
    `

    const reelsStatsResult = await client.query(reelsStatsQuery, [PROJECT_ID])

    if (
      reelsStatsResult.rows.length === 0 ||
      reelsStatsResult.rows[0].total_reels === '0'
    ) {
      console.log('❌ Рилсы не найдены в базе данных')
      console.log(`   Project ID: ${PROJECT_ID}`)
    } else {
      const reelsStats = reelsStatsResult.rows[0]

      console.log(`   ✅ Найдено рилсов: ${reelsStats.total_reels}`)
      console.log(
        `   Уникальных пользователей с рилсами: ${reelsStats.unique_users}`
      )
      console.log(`   Project ID: ${reelsStats.project_id}`)
      console.log(`   Первый рилс создан: ${reelsStats.first_reel_created}`)
      console.log(`   Последний рилс создан: ${reelsStats.last_reel_created}`)
    }

    // ===== ПРИМЕРЫ НАЙДЕННЫХ ПОЛЬЗОВАТЕЛЕЙ =====
    const sampleQuery = `
      SELECT 
        user_pk,
        username,
        full_name,
        is_verified,
        is_private,
        created_at
      FROM instagram_similar_users 
      WHERE search_username = $1 AND project_id = $2
      ORDER BY created_at DESC
      LIMIT 5
    `

    const sampleResult = await client.query(sampleQuery, [USERNAME, PROJECT_ID])

    if (sampleResult.rows.length > 0) {
      console.log('\n👥 ПРИМЕРЫ НАЙДЕННЫХ ПОЛЬЗОВАТЕЛЕЙ:')
      sampleResult.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. @${user.username}`)
        console.log(`      Имя: ${user.full_name || 'не указано'}`)
        console.log(`      PK: ${user.user_pk}`)
        console.log(`      Верифицирован: ${user.is_verified ? 'да' : 'нет'}`)
        console.log(`      Приватный: ${user.is_private ? 'да' : 'нет'}`)
        console.log(`      Создан: ${user.created_at}`)
        console.log('')
      })
    }

    // ===== ПРИМЕРЫ НАЙДЕННЫХ РИЛСОВ =====
    const sampleReelsQuery = `
      SELECT 
        reel_id,
        owner_username,
        caption,
        like_count,
        play_count,
        created_at
      FROM instagram_user_reels 
      WHERE project_id = $1
      ORDER BY play_count DESC
      LIMIT 5
    `

    const sampleReelsResult = await client.query(sampleReelsQuery, [PROJECT_ID])

    if (sampleReelsResult.rows.length > 0) {
      console.log('\n🎬 ПРИМЕРЫ НАЙДЕННЫХ РИЛСОВ (топ по просмотрам):')
      sampleReelsResult.rows.forEach((reel, index) => {
        console.log(`   ${index + 1}. @${reel.owner_username}`)
        console.log(`      Reel ID: ${reel.reel_id}`)
        console.log(
          `      Описание: ${
            reel.caption ? reel.caption.substring(0, 100) + '...' : 'не указано'
          }`
        )
        console.log(`      Лайки: ${reel.like_count || 0}`)
        console.log(`      Просмотры: ${reel.play_count || 0}`)
        console.log(`      Создан: ${reel.created_at}`)
        console.log('')
      })
    }

    // ===== ОБЩАЯ СТАТИСТИКА =====
    console.log('\n📈 ОБЩАЯ СТАТИСТИКА:')

    const totalUsersQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT search_username) as unique_search_users,
        COUNT(DISTINCT project_id) as unique_projects
      FROM instagram_similar_users
    `

    const totalUsersResult = await client.query(totalUsersQuery)
    const totalUsers = totalUsersResult.rows[0]

    console.log(`   Всего пользователей: ${totalUsers.total_records}`)
    console.log(
      `   Уникальных поисковых пользователей: ${totalUsers.unique_search_users}`
    )
    console.log(`   Уникальных проектов: ${totalUsers.unique_projects}`)

    const totalReelsQuery = `
      SELECT 
        COUNT(*) as total_reels,
        COUNT(DISTINCT project_id) as unique_projects_with_reels
      FROM instagram_user_reels
    `

    const totalReelsResult = await client.query(totalReelsQuery)
    const totalReels = totalReelsResult.rows[0]

    console.log(`   Всего рилсов: ${totalReels.total_reels}`)
    console.log(
      `   Проектов с рилсами: ${totalReels.unique_projects_with_reels}`
    )

    // ===== SQL ЗАПРОСЫ ДЛЯ РУЧНОЙ ПРОВЕРКИ =====
    console.log('\n🔍 SQL ЗАПРОСЫ ДЛЯ РУЧНОЙ ПРОВЕРКИ:')
    console.log('')
    console.log('-- 1. Все пользователи для vyacheslav_nekludov:')
    console.log(
      `SELECT * FROM instagram_similar_users WHERE search_username = '${USERNAME}' AND project_id = ${PROJECT_ID} ORDER BY created_at DESC;`
    )
    console.log('')
    console.log('-- 2. Все рилсы для проекта 38:')
    console.log(
      `SELECT * FROM instagram_user_reels WHERE project_id = ${PROJECT_ID} ORDER BY view_count DESC;`
    )
    console.log('')
    console.log('-- 3. Статистика по пользователям:')
    console.log(
      `SELECT search_username, project_id, COUNT(*) as users_count FROM instagram_similar_users GROUP BY search_username, project_id ORDER BY users_count DESC;`
    )
    console.log('')
    console.log('-- 4. Статистика по рилсам:')
    console.log(
      `SELECT project_id, COUNT(*) as reels_count, COUNT(DISTINCT scraped_for_user_pk) as unique_users FROM instagram_user_reels GROUP BY project_id ORDER BY reels_count DESC;`
    )
    console.log('')
    console.log('-- 5. Топ рилсы по просмотрам:')
    console.log(
      `SELECT owner_username, caption, play_count, like_count FROM instagram_user_reels WHERE project_id = ${PROJECT_ID} ORDER BY play_count DESC LIMIT 10;`
    )

    console.log('\n🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ:')
    const usersCount =
      statsResult.rows.length > 0
        ? parseInt(statsResult.rows[0].total_users)
        : 0
    const reelsCount =
      reelsStatsResult.rows.length > 0
        ? parseInt(reelsStatsResult.rows[0].total_reels)
        : 0

    if (usersCount >= 30 && reelsCount >= 50) {
      console.log('✅ УСПЕХ: Найдено достаточно пользователей и рилсов')
    } else {
      console.log('⚠️ ВНИМАНИЕ: Может быть недостаточно данных')
    }

    console.log(`   Пользователи: ${usersCount}/30`)
    console.log(
      `   Рилсы: ${reelsCount}/150 (ожидается ~150 для 30 пользователей × 5 рилсов)`
    )
  } catch (error) {
    console.error('❌ Ошибка проверки базы данных:', error.message)
    console.error('Детали:', error)
  } finally {
    await client.end()
    console.log('\n🔚 Проверка завершена')
  }
}

// Запуск проверки
checkDatabaseResults().catch(console.error)
