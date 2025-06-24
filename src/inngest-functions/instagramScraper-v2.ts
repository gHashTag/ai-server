/**
 * Instagram Scraper v2 - Fully Isolated with Zod Validation
 * Real API integration with strict typing and validation
 */

import { Inngest } from 'inngest'
import { slugify } from 'inngest'
import axios from 'axios'
import pkg from 'pg'
const { Pool } = pkg

// Импортируем Zod-схемы
import {
  InstagramScrapingEventSchema,
  validateInstagramApiResponse,
  validateInstagramUsers,
  DatabaseSaveResultSchema,
  type InstagramScrapingEvent,
  type ValidatedInstagramUser,
  type DatabaseSaveResult,
} from '../core/instagram/schemas'

// Isolated Inngest client for Instagram
const instagramInngest = new Inngest({
  id: 'ai-server-instagram-v2',
  name: 'AI Server Instagram Scraper V2',
})

// Simple logger
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[IG-INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[IG-ERROR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[IG-WARN] ${msg}`, data || ''),
}

// Database connection pool
const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

// Instagram API Integration with Zod validation
class InstagramAPI {
  private apiKey: string
  private host: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.RAPIDAPI_INSTAGRAM_KEY || ''
    this.host =
      process.env.RAPIDAPI_INSTAGRAM_HOST ||
      'real-time-instagram-scraper-api1.p.rapidapi.com'
    this.baseUrl = 'https://real-time-instagram-scraper-api1.p.rapidapi.com'
  }

  async getSimilarUsers(username: string, count = 50) {
    try {
      log.info(`Fetching similar users for: ${username}`)

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

      // Валидируем ответ API с помощью Zod
      const validationResult = validateInstagramApiResponse(response.data)

      if (!validationResult.success) {
        log.error('API Response Validation Error:', validationResult.error)
        return {
          success: false,
          error: validationResult.error,
          users: [],
          total: 0,
        }
      }

      const users = validationResult.data!.data.users
      log.info(`API Success: Found ${users.length} users (Zod validated)`)

      return {
        success: true,
        users: users,
        total: users.length,
      }
    } catch (error: any) {
      log.error('API Error:', error.message)
      return {
        success: false,
        error: error.message,
        users: [],
        total: 0,
      }
    }
  }
}

// Database operations with Zod validation
class InstagramDatabase {
  async saveUsers(
    searchUsername: string,
    users: ValidatedInstagramUser[]
  ): Promise<DatabaseSaveResult> {
    const client = await dbPool.connect()
    let saved = 0
    let duplicatesSkipped = 0

    try {
      // Ensure table exists
      await this.ensureTableExists(client)

      for (const user of users) {
        try {
          await client.query(
            `INSERT INTO instagram_similar_users 
             (search_username, user_pk, username, full_name, is_private, is_verified, 
              profile_pic_url, profile_chaining_secondary_label, social_context)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (search_username, user_pk) DO NOTHING`,
            [
              searchUsername,
              user.pk,
              user.username,
              user.full_name,
              user.is_private,
              user.is_verified,
              user.profile_pic_url,
              user.profile_chaining_secondary_label,
              user.social_context,
            ]
          )
          saved++
        } catch (error: any) {
          if (error.code === '23505') {
            // Duplicate key error
            duplicatesSkipped++
          } else {
            log.error(`Error saving user ${user.username}:`, error.message)
          }
        }
      }

      const result: DatabaseSaveResult = {
        saved,
        duplicatesSkipped,
        totalProcessed: saved + duplicatesSkipped,
      }

      // Валидируем результат с помощью Zod
      const validatedResult = DatabaseSaveResultSchema.parse(result)

      log.info(
        `💾 Database save complete: ${validatedResult.saved} saved, ${validatedResult.duplicatesSkipped} duplicates`
      )

      return validatedResult
    } finally {
      client.release()
    }
  }

  private async ensureTableExists(client: any) {
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
          profile_chaining_secondary_label VARCHAR(255),
          social_context VARCHAR(255),
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(search_username, user_pk)
        );
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_instagram_users_search_username 
        ON instagram_similar_users(search_username);
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_instagram_users_scraped_at 
        ON instagram_similar_users(scraped_at);
      `)
    } catch (error: any) {
      log.warn('Table creation warning:', error.message)
    }
  }
}

