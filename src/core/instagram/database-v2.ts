/**
 * Instagram Content Agent Database Operations
 * Jobs to be Done Architecture for PostgreSQL (Neon)
 */

import pkg from 'pg'
const { Pool } = pkg
import { logger } from '@/utils/logger'

// =====================================
// DATABASE CONNECTION CONFIGURATION
// =====================================

/**
 * Database configuration for Instagram Content Agent
 */
// Ленивая инициализация - подключение создается только при первом использовании
function getConnectionString() {
  const connectionString = process.env.SUPABASE_URL
  
  if (!connectionString) {
    console.warn('⚠️ No database connection string found. Instagram features may not work.')
    console.warn('Set SUPABASE_URL environment variable.')
    return null
  }
  
  return connectionString
}

export const InstagramContentAgentConfig = {
  // Ленивая инициализация - получаем строку подключения только при использовании
  get connectionString() {
    return getConnectionString()
  },
  ssl: {
    rejectUnauthorized: false,
  },
  // Optimized connection pool settings for Supabase
  max: 5, // Reduced pool size for better resource management
  min: 1, // Keep at least one connection alive
  connectionTimeoutMillis: 60000, // Increased to 60s for Supabase
  idleTimeoutMillis: 300000, // 5 minutes idle timeout
  query_timeout: 30000, // 30s query timeout
  keepAlive: true,
}

// Connection pool instance
const dbPool = new Pool(InstagramContentAgentConfig)

// =====================================
// INTERFACES FOR JOBS TO BE DONE
// =====================================

/**
 * Job 1: Competitor data
 */
export interface CompetitorData {
  id?: string
  query_username: string
  comp_username: string
  followers_count?: number
  category?: string
  bio?: string
  ig_url?: string
  project_id?: number
  created_at?: Date
}

/**
 * Job 2 & 3: Reels analysis data
 */
export interface ReelsAnalysisData {
  id?: string
  comp_username: string
  reel_id: string
  ig_reel_url: string
  caption?: string
  views_count?: number
  likes_count?: number
  comments_count?: number
  created_at_instagram?: Date
  created_at?: Date
  project_id?: number
}

/**
 * Job 4: Content scripts data
 */
export interface ContentScriptsData {
  id?: string
  reel_id: string
  orig_caption?: string
  orig_transcript?: string
  script_v1?: string
  script_v2?: string
  script_v3?: string
  ig_reel_url?: string
  project_id?: number
  created_at?: Date
}

/**
 * Job 5: Telegram memory data
 */
export interface TelegramMemoryData {
  id?: string
  user_id: string
  message_text: string
  message_type?: 'user' | 'bot'
  context_data?: Record<string, any>
  created_at?: Date
}

// =====================================
// DATABASE OPERATIONS CLASS
// =====================================

export class InstagramContentAgentDB {
  private pool: typeof dbPool
  private _isInitialized: boolean = false

  constructor() {
    this.pool = dbPool
    // Removed immediate connection test for truly lazy initialization
  }

  /**
   * Ensure database connection is available (lazy initialization)
   */
  private async ensureConnection(): Promise<void> {
    if (this._isInitialized) return

    const connectionString = getConnectionString()
    if (!connectionString) {
      logger.warn('⚠️ No database connection available. Skipping database operations.')
      return
    }

    try {
      const client = await this.pool.connect()
      logger.info('✅ Instagram Content Agent DB connected successfully')
      client.release()
      this._isInitialized = true
    } catch (error) {
      logger.error('❌ Instagram Content Agent DB connection failed:', error)
      logger.warn('⚠️ Database operations will be skipped due to connection failure.')
      // Don't throw error - allow app to continue without database
    }
  }

  // =====================================
  // JOB 1: COMPETITORS OPERATIONS
  // =====================================

