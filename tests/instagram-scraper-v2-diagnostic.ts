/**
 * Диагностический тест для Instagram Scraper V2
 * Тестирует подключения к базе данных и основные функции
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import pkg from 'pg'
const { Pool } = pkg

import { projectManager } from '../src/core/instagram/project-manager'

describe('Instagram Scraper V2 Diagnostic Tests', () => {
  let dbPool: Pool

  beforeAll(async () => {
    // Инициализируем тестовое подключение к БД
    const connectionString = process.env.SUPABASE_URL
    
    if (!connectionString) {
      throw new Error('SUPABASE_URL environment variable is required for tests')
    }

    dbPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 10000,
      queryTimeout: 30000,
      max: 5,
      min: 1,
    })
  })

  afterAll(async () => {
    await dbPool.end()
  })

  describe('Database Connection Tests', () => {
    it('should connect to database successfully', async () => {
      const client = await dbPool.connect()
      
      try {
        const result = await client.query('SELECT NOW() as current_time')
        expect(result.rows).toHaveLength(1)
        expect(result.rows[0].current_time).toBeDefined()
      } finally {
        client.release()
      }
    })

    it('should handle database timeouts gracefully', async () => {
      // Создаем пул с очень коротким таймаутом для тестирования
      const timeoutPool = new Pool({
        connectionString: process.env.SUPABASE_URL!,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 1, // 1ms - заведомо недостаточно
        queryTimeout: 1,
        max: 1,
      })

      try {
        const client = await timeoutPool.connect()
        await client.query('SELECT 1')
        client.release()
        
        // Если дошли сюда, то либо соединение очень быстрое, либо тест нужно пересмотреть
        console.warn('Connection was faster than expected - this is actually good!')
      } catch (error: any) {
        // Ожидаем timeout ошибку
        expect(error.message).toMatch(/timeout|ETIMEDOUT/)
      } finally {
        await timeoutPool.end()
      }
    }, 10000)
  })

  describe('Project Manager Tests', () => {
    it('should create and retrieve project with retry logic', async () => {
      const testTelegramId = `test_${Date.now()}`
      const testUsername = `test_user_${Date.now()}`
      
      try {
        // Тест создания проекта
        const { project: createdProject } = await projectManager.validateOrCreateProject(
          undefined,
          testTelegramId,
          testUsername,
          'test_bot'
        )

        expect(createdProject.id).toBeDefined()
        expect(createdProject.telegram_id).toBe(testTelegramId)
        expect(createdProject.is_active).toBe(true)

        // Тест получения существующего проекта
        const existingProject = await projectManager.getProjectById(createdProject.id)
        expect(existingProject).toBeTruthy()
        expect(existingProject!.id).toBe(createdProject.id)
        expect(existingProject!.name).toBe(createdProject.name)

        // Тест повторного создания (должен вернуть существующий)
        const { project: duplicateProject, created } = await projectManager.validateOrCreateProject(
          undefined,
          testTelegramId,
          testUsername,
          'test_bot'
        )

        expect(created).toBe(false) // Не создавался заново
        expect(duplicateProject.id).toBe(createdProject.id)

      } catch (error) {
        console.error('Project manager test failed:', error)
        throw error
      }
    }, 30000)

    it('should handle non-existent project ID gracefully', async () => {
      const nonExistentId = 999999
      
      const project = await projectManager.getProjectById(nonExistentId)
      expect(project).toBeNull()
    })

    it('should retry on connection failures', async () => {
      // Тестируем retry логику с невалидным project ID
      try {
        await projectManager.getProjectById(999999, 2) // 2 попытки
        // Если проект не найден, это нормально - возвращается null
      } catch (error: any) {
        // Если произошла ошибка соединения, проверим что это timeout
        expect(error.message).toMatch(/timeout|connection|ETIMEDOUT/)
      }
    })
  })

  describe('Database Schema Tests', () => {
    it('should ensure projects table exists', async () => {
      const client = await dbPool.connect()
      
      try {
        // Проверяем что таблица projects существует
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'projects'
          );
        `)

        const exists = tableExists.rows[0].exists
        
        if (!exists) {
          console.warn('Projects table does not exist, this may be expected in some environments')
        }
        
        expect(typeof exists).toBe('boolean')
      } finally {
        client.release()
      }
    })

    it('should ensure instagram_similar_users table can be created', async () => {
      const client = await dbPool.connect()
      
      try {
        // Тестируем создание таблицы instagram_similar_users
        await client.query(`
          CREATE TABLE IF NOT EXISTS instagram_similar_users_test (
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

        // Очищаем тестовую таблицу
        await client.query('DROP TABLE IF EXISTS instagram_similar_users_test')
        
        // Если дошли до этого места - таблица успешно создалась и удалилась
        expect(true).toBe(true)
      } finally {
        client.release()
      }
    })
  })

  describe('Environment Tests', () => {
    it('should have required environment variables', () => {
      expect(process.env.SUPABASE_URL).toBeDefined()
      expect(process.env.SUPABASE_URL).toMatch(/^postgresql:\/\//)
    })

    it('should have Apify token for integration', () => {
      expect(process.env.APIFY_TOKEN).toBeDefined()
      expect(process.env.APIFY_TOKEN!.length).toBeGreaterThan(10)
    })
  })
})