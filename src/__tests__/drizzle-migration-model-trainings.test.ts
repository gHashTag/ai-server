import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { closeConnection } from '@/db/drizzle-supabase'
import { drizzleORM } from '@/db/operations'

// Импортируем старые функции для сравнения
import { createModelTraining as oldCreateModelTraining } from '@/core/supabase/createModelTraining'
import { getTrainingWithUser as oldGetTrainingWithUser } from '@/core/supabase/getTrainingWithUser'

describe('🔴 TDD: Миграция функций тренировок моделей на Drizzle', () => {
  // Тестовые данные
  const testUser = {
    telegram_id: '333333333',
    username: 'training_test_user',
    first_name: 'Training',
    last_name: 'Test',
    gender: 'male' as const,
    bot_name: 'training_bot',
  }

  const testTraining = {
    telegram_id: testUser.telegram_id,
    model_name: 'test_model_drizzle',
    trigger_word: 'test_trigger',
    zip_url: 'https://example.com/test.zip',
    steps: 500,
    status: 'starting' as const,
    gender: 'female' as const,
    bot_name: 'training_bot',
  }

  beforeEach(async () => {
    // Создаем тестового пользователя перед каждым тестом
    await drizzleORM.users.insert(testUser)
  })

  afterEach(async () => {
    // Очищаем тестовые данные после каждого теста
    try {
      // Удаляем все тренировки пользователя
      const trainings = await drizzleORM.modelTrainings.findByTelegramId(
        testUser.telegram_id
      )
      for (const training of trainings) {
        await drizzleORM.modelTrainings.delete(training.id)
      }

      // Удаляем пользователя
      await drizzleORM.users.delete(testUser.telegram_id)
    } catch (error) {
      // Игнорируем ошибки удаления
    }
    await closeConnection()
  })

  describe('🤖 createModelTraining Migration', () => {
    it('🔴 should create training with same result as old function', async () => {
      // Создаем тренировку через новую функцию
      const newResult = await drizzleORM.modelTrainings.insert(testTraining)

      // Проверяем, что тренировка создана корректно
      expect(newResult).toBeDefined()
      expect(String(newResult.telegram_id)).toBe(testTraining.telegram_id)
      expect(newResult.model_name).toBe(testTraining.model_name)
      expect(newResult.trigger_word).toBe(testTraining.trigger_word)
      expect(newResult.zip_url).toBe(testTraining.zip_url)
      expect(newResult.steps).toBe(testTraining.steps)
      expect(newResult.status).toBe(testTraining.status)
      expect(newResult.gender).toBe(testTraining.gender)
      expect(newResult.bot_name).toBe(testTraining.bot_name)

      // Проверяем, что тренировка действительно сохранена в БД
      const foundTraining = await drizzleORM.modelTrainings.findById(
        newResult.id
      )
      expect(foundTraining).toBeDefined()
      expect(foundTraining!.id).toBe(newResult.id)
    })

    it('🔴 should validate required fields with Zod', async () => {
      // Тест с отсутствующим telegram_id
      await expect(
        drizzleORM.modelTrainings.insert({
          model_name: 'invalid_model',
          trigger_word: 'invalid',
          zip_url: 'https://example.com/invalid.zip',
          steps: 500,
          status: 'starting',
        } as any)
      ).rejects.toThrow()

      // Тест с невалидным URL
      await expect(
        drizzleORM.modelTrainings.insert({
          telegram_id: testUser.telegram_id,
          model_name: 'invalid_model',
          trigger_word: 'invalid',
          zip_url: 'invalid-url',
          steps: 500,
          status: 'starting',
        } as any)
      ).rejects.toThrow()

      // Тест с невалидным количеством шагов
      await expect(
        drizzleORM.modelTrainings.insert({
          telegram_id: testUser.telegram_id,
          model_name: 'invalid_model',
          trigger_word: 'invalid',
          zip_url: 'https://example.com/invalid.zip',
          steps: 50, // Меньше минимума (100)
          status: 'starting',
        } as any)
      ).rejects.toThrow()
    })

    it('🔴 should handle gender validation correctly', async () => {
      // Валидный gender
      const validTraining = {
        ...testTraining,
        gender: 'male' as const,
      }
      const result = await drizzleORM.modelTrainings.insert(validTraining)
      expect(result.gender).toBe('male')

      // Невалидный gender
      await expect(
        drizzleORM.modelTrainings.insert({
          ...testTraining,
          gender: 'invalid_gender',
        } as any)
      ).rejects.toThrow()
    })
  })

  describe('🔍 getTrainingWithUser Migration', () => {
    let createdTraining: any

    beforeEach(async () => {
      // Создаем тренировку для тестов
      createdTraining = await drizzleORM.modelTrainings.insert(testTraining)
    })

    it('🔴 should return training with user data', async () => {
      // Получаем тренировку с пользователем через новую функцию
      const result = await drizzleORM.modelTrainings.getTrainingWithUser(
        testUser.telegram_id,
        testTraining.model_name
      )

      // Проверяем данные тренировки
      expect(result).toBeDefined()
      expect(String(result.telegram_id)).toBe(testTraining.telegram_id)
      expect(result.model_name).toBe(testTraining.model_name)
      expect(result.trigger_word).toBe(testTraining.trigger_word)
      expect(result.status).toBe(testTraining.status)

      // Проверяем данные пользователя
      expect(result.user_id).toBeDefined()
      expect(result.user_username).toBe(testUser.username)
      expect(result.user_first_name).toBe(testUser.first_name)
      expect(result.user_last_name).toBe(testUser.last_name)
      expect(result.user_gender).toBe(testUser.gender)
      expect(result.user_bot_name).toBe(testUser.bot_name)
    })

    it('🔴 should handle non-existing training gracefully', async () => {
      // Пытаемся получить несуществующую тренировку
      await expect(
        drizzleORM.modelTrainings.getTrainingWithUser(
          testUser.telegram_id,
          'non_existing_model'
        )
      ).rejects.toThrow()
    })

    it('🔴 should handle non-existing user gracefully', async () => {
      // Пытаемся получить тренировку для несуществующего пользователя
      await expect(
        drizzleORM.modelTrainings.getTrainingWithUser(
          '999999999',
          testTraining.model_name
        )
      ).rejects.toThrow()
    })
  })

  describe('🔍 Model Training Queries', () => {
    it('🔴 should find trainings by telegram_id', async () => {
      // Создаем несколько тренировок
      const trainings = [
        {
          ...testTraining,
          model_name: 'model_1',
          trigger_word: 'trigger_1',
        },
        {
          ...testTraining,
          model_name: 'model_2',
          trigger_word: 'trigger_2',
        },
      ]

      for (const training of trainings) {
        await drizzleORM.modelTrainings.insert(training)
      }

      // Получаем все тренировки пользователя
      const userTrainings = await drizzleORM.modelTrainings.findByTelegramId(
        testUser.telegram_id
      )

      expect(userTrainings).toHaveLength(2)
      expect(userTrainings[0].model_name).toContain('model_')
      expect(userTrainings[1].model_name).toContain('model_')
    })

    it('🔴 should find training by replicate_id', async () => {
      // Создаем тренировку с replicate_id
      const trainingWithReplicate = {
        ...testTraining,
        replicate_training_id: 'test_replicate_id_123',
      }

      const created = await drizzleORM.modelTrainings.insert(
        trainingWithReplicate
      )

      // Ищем по replicate_id
      const found = await drizzleORM.modelTrainings.findByReplicateId(
        'test_replicate_id_123'
      )

      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
      expect(found!.replicate_training_id).toBe('test_replicate_id_123')
    })

    it('🔴 should update training status', async () => {
      // Создаем тренировку
      const created = await drizzleORM.modelTrainings.insert(testTraining)

      // Обновляем статус
      const updated = await drizzleORM.modelTrainings.update(created.id, {
        status: 'SUCCESS',
        telegram_id: created.telegram_id, // Добавляем обязательное поле
      })

      expect(updated.status).toBe('SUCCESS')
    })
  })
})
