import { logger } from '@/utils/logger'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number // Базовая задержка в мс
  maxDelay: number // Максимальная задержка в мс
  exponentialBase: number // Основание для экспоненциального роста
  jitter: boolean // Добавлять случайность к задержке
  retryCondition?: (error: any) => boolean // Условие для повтора
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: Error
  attempts: number
  totalTime: number
  lastAttemptTime: number
}

export class RetryMechanism {
  private static defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    exponentialBase: 2,
    jitter: true,
    retryCondition: (error: any) => {
      // По умолчанию повторяем для сетевых ошибок и временных сбоев
      if (error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND')
        return true
      if (error?.response?.status >= 500) return true // Серверные ошибки
      if (error?.response?.status === 429) return true // Rate limiting
      if (error?.response?.status === 408) return true // Request timeout
      return false
    },
  }

  static async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig = { ...this.defaultConfig, ...config }
    const startTime = Date.now()
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        logger.debug('🔄 Retry attempt', {
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          operation: operation.name || 'anonymous',
        })

        const result = await operation()

        const totalTime = Date.now() - startTime
        logger.debug('✅ Retry success', {
          attempt,
          totalTime,
          operation: operation.name || 'anonymous',
        })

        return {
          success: true,
          result,
          attempts: attempt,
          totalTime,
          lastAttemptTime: Date.now(),
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        logger.warn('⚠️ Retry attempt failed', {
          attempt,
          maxAttempts: finalConfig.maxAttempts,
          error: lastError.message,
          operation: operation.name || 'anonymous',
        })

        // Проверяем, стоит ли повторять
        if (
          attempt === finalConfig.maxAttempts ||
          !finalConfig.retryCondition?.(error)
        ) {
          break
        }

        // Вычисляем задержку
        const delay = this.calculateDelay(attempt, finalConfig)
        logger.debug('⏳ Retry delay', {
          attempt,
          delay,
          operation: operation.name || 'anonymous',
        })

        await this.sleep(delay)
      }
    }

    const totalTime = Date.now() - startTime
    logger.error('❌ Retry failed after all attempts', {
      attempts: finalConfig.maxAttempts,
      totalTime,
      lastError: lastError?.message,
      operation: operation.name || 'anonymous',
    })

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalTime,
      lastAttemptTime: Date.now(),
    }
  }

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Экспоненциальная задержка
    let delay = config.baseDelay * Math.pow(config.exponentialBase, attempt - 1)

    // Ограничиваем максимальной задержкой
    delay = Math.min(delay, config.maxDelay)

    // Добавляем jitter для избежания thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }

    return Math.floor(delay)
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Предконфигурированные retry механизмы для разных типов операций
export const retryConfigs = {
  // Для внешних API (более агрессивные повторы)
  externalAPI: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitter: true,
    retryCondition: (error: any) => {
      // Повторяем для сетевых ошибок и серверных проблем
      if (error?.code === 'ECONNRESET') return true
      if (error?.code === 'ENOTFOUND') return true
      if (error?.code === 'ETIMEDOUT') return true
      if (error?.response?.status >= 500) return true
      if (error?.response?.status === 429) return true
      if (error?.response?.status === 408) return true
      if (error?.response?.status === 502) return true
      if (error?.response?.status === 503) return true
      if (error?.response?.status === 504) return true
      return false
    },
  },

  // Для базы данных (быстрые повторы)
  database: {
    maxAttempts: 5,
    baseDelay: 500,
    maxDelay: 5000,
    exponentialBase: 1.5,
    jitter: true,
    retryCondition: (error: any) => {
      // Повторяем только для временных проблем БД
      if (error?.code === 'PGRST301') return true // Connection lost
      if (error?.code === 'PGRST302') return true // Connection timeout
      if (error?.message?.includes('timeout')) return true
      if (error?.message?.includes('connection')) return true
      return false
    },
  },

  // Для файловых операций
  fileSystem: {
    maxAttempts: 3,
    baseDelay: 200,
    maxDelay: 2000,
    exponentialBase: 2,
    jitter: false,
    retryCondition: (error: any) => {
      if (error?.code === 'EBUSY') return true
      if (error?.code === 'EMFILE') return true
      if (error?.code === 'ENFILE') return true
      return false
    },
  },
}

// Удобная функция для внешних API
export async function retryExternalAPI<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  const result = await RetryMechanism.execute(
    operation,
    retryConfigs.externalAPI
  )

  if (!result.success) {
    const error =
      result.error ||
      new Error(`Operation failed after ${result.attempts} attempts`)
    if (operationName) {
      error.message = `${operationName}: ${error.message}`
    }
    throw error
  }

  return result.result!
}

// Удобная функция для базы данных
export async function retryDatabase<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  const result = await RetryMechanism.execute(operation, retryConfigs.database)

  if (!result.success) {
    const error =
      result.error ||
      new Error(`Database operation failed after ${result.attempts} attempts`)
    if (operationName) {
      error.message = `${operationName}: ${error.message}`
    }
    throw error
  }

  return result.result!
}

// Удобная функция для файловых операций
export async function retryFileSystem<T>(
  operation: () => Promise<T>,
  operationName?: string
): Promise<T> {
  const result = await RetryMechanism.execute(
    operation,
    retryConfigs.fileSystem
  )

  if (!result.success) {
    const error =
      result.error ||
      new Error(
        `File system operation failed after ${result.attempts} attempts`
      )
    if (operationName) {
      error.message = `${operationName}: ${error.message}`
    }
    throw error
  }

  return result.result!
}
