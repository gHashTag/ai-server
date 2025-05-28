import {
  updateUserSubscriptionV2,
  invalidateUserCache,
} from '@/core/supabase/updateUserSubscriptionV2'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { SubscriptionType } from '@/interfaces/subscription.interface'

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

// Мокаем функцию invalidateUserCache из getUserByTelegramIdV2
jest.mock('@/core/supabase/getUserByTelegramIdV2', () => ({
  invalidateUserCache: jest.fn(),
}))

// Типизация моков
const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockLogger = logger as jest.Mocked<typeof logger>
const mockInvalidateUserCache = invalidateUserCache as jest.MockedFunction<
  typeof invalidateUserCache
>

describe('updateUserSubscriptionV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Zod Schema Validation', () => {
    it('should validate correct parameters', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                subscription: 'NEUROPHOTO',
                username: 'testuser',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await updateUserSubscriptionV2({
        telegram_id: '144022504',
        subscription_type: SubscriptionType.NEUROPHOTO,
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('📋 Обновление подписки пользователя V2'),
        expect.objectContaining({
          telegram_id: '144022504',
          subscription_type: 'NEUROPHOTO',
        })
      )
    })

    it('should reject empty telegram_id', async () => {
      await expect(
        updateUserSubscriptionV2({
          telegram_id: '',
          subscription_type: SubscriptionType.NEUROPHOTO,
        })
      ).rejects.toThrow('Telegram ID должен содержать только цифры')
    })

    it('should reject invalid subscription type', async () => {
      await expect(
        updateUserSubscriptionV2({
          telegram_id: '144022504',
          subscription_type: 'INVALID_TYPE' as any,
        })
      ).rejects.toThrow()
    })

    it('should reject null parameters', async () => {
      await expect(
        updateUserSubscriptionV2({
          telegram_id: null as any,
          subscription_type: SubscriptionType.NEUROPHOTO,
        })
      ).rejects.toThrow()

      await expect(
        updateUserSubscriptionV2({
          telegram_id: '144022504',
          subscription_type: null as any,
        })
      ).rejects.toThrow()
    })

    it('should reject undefined parameters', async () => {
      await expect(
        updateUserSubscriptionV2({
          telegram_id: undefined as any,
          subscription_type: SubscriptionType.NEUROPHOTO,
        })
      ).rejects.toThrow()

      await expect(
        updateUserSubscriptionV2({
          telegram_id: '144022504',
          subscription_type: undefined as any,
        })
      ).rejects.toThrow()
    })
  })

  describe('updateUserSubscriptionV2 Function', () => {
    it('should successfully update user subscription', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                subscription: 'NEUROTESTER',
                username: 'testuser',
                first_name: 'Test',
                last_name: 'User',
                updated_at: '2024-01-01T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await updateUserSubscriptionV2({
        telegram_id: '144022504',
        subscription_type: SubscriptionType.NEUROTESTER,
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user!.subscription).toBe('NEUROTESTER')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockUpdate).toHaveBeenCalledWith({
        subscription: 'NEUROTESTER',
      })
      expect(mockInvalidateUserCache).toHaveBeenCalledWith('144022504')
    })

    it('should return null when user does not exist', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await updateUserSubscriptionV2({
        telegram_id: '999999999',
        subscription_type: SubscriptionType.NEUROPHOTO,
      })

      expect(result.success).toBe(false)
      expect(result.user).toBeNull()
      expect(result.error_message).toContain(
        'Пользователь с telegram_id 999999999 не найден'
      )
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Пользователь не найден'),
        expect.objectContaining({
          telegram_id: '999999999',
        })
      )
    })

    it('should throw error for database errors', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      await expect(
        updateUserSubscriptionV2({
          telegram_id: '144022504',
          subscription_type: SubscriptionType.NEUROPHOTO,
        })
      ).rejects.toThrow('Ошибка обновления подписки: Database error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Ошибка обновления подписки'),
        expect.objectContaining({
          error: 'Database error',
          telegram_id: '144022504',
        })
      )
    })

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await expect(
        updateUserSubscriptionV2({
          telegram_id: '144022504',
          subscription_type: SubscriptionType.NEUROPHOTO,
        })
      ).rejects.toThrow('Unexpected error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '❌ Неожиданная ошибка в updateUserSubscriptionV2'
        ),
        expect.objectContaining({
          error: 'Unexpected error',
          telegram_id: '144022504',
        })
      )
    })

    it('should normalize telegram_id to string', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                subscription: 'NEUROVIDEO',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await updateUserSubscriptionV2({
        telegram_id: '144022504',
        subscription_type: SubscriptionType.NEUROVIDEO,
      })

      expect(result.success).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('📋 Обновление подписки пользователя V2'),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })

    it('should validate all subscription types', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                subscription: 'NEUROBLOGGER',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      // Тестируем все типы подписок
      const subscriptionTypes = [
        SubscriptionType.NEUROPHOTO,
        SubscriptionType.NEUROTESTER,
        SubscriptionType.NEUROBLOGGER,
        SubscriptionType.NEUROVIDEO,
        SubscriptionType.STARS,
      ]

      for (const subscriptionType of subscriptionTypes) {
        const result = await updateUserSubscriptionV2({
          telegram_id: '144022504',
          subscription_type: subscriptionType,
        })

        expect(result.success).toBe(true)
      }
    })
  })

  describe('Cache Management', () => {
    it('should invalidate user cache after successful update', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                subscription: 'NEUROPHOTO',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      await updateUserSubscriptionV2({
        telegram_id: '144022504',
        subscription_type: SubscriptionType.NEUROPHOTO,
      })

      expect(mockInvalidateUserCache).toHaveBeenCalledWith('144022504')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('✅ Подписка успешно обновлена'),
        expect.objectContaining({
          telegram_id: '144022504',
          subscription_type: 'NEUROPHOTO',
        })
      )
    })

    it('should not invalidate cache when update fails', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      await updateUserSubscriptionV2({
        telegram_id: '999999999',
        subscription_type: SubscriptionType.NEUROPHOTO,
      })

      expect(mockInvalidateUserCache).not.toHaveBeenCalled()
    })
  })
})
