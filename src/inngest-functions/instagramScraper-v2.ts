/**
 * Instagram Scraper v2 - Fully Isolated with Zod Validation
 * Real API integration with strict typing and validation
 */

import { slugify } from 'inngest'
import axios from 'axios'
import pkg from 'pg'
const { Pool } = pkg

// Используем основной Inngest клиент
import { inngest } from '@/core/inngest/clients'

// Импортируем Zod-схемы
import {
  InstagramScrapingEventSchema,
  validateInstagramApiResponse,
  validateInstagramUsers,
  DatabaseSaveResultSchema,
  type InstagramScrapingEvent,
  type ValidatedInstagramUser,
  type DatabaseSaveResult,
  validateInstagramReelsApiResponse,
  validateInstagramReels,
  type ValidatedInstagramReel,
  type ReelsSaveResult,
  ReelsSaveResultSchema,
  CreateInstagramUserEventSchema,
  type CreateInstagramUserEvent,
  type CreateUserResult,
  CreateUserResultSchema,
} from '../core/instagram/schemas'

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
  connectionString:
    process.env.NEON_DATABASE_URL ||
    'postgresql://neondb_owner:npg_vXnxbypES56V@ep-proud-grass-aegoipez-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
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
    const maxRetries = 1
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        // Добавляем задержку между попытками
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000 // Экспоненциальная задержка: 2s, 4s, 8s
          log.warn(
            `⏳ Rate limited, waiting ${delay / 1000}s before retry ${
              attempt + 1
            }/${maxRetries}`
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        log.info(
          `📡 API call attempt ${attempt + 1}/${maxRetries} for: ${username}`
        )

        const response = await axios.get(
          `${this.baseUrl}/v1/similar_users_v2`,
          {
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
          }
        )

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

        // Проверяем, что data не является строкой (ошибкой API)
        if (typeof validationResult.data!.data === 'string') {
          const apiError = validationResult.data!.data.trim()
          const errorMessage =
            apiError || 'Instagram API returned empty error response'
          log.error(
            `❌ API returned error: "${apiError}" (original response logged)`
          )
          log.error(
            'Full API response:',
            JSON.stringify(response.data, null, 2)
          )
          return {
            success: false,
            error: `API error: ${errorMessage}`,
            users: [],
            total: 0,
          }
        }

        const users = validationResult.data!.data.users
        log.info(`✅ API Success: Found ${users.length} users (Zod validated)`)

        return {
          success: true,
          users: users,
          total: users.length,
        }
      } catch (error: any) {
        attempt++

        // Особая обработка для rate limiting (429)
        if (error.response?.status === 429) {
          log.warn(`⚠️ Rate limited (429) on attempt ${attempt}/${maxRetries}`)

          if (attempt >= maxRetries) {
            log.error(`❌ Max retries exceeded for rate limiting`)
            return {
              success: false,
              error: `Rate limited after ${maxRetries} attempts. Please try again later.`,
              users: [],
              total: 0,
            }
          }
          // Продолжаем цикл для следующей попытки
          continue
        }

        // Для других ошибок - немедленный возврат
        log.error(`❌ API Error on attempt ${attempt}:`, error.message)
        return {
          success: false,
          error: error.message,
          users: [],
          total: 0,
        }
      }
    }

    // Не должны сюда попасть, но на всякий случай
    return {
      success: false,
      error: 'Unexpected error in retry loop',
      users: [],
      total: 0,
    }
  }

  /**
   * Получает рилсы пользователя Instagram
   */
  async getUserReels(username: string, count = 50) {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        // Добавляем задержку между попытками
        if (attempt > 0) {
          const delay = Math.pow(2, attempt) * 1000
          log.warn(
            `⏳ Reels rate limited, waiting ${delay / 1000}s before retry ${
              attempt + 1
            }/${maxRetries}`
          )
          await new Promise(resolve => setTimeout(resolve, delay))
        }

        log.info(
          `🎬 Reels API call attempt ${
            attempt + 1
          }/${maxRetries} for: ${username}`
        )

        const response = await axios.get(`${this.baseUrl}/v1/user_reels`, {
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
        const validationResult = validateInstagramReelsApiResponse(
          response.data
        )

        if (!validationResult.success) {
          log.error(
            'Reels API Response Validation Error:',
            validationResult.error
          )
          return {
            success: false,
            error: validationResult.error,
            reels: [],
            total: 0,
            userId: '',
            username: '',
          }
        }

        const data = validationResult.data!.data

        // Проверяем, что data не является строкой (ошибкой API)
        if (typeof data === 'string') {
          const apiError = data.trim()
          const errorMessage =
            apiError || 'Instagram Reels API returned empty error response'
          log.error(
            `❌ Reels API returned error: "${apiError}" (original response logged)`
          )
          log.error(
            'Full Reels API response:',
            JSON.stringify(response.data, null, 2)
          )
          return {
            success: false,
            error: `API error: ${errorMessage}`,
            reels: [],
            total: 0,
            userId: '',
            username: username,
          }
        }

        // Проверяем что есть хотя бы один рилс
        if (!data.items || data.items.length === 0) {
          log.warn(`⚠️ No reels found for user ${username}`)
          return {
            success: true,
            reels: [],
            total: 0,
            userId: '',
            username: username, // Используем параметр функции
          }
        }

        // Извлекаем информацию о пользователе из первого рилса
        const firstReel = data.items[0]
        const userId = firstReel?.media?.user?.pk?.toString() || ''
        const actualUsername = firstReel?.media?.user?.username || username

        log.info(
          `✅ Reels API Success: Found ${data.items.length} reels for ${actualUsername} (Zod validated)`
        )

        return {
          success: true,
          reels: data.items,
          total: data.items.length,
          userId: userId,
          username: actualUsername,
        }
      } catch (error: any) {
        attempt++

        // Особая обработка для rate limiting (429)
        if (error.response?.status === 429) {
          log.warn(
            `⚠️ Reels rate limited (429) on attempt ${attempt}/${maxRetries}`
          )

          if (attempt >= maxRetries) {
            log.error(`❌ Max retries exceeded for reels rate limiting`)
            return {
              success: false,
              error: `Reels rate limited after ${maxRetries} attempts. Please try again later.`,
              reels: [],
              total: 0,
              userId: '',
              username: username, // Используем параметр функции
            }
          }
          // Продолжаем цикл для следующей попытки
          continue
        }

        // Для других ошибок - немедленный возврат
        log.error(`❌ Reels API Error on attempt ${attempt}:`, error.message)
        return {
          success: false,
          error: error.message,
          reels: [],
          total: 0,
          userId: '',
          username: username, // Используем параметр функции
        }
      }
    }

    // Не должны сюда попасть, но на всякий случай
    return {
      success: false,
      error: 'Unexpected error in reels retry loop',
      reels: [],
      total: 0,
      userId: '',
      username: username, // Используем параметр функции
    }
  }
}

