import { Router } from 'express'
import { Routes } from '@interfaces/routes.interface'
import { logger } from '@/utils/logger'
import { getAllCircuitBreakerStats } from '@/utils/circuitBreaker'
import { supabase } from '@/core/supabase'

interface SystemMetrics {
  timestamp: string
  uptime: number
  memory: {
    rss: string
    heapUsed: string
    heapTotal: string
    external: string
  }
  cpu: {
    user: number
    system: number
  }
  circuitBreakers: Record<string, any>
  database: {
    activeConnections?: number
    responseTime?: number
    status: 'healthy' | 'degraded' | 'unhealthy'
  }
  requests: {
    total: number
    errors: number
    successRate: string
  }
  services: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      lastCheck: string
      responseTime?: number
    }
  }
}

// Простой счетчик запросов (в продакшене лучше использовать Redis)
let requestMetrics = {
  total: 0,
  errors: 0,
  startTime: Date.now(),
}

export class MetricsRoute implements Routes {
  public path = '/metrics'
  public router: Router = Router()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    // Prometheus-совместимые метрики
    this.router.get('/', this.getPrometheusMetrics)

    // JSON метрики для дашбордов
    this.router.get('/json', this.getJsonMetrics)

    // Сброс метрик (только для разработки)
    this.router.post('/reset', this.resetMetrics)

