import {
  getUserByTelegramIdV2,
  invalidateUserCache,
} from '@/core/supabase/getUserByTelegramIdV2'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'

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

describe('getUserByTelegramIdV2', () => {
  // Мок данных пользователя
  const mockUserData = {
    id: 1,
    telegram_id: '144022504',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    language_code: 'ru',
    level: 5,
    gender: 'male',
    bot_name: 'ai_koshey_bot',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Очищаем кэш перед каждым тестом
    invalidateUserCache('144022504')
  })

  describe('Zod Schema Validation', () => {
    it('should validate correct telegram_id', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await getUserByTelegramIdV2('144022504')

      expect(result).toEqual(mockUserData)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('👤 Получение пользователя по Telegram ID V2'),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })

    it('should reject empty telegram_id', async () => {
      await expect(getUserByTelegramIdV2('')).rejects.toThrow(
        'Telegram ID должен содержать только цифры'
      )
    })

    it('should reject null telegram_id', async () => {
      await expect(getUserByTelegramIdV2(null as any)).rejects.toThrow()
    })

    it('should reject undefined telegram_id', async () => {
      await expect(getUserByTelegramIdV2(undefined as any)).rejects.toThrow()
    })
  })

  describe('getUserByTelegramIdV2 Function', () => {
    it('should return user data when user exists', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await getUserByTelegramIdV2('144022504')

      expect(result).toEqual(mockUserData)
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockSelect).toHaveBeenCalledWith('*')
    })

    it('should return null when user does not exist (PGRST116)', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'No rows returned' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      const result = await getUserByTelegramIdV2('999999999')

      expect(result).toBeNull()
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('👤 Пользователь не найден'),
        expect.objectContaining({
          telegram_id: '999999999',
        })
      )
    })

    it('should throw error for database errors', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      await expect(getUserByTelegramIdV2('144022504')).rejects.toThrow(
        'Ошибка получения пользователя: Database error'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Ошибка получения пользователя'),
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

      await expect(getUserByTelegramIdV2('144022504')).rejects.toThrow(
        'Unexpected error'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          '❌ Неожиданная ошибка в getUserByTelegramIdV2'
        ),
        expect.objectContaining({
          error: 'Unexpected error',
          telegram_id: '144022504',
        })
      )
    })

    it('should use cache on second call', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      // Первый вызов - должен обратиться к БД
      const result1 = await getUserByTelegramIdV2('144022504')
      expect(result1).toEqual(mockUserData)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)

      // Второй вызов - должен использовать кэш
      const result2 = await getUserByTelegramIdV2('144022504')
      expect(result2).toEqual(mockUserData)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1) // Не должен вызываться повторно
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('💾 Получение пользователя из кэша'),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })

    it('should normalize telegram_id to string', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      // Передаем число, должно нормализоваться в строку
      const result = await getUserByTelegramIdV2('144022504')

      expect(result).toEqual(mockUserData)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('👤 Получение пользователя по Telegram ID V2'),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })
  })

  describe('Cache Management', () => {
    it('should invalidate cache correctly', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockUserData,
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      } as any)

      // Первый вызов
      await getUserByTelegramIdV2('144022504')
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)

      // Инвалидируем кэш
      invalidateUserCache('144022504')

      // Второй вызов после инвалидации - должен снова обратиться к БД
      await getUserByTelegramIdV2('144022504')
      expect(mockSupabase.from).toHaveBeenCalledTimes(2)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('🔄 Кэш пользователя инвалидирован'),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })
  })
})
