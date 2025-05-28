import {
  getPaymentHistoryV2,
  invalidatePaymentHistoryCache,
  clearPaymentHistoryCache,
} from '@/core/supabase/getPaymentHistoryV2'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { PaymentType } from '@/interfaces/payments.interface'

// Мокаем зависимости
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Типизация моков
const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockLogger = logger as jest.Mocked<typeof logger>

// Хелпер для создания мока Supabase query
const createMockQuery = (data: any, error: any = null) => {
  const mockLimit = jest.fn().mockResolvedValue({ data, error })
  const mockOrder = jest.fn().mockReturnValue({ limit: mockLimit })

  // Создаем объект который поддерживает цепочку .eq() вызовов
  const eqChain: any = {
    order: mockOrder,
  }
  eqChain.eq = jest.fn().mockReturnValue(eqChain)

  const mockSelect = jest.fn().mockReturnValue(eqChain)

  return { select: mockSelect }
}

describe('getPaymentHistoryV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearPaymentHistoryCache() // Очищаем кэш между тестами
  })

  describe('Zod Schema Validation', () => {
    it('should validate correct parameters', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          telegram_id: '144022504',
          type: 'MONEY_INCOME',
          stars: 100,
          description: 'Пополнение баланса',
          payment_method: 'Robokassa',
          created_at: '2024-01-01T00:00:00Z',
          status: 'COMPLETED',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      const result = await getPaymentHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.payments).toHaveLength(1)
    })

    it('should reject empty telegram_id', async () => {
      await expect(
        getPaymentHistoryV2({
          telegram_id: '',
          limit: 10,
        })
      ).rejects.toThrow('Telegram ID должен содержать только цифры')
    })

    it('should reject invalid limit', async () => {
      await expect(
        getPaymentHistoryV2({
          telegram_id: '144022504',
          limit: 0,
        })
      ).rejects.toThrow()

      await expect(
        getPaymentHistoryV2({
          telegram_id: '144022504',
          limit: 101,
        })
      ).rejects.toThrow()
    })

    it('should reject null parameters', async () => {
      await expect(
        getPaymentHistoryV2({
          telegram_id: null as any,
          limit: 10,
        })
      ).rejects.toThrow()

      await expect(
        getPaymentHistoryV2({
          telegram_id: '144022504',
          limit: null as any,
        })
      ).rejects.toThrow()
    })

    it('should reject undefined telegram_id', async () => {
      await expect(
        getPaymentHistoryV2({
          telegram_id: undefined as any,
          limit: 10,
        })
      ).rejects.toThrow()
    })
  })

  describe('getPaymentHistoryV2 Function', () => {
    it('should successfully get payment history', async () => {
      // Изолируем мок для этого теста
      jest.clearAllMocks()

      const mockPayments = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          telegram_id: '144022504',
          type: 'MONEY_INCOME',
          stars: 100,
          description: 'Пополнение баланса',
          payment_method: 'Robokassa',
          created_at: '2024-01-01T00:00:00Z',
          status: 'COMPLETED',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          telegram_id: '144022504',
          type: 'MONEY_OUTCOME',
          stars: 7,
          description: 'NeuroPhoto генерация',
          payment_method: 'System',
          created_at: '2024-01-02T00:00:00Z',
          status: 'COMPLETED',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockPayments) as any)

      const result = await getPaymentHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.payments).toHaveLength(2)
      expect(result.payments![0].type).toBe('MONEY_INCOME')
      expect(result.payments![1].type).toBe('MONEY_OUTCOME')
      expect(mockSupabase.from).toHaveBeenCalledWith('payments_v2')
    })

    it('should return empty array when no payments found', async () => {
      mockSupabase.from.mockReturnValue(createMockQuery([]) as any)

      const result = await getPaymentHistoryV2({
        telegram_id: '999999999',
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.payments).toEqual([])
    })

    it('should throw error for database errors', async () => {
      const error = { code: 'PGRST500', message: 'Database error' }
      mockSupabase.from.mockReturnValue(createMockQuery(null, error) as any)

      await expect(
        getPaymentHistoryV2({
          telegram_id: '144022504',
          limit: 10,
        })
      ).rejects.toThrow('Ошибка получения истории платежей: Database error')
    })

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await expect(
        getPaymentHistoryV2({
          telegram_id: '144022504',
          limit: 10,
        })
      ).rejects.toThrow('Unexpected error')
    })

    it('should support filtering by payment type', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          telegram_id: '144022504',
          type: 'MONEY_INCOME',
          stars: 100,
          description: 'Пополнение баланса',
          payment_method: 'Robokassa',
          created_at: '2024-01-01T00:00:00Z',
          status: 'COMPLETED',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      const result = await getPaymentHistoryV2({
        telegram_id: '144022504',
        limit: 10,
        payment_type: PaymentType.MONEY_INCOME,
      })

      expect(result.success).toBe(true)
      expect(result.payments).toHaveLength(1)
      expect(result.payments![0].type).toBe('MONEY_INCOME')
    })

    it('should support filtering by bot_name', async () => {
      const mockData = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          telegram_id: '144022504',
          type: 'MONEY_OUTCOME',
          stars: 7,
          description: 'NeuroPhoto генерация',
          payment_method: 'System',
          bot_name: 'ai_koshey_bot',
          created_at: '2024-01-01T00:00:00Z',
          status: 'COMPLETED',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      const result = await getPaymentHistoryV2({
        telegram_id: '144022504',
        limit: 10,
        bot_name: 'ai_koshey_bot',
      })

      expect(result.success).toBe(true)
      expect(result.payments).toHaveLength(1)
      expect(result.payments![0].bot_name).toBe('ai_koshey_bot')
    })

    it('should use default limit when not provided', async () => {
      mockSupabase.from.mockReturnValue(createMockQuery([]) as any)

      const result = await getPaymentHistoryV2({
        telegram_id: '144022504',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Cache Management', () => {
    it('should invalidate payment history cache', () => {
      expect(() => invalidatePaymentHistoryCache('144022504')).not.toThrow()
    })
  })
})
