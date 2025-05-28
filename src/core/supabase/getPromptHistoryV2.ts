import { z } from 'zod'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { telegramIdSchema } from '@/schemas/common/base.schemas'
import { ModeEnum } from '@/interfaces/modes'

// === ZOD SCHEMAS ===

/**
 * Схема для валидации параметров получения истории промптов
 */
export const getPromptHistoryParamsSchema = z.object({
  telegram_id: telegramIdSchema,
  limit: z.number().int().min(1).max(100).optional(),
  mode: z.nativeEnum(ModeEnum).optional(),
  status: z.string().optional(),
})

/**
 * Схема для валидации элемента истории промптов
 * Адаптирована для работы с Supabase (строковые даты)
 */
export const promptHistoryItemSchema = z.object({
  prompt_id: z.number(),
  prompt: z.string(),
  model_type: z.string(),
  mode: z.string(),
  media_url: z.string().nullable(),
  telegram_id: z.string(),
  status: z.string().nullable(),
  task_id: z.string().nullable(),
  created_at: z.string(), // Supabase возвращает даты как строки
  updated_at: z.string().nullable(),
})

/**
 * Схема для валидации результата получения истории промптов
 */
export const getPromptHistoryResultSchema = z.object({
  success: z.boolean(),
  prompts: z.array(promptHistoryItemSchema).optional(),
  error: z.string().optional(),
})

// === TYPES ===

export type GetPromptHistoryParams = z.infer<
  typeof getPromptHistoryParamsSchema
>
export type PromptHistoryItem = z.infer<typeof promptHistoryItemSchema>
export type GetPromptHistoryResult = z.infer<
  typeof getPromptHistoryResultSchema
>

// === CACHE MANAGEMENT ===

type PromptHistoryCache = {
  [key: string]: {
    prompts: PromptHistoryItem[]
    timestamp: number
  }
}

// Время жизни кэша истории промптов в миллисекундах (2 минуты)
const PROMPT_HISTORY_CACHE_TTL = 2 * 60 * 1000

// Кэш истории промптов
const promptHistoryCache: PromptHistoryCache = {}

// === MAIN FUNCTION ===

/**
 * Получает историю промптов пользователя
 * Современная версия с Zod валидацией, кэшированием и фильтрацией
 *
 * @param params - Параметры получения истории промптов
 * @returns Результат операции с массивом промптов
 */
export const getPromptHistoryV2 = async (
  params: GetPromptHistoryParams
): Promise<GetPromptHistoryResult> => {
  try {
    // Валидация входных параметров
    const validatedParams = getPromptHistoryParamsSchema.parse(params)
    const limit = validatedParams.limit || 10

    logger.info('📋 Получение истории промптов V2:', {
      telegram_id: validatedParams.telegram_id,
      limit,
      mode: validatedParams.mode,
      status: validatedParams.status,
    })

    // Проверяем кэш
    const cacheKey = `${validatedParams.telegram_id}_${limit}_${
      validatedParams.mode || 'all'
    }_${validatedParams.status || 'all'}`
    const now = Date.now()

    if (
      promptHistoryCache[cacheKey] &&
      now - promptHistoryCache[cacheKey].timestamp < PROMPT_HISTORY_CACHE_TTL
    ) {
      logger.info('💾 Получение истории промптов из кэша:', {
        telegram_id: validatedParams.telegram_id,
        cache_key: cacheKey,
        cached_count: promptHistoryCache[cacheKey].prompts.length,
      })
      return {
        success: true,
        prompts: promptHistoryCache[cacheKey].prompts,
      }
    }

    // Строим запрос к базе данных
    let query = supabase
      .from('prompts_history')
      .select(
        'prompt_id, prompt, model_type, mode, media_url, telegram_id, status, task_id, created_at, updated_at'
      )
      .eq('telegram_id', validatedParams.telegram_id)

    // Добавляем фильтры если они указаны
    if (validatedParams.mode) {
      query = query.eq('mode', validatedParams.mode)
    }

    if (validatedParams.status) {
      query = query.eq('status', validatedParams.status)
    }

    // Выполняем запрос
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('❌ Ошибка получения истории промптов:', {
        error: error.message,
        error_code: error.code,
        telegram_id: validatedParams.telegram_id,
        limit,
      })
      throw new Error(`Ошибка получения истории промптов: ${error.message}`)
    }

    // Проверяем, есть ли данные
    if (!data || data.length === 0) {
      logger.info('ℹ️ История промптов пуста:', {
        telegram_id: validatedParams.telegram_id,
        limit,
        mode: validatedParams.mode,
        status: validatedParams.status,
      })
      return {
        success: true,
        prompts: [],
      }
    }

    // Валидируем каждый промпт
    const validatedPrompts = data.map(prompt =>
      promptHistoryItemSchema.parse(prompt)
    )

    // Сохраняем в кэш
    promptHistoryCache[cacheKey] = {
      prompts: validatedPrompts,
      timestamp: now,
    }

    logger.info('✅ История промптов получена и кэширована:', {
      telegram_id: validatedParams.telegram_id,
      prompts_count: validatedPrompts.length,
      limit,
      mode: validatedParams.mode,
      status: validatedParams.status,
    })

    return {
      success: true,
      prompts: validatedPrompts,
    }
  } catch (error) {
    logger.error('❌ Неожиданная ошибка в getPromptHistoryV2:', {
      error: error instanceof Error ? error.message : String(error),
      telegram_id: params.telegram_id,
      limit: params.limit,
    })
    throw error
  }
}

