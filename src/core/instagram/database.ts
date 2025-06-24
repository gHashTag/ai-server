/**
 * Neon PostgreSQL Database Connection and Operations
 * Instagram users data management
 */

import { Pool, PoolConfig } from 'pg'
// Simple logger without config dependencies
const logger = {
  info: (message: string, data?: any) =>
    console.log(`[INSTAGRAM-DB] ${message}`, data),
  error: (message: string, data?: any) =>
    console.error(`[INSTAGRAM-DB] ${message}`, data),
  warn: (message: string, data?: any) =>
    console.warn(`[INSTAGRAM-DB] ${message}`, data),
}
import {
  InstagramUserEntity,
  CreateInstagramUserPayload,
  BulkInsertResult,
  InstagramUserFilters,
  InstagramScrapingError,
} from '@/interfaces/instagram.interface'

// Database configuration
const dbConfig: PoolConfig = {
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

if (!process.env.NEON_DATABASE_URL) {
  throw new Error('NEON_DATABASE_URL environment variable is required')
}

export const neonDB = new Pool(dbConfig)

export async function initializeDatabase(): Promise<void> {
  try {
    const client = await neonDB.connect()
    const result = await client.query('SELECT NOW() as current_time')
    client.release()

    logger.info('✅ Neon PostgreSQL connection established', {
      timestamp: result.rows[0].current_time,
    })
  } catch (error) {
    logger.error('❌ Failed to connect to Neon PostgreSQL', { error })
    throw new InstagramScrapingError(
      'Database connection failed',
      'DB_CONNECTION_ERROR',
      error
    )
  }
}

export async function createInstagramUsersTable(): Promise<void> {
  const createTableSQL = `
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
      CONSTRAINT unique_search_user UNIQUE(search_username, user_pk)
    );

    CREATE INDEX IF NOT EXISTS idx_instagram_users_search_username 
    ON instagram_similar_users(search_username);
    
    CREATE INDEX IF NOT EXISTS idx_instagram_users_scraped_at 
    ON instagram_similar_users(scraped_at);
  `

  try {
    await neonDB.query(createTableSQL)
    logger.info('✅ Instagram users table created successfully')
  } catch (error) {
    logger.error('❌ Failed to create Instagram users table', { error })
    throw new InstagramScrapingError(
      'Failed to create database schema',
      'DB_SCHEMA_ERROR',
      error
    )
  }
}

export async function insertInstagramUser(
  userData: CreateInstagramUserPayload
): Promise<InstagramUserEntity> {
  const insertSQL = `
    INSERT INTO instagram_similar_users (
      search_username, user_pk, username, full_name, 
      is_private, is_verified, profile_pic_url, 
      profile_chaining_secondary_label, social_context
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (search_username, user_pk) 
    DO UPDATE SET 
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `

  const values = [
    userData.search_username,
    userData.user_pk,
    userData.username,
    userData.full_name || null,
    userData.is_private || false,
    userData.is_verified || false,
    userData.profile_pic_url || null,
    userData.profile_chaining_secondary_label || null,
    userData.social_context || null,
  ]

  try {
    const result = await neonDB.query(insertSQL, values)
    const insertedUser = result.rows[0]

    return {
      ...insertedUser,
      scraped_at: new Date(insertedUser.scraped_at),
      created_at: new Date(insertedUser.created_at),
      updated_at: new Date(insertedUser.updated_at),
    }
  } catch (error) {
    logger.error('❌ Failed to insert Instagram user', {
      username: userData.username,
      error,
    })
    throw new InstagramScrapingError(
      `Failed to insert user ${userData.username}`,
      'DB_INSERT_ERROR',
      error
    )
  }
}

export async function getInstagramUsers(
  filters: InstagramUserFilters = {}
): Promise<InstagramUserEntity[]> {
  let query = 'SELECT * FROM instagram_similar_users WHERE 1=1'
  const values: any[] = []
  let paramCount = 0

  if (filters.search_username) {
    query += ` AND search_username = $${++paramCount}`
    values.push(filters.search_username)
  }

  if (filters.is_verified !== undefined) {
    query += ` AND is_verified = $${++paramCount}`
    values.push(filters.is_verified)
  }

  query += ' ORDER BY scraped_at DESC'

  if (filters.limit) {
    query += ` LIMIT $${++paramCount}`
    values.push(filters.limit)
  }

  try {
    const result = await neonDB.query(query, values)

    return result.rows.map(row => ({
      ...row,
      scraped_at: new Date(row.scraped_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }))
  } catch (error) {
    logger.error('❌ Failed to query Instagram users', { filters, error })
    throw new InstagramScrapingError(
      'Failed to retrieve Instagram users',
      'DB_SELECT_ERROR',
      error
    )
  }
}

/**
 * Get count of users by search target
 */
export async function getInstagramUsersCount(
  searchUsername?: string
): Promise<number> {
  let query = 'SELECT COUNT(*) as count FROM instagram_similar_users'
  const values: any[] = []

  if (searchUsername) {
    query += ' WHERE search_username = $1'
    values.push(searchUsername)
  }

  try {
    const result = await neonDB.query(query, values)
    return parseInt(result.rows[0].count)
  } catch (error) {
    logger.error('❌ Failed to count Instagram users', {
      searchUsername,
      error,
    })
    throw new InstagramScrapingError(
      'Failed to count Instagram users',
      'DB_COUNT_ERROR',
      error
    )
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    await neonDB.end()
    logger.info('✅ Database connection pool closed')
  } catch (error) {
    logger.error('❌ Error closing database connection', { error })
  }
}
