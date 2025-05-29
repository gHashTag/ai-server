import { logger } from '@/utils/logger'

export enum CircuitState {
  CLOSED = 'CLOSED', // Нормальная работа
  OPEN = 'OPEN', // Блокировка запросов
  HALF_OPEN = 'HALF_OPEN', // Тестирование восстановления
}

interface CircuitBreakerConfig {
  failureThreshold: number // Количество ошибок для открытия
  recoveryTimeout: number // Время до попытки восстановления (мс)
  monitoringPeriod: number // Период мониторинга (мс)
  successThreshold: number // Успешных запросов для закрытия
}

interface CircuitBreakerStats {
  state: CircuitState
  failures: number
  successes: number
  lastFailureTime: number
  lastSuccessTime: number
  totalRequests: number
  totalFailures: number
  totalSuccesses: number
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failures = 0
  private successes = 0
  private lastFailureTime = 0
  private lastSuccessTime = 0
  private totalRequests = 0
  private totalFailures = 0
  private totalSuccesses = 0

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++

    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        logger.warn(`🚫 Circuit breaker OPEN: ${this.serviceName}`, {
          state: this.state,
          failures: this.failures,
          lastFailureTime: this.lastFailureTime,
          recoveryTimeout: this.config.recoveryTimeout,
        })
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`)
      } else {
        this.state = CircuitState.HALF_OPEN
        this.successes = 0
        logger.info(
          `🔄 Circuit breaker testing recovery: ${this.serviceName}`,
          {
            state: this.state,
          }
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.successes++
    this.totalSuccesses++
    this.lastSuccessTime = Date.now()

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED
        this.failures = 0
        logger.info(`✅ Circuit breaker CLOSED: ${this.serviceName}`, {
          state: this.state,
          successes: this.successes,
        })
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Сбрасываем счетчик ошибок при успехе в CLOSED состоянии
      this.failures = 0
    }
  }

  private onFailure(): void {
    this.failures++
    this.totalFailures++
    this.lastFailureTime = Date.now()

    if (
      this.state === CircuitState.CLOSED ||
      this.state === CircuitState.HALF_OPEN
    ) {
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN
        logger.error(`❌ Circuit breaker OPEN: ${this.serviceName}`, {
          state: this.state,
          failures: this.failures,
          threshold: this.config.failureThreshold,
        })
      }
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    }
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failures = 0
    this.successes = 0
    this.lastFailureTime = 0
    this.lastSuccessTime = 0
    logger.info(`🔄 Circuit breaker reset: ${this.serviceName}`)
  }
}

// Конфигурации для разных сервисов
const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 минута
  monitoringPeriod: 300000, // 5 минут
  successThreshold: 3,
}

const replicateConfig: CircuitBreakerConfig = {
  failureThreshold: 3, // Replicate может быть медленным
  recoveryTimeout: 120000, // 2 минуты
  monitoringPeriod: 600000, // 10 минут
  successThreshold: 2,
}

const supabaseConfig: CircuitBreakerConfig = {
  failureThreshold: 5, // База данных должна быть стабильной
  recoveryTimeout: 30000, // 30 секунд
  monitoringPeriod: 300000, // 5 минут
  successThreshold: 3,
}

const elevenLabsConfig: CircuitBreakerConfig = {
  failureThreshold: 4,
  recoveryTimeout: 90000, // 1.5 минуты
  monitoringPeriod: 300000, // 5 минут
  successThreshold: 2,
}

// Глобальный реестр Circuit Breakers
export const circuitBreakers = {
  // Основные внешние сервисы
  replicate: new CircuitBreaker('replicate', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    successThreshold: 3,
  }),

  supabase: new CircuitBreaker('supabase', {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    monitoringPeriod: 30000,
    successThreshold: 2,
  }),

  elevenlabs: new CircuitBreaker('elevenlabs', {
    failureThreshold: 4,
    recoveryTimeout: 20000,
    monitoringPeriod: 45000,
    successThreshold: 2,
  }),

  // Новые сервисы
  synclabs: new CircuitBreaker('synclabs', {
    failureThreshold: 4,
    recoveryTimeout: 25000,
    monitoringPeriod: 50000,
    successThreshold: 2,
  }),

  huggingface: new CircuitBreaker('huggingface', {
    failureThreshold: 6, // HuggingFace может быть медленным
    recoveryTimeout: 45000,
    monitoringPeriod: 90000,
    successThreshold: 3,
  }),

  bfl: new CircuitBreaker('bfl', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    successThreshold: 2,
  }),

  // Файловые операции и утилиты
  fileDownload: new CircuitBreaker('file-download', {
    failureThreshold: 3,
    recoveryTimeout: 5000,
    monitoringPeriod: 15000,
    successThreshold: 2,
  }),
}

// Функция для получения статистики всех circuit breakers
export function getAllCircuitBreakerStats(): Record<
  string,
  CircuitBreakerStats
> {
  const stats: Record<string, CircuitBreakerStats> = {}

  Object.entries(circuitBreakers).forEach(([name, breaker]) => {
    stats[name] = breaker.getStats()
  })

  return stats
}

// Функция для сброса всех circuit breakers
export function resetAllCircuitBreakers(): void {
  Object.values(circuitBreakers).forEach(breaker => breaker.reset())
  logger.info('🔄 All circuit breakers reset')
}
