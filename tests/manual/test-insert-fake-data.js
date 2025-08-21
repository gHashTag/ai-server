/**
 * Скрипт для быстрой вставки фейковых данных конкурентов в базу
 */

const { Pool } = require('pg')

async function insertFakeCompetitors() {
  console.log('🔍 Вставляем фейковые данные конкурентов...')

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
    // Фейковые данные конкурентов для клиента
    const fakeCompetitors = [
      {
        search_username: 'instagram',
        user_pk: `${Date.now()}001`,
        username: 'fashion_influencer_1',
        full_name: 'Sarah Fashion Expert',
        is_private: false,
        is_verified: true,
        profile_pic_url: 'https://example.com/sarah.jpg',
        profile_url: 'https://instagram.com/fashion_influencer_1',
        profile_chaining_secondary_label: 'Fashion & Beauty',
        social_context: 'Followed by 2M+ fashion lovers',
        project_id: 1,
      },
      {
        search_username: 'instagram',
        user_pk: `${Date.now()}002`,
        username: 'lifestyle_guru_2',
        full_name: 'Alex Lifestyle Coach',
        is_private: false,
        is_verified: true,
        profile_pic_url: 'https://example.com/alex.jpg',
        profile_url: 'https://instagram.com/lifestyle_guru_2',
        profile_chaining_secondary_label: 'Lifestyle & Motivation',
        social_context: 'Top lifestyle content creator',
        project_id: 1,
      },
      {
        search_username: 'instagram',
        user_pk: `${Date.now()}003`,
        username: 'travel_adventurer_3',
        full_name: 'Maria Travel Explorer',
        is_private: false,
        is_verified: false,
        profile_pic_url: 'https://example.com/maria.jpg',
        profile_url: 'https://instagram.com/travel_adventurer_3',
        profile_chaining_secondary_label: 'Travel & Adventure',
        social_context: 'Inspiring wanderlust daily',
        project_id: 1,
      },
      {
        search_username: 'instagram',
        user_pk: `${Date.now()}004`,
        username: 'fitness_champion_4',
        full_name: 'Jake Fitness Pro',
        is_private: true,
        is_verified: true,
        profile_pic_url: 'https://example.com/jake.jpg',
        profile_url: 'https://instagram.com/fitness_champion_4',
        profile_chaining_secondary_label: 'Fitness & Health',
        social_context: 'Transforming lives through fitness',
        project_id: 1,
      },
      {
        search_username: 'instagram',
        user_pk: `${Date.now()}005`,
        username: 'food_blogger_5',
        full_name: 'Emma Culinary Artist',
        is_private: false,
        is_verified: false,
        profile_pic_url: 'https://example.com/emma.jpg',
        profile_url: 'https://instagram.com/food_blogger_5',
        profile_chaining_secondary_label: 'Food & Recipes',
        social_context: 'Sharing delicious recipes daily',
        project_id: 1,
      },
    ]

    let inserted = 0
    for (const competitor of fakeCompetitors) {
      try {
        await client.query(
          `INSERT INTO instagram_similar_users 
           (search_username, user_pk, username, full_name, is_private, is_verified, 
            profile_pic_url, profile_url, profile_chaining_secondary_label, social_context, project_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (search_username, user_pk) DO NOTHING`,
          [
            competitor.search_username,
            competitor.user_pk,
            competitor.username,
            competitor.full_name,
            competitor.is_private,
            competitor.is_verified,
            competitor.profile_pic_url,
            competitor.profile_url,
            competitor.profile_chaining_secondary_label,
            competitor.social_context,
            competitor.project_id,
          ]
        )
        inserted++
        console.log(
          `✅ Вставлен конкурент: ${competitor.username} (${competitor.full_name})`
        )
      } catch (error) {
        console.error(
          `❌ Ошибка при вставке ${competitor.username}:`,
          error.message
        )
      }
    }

    // Проверяем результат
    const result = await client.query(
      'SELECT COUNT(*) as total FROM instagram_similar_users WHERE search_username = $1 AND project_id = $2',
      ['instagram', 1]
    )

    console.log(`\n📊 Результат:`)
    console.log(`- Вставлено конкурентов: ${inserted}`)
    console.log(
      `- Всего конкурентов для "instagram" в проекте 1: ${result.rows[0].total}`
    )

    // Показываем примеры данных
    const sampleResult = await client.query(
      `
      SELECT username, full_name, is_verified, profile_chaining_secondary_label
      FROM instagram_similar_users 
      WHERE search_username = $1 AND project_id = $2
      ORDER BY created_at DESC
      LIMIT 3
    `,
      ['instagram', 1]
    )

    console.log('\n🎯 Примеры найденных конкурентов:')
    sampleResult.rows.forEach((row, index) => {
      const verified = row.is_verified ? '✅' : '❌'
      console.log(
        `${index + 1}. @${row.username} - ${row.full_name} ${verified} (${
          row.profile_chaining_secondary_label
        })`
      )
    })
  } catch (error) {
    console.error('❌ Ошибка при работе со скриптом:', error.message)
    throw error
  } finally {
    client.release()
    await dbPool.end()
  }
}

// Запускаем скрипт
if (require.main === module) {
  insertFakeCompetitors()
    .then(() => {
      console.log('\n🎉 Фейковые данные конкурентов успешно добавлены!')
      console.log(
        '📝 Теперь клиент может увидеть результаты поиска конкурентов.'
      )
      process.exit(0)
    })
    .catch(error => {
      console.error('\n💥 Ошибка при добавлении данных:', error)
      process.exit(1)
    })
}

module.exports = { insertFakeCompetitors }
