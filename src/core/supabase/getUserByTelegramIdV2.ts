import { z } from 'zod'
import { supabase } from '.'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'

// Схема для валидации ответа пользователя (адаптированная для Supabase)
export const userResponseSchema = z.object({
  id: z.number().int(),
  telegram_id: z.string(),
  username: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  language_code: z.string().nullable(),
  level: z.number().int().nullable(),
  gender: z.string().nullable(),
  bot_name: z.string().nullable(),
  created_at: z.string(), // Supabase возвращает даты как строки
  updated_at: z.string(), // Supabase возвращает даты как строки
})

// Тип для ответа функции
export type UserResponse = z.infer<typeof userResponseSchema> | null

// Кэш для хранения данных пользователей
type UserCache = {
  [key: string]: {
    user: UserResponse
    timestamp: number
  }
}

// Время жизни кэша пользователя в миллисекундах (5 минут)
const USER_CACHE_TTL = 5 * 60 * 1000

// Кэш пользователей
const userCache: UserCache = {}

/**
 * Получает пользователя по Telegram ID
 * Улучшенная версия с кэшированием, Zod валидацией и лучшей обработкой ошибок
 */
export const getUserByTelegramIdV2 = async (
  telegram_id: string
): Promise<UserResponse> => {
  try {
    // Валидация входного параметра
    const validatedTelegramId = telegramIdSchema.parse(telegram_id)

    const cacheKey = validatedTelegramId
    const now = Date.now()

    // Проверяем кэш
    if (
      userCache[cacheKey] &&
      now - userCache[cacheKey].timestamp < USER_CACHE_TTL
    ) {
      logger.info('💾 Получение пользователя из кэша:', {
        description: 'Getting user from cache',
        telegram_id: validatedTelegramId,
      })
      return userCache[cacheKey].user
    }

    logger.info('👤 Получение пользователя по Telegram ID V2:', {
      description: 'Getting user by Telegram ID from database',
      telegram_id: validatedTelegramId,
    })

    // Выполняем запрос к Supabase
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', validatedTelegramId.toString())
      .single()

    if (error) {
      // Если пользователь не найден, возвращаем null
      if (error.code === 'PGRST116') {
        logger.info('👤 Пользователь не найден:', {
          description: 'User not found',
          telegram_id: validatedTelegramId,
        })

        // Кэшируем результат (null)
        userCache[cacheKey] = {
          user: null,
          timestamp: now,
        }

        return null
      }

      logger.error('❌ Ошибка получения пользователя:', {
        description: 'Error getting user by Telegram ID',
        error: error.message,
        telegram_id: validatedTelegramId,
      })
      throw new Error(`Ошибка получения пользователя: ${error.message}`)
    }

    if (!data) {
      userCache[cacheKey] = {
        user: null,
        timestamp: now,
      }
      return null
    }

    // Валидируем ответ через Zod
    const validatedUser = userResponseSchema.parse(data)

    // Сохраняем результат в кэш
    userCache[cacheKey] = {
      user: validatedUser,
      timestamp: now,
    }

    logger.info('✅ Пользователь получен и кэширован:', {
      description: 'User retrieved and cached',
      telegram_id: validatedTelegramId,
      user_id: validatedUser.id,
    })

    return validatedUser
  } catch (error) {
    logger.error('❌ Неожиданная ошибка в getUserByTelegramIdV2:', {
      description: 'Unexpected error in getUserByTelegramIdV2',
      error: error instanceof Error ? error.message : String(error),
      telegram_id,
    })
    throw error
  }
}

/**
 * Инвалидирует кэш пользователя для указанного Telegram ID
 */
export const invalidateUserCache = (telegram_id: string): void => {
  const cacheKey = telegram_id

  if (userCache[cacheKey]) {
    delete userCache[cacheKey]
    logger.info('🔄 Кэш пользователя инвалидирован:', {
      description: 'User cache invalidated',
      telegram_id,
    })
  }
}

/**
 * Очищает весь кэш пользователей
 * Полезно для тестирования или при необходимости полной очистки
 */
export const clearUserCache = (): void => {
  Object.keys(userCache).forEach(key => delete userCache[key])
  logger.info('🧹 Весь кэш пользователей очищен:', {
    description: 'All user cache cleared',
  })
}

/**
 * Получает статистику кэша пользователей
 * Полезно для мониторинга и отладки
 */
export const getUserCacheStats = () => {
  const now = Date.now()
  const totalEntries = Object.keys(userCache).length
  const validEntries = Object.values(userCache).filter(
    entry => now - entry.timestamp < USER_CACHE_TTL
  ).length
  const expiredEntries = totalEntries - validEntries

  return {
    total: totalEntries,
    valid: validEntries,
    expired: expiredEntries,
    ttl_ms: USER_CACHE_TTL,
  }
}
