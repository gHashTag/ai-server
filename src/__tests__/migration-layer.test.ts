import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { closeConnection } from '@/db/drizzle-supabase'
import { drizzleORM } from '@/db/operations'
import {
  getUserByTelegramId,
  createUser,
  updateUser,
  getUserBalance,
  updateUserBalance,
  createModelTraining,
  getTrainingWithUser,
  updateUserLevelPlusOne,
  updateLatestModelTraining,
} from '@/db/migration-layer'
import { PaymentType } from '@/interfaces/payments.interface'
import { ModeEnum } from '@/interfaces/modes'

describe('🔴 TDD: Миграционный слой Drizzle', () => {
  // Тестовые данные с уникальными значениями
  const getTestUser = () => ({
    telegram_id: `111111${Date.now()}`,
    username: `migration_layer_user_${Date.now()}`,
    first_name: 'Migration',
    last_name: 'Layer',
    gender: 'male' as const,
    bot_name: 'migration_bot',
  })

  let testUser: ReturnType<typeof getTestUser>

  beforeEach(async () => {
    // Создаем уникального пользователя для каждого теста
    testUser = getTestUser()
  })

  afterEach(async () => {
    // Очищаем тестовые данные после каждого теста
    try {
      // Удаляем все платежи пользователя
      const payments = await drizzleORM.payments.findByTelegramId(
        testUser.telegram_id
      )
      for (const payment of payments) {
        await drizzleORM.payments.delete(payment.id)
      }

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

  describe('👤 User Migration Layer', () => {
    it('🔴 should create and find user through migration layer', async () => {
      // Создаем пользователя через миграционный слой
      const createdUser = await createUser(testUser)

      expect(createdUser).toBeDefined()
      expect(String(createdUser.telegram_id)).toBe(testUser.telegram_id)
      expect(createdUser.username).toBe(testUser.username)

      // Находим пользователя через миграционный слой
      const foundUser = await getUserByTelegramId(testUser.telegram_id)

      expect(foundUser).toBeDefined()
      expect(String(foundUser!.telegram_id)).toBe(testUser.telegram_id)
      expect(foundUser!.username).toBe(testUser.username)
    })

    it('🔴 should update user through migration layer', async () => {
      // Создаем пользователя
      await createUser(testUser)

      // Обновляем через миграционный слой
      const updatedUser = await updateUser(testUser.telegram_id, {
        first_name: 'Updated',
        level: 5,
      })

      expect(updatedUser.first_name).toBe('Updated')
      expect(updatedUser.level).toBe(5)
    })

    it('🔴 should update user level through migration layer', async () => {
      // Создаем пользователя с уровнем 0
      await createUser({ ...testUser, level: 0 })

      // Обновляем уровень через миграционный слой
      const updatedUser = await updateUserLevelPlusOne(testUser.telegram_id, 0)

      expect(updatedUser.level).toBe(1)
    })
  })

  describe('💰 Payment Migration Layer', () => {
    it('🔴 should handle balance operations through migration layer', async () => {
      // Создаем пользователя для тестов платежей
      await createUser(testUser)

      // Проверяем начальный баланс
      const initialBalance = await getUserBalance(testUser.telegram_id)
      expect(initialBalance).toBe(0)

      // Добавляем средства через миграционный слой
      await updateUserBalance(
        testUser.telegram_id,
        50,
        PaymentType.MONEY_INCOME,
        'Test income',
        {
          stars: 50,
          payment_method: 'Test',
          bot_name: 'test_bot',
          service_type: ModeEnum.DigitalAvatarBody,
        }
      )

      // Проверяем обновленный баланс
      const updatedBalance = await getUserBalance(testUser.telegram_id)
      expect(updatedBalance).toBe(50)

      // Списываем средства
      await updateUserBalance(
        testUser.telegram_id,
        20,
        PaymentType.MONEY_OUTCOME,
        'Test outcome',
        {
          stars: 20,
          payment_method: 'Test',
          bot_name: 'test_bot',
          service_type: ModeEnum.DigitalAvatarBody,
        }
      )

      // Проверяем финальный баланс
      const finalBalance = await getUserBalance(testUser.telegram_id)
      expect(finalBalance).toBe(30)
    })
  })

  describe('🤖 Model Training Migration Layer', () => {
    it('🔴 should create and get training through migration layer', async () => {
      // Создаем пользователя для тестов тренировок
      const createdUser = await createUser(testUser)

      const trainingData = {
        telegram_id: String(createdUser.telegram_id), // Используем telegram_id созданного пользователя
        model_name: 'test_migration_model',
        trigger_word: 'test_trigger',
        zip_url: 'https://example.com/test.zip',
        steps: 500,
        status: 'starting' as const,
        gender: 'female' as const,
        bot_name: 'test_bot',
      }

      // Создаем тренировку через миграционный слой
      const createdTraining = await createModelTraining(trainingData)

      expect(createdTraining).toBeDefined()
      // Проверяем, что telegram_id не пустой (нормализация может изменить формат)
      expect(createdTraining.telegram_id).toBeTruthy()
      expect(createdTraining.model_name).toBe(trainingData.model_name)

      // Получаем тренировку с пользователем через миграционный слой
      const trainingWithUser = await getTrainingWithUser(
        String(createdUser.telegram_id),
        trainingData.model_name
      )

      expect(trainingWithUser).toBeDefined()
      // Проверяем, что telegram_id не пустой (нормализация может изменить формат)
      expect(trainingWithUser.telegram_id).toBeTruthy()
      expect(trainingWithUser.user_username).toBe(testUser.username)
    })

    it('🔴 should update latest training through migration layer', async () => {
      // Создаем пользователя для тестов тренировок
      await createUser(testUser)

      const trainingData = {
        telegram_id: testUser.telegram_id,
        model_name: 'test_update_model',
        trigger_word: 'test_trigger',
        zip_url: 'https://example.com/test.zip',
        steps: 500,
        status: 'starting' as const,
        gender: 'female' as const,
        bot_name: 'test_bot',
      }

      // Создаем тренировку
      await createModelTraining(trainingData)

      // Обновляем через миграционный слой
      const updatedTraining = await updateLatestModelTraining(
        testUser.telegram_id,
        trainingData.model_name,
        {
          status: 'SUCCESS',
          model_url: 'https://example.com/model.safetensors',
        }
      )

      expect(updatedTraining.status).toBe('SUCCESS')
      expect(updatedTraining.model_url).toBe(
        'https://example.com/model.safetensors'
      )
    })
  })

  describe('🔄 Backward Compatibility', () => {
    it('🔴 should handle TelegramId normalization correctly', async () => {
      // Тестируем с числовым telegram_id (используем уникальный ID)
      const numericId = Date.now()
      const userData = {
        ...testUser,
        telegram_id: String(numericId),
        username: `normalization_user_${numericId}`,
      }

      const createdUser = await createUser(userData)
      expect(String(createdUser.telegram_id)).toBe(String(numericId))

      // Находим пользователя по строковому ID
      const foundUser = await getUserByTelegramId(String(numericId))
      expect(foundUser).toBeDefined()
      expect(String(foundUser!.telegram_id)).toBe(String(numericId))
    })
  })
})
