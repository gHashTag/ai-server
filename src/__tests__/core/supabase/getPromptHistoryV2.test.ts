import {
  getPromptHistoryV2,
  clearPromptHistoryCache,
} from '@/core/supabase/getPromptHistoryV2'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { ModeEnum } from '@/interfaces/modes'

// Мокаем зависимости
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

// Типы для моков
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

describe('getPromptHistoryV2', () => {
  // Очищаем моки и кэш перед каждым тестом
  beforeEach(() => {
    jest.clearAllMocks()
    clearPromptHistoryCache()
  })

  // === ZOD SCHEMA VALIDATION TESTS ===

  describe('Zod Schema Validation', () => {
    it('should validate correct parameters', async () => {
      // Мокаем успешный ответ
      const mockData = [
        {
          prompt_id: 1,
          prompt: 'Test prompt',
          model_type: 'test-model',
          mode: 'NeuroPhoto',
          media_url: 'https://example.com/image.jpg',
          telegram_id: '144022504',
          status: 'SUCCESS',
          task_id: 'task123',
          created_at: '2025-01-27T10:00:00Z',
          updated_at: '2025-01-27T10:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      const result = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.prompts).toHaveLength(1)
      expect(result.prompts![0].prompt_id).toBe(1)
    })

    it('should reject empty telegram_id', async () => {
      await expect(
        getPromptHistoryV2({
          telegram_id: '',
          limit: 10,
        })
      ).rejects.toThrow()
    })

    it('should reject invalid limit (too low)', async () => {
      await expect(
        getPromptHistoryV2({
          telegram_id: '144022504',
          limit: 0,
        })
      ).rejects.toThrow()
    })

    it('should reject invalid limit (too high)', async () => {
      await expect(
        getPromptHistoryV2({
          telegram_id: '144022504',
          limit: 101,
        })
      ).rejects.toThrow()
    })

    it('should handle null and undefined parameters', async () => {
      await expect(
        getPromptHistoryV2({
          telegram_id: null as any,
          limit: 10,
        })
      ).rejects.toThrow()

      await expect(
        getPromptHistoryV2({
          telegram_id: undefined as any,
          limit: 10,
        })
      ).rejects.toThrow()
    })
  })

  // === GETPROMPHISTORYV2 FUNCTION TESTS ===

  describe('getPromptHistoryV2 Function', () => {
    it('should successfully retrieve prompt history', async () => {
      const mockData = [
        {
          prompt_id: 1,
          prompt: 'Beautiful landscape',
          model_type: 'flux-dev',
          mode: 'NeuroPhoto',
          media_url: 'https://example.com/image1.jpg',
          telegram_id: '144022504',
          status: 'SUCCESS',
          task_id: 'task123',
          created_at: '2025-01-27T10:00:00Z',
          updated_at: '2025-01-27T10:00:00Z',
        },
        {
          prompt_id: 2,
          prompt: 'Portrait photo',
          model_type: 'flux-dev',
          mode: 'NeuroPhotoV2',
          media_url: 'https://example.com/image2.jpg',
          telegram_id: '144022504',
          status: 'SUCCESS',
          task_id: 'task456',
          created_at: '2025-01-27T09:00:00Z',
          updated_at: '2025-01-27T09:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      const result = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.prompts).toHaveLength(2)
      expect(result.prompts![0].prompt).toBe('Beautiful landscape')
      expect(result.prompts![1].prompt).toBe('Portrait photo')
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('📋 Получение истории промптов V2:'),
        expect.objectContaining({
          telegram_id: '144022504',
          limit: 10,
        })
      )
    })

    it('should return empty array when no prompts found', async () => {
      mockSupabase.from.mockReturnValue(createMockQuery([]) as any)

      const result = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result.success).toBe(true)
      expect(result.prompts).toEqual([])
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️ История промптов пуста:'),
        expect.objectContaining({
          telegram_id: '144022504',
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const mockError = {
        message: 'Database connection failed',
        code: 'PGRST301',
      }

      mockSupabase.from.mockReturnValue(createMockQuery(null, mockError) as any)

      await expect(
        getPromptHistoryV2({
          telegram_id: '144022504',
          limit: 10,
        })
      ).rejects.toThrow(
        'Ошибка получения истории промптов: Database connection failed'
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Ошибка получения истории промптов:'),
        expect.objectContaining({
          error: 'Database connection failed',
          error_code: 'PGRST301',
          telegram_id: '144022504',
        })
      )
    })

    it('should handle unexpected errors', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await expect(
        getPromptHistoryV2({
          telegram_id: '144022504',
          limit: 10,
        })
      ).rejects.toThrow('Unexpected error')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ Неожиданная ошибка в getPromptHistoryV2:'),
        expect.objectContaining({
          error: 'Unexpected error',
          telegram_id: '144022504',
        })
      )
    })

    it('should filter by mode when specified', async () => {
      const mockData = [
        {
          prompt_id: 1,
          prompt: 'NeuroPhoto prompt',
          model_type: 'flux-dev',
          mode: 'NeuroPhoto',
          media_url: 'https://example.com/image1.jpg',
          telegram_id: '144022504',
          status: 'SUCCESS',
          task_id: 'task123',
          created_at: '2025-01-27T10:00:00Z',
          updated_at: '2025-01-27T10:00:00Z',
        },
      ]

      const mockQuery = createMockQuery(mockData)
      mockSupabase.from.mockReturnValue(mockQuery as any)

      const result = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
        mode: ModeEnum.NeuroPhoto,
      })

      expect(result.success).toBe(true)
      expect(result.prompts).toHaveLength(1)
      expect(result.prompts![0].mode).toBe('NeuroPhoto')

      // Проверяем, что был добавлен фильтр по mode
      const mockSelect = mockQuery.select()
      expect(mockSelect.eq).toHaveBeenCalledWith('mode', ModeEnum.NeuroPhoto)
    })

    it('should filter by status when specified', async () => {
      const mockData = [
        {
          prompt_id: 1,
          prompt: 'Successful prompt',
          model_type: 'flux-dev',
          mode: 'NeuroPhoto',
          media_url: 'https://example.com/image1.jpg',
          telegram_id: '144022504',
          status: 'SUCCESS',
          task_id: 'task123',
          created_at: '2025-01-27T10:00:00Z',
          updated_at: '2025-01-27T10:00:00Z',
        },
      ]

      const mockQuery = createMockQuery(mockData)
      mockSupabase.from.mockReturnValue(mockQuery as any)

      const result = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
        status: 'SUCCESS',
      })

      expect(result.success).toBe(true)
      expect(result.prompts).toHaveLength(1)
      expect(result.prompts![0].status).toBe('SUCCESS')

      // Проверяем, что был добавлен фильтр по status
      const mockSelect = mockQuery.select()
      expect(mockSelect.eq).toHaveBeenCalledWith('status', 'SUCCESS')
    })

    it('should use default limit when not specified', async () => {
      const mockData = []

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      const result = await getPromptHistoryV2({
        telegram_id: '144022504',
      })

      expect(result.success).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('📋 Получение истории промптов V2:'),
        expect.objectContaining({
          telegram_id: '144022504',
          limit: 10, // default value
        })
      )
    })
  })

  // === CACHE MANAGEMENT TESTS ===

  describe('Cache Management', () => {
    it('should use cached data when available', async () => {
      const mockData = [
        {
          prompt_id: 1,
          prompt: 'Cached prompt',
          model_type: 'flux-dev',
          mode: 'NeuroPhoto',
          media_url: 'https://example.com/image1.jpg',
          telegram_id: '144022504',
          status: 'SUCCESS',
          task_id: 'task123',
          created_at: '2025-01-27T10:00:00Z',
          updated_at: '2025-01-27T10:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue(createMockQuery(mockData) as any)

      // Первый вызов - должен обратиться к БД
      const result1 = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result1.success).toBe(true)
      expect(result1.prompts).toHaveLength(1)

      // Второй вызов - должен использовать кэш
      const result2 = await getPromptHistoryV2({
        telegram_id: '144022504',
        limit: 10,
      })

      expect(result2.success).toBe(true)
      expect(result2.prompts).toHaveLength(1)

      // Проверяем, что БД была вызвана только один раз
      expect(mockSupabase.from).toHaveBeenCalledTimes(1)

      // Проверяем логи кэша
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('💾 Получение истории промптов из кэша:'),
        expect.objectContaining({
          telegram_id: '144022504',
          cached_count: 1,
        })
      )
    })
  })
})
