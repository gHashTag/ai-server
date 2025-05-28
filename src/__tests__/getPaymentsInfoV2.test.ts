import {
  getPaymentsInfoByTelegramIdV2,
  getPaymentsParamsSchema,
  paymentInfoSchema,
  getPaymentsInfoByTelegramIdSimple,
} from '@/core/supabase/getPaymentsInfoByTelegramIdV2'

// Мокаем зависимости для Jest
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            range: jest.fn(() =>
              Promise.resolve({
                data: [
                  {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    inv_id: '12345',
                    telegram_id: '144022504',
                    amount: 1000,
                    stars: 434,
                    currency: 'RUB',
                    status: 'COMPLETED',
                    type: 'MONEY_INCOME',
                    payment_method: 'Robokassa',
                    description: 'Покупка звезд',
                    bot_name: 'neuro_blogger_bot',
                    created_at: '2024-01-01T00:00:00Z',
                    payment_date: '2024-01-01T00:00:00Z',
                    subscription_type: null,
                    service_type: null,
                    metadata: { test: true },
                  },
                ],
                error: null,
              })
            ),
          })),
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

describe('getPaymentsInfoByTelegramIdV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Zod Schema Validation', () => {
    it('должен валидировать корректные параметры запроса', () => {
      const validParams = {
        telegram_id: '144022504',
        limit: 10,
        offset: 0,
        status: 'COMPLETED' as const,
        type: 'MONEY_INCOME' as const,
      }

      const result = getPaymentsParamsSchema.safeParse(validParams)
      expect(result.success).toBe(true)
    })

    it('должен применять значения по умолчанию', () => {
      const minimalParams = {
        telegram_id: '144022504',
      }

      const result = getPaymentsParamsSchema.parse(minimalParams)
      expect(result.limit).toBe(50)
      expect(result.offset).toBe(0)
    })

    it('должен отклонять неправильный лимит', () => {
      const invalidParams = {
        telegram_id: '144022504',
        limit: 0, // Меньше минимума
      }

      const result = getPaymentsParamsSchema.safeParse(invalidParams)
      expect(result.success).toBe(false)
    })

    it('должен валидировать схему платежа', () => {
      const validPayment = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        inv_id: '12345',
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        currency: 'RUB',
        status: 'COMPLETED',
        type: 'MONEY_INCOME',
        payment_method: 'Robokassa',
        description: 'Покупка звезд',
        bot_name: 'neuro_blogger_bot',
        created_at: '2024-01-01T00:00:00Z',
        payment_date: '2024-01-01T00:00:00Z',
        subscription_type: null,
        service_type: null,
        metadata: { test: true },
      }

      const result = paymentInfoSchema.safeParse(validPayment)
      expect(result.success).toBe(true)
    })
  })

  describe('getPaymentsInfoByTelegramIdV2 Function', () => {
    it('должен успешно получать платежи пользователя', async () => {
      const params = {
        telegram_id: '144022504',
        limit: 10,
      }

      const result = await getPaymentsInfoByTelegramIdV2(params)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        telegram_id: '144022504',
        amount: 1000,
        stars: 434,
        status: 'COMPLETED',
        type: 'MONEY_INCOME',
      })
    })

    it('должен выбрасывать ошибку при невалидных параметрах', async () => {
      const invalidParams = {
        telegram_id: '', // Пустой telegram_id
        limit: -1, // Отрицательный лимит
      }

      await expect(
        getPaymentsInfoByTelegramIdV2(invalidParams)
      ).rejects.toThrow('Ошибка валидации')
    })
  })

  describe('getPaymentsInfoByTelegramIdSimple Function', () => {
    it('должен возвращать упрощенный формат для обратной совместимости', async () => {
      const result = await getPaymentsInfoByTelegramIdSimple('144022504')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 1000,
        date: '2024-01-01T00:00:00Z',
      })
    })
  })

  describe('Type Safety', () => {
    it('должен иметь правильные TypeScript типы', () => {
      // Этот тест проверяет типы на этапе компиляции
      const validParams: Parameters<typeof getPaymentsInfoByTelegramIdV2>[0] = {
        telegram_id: '144022504',
        limit: 10,
        offset: 0,
      }

      expect(validParams).toBeDefined()
    })
  })
})