// === CACHE MANAGEMENT FUNCTIONS ===

/**
 * Инвалидирует кэш истории промптов для указанного пользователя
 */
export const invalidatePromptHistoryCache = (telegram_id: string): void => {
  const keysToDelete = Object.keys(promptHistoryCache).filter(key =>
    key.startsWith(`${telegram_id}_`)
  )

  keysToDelete.forEach(key => {
    delete promptHistoryCache[key]
  })

  if (keysToDelete.length > 0) {
    logger.info('🔄 Кэш истории промптов инвалидирован:', {
      telegram_id,
      invalidated_keys: keysToDelete.length,
    })
  }
}

/**
 * Очищает весь кэш истории промптов
 */
export const clearPromptHistoryCache = (): void => {
  const keysCount = Object.keys(promptHistoryCache).length
  Object.keys(promptHistoryCache).forEach(key => {
    delete promptHistoryCache[key]
  })

  logger.info('🧹 Кэш истории промптов полностью очищен:', {
    cleared_keys: keysCount,
  })
}

/**
 * Получает статистику кэша истории промптов
 */
export const getPromptHistoryCacheStats = () => {
  const now = Date.now()
  const totalEntries = Object.keys(promptHistoryCache).length
  const validEntries = Object.values(promptHistoryCache).filter(
    entry => now - entry.timestamp < PROMPT_HISTORY_CACHE_TTL
  ).length
  const expiredEntries = totalEntries - validEntries

  return {
    total: totalEntries,
    valid: validEntries,
    expired: expiredEntries,
    ttl_ms: PROMPT_HISTORY_CACHE_TTL,
  }
}

// === WRAPPER FUNCTION FOR BACKWARD COMPATIBILITY ===

/**
 * Упрощенная версия для обратной совместимости
 * Возвращает только массив промптов или null при ошибке
 */
export const getPromptHistorySimple = async (
  telegram_id: string,
  limit = 10,
  mode?: ModeEnum,
  status?: string
): Promise<PromptHistoryItem[] | null> => {
  try {
    const result = await getPromptHistoryV2({
      telegram_id,
      limit,
      mode,
      status,
    })

    return result.success ? result.prompts || [] : null
  } catch (error) {
    logger.error('❌ Ошибка в getPromptHistorySimple:', {
      error: error instanceof Error ? error.message : String(error),
      telegram_id,
      limit,
    })
    return null
  }
}
