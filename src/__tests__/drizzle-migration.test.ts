import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeConnection } from '@/db/drizzle-supabase'
import { drizzleORM } from '@/db/operations'

describe('🔴 TDD: Drizzle ORM Migration', () => {
  afterAll(async () => {
    await closeConnection()
  })

  describe('📊 Database Connection', () => {
    it('should connect to database successfully', async () => {
      // Простой тест подключения через получение пользователя
      const result = await drizzleORM.users.findByTelegramId('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('👤 Users Table Operations', () => {
    it('should create a new user with Drizzle', async () => {
      const testUser = {
        telegram_id: '999999999',
        username: 'test_drizzle_user',
        first_name: 'Test',
        last_name: 'User',
        gender: 'male' as const,
        bot_name: 'test_bot',
      }

      // Создаем пользователя через Drizzle
      const createdUser = await drizzleORM.users.insert(testUser)

      expect(createdUser).toBeDefined()
      expect(createdUser.telegram_id).toBe(testUser.telegram_id)
      expect(createdUser.username).toBe(testUser.username)
      expect(createdUser.gender).toBe(testUser.gender)

      // Очистка
      await drizzleORM.users.delete(testUser.telegram_id)
    })

    it('should find user by telegram_id with Drizzle', async () => {
      const testUser = {
        telegram_id: '999999998',
        username: 'test_find_user',
        first_name: 'Find',
        last_name: 'Test',
      }

      // Создаем пользователя
      await drizzleORM.users.insert(testUser)

      // Ищем пользователя
      const foundUser = await drizzleORM.users.findByTelegramId(
        testUser.telegram_id
      )

      expect(foundUser).toBeDefined()
      expect(foundUser!.telegram_id).toBe(testUser.telegram_id)
      expect(foundUser!.username).toBe(testUser.username)

      // Очистка
      await drizzleORM.users.delete(testUser.telegram_id)
    })
  })

  describe('💰 Payments Table Operations', () => {
    it('should create payment with fractional stars using Drizzle', async () => {
      const testPayment = {
        telegram_id: '999999997',
        bot_name: 'test_bot',
        amount: 10.5,
        stars: 7.5, // Дробное значение звезд!
        currency: 'STARS',
        status: 'COMPLETED' as const,
        type: 'MONEY_OUTCOME' as const,
        payment_method: 'Internal',
        description: 'Test fractional payment',
      }

      // Создаем платеж через Drizzle
      const createdPayment = await drizzleORM.payments.insert(testPayment)

      expect(createdPayment).toBeDefined()
      expect(String(createdPayment.telegram_id)).toBe(testPayment.telegram_id)
      expect(Number(createdPayment.stars)).toBe(7.5) // Проверяем дробное значение
      expect(createdPayment.type).toBe(testPayment.type)

      // Очистка
      await drizzleORM.payments.delete(createdPayment.id)
    })
  })

  describe('🤖 Model Trainings Table Operations', () => {
    it('should create model training with Drizzle', async () => {
      const testTraining = {
        telegram_id: '999999996',
        model_name: 'test_model_drizzle',
        trigger_word: 'test_trigger',
        zip_url: 'https://example.com/test.zip',
        steps: 500,
        status: 'starting' as const,
        gender: 'female' as const,
        bot_name: 'test_bot',
      }

      // Создаем тренировку через Drizzle
      const createdTraining = await drizzleORM.modelTrainings.insert(
        testTraining
      )

      expect(createdTraining).toBeDefined()
      expect(String(createdTraining.telegram_id)).toBe(testTraining.telegram_id)
      expect(createdTraining.model_name).toBe(testTraining.model_name)
      expect(createdTraining.gender).toBe(testTraining.gender)
      expect(createdTraining.steps).toBe(testTraining.steps)

      // Очистка
      await drizzleORM.modelTrainings.delete(createdTraining.id)
    })
  })
})