  /**
   * Save competitors data
   */
  async saveCompetitors(
    competitors: CompetitorData[]
  ): Promise<{ saved: number; duplicates: number }> {
    await this.ensureConnection()
    
    if (!this._isInitialized) {
      logger.warn('⚠️ Database not available, skipping competitor save')
      return { saved: 0, duplicates: 0 }
    }

    const client = await this.pool.connect()
    let saved = 0
    let duplicates = 0

    try {
      await client.query('BEGIN')

      for (const competitor of competitors) {
        try {
          await client.query(
            `INSERT INTO competitors 
             (query_username, comp_username, followers_count, category, bio, ig_url, project_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (query_username, comp_username) DO NOTHING`,
            [
              competitor.query_username,
              competitor.comp_username,
              competitor.followers_count,
              competitor.category,
              competitor.bio,
              competitor.ig_url,
              competitor.project_id,
            ]
          )
          saved++
        } catch (error: any) {
          if (error.code === '23505') {
            duplicates++
          } else {
            logger.error(
              `Error saving competitor ${competitor.comp_username}:`,
              error
            )
          }
        }
      }

      await client.query('COMMIT')
      logger.info(`💾 Competitors saved: ${saved}, duplicates: ${duplicates}`)

      return { saved, duplicates }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('❌ Error saving competitors:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get competitors by query username
   */
  async getCompetitorsByQuery(
    queryUsername: string,
    limit = 50
  ): Promise<CompetitorData[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        'SELECT * FROM competitors WHERE query_username = $1 ORDER BY followers_count DESC LIMIT $2',
        [queryUsername, limit]
      )

      return result.rows
    } catch (error) {
      logger.error('❌ Error getting competitors:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // =====================================
  // JOB 2 & 3: REELS ANALYSIS OPERATIONS
  // =====================================

  /**
   * Save reels analysis data
   */
  async saveReelsAnalysis(
    reels: ReelsAnalysisData[]
  ): Promise<{ saved: number; duplicates: number }> {
    const client = await this.pool.connect()
    let saved = 0
    let duplicates = 0

    try {
      await client.query('BEGIN')

      for (const reel of reels) {
        try {
          await client.query(
            `INSERT INTO reels_analysis 
             (comp_username, reel_id, ig_reel_url, caption, views_count, likes_count, comments_count, created_at_instagram, project_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (reel_id, project_id) DO UPDATE SET
             views_count = EXCLUDED.views_count,
             likes_count = EXCLUDED.likes_count,
             comments_count = EXCLUDED.comments_count`,
            [
              reel.comp_username,
              reel.reel_id,
              reel.ig_reel_url,
              reel.caption,
              reel.views_count,
              reel.likes_count,
              reel.comments_count,
              reel.created_at_instagram,
              reel.project_id,
            ]
          )
          saved++
        } catch (error: any) {
          if (error.code === '23505') {
            duplicates++
          } else {
            logger.error(`Error saving reel ${reel.reel_id}:`, error)
          }
        }
      }

      await client.query('COMMIT')
      logger.info(
        `🎬 Reels analysis saved: ${saved}, duplicates: ${duplicates}`
      )

      return { saved, duplicates }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('❌ Error saving reels analysis:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get top reels by views/likes for last 14 days
   */
  async getTopReels(
    username: string,
    limit = 10
  ): Promise<ReelsAnalysisData[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `SELECT * FROM reels_analysis 
         WHERE comp_username = $1 
         AND created_at_instagram >= NOW() - INTERVAL '14 days'
         ORDER BY views_count DESC, likes_count DESC 
         LIMIT $2`,
        [username, limit]
      )

      return result.rows
    } catch (error) {
      logger.error('❌ Error getting top reels:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // =====================================
  // JOB 4: CONTENT SCRIPTS OPERATIONS
  // =====================================

  /**
   * Save content scripts
   */
  async saveContentScripts(
    scripts: ContentScriptsData[]
  ): Promise<{ saved: number; duplicates: number }> {
    const client = await this.pool.connect()
    let saved = 0
    let duplicates = 0

    try {
      await client.query('BEGIN')

      for (const script of scripts) {
        try {
          await client.query(
            `INSERT INTO content_scripts 
             (reel_id, orig_caption, orig_transcript, script_v1, script_v2, script_v3, ig_reel_url, project_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (reel_id, project_id) DO UPDATE SET
             orig_caption = EXCLUDED.orig_caption,
             orig_transcript = EXCLUDED.orig_transcript,
             script_v1 = EXCLUDED.script_v1,
             script_v2 = EXCLUDED.script_v2,
             script_v3 = EXCLUDED.script_v3`,
            [
              script.reel_id,
              script.orig_caption,
              script.orig_transcript,
              script.script_v1,
              script.script_v2,
              script.script_v3,
              script.ig_reel_url,
              script.project_id,
            ]
          )
          saved++
        } catch (error: any) {
          if (error.code === '23505') {
            duplicates++
          } else {
            logger.error(
              `Error saving content script for reel ${script.reel_id}:`,
              error
            )
          }
        }
      }

      await client.query('COMMIT')
      logger.info(
        `🎨 Content scripts saved: ${saved}, duplicates: ${duplicates}`
      )

      return { saved, duplicates }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('❌ Error saving content scripts:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get content scripts by reel ID
   */
  async getContentScriptsByReelId(
    reelId: string
  ): Promise<ContentScriptsData | null> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        'SELECT * FROM content_scripts WHERE reel_id = $1 LIMIT 1',
        [reelId]
      )

      return result.rows[0] || null
    } catch (error) {
      logger.error('❌ Error getting content scripts:', error)
      throw error
    } finally {
      client.release()
    }
  }

  // =====================================
  // JOB 5: TELEGRAM MEMORY OPERATIONS
  // =====================================

  /**
   * Save telegram message to memory
   */
  async saveTelegramMessage(message: TelegramMemoryData): Promise<string> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `INSERT INTO telegram_memory 
         (user_id, message_text, message_type, context_data)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          message.user_id,
          message.message_text,
          message.message_type,
          JSON.stringify(message.context_data || {}),
        ]
      )

      const messageId = result.rows[0].id
      logger.info(`💬 Telegram message saved: ${messageId}`)

      // Keep only last 10 messages per user
      await this.cleanupTelegramMemory(message.user_id)

      return messageId
    } catch (error) {
      logger.error('❌ Error saving telegram message:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get telegram conversation history (last 10 messages)
   */
  async getTelegramHistory(userId: string): Promise<TelegramMemoryData[]> {
    const client = await this.pool.connect()

    try {
      const result = await client.query(
        `SELECT * FROM telegram_memory 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 10`,
        [userId]
      )

      return result.rows.reverse() // Reverse to get chronological order
    } catch (error) {
      logger.error('❌ Error getting telegram history:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Clean up old telegram messages (keep only last 10 per user)
   */
  private async cleanupTelegramMemory(userId: string): Promise<void> {
    const client = await this.pool.connect()

    try {
      await client.query(
        `DELETE FROM telegram_memory 
         WHERE user_id = $1 
         AND id NOT IN (
           SELECT id FROM telegram_memory 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT 10
         )`,
        [userId]
      )
    } catch (error) {
      logger.error('❌ Error cleaning up telegram memory:', error)
    } finally {
      client.release()
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    const connectionString = getConnectionString()
    if (!connectionString) {
      logger.warn('⚠️ No database connection string available')
      return false
    }

    try {
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      
      logger.info('✅ Database connection test successful')
      this._isInitialized = true
      return true
    } catch (error) {
      logger.error('❌ Database connection test failed:', error)
      return false
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      await this.pool.end()
      logger.info('✅ Database connection closed')
    } catch (error) {
      logger.error('❌ Error closing database connection:', error)
    }
  }
}

// =====================================
// GLOBAL INSTANCE
// =====================================

export const instagramContentAgentDB = new InstagramContentAgentDB()
