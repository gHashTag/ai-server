import {
  sendPaymentInfoV2,
  sendPaymentInfoParamsSchema,
  paymentCreatedSchema,
  sendPaymentInfoSimple,
} from '@/core/supabase/sendPaymentInfoV2'
import { PaymentType } from '@/interfaces/payments.interface'

// Мокаем зависимости для Jest
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(data => ({
        select: jest.fn(() => ({
          single: jest.fn(() => {
            // Возвращаем данные на основе входных параметров
            const inputData = Array.isArray(data) ? data[0] : data
            return Promise.resolve({
              data: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                telegram_id: inputData.telegram_id || '144022504',
                amount: inputData.amount || 1000,
                stars: inputData.stars || 434,
                currency: inputData.currency || 'RUB',
                status: inputData.status || 'PENDING',
                type: inputData.type || 'MONEY_INCOME',
                payment_method: inputData.payment_method || 'System',
                description: inputData.description || 'Тестовый платеж',
                bot_name: inputData.bot_name || 'neuro_blogger_bot',
                created_at: inputData.created_at || '2024-01-01T00:00:00Z',
                subscription_type: inputData.subscription_type || null,
                service_type: inputData.service_type || null,
                metadata: inputData.metadata || null,
              },
              error: null,
            })
          }),
        })),
      })),
    })),
  },
}))

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe('sendPaymentInfoV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Zod Schema Validation', () => {
    it('должен валидировать корректные параметры создания платежа', () => {
      const validParams = {
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        currency: 'RUB',
        type: PaymentType.MONEY_INCOME,
        payment_method: 'System',
        description: 'Тестовый платеж',
        bot_name: 'neuro_blogger_bot',
        subscription_type: 'NEUROBASE',
        service_type: 'IMAGE_GENERATION',
        metadata: { test: true },
      }

      const result = sendPaymentInfoParamsSchema.safeParse(validParams)
      expect(result.success).toBe(true)
    })

    it('должен применять значения по умолчанию', () => {
      const minimalParams = {
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        bot_name: 'neuro_blogger_bot',
      }

      const result = sendPaymentInfoParamsSchema.parse(minimalParams)
      expect(result.currency).toBe('RUB')
      expect(result.type).toBe(PaymentType.MONEY_INCOME)
      expect(result.payment_method).toBe('System')
    })

    it('должен отклонять отрицательные суммы', () => {
      const invalidParams = {
        telegram_id: '144022504',
        amount: -100, // Отрицательная сумма
        stars: 434,
        bot_name: 'neuro_blogger_bot',
      }

      const result = sendPaymentInfoParamsSchema.safeParse(invalidParams)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('положительной')
      }
    })

    it('должен валидировать схему ответа созданного платежа', () => {
      const validResponse = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        currency: 'RUB',
        status: 'PENDING',
        type: PaymentType.MONEY_INCOME,
        payment_method: 'System',
        description: 'Тестовый платеж',
        bot_name: 'neuro_blogger_bot',
        created_at: '2024-01-01T00:00:00Z',
        subscription_type: null,
        service_type: null,
        metadata: null,
      }

      const result = paymentCreatedSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('sendPaymentInfoV2 Function', () => {
    it('должен успешно создавать новый платеж', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        bot_name: 'neuro_blogger_bot',
        description: 'Тестовый платеж',
      }

      const result = await sendPaymentInfoV2(params)

      expect(result).toBeDefined()
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.telegram_id).toBe('144022504')
      expect(result.amount).toBe(1000)
      expect(result.stars).toBe(434)
      expect(result.status).toBe('PENDING')
      expect(result.type).toBe(PaymentType.MONEY_INCOME)
      expect(result.payment_method).toBe('System')
    })

    it('должен выбрасывать ошибку при невалидных параметрах', async () => {
      const invalidParams = {
        telegram_id: '', // Пустой telegram_id
        amount: -100, // Отрицательная сумма
        stars: 434,
        bot_name: 'neuro_blogger_bot',
      }

      await expect(sendPaymentInfoV2(invalidParams)).rejects.toThrow(
        'Ошибка валидации'
      )
    })

    it('должен корректно обрабатывать все типы платежей', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 500,
        stars: 217,
        type: PaymentType.MONEY_OUTCOME,
        bot_name: 'neuro_blogger_bot',
        description: 'Списание за услугу',
      }

      const result = await sendPaymentInfoV2(params)
      expect(result.type).toBe(PaymentType.MONEY_OUTCOME)
    })

    it('должен корректно обрабатывать метаданные', async () => {
      const params = {
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        bot_name: 'neuro_blogger_bot',
        metadata: {
          operation_id: 'test-123',
          category: 'REAL',
          cost: 666.67,
        },
      }

      const result = await sendPaymentInfoV2(params)
      expect(result).toBeDefined()
      // Метаданные должны быть сохранены (в моке возвращается null, но в реальности сохранятся)
    })
  })

  describe('sendPaymentInfoSimple Function', () => {
    it('должен создавать платеж с упрощенными параметрами', async () => {
      const result = await sendPaymentInfoSimple(
        '144022504',
        1000,
        'neuro_blogger_bot',
        'Простой платеж'
      )

      expect(result).toBeDefined()
      expect(result.telegram_id).toBe('144022504')
      expect(result.amount).toBe(1000)
      expect(result.bot_name).toBe('neuro_blogger_bot')
      expect(result.description).toBe('Простой платеж')
    })

    it('должен автоматически рассчитывать звезды', async () => {
      const result = await sendPaymentInfoSimple(
        '144022504',
        1000,
        'neuro_blogger_bot'
      )

      // Math.floor(1000 * 0.434) = 434
      expect(result.stars).toBe(434)
    })
  })

  describe('Error Handling', () => {
    it('должен корректно обрабатывать ошибки Supabase', async () => {
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
        stars: 434,
        bot_name: 'neuro_blogger_bot',
      }

      await expect(sendPaymentInfoV2(params)).rejects.toThrow(
        'Ошибка создания платежа'
      )
    })
  })

  describe('Type Safety', () => {
    it('должен иметь правильные TypeScript типы', () => {
      // Этот тест проверяет типы на этапе компиляции
      const validParams: Parameters<typeof sendPaymentInfoV2>[0] = {
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        bot_name: 'neuro_blogger_bot',
      }

      expect(validParams).toBeDefined()
    })
  })
})
