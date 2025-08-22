/**
 * Instagram Scraper V2 - TEST VERSION (без внешних API)
 * Тестовая версия для проверки работы базы данных
 */

import { slugify } from 'inngest'
import pkg from 'pg'
const { Pool } = pkg

// Используем основной Inngest клиент
import { inngest } from '@/core/inngest/clients'

// Простой логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[IG-TEST-INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[IG-TEST-ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[IG-TEST-WARN] ${msg}`, data || ''),
}

// Database connection pool
const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Тестовая версия Instagram Database
class TestInstagramDatabase {
  async ensureTableExists(client: any) {
    try {
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

      log.info('✅ Instagram users table and indexes ensured')
    } catch (error: any) {
      log.error('Error ensuring table exists:', error.message)
    }
  }

  async saveTestUsers(searchUsername: string, projectId: number) {
    const client = await dbPool.connect()
    let saved = 0

    // Фейковые тестовые данные
    const testUsers = [
      {
        pk: `${Date.now()}001`,
        username: 'test_competitor_1',
        full_name: 'Test Competitor 1',
        is_private: false,
        is_verified: true,
        profile_pic_url: 'https://example.com/pic1.jpg',
        profile_url: 'https://instagram.com/test_competitor_1',
        profile_chaining_secondary_label: 'Popular creator',
        social_context: 'Followed by test users',
      },
      {
        pk: `${Date.now()}002`,
        username: 'test_competitor_2',
        full_name: 'Test Competitor 2',
        is_private: true,
        is_verified: false,
        profile_pic_url: 'https://example.com/pic2.jpg',
        profile_url: 'https://instagram.com/test_competitor_2',
        profile_chaining_secondary_label: '',
        social_context: 'Has mutual followers',
      },
      {
        pk: `${Date.now()}003`,
        username: 'test_competitor_3',
        full_name: 'Test Competitor 3',
        is_private: false,
        is_verified: true,
        profile_pic_url: 'https://example.com/pic3.jpg',
        profile_url: 'https://instagram.com/test_competitor_3',
        profile_chaining_secondary_label: 'Influencer',
        social_context: 'Top creator in niche',
      },
    ]

    try {
      // Ensure table exists
      await this.ensureTableExists(client)

      for (const user of testUsers) {
        try {
          await client.query(
            `INSERT INTO instagram_similar_users 
             (search_username, user_pk, username, full_name, is_private, is_verified, 
              profile_pic_url, profile_url, profile_chaining_secondary_label, social_context, project_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (search_username, user_pk) DO NOTHING`,
            [
              searchUsername,
              user.pk,
              user.username,
              user.full_name,
              user.is_private,
              user.is_verified,
              user.profile_pic_url,
              user.profile_url,
              user.profile_chaining_secondary_label,
              user.social_context,
              projectId,
            ]
          )
          saved++
          log.info(`✅ Saved test user: ${user.username}`)
        } catch (error: any) {
          log.error(`Error saving user ${user.username}:`, error.message)
        }
      }

      log.info(`💾 Test database save: ${saved} users saved`)

      return {
        saved,
        totalProcessed: saved,
        testUsers: testUsers,
      }
    } finally {
      client.release()
    }
  }
}

// Тестовая Instagram Scraper Function
export const instagramScraperV2Test = inngest.createFunction(
  {
    id: slugify('instagram-scraper-v2-test'),
    name: '🧪 Instagram Scraper V2 TEST (No External APIs)',
    concurrency: 2,
  },
  { event: 'instagram/scraper-v2-test' },
  async ({ event, step, runId, logger }) => {
    log.info('🧪 Instagram Scraper V2 TEST started', {
      runId,
      eventData: event.data,
    })

    // Step 1: Validate input
    const validation = await step.run('validate-input-test', async () => {
      const { username_or_id, project_id } = event.data

      if (!process.env.SUPABASE_URL) {
        throw new Error('Database URL is not configured')
      }

      if (!username_or_id) {
        throw new Error('username_or_id is required')
      }

      if (!project_id || project_id <= 0) {
        throw new Error('Valid project_id is required')
      }

      log.info(`✅ Input validated: ${username_or_id}, project: ${project_id}`)
      return {
        valid: true,
        target: username_or_id,
        projectId: project_id,
      }
    })

    // Step 2: Save test data to database
    const saveResult = await step.run('save-test-data', async () => {
      log.info('💾 Saving test competitors to database...')

      const db = new TestInstagramDatabase()
      const result = await db.saveTestUsers(
        validation.target,
        validation.projectId
      )

      log.info(`✅ Test data saved: ${result.saved} users`)
      return result
    })

    // Step 3: Verify data was saved
    const verifyResult = await step.run('verify-saved-data', async () => {
      const client = await dbPool.connect()

      try {
        const countResult = await client.query(
          'SELECT COUNT(*) as total FROM instagram_similar_users WHERE project_id = $1',
          [validation.projectId]
        )

        const dataResult = await client.query(
          'SELECT username, full_name, is_verified FROM instagram_similar_users WHERE project_id = $1 ORDER BY created_at DESC LIMIT 5',
          [validation.projectId]
        )

        log.info(
          `📊 Verification: ${countResult.rows[0].total} total users in project ${validation.projectId}`
        )

        return {
          totalUsers: parseInt(countResult.rows[0].total),
          sampleUsers: dataResult.rows,
        }
      } finally {
        client.release()
      }
    })

    // Final result
    const finalResult = {
      success: true,
      mode: 'TEST_NO_EXTERNAL_APIs',
      searchTarget: validation.target,
      projectId: validation.projectId,
      testUsersSaved: saveResult.saved,
      totalUsersInProject: verifyResult.totalUsers,
      sampleUsers: verifyResult.sampleUsers,
      runId,
      completedAt: new Date(),
    }

    log.info('🎉 Instagram Scraper V2 TEST completed successfully', finalResult)

    return finalResult
  }
)

// Helper function to trigger test scraping
export async function triggerInstagramTestScraping(data: {
  username_or_id: string
  project_id: number
  requester_telegram_id?: string
}): Promise<{ eventId: string }> {
  const result = await inngest.send({
    name: 'instagram/scraper-v2-test',
    data: data,
  })

  return {
    eventId: result.ids[0],
  }
}
