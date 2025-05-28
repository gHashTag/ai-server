import {
  setPaymentsV2,
  setPaymentV2Schema,
} from '@/core/supabase/setPaymentsV2'
import { PaymentType } from '@/interfaces/payments.interface'

// Мокаем зависимости для Jest
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() =>
            Promise.resolve({
              data: [{ id: 'test-id', status: 'COMPLETED' }],
              error: null,
            })
          ),
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

jest.mock('@/core/supabase/getUserBalance', () => ({
  invalidateBalanceCache: jest.fn(),
}))

describe('setPaymentsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Zod Schema Validation', () => {
    it('должен валидировать корректные данные', () => {
      const validData = {
        inv_id: '12345',
        telegram_id: '144022504',
        amount: 1000,
        currency: 'RUB' as const,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
      }

      const result = setPaymentV2Schema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('должен отклонять пустой inv_id', () => {
      const invalidData = {
        inv_id: '',
        telegram_id: '144022504',
        amount: 1000,
        currency: 'RUB' as const,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
      }

      const result = setPaymentV2Schema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          'inv_id не может быть пустым'
        )
      }
    })

    it('должен отклонять отрицательную сумму', () => {
      const invalidData = {
        inv_id: '12345',
        telegram_id: '144022504',
        amount: -100,
        currency: 'RUB' as const,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
      }

      const result = setPaymentV2Schema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          'amount должен быть положительным'
        )
      }
    })

    it('должен отклонять неподдерживаемую валюту', () => {
      const invalidData = {
        inv_id: '12345',
        telegram_id: '144022504',
        amount: 1000,
        currency: 'BTC' as any,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
      }

      const result = setPaymentV2Schema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Неподдерживаемая валюта')
      }
    })

    it('должен принимать опциональные поля', () => {
      const validData = {
        inv_id: '12345',
        telegram_id: '144022504',
        amount: 1000,
        currency: 'RUB' as const,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
        email: 'test@example.com',
        subscription_type: 'NEUROPHOTO' as const,
      }

      const result = setPaymentV2Schema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('setPaymentsV2 Function', () => {
    it('должен успешно обновлять платеж', async () => {
      const paymentData = {
        inv_id: '12345',
        telegram_id: '144022504',
        amount: 1000,
        currency: 'RUB' as const,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
      }

      await expect(setPaymentsV2(paymentData)).resolves.not.toThrow()
    })

    it('должен выбрасывать ошибку при невалидных данных', async () => {
      const invalidData = {
        inv_id: '',
        telegram_id: '144022504',
        amount: -100,
        currency: 'INVALID' as any,
        stars: 434,
        payment_method: 'Robokassa' as const,
        bot_name: 'neuro_blogger_bot',
      }

      await expect(setPaymentsV2(invalidData)).rejects.toThrow(
        'Ошибка валидации'
      )
    })
  })

  describe('Type Safety', () => {
    it('должен иметь правильные TypeScript типы', () => {
      // Этот тест проверяет типы на этапе компиляции
      const validData: Parameters<typeof setPaymentsV2>[0] = {
        inv_id: '12345',
        telegram_id: '144022504',
        amount: 1000,
        currency: 'RUB',
        stars: 434,
        payment_method: 'Robokassa',
        bot_name: 'neuro_blogger_bot',
      }

      expect(validData).toBeDefined()
    })
  })
})
