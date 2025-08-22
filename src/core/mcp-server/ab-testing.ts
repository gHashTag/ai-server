import { inngest } from '@/core/inngest-client/clients'
import { logger } from '@/utils/logger'

/**
 * Результат выполнения плана
 */
interface PlanExecutionResult {
  plan: 'A' | 'B'
  success: boolean
  executionTime: number
  errorMessage?: string
  responseSize?: number
  metadata?: Record<string, any>
}

/**
 * Метрики A/B тестирования
 */
interface ABTestMetrics {
  planA: {
    totalExecutions: number
    successfulExecutions: number
    averageExecutionTime: number
    averageResponseSize: number
    errorRate: number
    errors: string[]
  }
  planB: {
    totalExecutions: number
    successfulExecutions: number
    averageExecutionTime: number
    averageResponseSize: number
    errorRate: number
    errors: string[]
  }
  overallStats: {
    totalTests: number
    planAPreference: number // Процент использования плана A
    planBPreference: number // Процент использования плана B
    startTime: Date
    lastUpdate: Date
  }
}

/**
 * Конфигурация A/B тестирования
 */
interface ABTestConfig {
  enabled: boolean
  planAPercentage: number // Процент трафика для плана A
  planBPercentage: number // Процент трафика для плана B
  minSampleSize: number // Минимальный размер выборки для статистической значимости
  maxExecutionTime: number // Максимальное время выполнения (мс)
  collectMetrics: boolean
  logResults: boolean
}

/**
 * Менеджер A/B тестирования для инструментов MCP
 */
export class ABTestManager {
  private metrics: ABTestMetrics
  private config: ABTestConfig

  constructor(config: Partial<ABTestConfig> = {}) {
    this.config = {
      enabled: process.env.AB_TESTING_ENABLED === 'true',
      planAPercentage: parseInt(process.env.AB_TEST_PERCENTAGE || '50', 10),
      planBPercentage: 100 - parseInt(process.env.AB_TEST_PERCENTAGE || '50', 10),
      minSampleSize: 100,
      maxExecutionTime: 30000,
      collectMetrics: true,
      logResults: true,
      ...config,
    }

    this.metrics = this.initializeMetrics()
    
    logger.info({
      message: 'AB Test Manager инициализирован',
      config: this.config,
    })
  }

  /**
   * Инициализация метрик
   */
  private initializeMetrics(): ABTestMetrics {
    return {
      planA: {
        totalExecutions: 0,
        successfulExecutions: 0,
        averageExecutionTime: 0,
        averageResponseSize: 0,
        errorRate: 0,
        errors: [],
      },
      planB: {
        totalExecutions: 0,
        successfulExecutions: 0,
        averageExecutionTime: 0,
        averageResponseSize: 0,
        errorRate: 0,
        errors: [],
      },
      overallStats: {
        totalTests: 0,
        planAPreference: this.config.planAPercentage,
        planBPreference: this.config.planBPercentage,
        startTime: new Date(),
        lastUpdate: new Date(),
      },
    }
  }

  /**
   * Определение плана для выполнения на основе A/B тестирования
   */
  decidePlan(userId?: string): 'A' | 'B' {
    if (!this.config.enabled) {
      return 'A' // По умолчанию план A если A/B тестирование отключено
    }

    // Детерминированный выбор на основе user ID для консистентности
    if (userId) {
      const hash = this.hashUserId(userId)
      const percentage = hash % 100
      const planChoice = percentage < this.config.planAPercentage ? 'A' : 'B'
      
      logger.debug({
        message: 'AB Test: Детерминированный выбор плана',
        userId,
        hash,
        percentage,
        plan: planChoice,
      })
      
      return planChoice
    }

    // Случайный выбор если нет user ID
    const randomPercentage = Math.random() * 100
    const planChoice = randomPercentage < this.config.planAPercentage ? 'A' : 'B'
    
    logger.debug({
      message: 'AB Test: Случайный выбор плана',
      randomPercentage,
      plan: planChoice,
    })
    
    return planChoice
  }