    // Детальная информация о circuit breakers
    this.router.get('/circuit-breakers', this.getCircuitBreakerMetrics)
  }

  private getPrometheusMetrics = async (req: any, res: any) => {
    try {
      const metrics = await this.collectMetrics()

      // Формируем Prometheus-совместимый формат
      const prometheusMetrics = this.formatPrometheusMetrics(metrics)

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      res.send(prometheusMetrics)
    } catch (error) {
      logger.error('❌ Error collecting Prometheus metrics', {
        error: error.message,
      })
      res.status(500).send('# Error collecting metrics\n')
    }
  }

  private getJsonMetrics = async (req: any, res: any) => {
    try {
      const metrics = await this.collectMetrics()

      logger.info('📊 Metrics collected', {
        uptime: metrics.uptime,
        memoryUsage: metrics.memory.rss,
        circuitBreakersCount: Object.keys(metrics.circuitBreakers).length,
      })

      res.json(metrics)
    } catch (error) {
      logger.error('❌ Error collecting JSON metrics', {
        error: error.message,
      })
      res.status(500).json({
        error: 'Failed to collect metrics',
        message: error.message,
      })
    }
  }

  private resetMetrics = async (req: any, res: any) => {
    try {
      // Сбрасываем счетчики запросов
      requestMetrics = {
        total: 0,
        errors: 0,
        startTime: Date.now(),
      }

      logger.info('🔄 Metrics reset')

      res.json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      logger.error('❌ Error resetting metrics', {
        error: error.message,
      })
      res.status(500).json({
        error: 'Failed to reset metrics',
        message: error.message,
      })
    }
  }

  private getCircuitBreakerMetrics = async (req: any, res: any) => {
    try {
      const circuitBreakerStats = getAllCircuitBreakerStats()

      res.json({
        timestamp: new Date().toISOString(),
        circuitBreakers: circuitBreakerStats,
        summary: {
          total: Object.keys(circuitBreakerStats).length,
          open: Object.values(circuitBreakerStats).filter(
            cb => cb.state === 'OPEN'
          ).length,
          halfOpen: Object.values(circuitBreakerStats).filter(
            cb => cb.state === 'HALF_OPEN'
          ).length,
          closed: Object.values(circuitBreakerStats).filter(
            cb => cb.state === 'CLOSED'
          ).length,
        },
      })
    } catch (error) {
      logger.error('❌ Error collecting circuit breaker metrics', {
        error: error.message,
      })
      res.status(500).json({
        error: 'Failed to collect circuit breaker metrics',
        message: error.message,
      })
    }
  }

  private async collectMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    // Проверяем состояние базы данных
    const dbStatus = await this.checkDatabaseStatus()

    // Получаем статистику circuit breakers
    const circuitBreakerStats = getAllCircuitBreakerStats()

    // Вычисляем success rate
    const successRate =
      requestMetrics.total > 0
        ? (
            ((requestMetrics.total - requestMetrics.errors) /
              requestMetrics.total) *
            100
          ).toFixed(2)
        : '100.00'

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      circuitBreakers: circuitBreakerStats,
      database: dbStatus,
      requests: {
        total: requestMetrics.total,
        errors: requestMetrics.errors,
        successRate: `${successRate}%`,
      },
      services: {
        // Здесь можно добавить проверки других сервисов
        app: {
          status: 'healthy',
          lastCheck: new Date().toISOString(),
        },
      },
    }
  }

  private async checkDatabaseStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    responseTime?: number
    activeConnections?: number
  }> {
    const start = Date.now()

    try {
      const { error } = await supabase.from('users').select('count').limit(1)

      const responseTime = Date.now() - start

      if (error) {
        return {
          status: 'unhealthy',
          responseTime,
        }
      }

      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - start,
      }
    }
  }

  private formatPrometheusMetrics(metrics: SystemMetrics): string {
    const lines: string[] = []

    // Базовые метрики
    lines.push('# HELP nodejs_uptime_seconds Process uptime in seconds')
    lines.push('# TYPE nodejs_uptime_seconds gauge')
    lines.push(`nodejs_uptime_seconds ${metrics.uptime}`)
    lines.push('')

    // Память
    lines.push('# HELP nodejs_memory_rss_bytes Resident Set Size in bytes')
    lines.push('# TYPE nodejs_memory_rss_bytes gauge')
    lines.push(
      `nodejs_memory_rss_bytes ${parseInt(metrics.memory.rss) * 1024 * 1024}`
    )
    lines.push('')

    lines.push('# HELP nodejs_memory_heap_used_bytes Heap used in bytes')
    lines.push('# TYPE nodejs_memory_heap_used_bytes gauge')
    lines.push(
      `nodejs_memory_heap_used_bytes ${
        parseInt(metrics.memory.heapUsed) * 1024 * 1024
      }`
    )
    lines.push('')

    // Запросы
    lines.push('# HELP http_requests_total Total number of HTTP requests')
    lines.push('# TYPE http_requests_total counter')
    lines.push(`http_requests_total ${metrics.requests.total}`)
    lines.push('')

    lines.push(
      '# HELP http_request_errors_total Total number of HTTP request errors'
    )
    lines.push('# TYPE http_request_errors_total counter')
    lines.push(`http_request_errors_total ${metrics.requests.errors}`)
    lines.push('')

    // Circuit Breakers
    lines.push(
      '# HELP circuit_breaker_state Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)'
    )
    lines.push('# TYPE circuit_breaker_state gauge')
    Object.entries(metrics.circuitBreakers).forEach(([name, stats]) => {
      const stateValue =
        stats.state === 'CLOSED' ? 0 : stats.state === 'HALF_OPEN' ? 1 : 2
      lines.push(`circuit_breaker_state{name="${name}"} ${stateValue}`)
    })
    lines.push('')

    lines.push(
      '# HELP circuit_breaker_failures_total Total circuit breaker failures'
    )
    lines.push('# TYPE circuit_breaker_failures_total counter')
    Object.entries(metrics.circuitBreakers).forEach(([name, stats]) => {
      lines.push(
        `circuit_breaker_failures_total{name="${name}"} ${stats.totalFailures}`
      )
    })
    lines.push('')

    // База данных
    if (metrics.database.responseTime) {
      lines.push(
        '# HELP database_response_time_ms Database response time in milliseconds'
      )
      lines.push('# TYPE database_response_time_ms gauge')
      lines.push(`database_response_time_ms ${metrics.database.responseTime}`)
      lines.push('')
    }

    return lines.join('\n')
  }
}

// Middleware для подсчета запросов
export const metricsMiddleware = (req: any, res: any, next: any) => {
  requestMetrics.total++

  // Перехватываем ошибки
  const originalSend = res.send
  res.send = function (data: any) {
    if (res.statusCode >= 400) {
      requestMetrics.errors++
    }
    return originalSend.call(this, data)
  }

  next()
}
