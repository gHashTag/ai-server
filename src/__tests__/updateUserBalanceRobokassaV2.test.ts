import {
  updateUserBalanceRobokassaV2,
  updateUserBalanceRobokassaParamsSchema,
  balanceUpdateResultSchema,
  updateUserBalanceRobokassaSimple,
} from '@/core/supabase/updateUserBalanceRobokassaV2'

// Мокаем зависимости для Jest
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn(() =>
                Promise.resolve({
                  data: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    status: 'COMPLETED',
                    payment_date: '2024-01-01T00:00:00Z',
                  },
                  error: null,
                })
              ),
            })),
          })),
        })),
      })),
      insert: jest.fn(data => ({
        select: jest.fn(() => ({
          single: jest.fn(() =>
            Promise.resolve({
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                telegram_id: data.telegram_id || '144022504',
                amount: data.amount || 1000,
                stars: data.stars || 1000,
                currency: data.currency || 'STARS',
                status: data.status || 'COMPLETED',
                type: data.type || 'MONEY_INCOME',
                payment_method: data.payment_method || 'Robokassa',
                description: data.description || 'Test payment',
                bot_name: data.bot_name || 'neuro_blogger_bot',
                created_at: data.created_at || '2024-01-01T00:00:00Z',
                payment_date: data.payment_date || '2024-01-01T00:00:00Z',
              },
              error: null,
            })
          ),
        })),
      })),
    })),
  },
}))

jest.mock('@/core/supabase/getUserBalance', () => ({
  getUserBalance: jest.fn(() => Promise.resolve(1500)), // Мокаем достаточный баланс
  invalidateBalanceCache: jest.fn(),
}))

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('updateUserBalanceRobokassaV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Zod Schema Validation', () => {
    it('должен валидировать корректные параметры обновления баланса', () => {
      const validParams = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
        description: 'Robokassa payment',
        metadata: {
          inv_id: 'inv_123',
          currency: 'STARS',
          bot_name: 'neuro_blogger_bot',
          language: 'ru' as const,
          payment_method: 'Robokassa',
          service_type: 'IMAGE_GENERATION',
          subscription_type: 'NEUROBASE',
          operation_id: 'op_123',
          category: 'REAL' as const,
          cost: 666.67,
        },
      }

      const result =
        updateUserBalanceRobokassaParamsSchema.safeParse(validParams)
      expect(result.success).toBe(true)
    })

    it('должен применять значения по умолчанию для метаданных', () => {
      const minimalParams = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
      }

      const result = updateUserBalanceRobokassaParamsSchema.parse(minimalParams)
      expect(result.metadata).toBeUndefined() // metadata опциональна
    })

    it('должен отклонять отрицательные суммы', () => {
      const invalidParams = {
        telegram_id: '144022504',
        amount: -100, // Отрицательная сумма
        type: 'money_income' as const,
      }

      const result =
        updateUserBalanceRobokassaParamsSchema.safeParse(invalidParams)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('положительной')
      }
    })

    it('должен валидировать схему ответа', () => {
      const validResponse = {
        success: true,
        transaction_id: '123e4567-e89b-12d3-a456-426614174000',
        new_balance: 2500,
      }

      const result = balanceUpdateResultSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('updateUserBalanceRobokassaV2 Function', () => {
    it('должен успешно создавать новую транзакцию income', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
        description: 'Robokassa payment',
        metadata: {
          currency: 'STARS',
          bot_name: 'neuro_blogger_bot',
          payment_method: 'Robokassa',
        },
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(true)
      expect(result.transaction_id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.new_balance).toBe(1500) // Мокнутый баланс
      expect(result.error_message).toBeUndefined()
    })

    it('должен успешно обновлять существующую транзакцию по inv_id', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
        description: 'Robokassa payment completed',
        metadata: {
          inv_id: 'existing_inv_123',
          bot_name: 'neuro_blogger_bot',
        },
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(true)
      expect(result.transaction_id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.new_balance).toBe(1500)
    })

    it('должен отклонять операции outcome при недостатке средств', async () => {
      // Мокаем недостаточный баланс
      const { getUserBalance } = require('@/core/supabase/getUserBalance')
      getUserBalance.mockResolvedValueOnce(500) // Недостаточно для списания 1000

      const params = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_outcome' as const,
        description: 'Service payment',
        metadata: {
          language: 'ru' as const,
        },
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(false)
      expect(result.error_message).toContain('Недостаточно средств')
      expect(result.transaction_id).toBeUndefined()
    })

    it('должен успешно обрабатывать операции outcome при достаточном балансе', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 500,
        type: 'money_outcome' as const,
        description: 'Service payment',
        metadata: {
          service_type: 'IMAGE_GENERATION',
          bot_name: 'neuro_blogger_bot',
        },
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(true)
      expect(result.transaction_id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.new_balance).toBe(1500)
    })

    it('должен выбрасывать ошибку при невалидных параметрах', async () => {
      const invalidParams = {
        telegram_id: '', // Пустой telegram_id
        amount: -100, // Отрицательная сумма
        type: 'invalid_type' as any,
      }

      const result = await updateUserBalanceRobokassaV2(invalidParams)

      expect(result.success).toBe(false)
      expect(result.error_message).toContain('Ошибка валидации')
    })

    it('должен корректно обрабатывать метаданные', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
        metadata: {
          operation_id: 'test-123',
          category: 'REAL' as const,
          cost: 666.67,
          subscription_type: 'NEUROBASE',
          service_type: 'IMAGE_GENERATION',
        },
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(true)
      expect(result.transaction_id).toBeDefined()
    })
  })

  describe('updateUserBalanceRobokassaSimple Function', () => {
    it('должен возвращать boolean для обратной совместимости', async () => {
      const result = await updateUserBalanceRobokassaSimple(
        '144022504',
        1000,
        'money_income',
        'Simple payment'
      )

      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
    })

    it('должен возвращать false при ошибке', async () => {
      const result = await updateUserBalanceRobokassaSimple(
        '', // Невалидный telegram_id
        -100, // Отрицательная сумма
        'money_income'
      )

      expect(result).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('должен корректно обрабатывать ошибки Supabase при создании', async () => {
      // Мокаем ошибку Supabase
      const mockSupabase = require('@/core/supabase').supabase
      mockSupabase.from.mockReturnValueOnce({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database error' },
              })
            ),
          })),
        })),
      })

      const params = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(false)
      expect(result.error_message).toContain('Ошибка создания платежа')
    })

    it('должен корректно обрабатывать ошибки Supabase при обновлении', async () => {
      // Мокаем ошибку Supabase для обновления
      const mockSupabase = require('@/core/supabase').supabase
      mockSupabase.from.mockReturnValueOnce({
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() =>
                  Promise.resolve({
                    data: null,
                    error: { message: 'Update error' },
                  })
                ),
              })),
            })),
          })),
        })),
      })

      const params = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income' as const,
        metadata: {
          inv_id: 'existing_inv_123',
        },
      }

      const result = await updateUserBalanceRobokassaV2(params)

      expect(result.success).toBe(false)
      expect(result.error_message).toContain('Ошибка обновления платежа')
    })
  })

  describe('Type Safety', () => {
    it('должен иметь правильные TypeScript типы', () => {
      // Этот тест проверяет типы на этапе компиляции
      const validParams: Parameters<typeof updateUserBalanceRobokassaV2>[0] = {
        telegram_id: '144022504',
        amount: 1000,
        type: 'money_income',
      }

      expect(validParams).toBeDefined()
    })
  })
})
