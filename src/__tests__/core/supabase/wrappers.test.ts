import {
  getUserDataWrapper,
  updateUserVoiceWrapper,
  updateUserSubscriptionWrapper,
  getWrapperStats,
} from '@/core/supabase/wrappers'
import { SubscriptionType } from '@/interfaces/subscription.interface'

// Мокаем все зависимости перед импортами
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

// Мокаем V2 функции
jest.mock('@/core/supabase/getUserDataV2', () => ({
  getUserDataV2: jest.fn(),
}))

jest.mock('@/core/supabase/updateUserVoiceV2', () => ({
  updateUserVoiceV2: jest.fn(),
}))

jest.mock('@/core/supabase/updateUserSubscriptionV2', () => ({
  updateUserSubscriptionV2: jest.fn(),
}))

// Импортируем мокнутые функции
const { getUserDataV2 } = require('@/core/supabase/getUserDataV2')
const { updateUserVoiceV2 } = require('@/core/supabase/updateUserVoiceV2')
const {
  updateUserSubscriptionV2,
} = require('@/core/supabase/updateUserSubscriptionV2')
const { logger } = require('@/utils/logger')

describe('Wrapper Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // === getUserDataWrapper TESTS ===

  describe('getUserDataWrapper', () => {
    it('should successfully wrap getUserDataV2 and return compatible format', async () => {
      // Мокаем успешный ответ от getUserDataV2
      const mockUserData = {
        id: 1,
        telegram_id: '144022504',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        company: 'Test Company',
        position: 'Developer',
        designation: 'Senior',
        language_code: 'ru',
        level: 5,
        gender: 'male' as const,
        bot_name: 'test_bot',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      getUserDataV2.mockResolvedValue(mockUserData)

      const result = await getUserDataWrapper('144022504')

      expect(result).toEqual({
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        company: 'Test Company',
        position: 'Developer',
        designation: 'Senior',
      })

      expect(getUserDataV2).toHaveBeenCalledWith({
        telegram_id: '144022504',
        fields: [
          'username',
          'first_name',
          'last_name',
          'company',
          'position',
          'designation',
        ],
      })

      expect(logger.info).toHaveBeenCalledWith(
        '🔄 Wrapper: getUserData → getUserDataV2',
        expect.objectContaining({
          telegram_id: '144022504',
          wrapper_type: 'getUserData',
        })
      )
    })

    it('should throw error when user not found', async () => {
      getUserDataV2.mockResolvedValue(null)

      await expect(getUserDataWrapper('999999999')).rejects.toThrow(
        'Ошибка при получении данных пользователя: пользователь не найден'
      )

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в getUserDataWrapper:',
        expect.objectContaining({
          telegram_id: '999999999',
        })
      )
    })

    it('should handle getUserDataV2 errors', async () => {
      const mockError = new Error('Database connection failed')
      getUserDataV2.mockRejectedValue(mockError)

      await expect(getUserDataWrapper('144022504')).rejects.toThrow(
        'Database connection failed'
      )

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в getUserDataWrapper:',
        expect.objectContaining({
          error: 'Database connection failed',
          telegram_id: '144022504',
        })
      )
    })

    it('should handle null values in user data gracefully', async () => {
      const mockUserData = {
        id: 1,
        telegram_id: '144022504',
        username: null,
        first_name: null,
        last_name: null,
        company: null,
        position: null,
        designation: null,
        language_code: 'ru',
        level: 5,
        gender: 'male' as const,
        bot_name: 'test_bot',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      getUserDataV2.mockResolvedValue(mockUserData)

      const result = await getUserDataWrapper('144022504')

      expect(result).toEqual({
        username: null,
        first_name: null,
        last_name: null,
        company: null,
        position: null,
        designation: null,
      })
    })
  })

  // === updateUserVoiceWrapper TESTS ===

  describe('updateUserVoiceWrapper', () => {
    it('should successfully wrap updateUserVoiceV2', async () => {
      const mockResult = {
        success: true,
        user: {
          id: 1,
          telegram_id: '144022504',
          voice_id_elevenlabs: 'new_voice_id',
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      updateUserVoiceV2.mockResolvedValue(mockResult)

      await updateUserVoiceWrapper('144022504', 'new_voice_id')

      expect(updateUserVoiceV2).toHaveBeenCalledWith({
        telegram_id: '144022504',
        voice_id_elevenlabs: 'new_voice_id',
      })

      expect(logger.info).toHaveBeenCalledWith(
        '🔄 Wrapper: updateUserVoice → updateUserVoiceV2',
        expect.objectContaining({
          telegram_id: '144022504',
          voice_id_elevenlabs: 'new_voice_id',
          wrapper_type: 'updateUserVoice',
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        '✅ Wrapper: updateUserVoice успешно выполнен',
        expect.objectContaining({
          telegram_id: '144022504',
          voice_id_elevenlabs: 'new_voice_id',
        })
      )
    })

    it('should throw error when updateUserVoiceV2 fails', async () => {
      const mockResult = {
        success: false,
        user: null,
        error_message: 'Пользователь не найден',
      }

      updateUserVoiceV2.mockResolvedValue(mockResult)

      await expect(
        updateUserVoiceWrapper('999999999', 'test_voice_id')
      ).rejects.toThrow('Пользователь не найден')

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в updateUserVoiceWrapper:',
        expect.objectContaining({
          telegram_id: '999999999',
          voice_id_elevenlabs: 'test_voice_id',
        })
      )
    })

    it('should handle updateUserVoiceV2 exceptions', async () => {
      const mockError = new Error('Validation error')
      updateUserVoiceV2.mockRejectedValue(mockError)

      await expect(
        updateUserVoiceWrapper('144022504', 'invalid_voice_id')
      ).rejects.toThrow('Validation error')

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в updateUserVoiceWrapper:',
        expect.objectContaining({
          error: 'Validation error',
          telegram_id: '144022504',
          voice_id_elevenlabs: 'invalid_voice_id',
        })
      )
    })

    it('should handle success without error_message', async () => {
      const mockResult = {
        success: false,
        user: null,
        // error_message отсутствует
      }

      updateUserVoiceV2.mockResolvedValue(mockResult)

      await expect(
        updateUserVoiceWrapper('144022504', 'test_voice_id')
      ).rejects.toThrow('Ошибка обновления голосовых настроек')
    })
  })

  // === updateUserSubscriptionWrapper TESTS ===

  describe('updateUserSubscriptionWrapper', () => {
    it('should successfully wrap updateUserSubscriptionV2 with valid subscription type', async () => {
      const mockResult = {
        success: true,
        user: {
          id: 1,
          telegram_id: '144022504',
          subscription: 'NEUROPHOTO',
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      updateUserSubscriptionV2.mockResolvedValue(mockResult)

      await updateUserSubscriptionWrapper(
        '144022504',
        SubscriptionType.NEUROPHOTO
      )

      expect(updateUserSubscriptionV2).toHaveBeenCalledWith({
        telegram_id: '144022504',
        subscription_type: SubscriptionType.NEUROPHOTO,
      })

      expect(logger.info).toHaveBeenCalledWith(
        '🔄 Wrapper: updateUserSubscription → updateUserSubscriptionV2',
        expect.objectContaining({
          telegram_id: '144022504',
          subscription: SubscriptionType.NEUROPHOTO,
          wrapper_type: 'updateUserSubscription',
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        '✅ Wrapper: updateUserSubscription успешно выполнен',
        expect.objectContaining({
          telegram_id: '144022504',
          subscription: SubscriptionType.NEUROPHOTO,
        })
      )
    })

    it('should validate all subscription types', async () => {
      const mockResult = {
        success: true,
        user: {
          id: 1,
          telegram_id: '144022504',
          subscription: 'NEUROTESTER',
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      updateUserSubscriptionV2.mockResolvedValue(mockResult)

      // Тестируем все валидные типы подписок
      const validSubscriptions = [
        SubscriptionType.NEUROPHOTO,
        SubscriptionType.NEUROTESTER,
        SubscriptionType.NEUROBLOGGER,
        SubscriptionType.NEUROVIDEO,
        SubscriptionType.STARS,
      ]

      for (const subscription of validSubscriptions) {
        await updateUserSubscriptionWrapper('144022504', subscription)
        expect(updateUserSubscriptionV2).toHaveBeenCalledWith({
          telegram_id: '144022504',
          subscription_type: subscription,
        })
      }
    })

    it('should reject invalid subscription type', async () => {
      await expect(
        updateUserSubscriptionWrapper('144022504', 'INVALID_SUBSCRIPTION')
      ).rejects.toThrow('Недопустимый тип подписки: INVALID_SUBSCRIPTION')

      expect(updateUserSubscriptionV2).not.toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в updateUserSubscriptionWrapper:',
        expect.objectContaining({
          error: 'Недопустимый тип подписки: INVALID_SUBSCRIPTION',
          telegram_id: '144022504',
          subscription: 'INVALID_SUBSCRIPTION',
        })
      )
    })

    it('should throw error when updateUserSubscriptionV2 fails', async () => {
      const mockResult = {
        success: false,
        user: null,
        error_message: 'Пользователь не найден',
      }

      updateUserSubscriptionV2.mockResolvedValue(mockResult)

      await expect(
        updateUserSubscriptionWrapper('999999999', SubscriptionType.NEUROPHOTO)
      ).rejects.toThrow('Пользователь не найден')

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в updateUserSubscriptionWrapper:',
        expect.objectContaining({
          telegram_id: '999999999',
          subscription: SubscriptionType.NEUROPHOTO,
        })
      )
    })

    it('should handle updateUserSubscriptionV2 exceptions', async () => {
      const mockError = new Error('Database error')
      updateUserSubscriptionV2.mockRejectedValue(mockError)

      await expect(
        updateUserSubscriptionWrapper('144022504', SubscriptionType.NEUROPHOTO)
      ).rejects.toThrow('Database error')

      expect(logger.error).toHaveBeenCalledWith(
        '❌ Ошибка в updateUserSubscriptionWrapper:',
        expect.objectContaining({
          error: 'Database error',
          telegram_id: '144022504',
          subscription: SubscriptionType.NEUROPHOTO,
        })
      )
    })

    it('should handle success without error_message', async () => {
      const mockResult = {
        success: false,
        user: null,
        // error_message отсутствует
      }

      updateUserSubscriptionV2.mockResolvedValue(mockResult)

      await expect(
        updateUserSubscriptionWrapper('144022504', SubscriptionType.NEUROPHOTO)
      ).rejects.toThrow('Ошибка обновления подписки')
    })
  })

  // === getWrapperStats TESTS ===

  describe('getWrapperStats', () => {
    it('should return correct wrapper statistics', () => {
      const stats = getWrapperStats()

      expect(stats).toEqual({
        available_wrappers: [
          'getUserDataWrapper',
          'updateUserVoiceWrapper',
          'updateUserSubscriptionWrapper',
        ],
        description: 'Wrapper функции для обратной совместимости V1 → V2',
        migration_status: 'Готовы к использованию',
      })
    })

    it('should have correct number of available wrappers', () => {
      const stats = getWrapperStats()
      expect(stats.available_wrappers).toHaveLength(3)
    })
  })
})