// Main Instagram Scraper Function with Zod validation
export const instagramScraperV2 = instagramInngest.createFunction(
  {
    id: slugify('instagram-scraper-v2'),
    name: 'Instagram Scraper V2 (Real API + Zod)',
    concurrency: 2,
  },
  { event: 'instagram/scrape-similar-users' },
  async ({ event, step, runId }) => {
    // Валидируем входные данные с помощью Zod
    const validationResult = InstagramScrapingEventSchema.safeParse(event.data)

    if (!validationResult.success) {
      const errorMessage = `Invalid event data: ${validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`
      log.error(errorMessage)
      throw new Error(errorMessage)
    }

    const { username_or_id, max_users, requester_telegram_id } =
      validationResult.data

    log.info('🚀 Instagram Scraper V2 started (with Zod validation)', {
      runId,
      target: username_or_id,
      maxUsers: max_users,
      requester: requester_telegram_id,
    })

    // Step 1: Validate input
    const validation = await step.run('validate-input', async () => {
      if (!process.env.RAPIDAPI_INSTAGRAM_KEY) {
        throw new Error('Instagram API key is not configured')
      }

      if (!process.env.NEON_DATABASE_URL) {
        throw new Error('Database URL is not configured')
      }

      log.info(`✅ Input validated with Zod: ${username_or_id}`)
      return { valid: true, target: username_or_id }
    })

    // Step 2: Call Instagram API with Zod validation
    const apiResult = await step.run('call-instagram-api', async () => {
      const api = new InstagramAPI()
      const result = await api.getSimilarUsers(username_or_id, max_users)

      if (!result.success) {
        throw new Error(`API call failed: ${result.error}`)
      }

      log.info(
        `✅ API call successful with Zod validation: ${result.total} users found`
      )
      return result
    })

    // Step 3: Process and validate users with Zod
    const processedUsers = await step.run(
      'process-users-with-zod',
      async () => {
        const validationResult = validateInstagramUsers(apiResult.users)

        if (validationResult.errors.length > 0) {
          log.warn('Some users failed validation:', validationResult.errors)
        }

        log.info(
          `✅ Zod processing complete: ${validationResult.validUsers.length} valid, ${validationResult.invalidUsers.length} invalid`
        )

        return {
          validUsers: validationResult.validUsers,
          invalidUsers: validationResult.invalidUsers,
          validCount: validationResult.validUsers.length,
          invalidCount: validationResult.invalidUsers.length,
          validationErrors: validationResult.errors,
        }
      }
    )

    // Step 4: REAL DATABASE SAVE with Zod validation
    const saveResult = (await step.run(
      'save-to-neon-database-zod',
      async () => {
        const db = new InstagramDatabase()
        const result = await db.saveUsers(
          username_or_id,
          processedUsers.validUsers
        )

        log.info(
          `💾 REAL Database save with Zod: ${result.saved} saved, ${result.duplicatesSkipped} duplicates`
        )

        return result
      }
    )) as DatabaseSaveResult

    // Final result with Zod validation
    const finalResult = {
      success: true,
      searchTarget: username_or_id,
      usersScraped: apiResult.total,
      usersValid: processedUsers.validCount,
      usersInvalid: processedUsers.invalidCount,
      usersSaved: saveResult.saved,
      duplicatesSkipped: saveResult.duplicatesSkipped,
      scrapedAt: new Date(),
      runId,
      requesterTelegramId: requester_telegram_id,
      sampleUsers: processedUsers.validUsers.slice(0, 3), // First 3 users as sample
      validationErrors: processedUsers.validationErrors,
      mode: 'REAL_API_V2_WITH_NEON_DB_AND_ZOD',
    }

    log.info(
      '🎉 Instagram Scraper V2 completed successfully with Zod validation',
      {
        target: username_or_id,
        scraped: finalResult.usersScraped,
        saved: finalResult.usersSaved,
        validationErrors: finalResult.validationErrors.length,
      }
    )

    return finalResult
  }
)

// Helper function to trigger scraping with Zod validation
export async function triggerInstagramScrapingV2(
  data: InstagramScrapingEvent
): Promise<{ eventId: string }> {
  // Валидируем входные данные
  const validatedData = InstagramScrapingEventSchema.parse(data)

  const result = await instagramInngest.send({
    name: 'instagram/scrape-similar-users',
    data: validatedData,
  })

  return {
    eventId: result.ids[0],
  }
}
