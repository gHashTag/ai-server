import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { closeConnection } from '@/db/drizzle-supabase'
import { drizzleORM } from '@/db/operations'

// Импортируем старые функции для сравнения
import { getUserByTelegramId as oldGetUserByTelegramId } from '@/core/supabase/getUserByTelegramId'

describe('🔴 TDD: Миграция функций на Drizzle', () => {
  // Тестовые данные
  const testUser = {
    telegram_id: '888888888',
    username: 'migration_test_user',
    first_name: 'Migration',
    last_name: 'Test',
    gender: 'female' as const,
    bot_name: 'migration_bot',
  }

  beforeEach(async () => {
    // Создаем тестового пользователя перед каждым тестом
    await drizzleORM.users.insert(testUser)
  })

  afterEach(async () => {
    // Очищаем тестовые данные после каждого теста
    try {
      await drizzleORM.users.delete(testUser.telegram_id)
    } catch (error) {
      // Игнорируем ошибки удаления (пользователь может не существовать)
    }
    await closeConnection()
  })

  describe('👤 getUserByTelegramId Migration', () => {
    it('🔴 should return same result as old function for existing user', async () => {
      // Получаем результат старой функции
      const oldResult = await oldGetUserByTelegramId(testUser.telegram_id)

      // Получаем результат новой функции
      const newResult = await drizzleORM.users.findByTelegramId(
        testUser.telegram_id
      )

      // Проверяем, что результаты идентичны
      expect(newResult).toBeDefined()
      expect(oldResult).toBeDefined()

      if (oldResult && newResult) {
        expect(String(newResult.telegram_id)).toBe(oldResult.telegram_id)
        expect(newResult.username).toBe(oldResult.username)
        expect(newResult.first_name).toBe(oldResult.first_name)
        expect(newResult.last_name).toBe(oldResult.last_name)
        expect(newResult.gender).toBe(oldResult.gender)
        expect(newResult.bot_name).toBe(oldResult.bot_name)
        expect(newResult.level).toBe(oldResult.level)
      }
    })

    it('🔴 should return null for non-existing user (both functions)', async () => {
      const nonExistentId = '999999999'

      // Проверяем старую функцию
      const oldResult = await oldGetUserByTelegramId(nonExistentId)

      // Проверяем новую функцию
      const newResult = await drizzleORM.users.findByTelegramId(nonExistentId)

      // Обе должны вернуть null
      expect(oldResult).toBeNull()
      expect(newResult).toBeNull()
    })

    it('🔴 should handle edge cases consistently', async () => {
      const edgeCases = ['', '0', '-1', 'invalid']

      for (const edgeCase of edgeCases) {
        try {
          const oldResult = await oldGetUserByTelegramId(edgeCase)
          const newResult = await drizzleORM.users.findByTelegramId(edgeCase)

          // Результаты должны быть одинаковыми
          expect(newResult).toBe(oldResult)
        } catch (oldError) {
          // Если старая функция выбрасывает ошибку, новая тоже должна
          await expect(
            drizzleORM.users.findByTelegramId(edgeCase)
          ).rejects.toThrow()
        }
      }
    })
  })

  describe('👤 createUser Migration', () => {
    const newTestUser = {
      telegram_id: '777777777',
      username: 'create_test_user',
      first_name: 'Create',
      last_name: 'Test',
      gender: 'male' as const,
      bot_name: 'create_bot',
    }

    afterEach(async () => {
      // Очищаем созданного пользователя
      try {
        await drizzleORM.users.delete(newTestUser.telegram_id)
      } catch (error) {
        // Игнорируем ошибки
      }
    })

    it('🔴 should create user with Zod validation', async () => {
      // Создаем пользователя через новую функцию
      const createdUser = await drizzleORM.users.insert(newTestUser)

      // Проверяем, что пользователь создан корректно
      expect(createdUser).toBeDefined()
      expect(String(createdUser.telegram_id)).toBe(newTestUser.telegram_id)
      expect(createdUser.username).toBe(newTestUser.username)
      expect(createdUser.gender).toBe(newTestUser.gender)

      // Проверяем, что пользователь действительно сохранен в БД
      const foundUser = await drizzleORM.users.findByTelegramId(
        newTestUser.telegram_id
      )
      expect(foundUser).toBeDefined()
      expect(String(foundUser!.telegram_id)).toBe(newTestUser.telegram_id)
    })

    it('🔴 should validate required fields with Zod', async () => {
      // Тест с отсутствующим telegram_id
      await expect(
        drizzleORM.users.insert({
          username: 'invalid_user',
          first_name: 'Invalid',
        } as any)
      ).rejects.toThrow()

      // Тест с невалидным gender
      await expect(
        drizzleORM.users.insert({
          telegram_id: '666666666',
          gender: 'invalid_gender',
        } as any)
      ).rejects.toThrow()
    })
  })
})