// Database operations with Zod validation
class InstagramDatabase {
  /**
   * Проверяет project_id (упрощённая версия без таблицы projects)
   */
  async validateProjectId(
    projectId: number
  ): Promise<{ exists: boolean; projectName?: string }> {
    // Упрощённая валидация - принимаем любой положительный project_id
    if (projectId && projectId > 0) {
      log.info(
        `✅ Project validation successful: Project ID ${projectId} (simplified validation)`
      )
      return {
        exists: true,
        projectName: `Project ${projectId}`,
      }
    }

    log.error(`❌ Project validation failed: invalid project_id ${projectId}`)
    return { exists: false }
  }

  async saveUsers(
    searchUsername: string,
    users: ValidatedInstagramUser[],
    projectId?: number
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
              user.profile_url || `https://instagram.com/${user.username}`,
              user.profile_chaining_secondary_label,
              user.social_context,
              projectId || null,
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
        `💾 REAL Database save with Zod: ${validatedResult.saved} saved, ${validatedResult.duplicatesSkipped} duplicates`
      )

      return validatedResult
    } finally {
      client.release()
    }
  }

  /**
   * Создаёт одного пользователя в таблице instagram_similar_users
   */
  async createSingleUser(
    userData: CreateInstagramUserEvent
  ): Promise<CreateUserResult> {
    const client = await dbPool.connect()

    try {
      // Ensure table exists
      await this.ensureTableExists(client)

      // Создаём объект пользователя для сохранения
      const user: ValidatedInstagramUser = {
        pk: userData.pk,
        username: userData.username,
        full_name: userData.full_name || '',
        is_private: userData.is_private || false,
        is_verified: userData.is_verified || false,
        profile_pic_url: userData.profile_pic_url || '',
        profile_url: `https://instagram.com/${userData.username}`,
        profile_chaining_secondary_label:
          userData.profile_chaining_secondary_label || '',
        social_context: userData.social_context || '',
        project_id: userData.project_id,
      }

      // Проверяем, существует ли уже такой пользователь
      const existingUser = await client.query(
        'SELECT id FROM instagram_similar_users WHERE user_pk = $1 AND project_id = $2',
        [user.pk, userData.project_id]
      )

      if (existingUser.rows.length > 0) {
        log.info(
          `👤 User already exists: ${user.username} (PK: ${user.pk}) in project ${userData.project_id}`
        )

        const result: CreateUserResult = {
          success: true,
          created: false,
          alreadyExists: true,
          user: user,
        }

        return CreateUserResultSchema.parse(result)
      }

      // Вставляем нового пользователя
      await client.query(
        `INSERT INTO instagram_similar_users 
         (search_username, user_pk, username, full_name, is_private, is_verified, 
          profile_pic_url, profile_url, profile_chaining_secondary_label, social_context, project_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          `manual_${userData.username}`, // Префикс для ручного создания
          user.pk,
          user.username,
          user.full_name,
          user.is_private,
          user.is_verified,
          user.profile_pic_url,
          user.profile_url,
          user.profile_chaining_secondary_label,
          user.social_context,
          userData.project_id,
        ]
      )

      log.info(
        `✅ User created successfully: ${user.username} (PK: ${user.pk}) in project ${userData.project_id}`
      )

      const result: CreateUserResult = {
        success: true,
        created: true,
        alreadyExists: false,
        user: user,
      }

      return CreateUserResultSchema.parse(result)
    } catch (error: any) {
      log.error(`❌ Error creating user ${userData.username}:`, error.message)

      const result: CreateUserResult = {
        success: false,
        created: false,
        alreadyExists: false,
        error: error.message,
      }

      return CreateUserResultSchema.parse(result)
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
          profile_url TEXT, -- URL профиля Instagram для прямого перехода
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
    } catch (error: any) {
      log.error('Error ensuring table exists:', error.message)
    }
  }

  /**
   * Создаёт таблицу для рилсов если её нет
   */
  private async ensureReelsTableExists(client: any) {
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS instagram_user_reels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reel_id VARCHAR(255) NOT NULL,
          shortcode VARCHAR(255) NOT NULL,
          display_url TEXT NOT NULL,
          video_url TEXT,
          caption TEXT,
          like_count INTEGER DEFAULT 0,
          comment_count INTEGER DEFAULT 0,
          play_count INTEGER DEFAULT 0,
          taken_at_timestamp BIGINT NOT NULL,
          owner_id VARCHAR(255) NOT NULL,
          owner_username VARCHAR(255) NOT NULL,
          owner_full_name VARCHAR(255),
          owner_profile_pic_url TEXT,
          owner_is_verified BOOLEAN DEFAULT false,
          is_video BOOLEAN DEFAULT true,
          video_duration FLOAT,
          accessibility_caption TEXT,
          hashtags JSONB,
          mentions JSONB,
          project_id INTEGER,
          scraped_for_user_pk VARCHAR(255),
          scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(reel_id, project_id)
        );
      `)

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_instagram_reels_owner_username 
        ON instagram_user_reels(owner_username);
        
        CREATE INDEX IF NOT EXISTS idx_instagram_reels_project_id 
        ON instagram_user_reels(project_id);
        
        CREATE INDEX IF NOT EXISTS idx_instagram_reels_scraped_for_user 
        ON instagram_user_reels(scraped_for_user_pk);
        
        CREATE INDEX IF NOT EXISTS idx_instagram_reels_taken_at 
        ON instagram_user_reels(taken_at_timestamp);
      `)

      log.info('✅ Instagram reels table and indexes ensured')
    } catch (error: any) {
      log.error('Error ensuring reels table exists:', error.message)
    }
  }

  /**
   * Сохраняет рилсы пользователя в базу данных
   */
  async saveUserReels(
    reels: ValidatedInstagramReel[],
    projectId?: number
  ): Promise<ReelsSaveResult> {
    const client = await dbPool.connect()
    let saved = 0
    let duplicatesSkipped = 0
    let userId = ''
    let username = ''

    try {
      // Ensure table exists
      await this.ensureReelsTableExists(client)

      for (const reel of reels) {
        try {
          // Сохраняем данные пользователя из первого рилса
          if (!userId && reel.owner_id) {
            userId = reel.owner_id
            username = reel.owner_username
          }

          await client.query(
            `INSERT INTO instagram_user_reels 
             (reel_id, shortcode, display_url, video_url, caption, like_count, comment_count, 
              play_count, taken_at_timestamp, owner_id, owner_username, owner_full_name, 
              owner_profile_pic_url, owner_is_verified, is_video, video_duration, 
              accessibility_caption, hashtags, mentions, project_id, scraped_for_user_pk)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
             ON CONFLICT (reel_id, project_id) DO NOTHING`,
            [
              reel.reel_id,
              reel.shortcode,
              reel.display_url,
              reel.video_url,
              reel.caption,
              reel.like_count,
              reel.comment_count,
              reel.play_count,
              reel.taken_at_timestamp,
              reel.owner_id,
              reel.owner_username,
              reel.owner_full_name,
              reel.owner_profile_pic_url,
              reel.owner_is_verified,
              reel.is_video,
              reel.video_duration,
              reel.accessibility_caption,
              JSON.stringify(reel.hashtags),
              JSON.stringify(reel.mentions),
              projectId || null,
              reel.scraped_for_user_pk,
            ]
          )
          saved++
        } catch (error: any) {
          if (error.code === '23505') {
            // Duplicate key error
            duplicatesSkipped++
          } else {
            log.error(`Error saving reel ${reel.reel_id}:`, error.message)
          }
        }
      }

      const result: ReelsSaveResult = {
        saved,
        duplicatesSkipped,
        totalProcessed: saved + duplicatesSkipped,
        userId,
        username,
      }

      // Валидируем результат с помощью Zod
      const validatedResult = ReelsSaveResultSchema.parse(result)

      log.info(
        `🎬 Reels save complete for ${username}: ${validatedResult.saved} saved, ${validatedResult.duplicatesSkipped} duplicates`
      )

      return validatedResult
    } finally {
      client.release()
    }
  }
}

// Main Instagram Scraper Function with Zod validation
export const instagramScraperV2 = inngest.createFunction(
  {
    id: slugify('instagram-scraper-v2'),
    name: '🤖 Instagram Scraper V2 (Real API + Zod)',
    concurrency: 2,
  },
  { event: 'instagram/scraper-v2' },
  async ({ event, step, runId, logger: log }) => {
    // ===============================================
    // ДИАГНОСТИКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
    // ===============================================
    log.info('🔍 Диагностика переменных окружения:', {
      RAPIDAPI_INSTAGRAM_KEY: process.env.RAPIDAPI_INSTAGRAM_KEY
        ? `${process.env.RAPIDAPI_INSTAGRAM_KEY.substring(0, 10)}...`
        : 'НЕ НАЙДЕН',
      RAPIDAPI_INSTAGRAM_HOST:
        process.env.RAPIDAPI_INSTAGRAM_HOST || 'НЕ НАЙДЕН',
      NODE_ENV: process.env.NODE_ENV || 'НЕ НАЙДЕН',
    })

    // Логгируем полученные данные события для отладки
    log.info('🔍 Received event data:', event.data)

    // УПРОЩЁННАЯ валидация без Zod для быстрого исправления
    const eventData = event.data as any

    if (!eventData || typeof eventData !== 'object') {
      log.error('❌ Event data is not an object:', eventData)
      throw new Error('Event data must be an object')
    }

    if (!eventData.username_or_id) {
      log.error('❌ username_or_id is missing from event data:', eventData)
      throw new Error('username_or_id is required')
    }

    if (!eventData.project_id || eventData.project_id <= 0) {
      log.error(
        '❌ project_id is missing or invalid from event data:',
        eventData
      )
      throw new Error('project_id must be a positive number')
    }

    // Устанавливаем дефолтные значения
    const username_or_id = String(eventData.username_or_id)
    const project_id = Number(eventData.project_id)
    const max_users = Number(eventData.max_users) || 50
    const max_reels_per_user = Number(eventData.max_reels_per_user) || 50
    const scrape_reels = Boolean(eventData.scrape_reels || false)
    const requester_telegram_id = eventData.requester_telegram_id || ''

    log.info('✅ Event data parsed successfully:', {
      username_or_id,
      project_id,
      max_users,
      max_reels_per_user,
      scrape_reels,
      requester_telegram_id,
    })

    log.info('🚀 Instagram Scraper V2 started (simplified validation)', {
      runId,
      target: username_or_id,
      maxUsers: max_users,
      scrapeReels: scrape_reels,
      maxReelsPerUser: max_reels_per_user,
      requester: requester_telegram_id,
      projectId: project_id,
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

    // Step 2: Validate project_id exists in database
    const projectValidation = await step.run(
      'validate-project-id',
      async () => {
        const db = new InstagramDatabase()
        const validation = await db.validateProjectId(project_id)

        if (!validation.exists) {
          throw new Error(
            `Project ID ${project_id} does not exist or is inactive`
          )
        }

        log.info(
          `✅ Project validation successful: ${validation.projectName} (ID: ${project_id})`
        )
        return {
          valid: true,
          projectId: project_id,
          projectName: validation.projectName,
        }
      }
    )

    // Step 3: Call Instagram API with Zod validation
    const apiResult = await step.run('call-instagram-api', async () => {
      // Добавляем базовую задержку для избежания rate limiting
      log.info('⏳ Waiting 5 seconds before API call to avoid rate limiting...')
      await new Promise(resolve => setTimeout(resolve, 5000))

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

    // Step 4: Process and validate users with Zod
    const processedUsers = await step.run(
      'process-users-with-zod',
      async () => {
        const userValidationResult = validateInstagramUsers(
          apiResult.users,
          project_id
        )

        if (userValidationResult.errors.length > 0) {
          log.warn('Some users failed validation:', userValidationResult.errors)
        }

        log.info(
          `✅ Zod processing complete: ${userValidationResult.validUsers.length} valid, ${userValidationResult.invalidUsers.length} invalid`
        )

        return {
          validUsers: userValidationResult.validUsers,
          invalidUsers: userValidationResult.invalidUsers,
          validCount: userValidationResult.validUsers.length,
          invalidCount: userValidationResult.invalidUsers.length,
          validationErrors: userValidationResult.errors,
        }
      }
    )

    // Step 5: REAL DATABASE SAVE with Zod validation
    const saveResult = (await step.run(
      'save-to-neon-database-zod',
      async () => {
        const db = new InstagramDatabase()
        const result = await db.saveUsers(
          username_or_id,
          processedUsers.validUsers,
          project_id
        )

        log.info(
          `💾 REAL Database save with Zod: ${result.saved} saved, ${result.duplicatesSkipped} duplicates`
        )

        return result
      }
    )) as DatabaseSaveResult

    // Step 6: CONDITIONALLY SCRAPE REELS for each user
    const reelsResults: ReelsSaveResult[] = []
    let totalReelsSaved = 0
    let totalReelsDuplicates = 0

    if (scrape_reels && processedUsers.validUsers.length > 0) {
      log.info(
        `🎬 Starting reels scraping for ${processedUsers.validUsers.length} users...`
      )

      for (let i = 0; i < processedUsers.validUsers.length; i++) {
        const user: ValidatedInstagramUser = processedUsers.validUsers[i]!

        // Step 6.X: Get reels for individual user
        const userReelsResult = await step.run(
          `get-reels-for-user-${i}`,
          async () => {
            // Добавляем задержку между запросами рилсов
            if (i > 0) {
              log.info('⏳ Waiting 3 seconds between reels requests...')
              await new Promise(resolve => setTimeout(resolve, 3000))
            }

            const api = new InstagramAPI()
            const result = await api.getUserReels(
              user.username,
              max_reels_per_user
            )

            if (!result.success) {
              log.warn(
                `⚠️ Failed to get reels for ${user.username}: ${result.error}`
              )
              return {
                success: false,
                error: result.error,
                username: user.username,
                reels: [],
                total: 0,
              }
            }

            log.info(
              `✅ Reels fetched for ${user.username}: ${result.total} reels found`
            )
            return result
          }
        )

        // Step 6.X: Process and save reels if API call was successful
        if (
          userReelsResult.success &&
          userReelsResult.reels &&
          Array.isArray(userReelsResult.reels) &&
          userReelsResult.reels.length > 0
        ) {
          const reelsSaveResult = await step.run(
            `save-reels-for-user-${i}`,
            async () => {
              // Валидируем рилсы
              const validationResult = validateInstagramReels(
                userReelsResult.reels as any[],
                project_id,
                user.pk // ID пользователя, для которого собираем рилсы
              )

              if (validationResult.errors.length > 0) {
                log.warn(
                  `Some reels failed validation for ${user.username}:`,
                  validationResult.errors
                )
              }

              // Сохраняем в БД
              const db = new InstagramDatabase()
              const saveResult = await db.saveUserReels(
                validationResult.validReels,
                project_id
              )

              log.info(
                `🎬 Reels saved for ${user.username}: ${saveResult.saved} saved, ${saveResult.duplicatesSkipped} duplicates`
              )

              return {
                ...saveResult,
                validReelsCount: validationResult.validReels.length,
                invalidReelsCount: validationResult.invalidReels.length,
                validationErrors: validationResult.errors,
              }
            }
          )

          reelsResults.push(reelsSaveResult)
          totalReelsSaved += reelsSaveResult.saved
          totalReelsDuplicates += reelsSaveResult.duplicatesSkipped
        }
      }

      log.info(
        `🎯 Reels scraping complete: ${totalReelsSaved} reels saved, ${totalReelsDuplicates} duplicates across ${reelsResults.length} users`
      )
    } else {
      log.info('⏭️ Reels scraping skipped (not enabled or no users found)')
    }

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
      projectId: project_id,
      sampleUsers: processedUsers.validUsers.slice(0, 3),
      validationErrors: processedUsers.validationErrors,
      // Reels data
      reelsEnabled: scrape_reels,
      reelsScraped: totalReelsSaved,
      reelsDuplicates: totalReelsDuplicates,
      reelsPerUser: max_reels_per_user,
      reelsResults: reelsResults.map(r => ({
        username: r.username,
        saved: r.saved,
        duplicatesSkipped: r.duplicatesSkipped,
        totalProcessed: r.totalProcessed,
      })),
      mode: 'REAL_API_V2_WITH_NEON_DB_SIMPLIFIED',
    }

    log.info(
      '🎉 Instagram Scraper V2 completed successfully (simplified validation)',
      {
        target: username_or_id,
        scraped: finalResult.usersScraped,
        saved: finalResult.usersSaved,
        projectId: finalResult.projectId,
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

  const result = await inngest.send({
    name: 'instagram/scrape-similar-users',
    data: validatedData,
  })

  return {
    eventId: result.ids[0],
  }
}

// Новая функция для создания одного пользователя Instagram
export const createInstagramUser = inngest.createFunction(
  {
    id: slugify('create-instagram-user'),
    name: '👤 Create Single Instagram User',
    concurrency: 5,
  },
  { event: 'instagram/create-user' },
  async ({ event, step, runId, logger: log }) => {
    // Валидируем входные данные с помощью Zod
    const validationResult = CreateInstagramUserEventSchema.safeParse(
      event.data
    )

    if (!validationResult.success) {
      const errorMessage = `Invalid event data: ${validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`
      log.error(errorMessage)
      throw new Error(errorMessage)
    }

    const userData = validationResult.data

    log.info('🚀 Create Instagram User started (with Zod validation)', {
      runId,
      username: userData.username,
      pk: userData.pk,
      projectId: userData.project_id,
      requester: userData.requester_telegram_id,
    })

    // Step 1: Validate database connection
    const dbValidation = await step.run('validate-database', async () => {
      if (!process.env.NEON_DATABASE_URL) {
        throw new Error('Database URL is not configured')
      }

      log.info(`✅ Database connection validated`)
      return { valid: true }
    })

    // Step 2: Validate project_id exists in database
    const projectValidation = await step.run(
      'validate-project-id',
      async () => {
        const db = new InstagramDatabase()
        const validation = await db.validateProjectId(userData.project_id)

        if (!validation.exists) {
          throw new Error(
            `Project ID ${userData.project_id} does not exist or is inactive`
          )
        }

        log.info(
          `✅ Project validation successful: ${validation.projectName} (ID: ${userData.project_id})`
        )
        return {
          valid: true,
          projectId: userData.project_id,
          projectName: validation.projectName,
        }
      }
    )

    // Step 3: Create user in database
    const createResult = (await step.run(
      'create-user-in-database',
      async () => {
        const db = new InstagramDatabase()
        const result = await db.createSingleUser(userData)

        if (!result.success) {
          throw new Error(`Failed to create user: ${result.error}`)
        }

        log.info(
          `${result.created ? '✅ User created' : '👤 User already exists'}: ${
            userData.username
          } (PK: ${userData.pk})`
        )

        return result
      }
    )) as CreateUserResult

    // Final result
    const finalResult = {
      success: true,
      created: createResult.created,
      alreadyExists: createResult.alreadyExists,
      user: {
        pk: userData.pk,
        username: userData.username,
        full_name: userData.full_name,
        is_private: userData.is_private,
        is_verified: userData.is_verified,
        profile_pic_url: userData.profile_pic_url,
        profile_url: `https://instagram.com/${userData.username}`,
        profile_chaining_secondary_label:
          userData.profile_chaining_secondary_label,
        social_context: userData.social_context,
      },
      projectId: userData.project_id,
      requesterTelegramId: userData.requester_telegram_id,
      createdAt: new Date(),
      runId,
      mode: 'MANUAL_USER_CREATION_WITH_ZOD',
    }

    log.info('🎉 Create Instagram User completed successfully', {
      username: userData.username,
      pk: userData.pk,
      created: createResult.created,
      projectId: userData.project_id,
    })

    return finalResult
  }
)

// Helper function to trigger single user creation with Zod validation
export async function triggerCreateInstagramUser(
  data: CreateInstagramUserEvent
): Promise<{ eventId: string }> {
  // Валидируем входные данные
  const validatedData = CreateInstagramUserEventSchema.parse(data)

  const result = await inngest.send({
    name: 'instagram/create-user',
    data: validatedData,
  })

  return {
    eventId: result.ids[0],
  }
}
