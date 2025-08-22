#!/usr/bin/env node

/**
 * Проверка результатов Instagram Scraper V2 в базе данных
 */

const { Pool } = require('pg')

async function checkInstagramResults() {
  console.log('🔍 Проверяем результаты Instagram парсинга в базе данных...\n')

  const dbPool = new Pool({
    connectionString: process.env.SUPABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    const client = await dbPool.connect()

    console.log('📊 Проверяем найденных конкурентов...')

    // Проверяем последние результаты для vyacheslav_nekludov
    const competitorsQuery = `
      SELECT 
        search_username,
        username,
        full_name,
        is_verified,
        is_private,
        profile_chaining_secondary_label,
        social_context,
        created_at,
        project_id
      FROM instagram_similar_users 
      WHERE search_username = 'vyacheslav_nekludov'
      ORDER BY created_at DESC 
      LIMIT 10
    `

    const competitorsResult = await client.query(competitorsQuery)

    if (competitorsResult.rows.length > 0) {
      console.log(
        `✅ Найдено ${competitorsResult.rows.length} конкурентов для vyacheslav_nekludov:`
      )

      competitorsResult.rows.forEach((competitor, index) => {
        const verified = competitor.is_verified ? '✅' : '❌'
        const private_status = competitor.is_private ? '🔒' : '🔓'
        const category =
          competitor.profile_chaining_secondary_label || 'No category'

        console.log(
          `${index + 1}. @${competitor.username} ${verified} ${private_status}`
        )
        console.log(`   👤 ${competitor.full_name || 'No name'}`)
        console.log(`   📂 ${category}`)
        if (competitor.social_context) {
          console.log(`   💬 ${competitor.social_context}`)
        }
        console.log(
          `   📅 ${new Date(competitor.created_at).toLocaleString('ru-RU')}`
        )
        console.log(`   🏗️ Project: ${competitor.project_id}`)
        console.log('')
      })

      // Проверяем рилсы
      console.log('🎬 Проверяем рилсы конкурентов...')

      const reelsQuery = `
        SELECT 
          owner_username,
          shortcode,
          like_count,
          comment_count,
          play_count,
          video_duration,
          taken_at_timestamp,
          scraped_at
        FROM instagram_user_reels 
        WHERE scraped_for_user_pk IN (
          SELECT user_pk FROM instagram_similar_users 
          WHERE search_username = 'vyacheslav_nekludov'
        )
        ORDER BY like_count DESC 
        LIMIT 5
      `

      const reelsResult = await client.query(reelsQuery)

      if (reelsResult.rows.length > 0) {
        console.log(`✅ Найдено ${reelsResult.rows.length} рилсов:`)

        reelsResult.rows.forEach((reel, index) => {
          console.log(
            `${index + 1}. @${reel.owner_username} - ${reel.shortcode}`
          )
          console.log(
            `   👍 ${reel.like_count || 0} лайков, 💬 ${
              reel.comment_count || 0
            } комментариев`
          )
          console.log(
            `   👀 ${reel.play_count || 0} просмотров, ⏱️ ${
              reel.video_duration || 0
            }с`
          )
          console.log(
            `   📅 ${
              reel.taken_at_timestamp
                ? new Date(reel.taken_at_timestamp * 1000).toLocaleString(
                    'ru-RU'
                  )
                : 'Unknown date'
            }`
          )
          console.log('')
        })
      } else {
        console.log('❌ Рилсы не найдены')
      }
    } else {
      console.log('❌ Конкуренты для vyacheslav_nekludov не найдены')
    }

    // Проверяем последние записи вообще
    console.log('📋 Последние 5 записей в таблице instagram_similar_users:')

    const latestQuery = `
      SELECT 
        search_username,
        username,
        created_at,
        project_id
      FROM instagram_similar_users 
      ORDER BY created_at DESC 
      LIMIT 5
    `

    const latestResult = await client.query(latestQuery)

    if (latestResult.rows.length > 0) {
      latestResult.rows.forEach((row, index) => {
        console.log(
          `${index + 1}. Target: ${row.search_username} → Found: @${
            row.username
          }`
        )
        console.log(
          `   📅 ${new Date(row.created_at).toLocaleString(
            'ru-RU'
          )} | Project: ${row.project_id}`
        )
      })
    } else {
      console.log('❌ Таблица instagram_similar_users пуста')
    }

    client.release()
  } catch (error) {
    console.error('❌ Ошибка проверки базы данных:', error.message)

    if (
      error.message.includes('relation') &&
      error.message.includes('does not exist')
    ) {
      console.log(
        '\n💡 Возможно, таблицы не созданы. Проверьте выполнение функции в Inngest Dashboard.'
      )
    }
  } finally {
    await dbPool.end()
  }
}

// Запуск
checkInstagramResults()
  .then(() => {
    console.log('\n✅ Проверка завершена')
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error)
  })
