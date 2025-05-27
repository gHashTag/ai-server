import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { closeConnection } from '@/db/drizzle-supabase'
import { drizzleORM } from '@/db/operations'

// Импортируем старые функции для сравнения
import {
  getUserBalance as oldGetUserBalance,
  invalidateBalanceCache,
} from '@/core/supabase/getUserBalance'
import { updateUserBalance as oldUpdateUserBalance } from '@/core/supabase/updateUserBalance'
import { PaymentType } from '@/interfaces/payments.interface'

describe('🔴 TDD: Миграция функций платежей на Drizzle', () => {
  // Тестовые данные
  const testUser = {
    telegram_id: '555555555',
    username: 'payment_test_user',
    first_name: 'Payment',
    last_name: 'Test',
    bot_name: 'payment_bot',
  }

  beforeEach(async () => {
    // Создаем тестового пользователя перед каждым тестом
    await drizzleORM.users.insert(testUser)
  })

  afterEach(async () => {
    // Очищаем кэш баланса
    invalidateBalanceCache(testUser.telegram_id)

    // Очищаем тестовые данные после каждого теста
    try {
      // Удаляем все платежи пользователя
      const payments = await drizzleORM.payments.findByTelegramId(
        testUser.telegram_id
      )
      for (const payment of payments) {
        await drizzleORM.payments.delete(payment.id)
      }

      // Удаляем пользователя
      await drizzleORM.users.delete(testUser.telegram_id)
    } catch (error) {
      // Игнорируем ошибки удаления
    }
    await closeConnection()
  })

  describe('💰 getUserBalance Migration', () => {
    it('🔴 should return same balance as old function', async () => {
      // Создаем тестовый платеж
      const testPayment = {
        telegram_id: testUser.telegram_id,
        bot_name: 'test_bot',
        amount: 100,
        stars: 50,
        currency: 'STARS',
        status: 'COMPLETED' as const,
        type: 'MONEY_INCOME' as const,
        payment_method: 'Test',
        description: 'Test payment for balance',
      }

      await drizzleORM.payments.insert(testPayment)

      // Получаем баланс старой функцией
      const oldBalance = await oldGetUserBalance(testUser.telegram_id)

      // Получаем баланс новой функцией
      const newBalance = await drizzleORM.payments.getUserBalance(
        testUser.telegram_id
      )

      // Балансы должны совпадать
      expect(newBalance).toBe(oldBalance)
      expect(newBalance).toBeGreaterThan(0)
    })

    it('🔴 should return 0 for user with no payments', async () => {
      // Получаем баланс для пользователя без платежей
      const oldBalance = await oldGetUserBalance(testUser.telegram_id)
      const newBalance = await drizzleORM.payments.getUserBalance(
        testUser.telegram_id
      )

      // Оба должны вернуть 0
      expect(oldBalance).toBe(0)
      expect(newBalance).toBe(0)
    })

    it('🔴 should handle fractional stars correctly', async () => {
      // Создаем платеж с дробными звездами
      const fractionalPayment = {
        telegram_id: testUser.telegram_id,
        bot_name: 'test_bot',
        amount: 15.75,
        stars: 7.5, // Дробное значение!
        currency: 'STARS',
        status: 'COMPLETED' as const,
        type: 'MONEY_INCOME' as const,
        payment_method: 'Test',
        description: 'Fractional stars test',
      }

      await drizzleORM.payments.insert(fractionalPayment)

      const oldBalance = await oldGetUserBalance(testUser.telegram_id)
      const newBalance = await drizzleORM.payments.getUserBalance(
        testUser.telegram_id
      )

      // Проверяем, что дробные значения обрабатываются корректно
      expect(newBalance).toBe(oldBalance)
      expect(newBalance).toBe(7.5)
    })
  })

  describe('💳 updateUserBalance Migration', () => {
    it('🔴 should create payment record with Zod validation', async () => {
      const paymentAmount = 25.5
      const description = 'Test payment via Drizzle'

      // Создаем платеж через новую функцию (имитируем updateUserBalance)
      const paymentData = {
        telegram_id: testUser.telegram_id,
        bot_name: 'test_bot',
        amount: paymentAmount,
        stars: paymentAmount,
        currency: 'STARS',
        status: 'COMPLETED' as const,
        type: 'MONEY_INCOME' as const,
        payment_method: 'Internal',
        description,
      }

      const createdPayment = await drizzleORM.payments.insert(paymentData)

      // Проверяем, что платеж создан корректно
      expect(createdPayment).toBeDefined()
      expect(String(createdPayment.telegram_id)).toBe(testUser.telegram_id)
      expect(Number(createdPayment.stars)).toBe(paymentAmount)
      expect(createdPayment.type).toBe('MONEY_INCOME')
      expect(createdPayment.description).toBe(description)

      // Проверяем, что баланс обновился
      const balance = await drizzleORM.payments.getUserBalance(
        testUser.telegram_id
      )
      expect(balance).toBe(paymentAmount)
    })

    it('🔴 should handle MONEY_OUTCOME operations correctly', async () => {
      // Сначала добавляем средства
      const incomePayment = {
        telegram_id: testUser.telegram_id,
        bot_name: 'test_bot',
        amount: 100,
        stars: 100,
        currency: 'STARS',
        status: 'COMPLETED' as const,
        type: 'MONEY_INCOME' as const,
        payment_method: 'Internal',
        description: 'Initial balance',
      }

      await drizzleORM.payments.insert(incomePayment)

      // Затем списываем средства
      const outcomePayment = {
        telegram_id: testUser.telegram_id,
        bot_name: 'test_bot',
        amount: 30,
        stars: 30,
        currency: 'STARS',
        status: 'COMPLETED' as const,
        type: 'MONEY_OUTCOME' as const,
        payment_method: 'Internal',
        description: 'Service usage',
        service_type: 'IMAGE_GENERATION',
      }

      await drizzleORM.payments.insert(outcomePayment)

      // Проверяем итоговый баланс
      const balance = await drizzleORM.payments.getUserBalance(
        testUser.telegram_id
      )
      expect(balance).toBe(70) // 100 - 30 = 70
    })

    it('🔴 should validate payment data with Zod', async () => {
      // Тест с отсутствующим bot_name
      await expect(
        drizzleORM.payments.insert({
          telegram_id: testUser.telegram_id,
          amount: 10,
          stars: 10,
          status: 'COMPLETED',
          type: 'MONEY_INCOME',
        } as any)
      ).rejects.toThrow()

      // Тест с невалидным типом операции
      await expect(
        drizzleORM.payments.insert({
          telegram_id: testUser.telegram_id,
          bot_name: 'test_bot',
          amount: 10,
          stars: 10,
          status: 'COMPLETED',
          type: 'INVALID_TYPE',
        } as any)
      ).rejects.toThrow()
    })
  })

  describe('🔍 Payment Queries', () => {
    it('🔴 should find payments by telegram_id', async () => {
      // Создаем несколько платежей
      const payments = [
        {
          telegram_id: testUser.telegram_id,
          bot_name: 'test_bot',
          amount: 10,
          stars: 10,
          currency: 'STARS',
          status: 'COMPLETED' as const,
          type: 'MONEY_INCOME' as const,
          payment_method: 'Test1',
          description: 'Payment 1',
        },
        {
          telegram_id: testUser.telegram_id,
          bot_name: 'test_bot',
          amount: 20,
          stars: 20,
          currency: 'STARS',
          status: 'COMPLETED' as const,
          type: 'MONEY_INCOME' as const,
          payment_method: 'Test2',
          description: 'Payment 2',
        },
      ]

      for (const payment of payments) {
        await drizzleORM.payments.insert(payment)
      }

      // Получаем все платежи пользователя
      const userPayments = await drizzleORM.payments.findByTelegramId(
        testUser.telegram_id
      )

      expect(userPayments).toHaveLength(2)
      expect(userPayments[0].description).toContain('Payment')
      expect(userPayments[1].description).toContain('Payment')
    })
  })
})