  /**
   * Хеширование user ID для детерминированного выбора
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Конвертация в 32-битное число
    }
    return Math.abs(hash)
  }

  /**
   * Запись результата выполнения плана
   */
  recordResult(result: PlanExecutionResult): void {
    if (!this.config.collectMetrics) {
      return
    }

    const planMetrics = result.plan === 'A' ? this.metrics.planA : this.metrics.planB

    // Обновление счетчиков
    planMetrics.totalExecutions++
    if (result.success) {
      planMetrics.successfulExecutions++
    } else if (result.errorMessage) {
      planMetrics.errors.push(result.errorMessage)
    }

    // Обновление средних значений
    planMetrics.averageExecutionTime = this.updateAverage(
      planMetrics.averageExecutionTime,
      result.executionTime,
      planMetrics.totalExecutions
    )

    if (result.responseSize) {
      planMetrics.averageResponseSize = this.updateAverage(
        planMetrics.averageResponseSize,
        result.responseSize,
        planMetrics.totalExecutions
      )
    }

    // Обновление rate ошибок
    planMetrics.errorRate = ((planMetrics.totalExecutions - planMetrics.successfulExecutions) / planMetrics.totalExecutions) * 100

    // Обновление общих статистик
    this.metrics.overallStats.totalTests++
    this.metrics.overallStats.lastUpdate = new Date()

    if (this.config.logResults) {
      logger.info({
        message: 'AB Test: Результат записан',
        plan: result.plan,
        success: result.success,
        executionTime: result.executionTime,
        totalExecutions: planMetrics.totalExecutions,
        successRate: (planMetrics.successfulExecutions / planMetrics.totalExecutions) * 100,
      })
    }

    // Отправка метрик в Inngest для аналитики
    this.sendMetricsToInngest(result)
  }

  /**
   * Обновление скользящего среднего
   */
  private updateAverage(currentAverage: number, newValue: number, totalCount: number): number {
    return ((currentAverage * (totalCount - 1)) + newValue) / totalCount
  }

