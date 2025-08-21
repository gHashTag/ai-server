/**
 * Database validation utilities for Instagram functions
 * Provides reusable validation functions for project and database operations
 */

import { Pool } from 'pg'

// Simple logger for database operations
const log = {
  info: (message: string, data?: any) =>
    console.log(`[DB-VALIDATION] ${message}`, data),
  error: (message: string, data?: any) =>
    console.error(`[DB-VALIDATION] ${message}`, data),
  warn: (message: string, data?: any) =>
    console.warn(`[DB-VALIDATION] ${message}`, data),
}

// Database pool (will be initialized with connection from environment)
let dbPool: Pool | null = null

/**
 * Initialize database pool if not already initialized
 */
function initializeDbPool(): Pool {
  if (!dbPool) {
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL environment variable is not set')
    }

    dbPool = new Pool({
      connectionString: process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  }

  return dbPool
}

/**
 * Project validation result interface
 */
export interface ProjectValidationResult {
  exists: boolean
  projectName?: string
  projectId?: number
}

/**
 * Validates that a project exists in the database
 * @param projectId - The project ID to validate
 * @returns Promise with validation result
 */
export async function validateProjectId(
  projectId: number
): Promise<ProjectValidationResult> {
  const pool = initializeDbPool()
  const client = await pool.connect()

  try {
    log.info(`🔍 Validating project_id: ${projectId}`)

    const result = await client.query(
      'SELECT id, name FROM projects WHERE id = $1 AND is_active = true',
      [projectId]
    )

    if (result.rows.length === 0) {
      log.error(
        `❌ Project validation failed: project_id ${projectId} not found or inactive`
      )
      return { exists: false }
    }

    const project = result.rows[0]
    log.info(
      `✅ Project validation successful: ${project.name} (ID: ${projectId})`
    )

    return {
      exists: true,
      projectName: project.name,
      projectId: projectId,
    }
  } catch (error) {
    log.error(`❌ Database error during project validation:`, error)
    throw new Error(
      `Project validation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  } finally {
    client.release()
  }
}

/**
 * Validates project in Inngest step format
 * @param projectId - The project ID to validate
 * @returns Promise with step result
 */
export async function validateProjectInStep(projectId?: number): Promise<{
  valid: boolean
  projectId: number | null
  projectName?: string
}> {
  if (!projectId) {
    log.info('⏭️ No project_id provided, skipping project validation')
    return { valid: true, projectId: null }
  }

  const validation = await validateProjectId(projectId)

  if (!validation.exists) {
    throw new Error(`Project ID ${projectId} does not exist or is inactive`)
  }

  return {
    valid: true,
    projectId: projectId,
    projectName: validation.projectName,
  }
}

/**
 * Checks if database connection is available
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const pool = initializeDbPool()
    const client = await pool.connect()

    try {
      await client.query('SELECT 1')
      log.info('✅ Database connection successful')
      return true
    } finally {
      client.release()
    }
  } catch (error) {
    log.error('❌ Database connection failed:', error)
    return false
  }
}

/**
 * Ensures the projects table exists and has the expected structure
 */
export async function ensureProjectsTableExists(): Promise<void> {
  const pool = initializeDbPool()
  const client = await pool.connect()

  try {
    // Check if projects table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'projects'
    `)

    if (tableCheck.rows.length === 0) {
      log.warn('⚠️ Projects table not found, creating it...')

      // Create projects table with basic structure
      await client.query(`
        CREATE TABLE projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Insert a default project
      await client.query(`
        INSERT INTO projects (id, name, is_active) 
        VALUES (1, 'Default Project', true)
        ON CONFLICT (id) DO NOTHING
      `)

      log.info('✅ Projects table created with default project')
    } else {
      log.info('✅ Projects table exists')
    }
  } finally {
    client.release()
  }
}
