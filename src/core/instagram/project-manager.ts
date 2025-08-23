/**
 * Project Manager for Instagram Parsing
 * Автоматическое создание и управление проектами
 */

import pkg from 'pg'
const { Pool } = pkg
import { z } from 'zod'

// Схема для проекта
export const ProjectSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  telegram_id: z.string().nullable().optional(),
  telegram_username: z.string().nullable().optional(),
  bot_name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
  metadata: z.record(z.any()).optional(),
})

export type Project = z.infer<typeof ProjectSchema>

// Схема для создания проекта
export const CreateProjectSchema = z.object({
  telegram_id: z.string(),
  telegram_username: z.string().optional(),
  bot_name: z.string().optional(),
  project_name: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>

// Simple logger
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[PROJECT-MANAGER] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[PROJECT-MANAGER] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[PROJECT-MANAGER] ${msg}`, data || ''),
}

// Database connection pool - ленивая инициализация
let dbPool: Pool | null = null

function getDbPool(): Pool {
  if (!dbPool) {
    const connectionString = process.env.SUPABASE_URL

    if (!connectionString) {
      throw new Error(
        'Database connection string is required. Please set SUPABASE_URL environment variable.'
      )
    }

    dbPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      // Timeout и connection pool конфигурация
      connectionTimeoutMillis: 30000, // 30 секунд на подключение
      idleTimeoutMillis: 30000, // 30 секунд idle timeout
      queryTimeout: 60000, // 60 секунд на выполнение запроса
      max: 10, // Максимум 10 соединений в пуле
      min: 2, // Минимум 2 соединения
      acquireTimeoutMillis: 20000, // 20 секунд на получение соединения из пула
    })

    // Обработка ошибок подключения
    dbPool.on('error', err => {
      log.error('PostgreSQL pool error:', err.message)
    })

    dbPool.on('connect', client => {
      log.info('New PostgreSQL client connected')
    })
  }

  return dbPool
}

export class ProjectManager {
  /**
   * Обеспечивает существование таблицы projects
   */
  private async ensureProjectsTableExists(client: any) {
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          telegram_id VARCHAR(255),
          telegram_username VARCHAR(255),
          bot_name VARCHAR(255),
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          metadata JSONB DEFAULT '{}'::jsonb,
          UNIQUE(telegram_id, bot_name)
        );
      `)

      // Создаем индексы
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_projects_telegram_id 
        ON projects(telegram_id);
        
        CREATE INDEX IF NOT EXISTS idx_projects_bot_name 
        ON projects(bot_name);
        
        CREATE INDEX IF NOT EXISTS idx_projects_is_active 
        ON projects(is_active);
      `)

      log.info('✅ Projects table structure ensured')
    } catch (error: any) {
      log.error('Error ensuring projects table exists:', error.message)
      throw error
    }
  }

  /**
   * Получает или создает проект для пользователя
   */
  async getOrCreateProject(
    input: CreateProjectInput,
    retries = 3
  ): Promise<Project> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const client = await getDbPool().connect()

      try {
        log.info(
          `Getting or creating project for telegram_id: ${input.telegram_id} (attempt ${attempt}/${retries})`
        )

        // Ensure table exists
        await this.ensureProjectsTableExists(client)

        // Пытаемся найти существующий проект
        const existingProject = await client.query(
          `SELECT * FROM projects 
         WHERE telegram_id = $1 
         AND ($2::text IS NULL OR bot_name = $2) 
         AND is_active = true
         LIMIT 1`,
          [input.telegram_id, input.bot_name || null]
        )

        if (existingProject.rows.length > 0) {
          const project = existingProject.rows[0]
          log.info(
            `✅ Found existing project for telegram_id: ${input.telegram_id}`,
            {
              project_id: project.id,
              project_name: project.name,
            }
          )

          return ProjectSchema.parse({
            ...project,
            created_at: new Date(project.created_at),
            updated_at: new Date(project.updated_at),
          })
        }

        // Создаем новый проект
        const projectName =
          input.project_name ||
          (input.telegram_username
            ? `@${input.telegram_username}'s Project`
            : `Project for ${input.telegram_id}`)

        const newProject = await client.query(
          `INSERT INTO projects 
         (name, telegram_id, telegram_username, bot_name, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
          [
            projectName,
            input.telegram_id,
            input.telegram_username || null,
            input.bot_name || null,
            input.description || `Auto-created project for Instagram parsing`,
            JSON.stringify(input.metadata || {}),
          ]
        )

        const createdProject = newProject.rows[0]
        log.info(
          `✅ Created new project for telegram_id: ${input.telegram_id}`,
          {
            project_id: createdProject.id,
            project_name: createdProject.name,
          }
        )

        return ProjectSchema.parse({
          ...createdProject,
          created_at: new Date(createdProject.created_at),
          updated_at: new Date(createdProject.updated_at),
        })
      } catch (error: any) {
        log.error(
          `Error in getOrCreateProject (attempt ${attempt}/${retries}):`,
          error.message
        )

        if (attempt === retries) {
          throw new Error(
            `Failed to get/create project after ${retries} attempts: ${error.message}`
          )
        }

        // Экспоненциальная задержка
        const delay = Math.pow(2, attempt - 1) * 1000
        log.info(`Retrying getOrCreateProject after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } finally {
        client.release()
      }
    }

    throw new Error(`Failed to get/create project after ${retries} attempts`)
  }

  /**
   * Получает проект по ID с retry логикой
   */
  async getProjectById(
    projectId: number,
    retries = 3
  ): Promise<Project | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const client = await getDbPool().connect()

      try {
        log.info(
          `Getting project by ID: ${projectId} (attempt ${attempt}/${retries})`
        )

        const result = await client.query(
          'SELECT * FROM projects WHERE id = $1 AND is_active = true',
          [projectId]
        )

        if (result.rows.length === 0) {
          log.info(`Project ${projectId} not found`)
          return null
        }

        const project = result.rows[0]
        log.info(
          `Successfully retrieved project: ${project.name} (ID: ${project.id})`
        )

        return ProjectSchema.parse({
          ...project,
          created_at: new Date(project.created_at),
          updated_at: new Date(project.updated_at),
        })
      } catch (error: any) {
        log.error(
          `Error getting project by ID (attempt ${attempt}/${retries}):`,
          error.message
        )

        if (attempt === retries) {
          throw new Error(
            `Failed to get project ${projectId} after ${retries} attempts: ${error.message}`
          )
        }

        // Экспоненциальная задержка: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000
        log.info(`Retrying after ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      } finally {
        client.release()
      }
    }

    throw new Error(
      `Failed to get project ${projectId} after ${retries} attempts`
    )
  }

  /**
   * Проверяет существование проекта и создает если нужно
   */
  async validateOrCreateProject(
    projectId: number | undefined,
    telegramId: string | undefined,
    telegramUsername?: string,
    botName?: string
  ): Promise<{ project: Project; created: boolean }> {
    // Если передан project_id, пробуем найти его
    if (projectId && projectId > 0) {
      const existingProject = await this.getProjectById(projectId)
      if (existingProject) {
        return { project: existingProject, created: false }
      }

      log.warn(`Project with ID ${projectId} not found, will create new one`)
    }

    // Если нет project_id или он не найден, создаем новый проект
    if (!telegramId) {
      throw new Error('telegram_id is required to create a project')
    }

    const project = await this.getOrCreateProject({
      telegram_id: telegramId,
      telegram_username: telegramUsername,
      bot_name: botName,
      project_name: `Instagram Analytics ${
        telegramUsername ? `@${telegramUsername}` : telegramId
      }`,
      description: 'Auto-created for Instagram competitor analysis',
      metadata: {
        source: 'instagram-scraper-v2',
        auto_created: true,
        created_at: new Date().toISOString(),
      },
    })

    return { project, created: true }
  }

  /**
   * Получает все проекты пользователя
   */
  async getUserProjects(telegramId: string): Promise<Project[]> {
    const client = await getDbPool().connect()

    try {
      const result = await client.query(
        `SELECT * FROM projects 
         WHERE telegram_id = $1 
         AND is_active = true 
         ORDER BY created_at DESC`,
        [telegramId]
      )

      return result.rows.map(row =>
        ProjectSchema.parse({
          ...row,
          created_at: new Date(row.created_at),
          updated_at: new Date(row.updated_at),
        })
      )
    } catch (error: any) {
      log.error('Error getting user projects:', error.message)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Обновляет метаданные проекта
   */
  async updateProjectMetadata(
    projectId: number,
    metadata: Record<string, any>
  ): Promise<Project> {
    const client = await getDbPool().connect()

    try {
      const result = await client.query(
        `UPDATE projects 
         SET metadata = metadata || $2::jsonb,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND is_active = true
         RETURNING *`,
        [projectId, JSON.stringify(metadata)]
      )

      if (result.rows.length === 0) {
        throw new Error(`Project ${projectId} not found or inactive`)
      }

      const project = result.rows[0]
      return ProjectSchema.parse({
        ...project,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at),
      })
    } catch (error: any) {
      log.error('Error updating project metadata:', error.message)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Деактивирует проект (soft delete)
   */
  async deactivateProject(projectId: number): Promise<boolean> {
    const client = await getDbPool().connect()

    try {
      const result = await client.query(
        `UPDATE projects 
         SET is_active = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id`,
        [projectId]
      )

      const success = result.rows.length > 0
      if (success) {
        log.info(`✅ Project ${projectId} deactivated`)
      } else {
        log.warn(`⚠️ Project ${projectId} not found`)
      }

      return success
    } catch (error: any) {
      log.error('Error deactivating project:', error.message)
      throw error
    } finally {
      client.release()
    }
  }
}

// Экспортируем singleton экземпляр
export const projectManager = new ProjectManager()
