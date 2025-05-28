import {
  getUserDataV2,
  getUserDataParamsSchema,
  userDataResponseSchema,
  getUserDataSimple,
  type UserField,
} from '@/core/supabase/getUserDataV2'

// Мокаем зависимости для Jest
jest.mock('@/core/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => {
            // Возвращаем данные на основе telegram_id
            return Promise.resolve({
              data: {
                id: 1,
                telegram_id: '144022504',
                username: 'test_user',
                first_name: 'Test',
                last_name: 'User',
                language_code: 'ru',
                level: 5,
                gender: 'male',
                bot_name: 'neuro_blogger_bot',
                created_at: '2024-01-01T00:00:00Z',
                updated_at: '2024-01-01T00:00:00Z',
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

describe('getUserDataV2', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Zod Schema Validation', () => {
    it('должен валидировать корректные параметры запроса', () => {
      const validParams = {
        telegram_id: '144022504',
        fields: ['username', 'first_name', 'last_name'] as UserField[],
      }

      const result = getUserDataParamsSchema.safeParse(validParams)
      expect(result.success).toBe(true)
    })

    it('должен применять значения по умолчанию для полей', () => {
      const minimalParams = {
        telegram_id: '144022504',
      }

      const result = getUserDataParamsSchema.parse(minimalParams)
      expect(result.fields).toEqual([
        'username',
        'first_name',
        'last_name',
        'company',
        'position',
        'designation',
      ])
    })

    it('должен отклонять пустой telegram_id', () => {
      const invalidParams = {
        telegram_id: '', // Пустой telegram_id
      }

      const result = getUserDataParamsSchema.safeParse(invalidParams)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('только цифры')
      }
    })

    it('должен валидировать схему ответа пользователя', () => {
      const validResponse = {
        id: 1,
        telegram_id: '144022504',
        username: 'test_user',
        first_name: 'Test',
        last_name: 'User',
        language_code: 'ru',
        level: 5,
        gender: 'male',
        bot_name: 'neuro_blogger_bot',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = userDataResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('getUserDataV2 Function', () => {
    it('должен успешно получать данные пользователя', async () => {
      const params = {
        telegram_id: '144022504',
      }

      const result = await getUserDataV2(params)

      expect(result).toBeDefined()
      expect(result!.telegram_id).toBe('144022504')
      expect(result!.username).toBe('test_user')
      expect(result!.first_name).toBe('Test')
      expect(result!.last_name).toBe('User')
      expect(result!.level).toBe(5)
      expect(result!.gender).toBe('male')
    })

    it('должен получать только запрошенные поля', async () => {
      const params = {
        telegram_id: '144022504',
        fields: ['username', 'first_name'] as UserField[],
      }

      const result = await getUserDataV2(params)

      expect(result).toBeDefined()
      expect(result!.username).toBe('test_user')
      expect(result!.first_name).toBe('Test')
      // Другие поля должны быть undefined или null
    })

    it('должен выбрасывать ошибку при невалидных параметрах', async () => {
      const invalidParams = {
        telegram_id: '', // Пустой telegram_id
      }

      await expect(getUserDataV2(invalidParams)).rejects.toThrow(
        'Ошибка валидации'
      )
    })

    it('должен корректно обрабатывать отсутствующего пользователя', async () => {
      // Мокаем ошибку "пользователь не найден"
      const mockSupabase = require('@/core/supabase').supabase
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() =>
              Promise.resolve({
                data: null,
                error: { code: 'PGRST116', message: 'No rows returned' },
              })
            ),
          })),
        })),
      })

      const params = {
        telegram_id: '999999999',
      }

      const result = await getUserDataV2(params)
      expect(result).toBeNull()
    })

    it('должен корректно обрабатывать все поля пользователя', async () => {
      const params = {
        telegram_id: '144022504',
        fields: [
          'id',
          'telegram_id',
          'username',
          'first_name',
          'last_name',
          'language_code',
          'level',
          'gender',
          'bot_name',
          'created_at',
          'updated_at',
        ] as UserField[],
      }

      const result = await getUserDataV2(params)

      expect(result).toBeDefined()
      expect(result!.id).toBe(1)
      expect(result!.telegram_id).toBe('144022504')
      expect(result!.level).toBe(5)
      expect(result!.gender).toBe('male')
      expect(result!.bot_name).toBe('neuro_blogger_bot')
      expect(result!.created_at).toBe('2024-01-01T00:00:00Z')
    })
  })

  describe('getUserDataSimple Function', () => {
    it('должен получать данные с упрощенными параметрами', async () => {
      const result = await getUserDataSimple('144022504')

      expect(result).toBeDefined()
      expect(result!.telegram_id).toBe('144022504')
      expect(result!.username).toBe('test_user')
      expect(result!.first_name).toBe('Test')
    })

    it('должен получать данные с кастомными полями', async () => {
      const result = await getUserDataSimple('144022504', [
        'username',
        'level',
        'gender',
      ])

      expect(result).toBeDefined()
      expect(result!.username).toBe('test_user')
      expect(result!.level).toBe(5)
      expect(result!.gender).toBe('male')
    })
  })

  describe('Error Handling', () => {
    it('должен корректно обрабатывать ошибки Supabase', async () => {
      // Мокаем ошибку Supabase
      const mockSupabase = require('@/core/supabase').supabase
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
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
      }

      await expect(getUserDataV2(params)).rejects.toThrow(
        'Ошибка получения данных пользователя'
      )
    })
  })

  describe('Type Safety', () => {
    it('должен иметь правильные TypeScript типы', () => {
      // Этот тест проверяет типы на этапе компиляции
      const validParams: Parameters<typeof getUserDataV2>[0] = {
        telegram_id: '144022504',
        fields: ['username', 'first_name'] as UserField[],
      }

      expect(validParams).toBeDefined()
    })
  })
})
