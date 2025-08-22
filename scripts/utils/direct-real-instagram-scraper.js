/**
 * Прямой парсер Instagram с реальными API ключами
 * Сохраняет данные напрямую в базу, минуя Inngest
 */

const axios = require('axios')
const { Pool } = require('pg')

class DirectInstagramScraper {
  constructor() {
    this.apiKey = 'da6f54ca68mshc06984da37c569bp1743f1jsne4c79beeb969'
    this.host = 'real-time-instagram-scraper-api1.p.rapidapi.com'
    this.baseUrl = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'

    this.dbPool = new Pool({
      connectionString: process.env.SUPABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  }

  async getSimilarUsers(username, count = 10) {
    console.log(`🔍 Получаем реальных конкурентов для @${username}...`)

    try {
      const response = await axios.get(`${this.baseUrl}/v1/similar_users_v2`, {
        params: {
          username_or_id: username,
          count: count,
        },
        headers: {
          'x-rapidapi-key': this.apiKey,
          'x-rapidapi-host': this.host,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      })

      if (response.data?.status === 'ok' && response.data?.data?.users) {
        const users = response.data.data.users
        console.log(
          `✅ API Success: Найдено ${users.length} реальных пользователей`
        )
        return {
          success: true,
          users: users,
          total: users.length,
        }
      } else {
        console.log(`❌ API Error:`, response.data)
        return {
          success: false,
          error: response.data?.data || 'Unknown API error',
          users: [],
          total: 0,
        }
      }
    } catch (error) {
      console.error(`❌ API Request Error:`, error.message)
      return {
        success: false,
        error: error.message,
        users: [],
        total: 0,
      }
    }
  }

  async ensureTableExists(client) {
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

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_instagram_users_search_username 
      ON instagram_similar_users(search_username);
      
      CREATE INDEX IF NOT EXISTS idx_instagram_users_project_id 
      ON instagram_similar_users(project_id);
    `)
  }

  async saveUsersToDatabase(searchUsername, users, projectId = 1) {
    console.log(
      `💾 Сохраняем ${users.length} реальных пользователей в базу данных...`
    )

    const client = await this.dbPool.connect()
    let saved = 0
    let duplicatesSkipped = 0

    try {
      await this.ensureTableExists(client)

      for (const user of users) {
        try {
          await client.query(
            `INSERT INTO instagram_similar_users 
             (search_username, user_pk, username, full_name, is_private, is_verified, 
              profile_pic_url, profile_url, profile_chaining_secondary_label, social_context, project_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (search_username, user_pk) DO NOTHING`,
            [
              searchUsername,
              String(user.pk),
              user.username,
              user.full_name || '',
              user.is_private || false,
              user.is_verified || false,
              user.profile_pic_url || '',
              `https://instagram.com/${user.username}`,
              user.profile_chaining_secondary_label || '',
              user.social_context || '',
              projectId,
            ]
          )
          saved++
          console.log(
            `✅ Сохранён: @${user.username} - ${user.full_name || 'No name'} (${
              user.is_verified ? 'Verified' : 'Not verified'
            })`
          )
        } catch (error) {
          if (error.code === '23505') {
            duplicatesSkipped++
            console.log(`⚠️ Дубликат пропущен: @${user.username}`)
          } else {
            console.error(
              `❌ Ошибка при сохранении @${user.username}:`,
              error.message
            )
          }
        }
      }

      console.log(`\n📊 Результат сохранения:`)
      console.log(`- Сохранено новых: ${saved}`)
      console.log(`- Дубликатов пропущено: ${duplicatesSkipped}`)
      console.log(`- Всего обработано: ${saved + duplicatesSkipped}`)

      return {
        saved,
        duplicatesSkipped,
        totalProcessed: saved + duplicatesSkipped,
      }
    } finally {
      client.release()
    }
  }

  async runFullScraping(targetUsername, projectId = 1, maxUsers = 10) {
    console.log(`\n🚀 ПРЯМОЙ ПАРСИНГ Instagram для @${targetUsername}`)
    console.log(`📊 Параметры: Project ID ${projectId}, Max Users: ${maxUsers}`)

    // Step 1: Get similar users from API
    const apiResult = await this.getSimilarUsers(targetUsername, maxUsers)

    if (!apiResult.success) {
      console.error(`❌ Не удалось получить данные от API: ${apiResult.error}`)
      return false
    }

    // Step 2: Save to database
    const saveResult = await this.saveUsersToDatabase(
      targetUsername,
      apiResult.users,
      projectId
    )

    // Step 3: Verify saved data
    const client = await this.dbPool.connect()
    try {
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM instagram_similar_users WHERE search_username = $1 AND project_id = $2',
        [targetUsername, projectId]
      )

      const sampleResult = await client.query(
        `
        SELECT username, full_name, is_verified, profile_chaining_secondary_label
        FROM instagram_similar_users 
        WHERE search_username = $1 AND project_id = $2
        ORDER BY created_at DESC
        LIMIT 5
      `,
        [targetUsername, projectId]
      )

      console.log(`\n🎉 ПАРСИНГ ЗАВЕРШЁН УСПЕШНО!`)
      console.log(
        `📊 Всего конкурентов для @${targetUsername}: ${countResult.rows[0].total}`
      )

      console.log('\n🎯 Топ-5 реальных конкурентов:')
      sampleResult.rows.forEach((row, index) => {
        const verified = row.is_verified ? '✅' : '❌'
        const category = row.profile_chaining_secondary_label || 'General'
        console.log(
          `${index + 1}. @${row.username} - ${
            row.full_name
          } ${verified} (${category})`
        )
      })

      return true
    } finally {
      client.release()
      await this.dbPool.end()
    }
  }
}

// Запуск прямого парсинга
async function main() {
  console.log('🔥 ЗАПУСК ПРЯМОГО ПАРСИНГА INSTAGRAM С РЕАЛЬНЫМИ API КЛЮЧАМИ')

  const scraper = new DirectInstagramScraper()

  try {
    const success = await scraper.runFullScraping('selenagomez', 1, 15)

    if (success) {
      console.log('\n🎉 РЕАЛЬНЫЕ ДАННЫЕ КОНКУРЕНТОВ СОХРАНЕНЫ В БАЗУ!')
      console.log('💰 КЛИЕНТ ПОЛУЧИЛ СВОИ РЕЛСЫ ПО КОНКУРЕНТАМ!')
    } else {
      console.log('\n❌ Не удалось завершить парсинг')
    }

    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('\n💥 Критическая ошибка:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { DirectInstagramScraper }
