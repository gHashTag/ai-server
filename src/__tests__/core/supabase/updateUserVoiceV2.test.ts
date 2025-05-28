import {
  updateUserVoiceV2,
  invalidateUserCache,
} from '@/core/supabase/updateUserVoiceV2'
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

describe('updateUserVoiceV2', () => {
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
                voice_id_elevenlabs: 'test_voice_id',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await updateUserVoiceV2({
        telegram_id: '144022504',
        voice_id_elevenlabs: 'test_voice_id_123',
      })

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          '🎤 Обновление голосовых настроек пользователя V2'
        ),
        expect.objectContaining({
          telegram_id: '144022504',
          voice_id_elevenlabs: 'test_voice_id_123',
        })
      )
    })

    it('should reject empty telegram_id', async () => {
      await expect(
        updateUserVoiceV2({
          telegram_id: '',
          voice_id_elevenlabs: 'test_voice_id',
        })
      ).rejects.toThrow('Telegram ID должен содержать только цифры')
    })

    it('should reject empty voice_id_elevenlabs', async () => {
      await expect(
        updateUserVoiceV2({
          telegram_id: '144022504',
          voice_id_elevenlabs: '',
        })
      ).rejects.toThrow('Voice ID не может быть пустым')
    })

    it('should reject null parameters', async () => {
      await expect(
        updateUserVoiceV2({
          telegram_id: null as any,
          voice_id_elevenlabs: 'test_voice_id',
        })
      ).rejects.toThrow()

      await expect(
        updateUserVoiceV2({
          telegram_id: '144022504',
          voice_id_elevenlabs: null as any,
        })
      ).rejects.toThrow()
    })

    it('should reject undefined parameters', async () => {
      await expect(
        updateUserVoiceV2({
          telegram_id: undefined as any,
          voice_id_elevenlabs: 'test_voice_id',
        })
      ).rejects.toThrow()

      await expect(
        updateUserVoiceV2({
          telegram_id: '144022504',
          voice_id_elevenlabs: undefined as any,
        })
      ).rejects.toThrow()
    })
  })

  describe('updateUserVoiceV2 Function', () => {
    it('should successfully update user voice settings', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                voice_id_elevenlabs: 'new_voice_id_123',
                username: 'testuser',
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

      const result = await updateUserVoiceV2({
        telegram_id: '144022504',
        voice_id_elevenlabs: 'new_voice_id_123',
      })

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user!.voice_id_elevenlabs).toBe('new_voice_id_123')
      expect(mockSupabase.from).toHaveBeenCalledWith('users')
      expect(mockUpdate).toHaveBeenCalledWith({
        voice_id_elevenlabs: 'new_voice_id_123',
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

      const result = await updateUserVoiceV2({
        telegram_id: '999999999',
        voice_id_elevenlabs: 'test_voice_id',
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
        updateUserVoiceV2({
          telegram_id: '144022504',
          voice_id_elevenlabs: 'test_voice_id',
        })
      ).rejects.toThrow('Ошибка обновления голосовых настроек: Database error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Ошибка обновления голосовых настроек'),
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
        updateUserVoiceV2({
          telegram_id: '144022504',
          voice_id_elevenlabs: 'test_voice_id',
        })
      ).rejects.toThrow('Unexpected error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Неожиданная ошибка в updateUserVoiceV2'),
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
                voice_id_elevenlabs: 'test_voice_id',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await updateUserVoiceV2({
        telegram_id: '144022504',
        voice_id_elevenlabs: 'test_voice_id',
      })

      expect(result.success).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          '🎤 Обновление голосовых настроек пользователя V2'
        ),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })

    it('should validate voice_id format (ElevenLabs format)', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [
              {
                id: 1,
                telegram_id: '144022504',
                voice_id_elevenlabs: 'gPxfjvn7IXljXm1Tlb8o',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      // Тестируем с реальным форматом ElevenLabs voice_id
      const result = await updateUserVoiceV2({
        telegram_id: '144022504',
        voice_id_elevenlabs: 'gPxfjvn7IXljXm1Tlb8o',
      })

      expect(result.success).toBe(true)
      expect(result.user!.voice_id_elevenlabs).toBe('gPxfjvn7IXljXm1Tlb8o')
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
                voice_id_elevenlabs: 'new_voice_id',
              },
            ],
            error: null,
          }),
        }),
      })

      mockSupabase.from.mockReturnValue({
        update: mockUpdate,
      } as any)

      await updateUserVoiceV2({
        telegram_id: '144022504',
        voice_id_elevenlabs: 'new_voice_id',
      })

      expect(mockInvalidateUserCache).toHaveBeenCalledWith('144022504')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('✅ Голосовые настройки успешно обновлены'),
        expect.objectContaining({
          telegram_id: '144022504',
          voice_id_elevenlabs: 'new_voice_id',
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

      await updateUserVoiceV2({
        telegram_id: '999999999',
        voice_id_elevenlabs: 'test_voice_id',
      })

      expect(mockInvalidateUserCache).not.toHaveBeenCalled()
    })
  })
})