  /**
   * Отправка метрик в Inngest
   */
  private async sendMetricsToInngest(result: PlanExecutionResult): Promise<void> {
    try {
      await inngest.send({
        name: 'analytics/ab-test-result',
        data: {
          plan: result.plan,
          success: result.success,
          executionTime: result.executionTime,
          errorMessage: result.errorMessage,
          responseSize: result.responseSize,
          metadata: result.metadata,
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      logger.warn({
        message: 'AB Test: Ошибка отправки метрик в Inngest',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Получение текущих метрик
   */
  getMetrics(): ABTestMetrics {
    return { ...this.metrics }
  }

  /**
   * Анализ результатов A/B тестирования
   */
  analyzeResults(): {
    winner: 'A' | 'B' | 'inconclusive'
    confidence: number
    recommendation: string
    details: {
      planA: { successRate: number; avgTime: number }
      planB: { successRate: number; avgTime: number }
    }
  } {
    const planA = this.metrics.planA
    const planB = this.metrics.planB

    // Проверка минимального размера выборки
    if (planA.totalExecutions < this.config.minSampleSize || 
        planB.totalExecutions < this.config.minSampleSize) {
      return {
        winner: 'inconclusive',
        confidence: 0,
        recommendation: `Недостаточно данных для анализа. Требуется минимум ${this.config.minSampleSize} выполнений для каждого плана.`,
        details: {
          planA: { successRate: 0, avgTime: 0 },
          planB: { successRate: 0, avgTime: 0 },
        },
      }
    }

    // Расчет метрик
    const planASuccessRate = (planA.successfulExecutions / planA.totalExecutions) * 100
    const planBSuccessRate = (planB.successfulExecutions / planB.totalExecutions) * 100

    const planAAvgTime = planA.averageExecutionTime
    const planBAvgTime = planB.averageExecutionTime

    // Простой анализ winner-а на основе success rate и времени выполнения
    let winner: 'A' | 'B' | 'inconclusive' = 'inconclusive'
    let confidence = 0

    // План A лучше если у него выше success rate и меньше время выполнения
    const aIsBetter = planASuccessRate > planBSuccessRate && planAAvgTime <= planBAvgTime
    const bIsBetter = planBSuccessRate > planASuccessRate && planBAvgTime <= planAAvgTime

    if (aIsBetter) {
      winner = 'A'
      confidence = Math.min(95, Math.abs(planASuccessRate - planBSuccessRate) * 2)
    } else if (bIsBetter) {
      winner = 'B'
      confidence = Math.min(95, Math.abs(planBSuccessRate - planASuccessRate) * 2)
    }

    let recommendation = ''
    if (winner === 'A') {
      recommendation = `План A показывает лучшие результаты (${planASuccessRate.toFixed(1)}% успешности vs ${planBSuccessRate.toFixed(1)}%). Рекомендуется увеличить трафик на план A.`
    } else if (winner === 'B') {
      recommendation = `План B показывает лучшие результаты (${planBSuccessRate.toFixed(1)}% успешности vs ${planASuccessRate.toFixed(1)}%). Рекомендуется увеличить трафик на план B.`
    } else {
      recommendation = 'Планы показывают схожие результаты. Требуется больше данных или дополнительный анализ.'
    }

    return {
      winner,
      confidence,
      recommendation,
      details: {
        planA: { successRate: planASuccessRate, avgTime: planAAvgTime },
        planB: { successRate: planBSuccessRate, avgTime: planBAvgTime },
      },
    }
  }

  /**
   * Сброс метрик
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
    logger.info('AB Test: Метрики сброшены')
  }

  /**
   * Обновление конфигурации
   */
  updateConfig(newConfig: Partial<ABTestConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Обновление процентов в overallStats
    this.metrics.overallStats.planAPreference = this.config.planAPercentage
    this.metrics.overallStats.planBPreference = this.config.planBPercentage
    
    logger.info({
      message: 'AB Test: Конфигурация обновлена',
      newConfig: this.config,
    })
  }

  /**
   * Экспорт метрик в JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      config: this.config,
      analysis: this.analyzeResults(),
      exportTime: new Date().toISOString(),
    }, null, 2)
  }

  /**
   * Проверка статистической значимости (упрощенная)
   */
  isStatisticallySignificant(): boolean {
    const analysis = this.analyzeResults()
    return analysis.confidence > 80 && analysis.winner !== 'inconclusive'
  }
}

/**
 * Глобальный экземпляр менеджера A/B тестирования
 */
export const abTestManager = new ABTestManager()

/**
 * Вспомогательная функция для измерения времени выполнения
 */
export async function measureExecution<T>(
  plan: 'A' | 'B',
  operation: () => Promise<T>,
  userId?: string,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await operation()
    const executionTime = Date.now() - startTime
    
    abTestManager.recordResult({
      plan,
      success: true,
      executionTime,
      responseSize: typeof result === 'string' ? result.length : JSON.stringify(result).length,
      metadata: { userId, ...metadata },
    })
    
    return result
  } catch (error) {
    const executionTime = Date.now() - startTime
    
    abTestManager.recordResult({
      plan,
      success: false,
      executionTime,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      metadata: { userId, ...metadata },
    })
    
    throw error
  }
}

/**
 * Inngest функция для анализа A/B тестов
 */
export const analyzeABTestsInngest = inngest.createFunction(
  { 
    id: 'analyze-ab-tests',
    name: 'Анализ результатов A/B тестирования'
  },
  { cron: '0 */6 * * *' }, // Каждые 6 часов
  async ({ step }) => {
    return await step.run('analyze-ab-tests', async () => {
      const analysis = abTestManager.analyzeResults()
      const metrics = abTestManager.getMetrics()
      
      logger.info({
        message: 'AB Test: Периодический анализ выполнен',
        analysis,
        totalTests: metrics.overallStats.totalTests,
      })

      // Если есть статистически значимые результаты, отправляем уведомление
      if (abTestManager.isStatisticallySignificant()) {
        await inngest.send({
          name: 'notification/ab-test-significant-result',
          data: {
            analysis,
            metrics,
            timestamp: new Date().toISOString(),
          },
        })
      }

      return {
        success: true,
        analysis,
        metricsSnapshot: metrics,
        timestamp: new Date().toISOString(),
      }
    })
  }
)