import { z } from 'zod'
import { CacheManager } from './CacheManager'
import { logger } from '@/utils/logger'

// === ENUMS ===

export enum MetricType {
  API_RESPONSE_TIME = 'api_response_time',
  ERROR_RATE = 'error_rate',
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  CACHE_HIT_RATE = 'cache_hit_rate',
  USER_SESSION = 'user_session',
  DATABASE_QUERY_TIME = 'database_query_time',
  THROUGHPUT = 'throughput',
}

export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DEGRADING = 'degrading',
}

// === ZOD SCHEMAS ===

export const advancedMetricsConfigSchema = z.object({
  bufferSize: z.number().min(10).default(1000),
  flushInterval: z.number().min(1000).default(5000), // 5 seconds
  enableAlerts: z.boolean().default(true),
  retentionDays: z.number().min(1).default(30),
  cacheManager: z.instanceof(CacheManager).optional(),
  alertThresholds: z
    .object({
      responseTimeMs: z.number().default(1000),
      errorRatePercent: z.number().default(5),
      cacheHitRatePercent: z.number().default(80),
      memoryUsagePercent: z.number().default(85),
      cpuUsagePercent: z.number().default(80),
    })
    .default({}),
})

export const metricDataSchema = z.object({
  type: z.nativeEnum(MetricType),
  name: z.string(),
  value: z.number(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional(),
})

export const alertSchema = z.object({
  id: z.string(),
  type: z.string(),
  level: z.nativeEnum(AlertLevel),
  metric: z.string(),
  value: z.number(),
  threshold: z.number(),
  message: z.string(),
  timestamp: z.number(),
  resolved: z.boolean().default(false),
  resolvedAt: z.number().optional(),
})

export const userSessionSchema = z.object({
  userId: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  actions: z.array(
    z.object({
      action: z.string(),
      timestamp: z.number(),
      metadata: z.record(z.any()).optional(),
    })
  ),
  metadata: z.record(z.any()).optional(),
})

// === TYPES ===

export type AdvancedMetricsConfig = z.infer<typeof advancedMetricsConfigSchema>
export type MetricData = z.infer<typeof metricDataSchema>
export type Alert = z.infer<typeof alertSchema>
export type UserSession = z.infer<typeof userSessionSchema>

export interface TimeSeriesPoint {
  timestamp: number
  value: number
  metadata?: Record<string, any>
}

export interface AggregatedData {
  value: number
  count: number
  aggregationType: 'avg' | 'sum' | 'min' | 'max' | 'p95' | 'p99'
  timeRange: { start: number; end: number }
}

export interface PerformanceTrend {
  metric: string
  trend: TrendDirection
  slope: number
  confidence: number
  dataPoints: number
}

export interface APICallMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: number
  metadata?: Record<string, any>
}

export interface CacheMetrics {
  hitRate: number
  totalHits: number
  totalMisses: number
  memoryUsage: number
  compressionRatio: number
  avgAccessTime: number
}

export interface SLAStats {
  overallCompliance: number
  violations: number
  totalRequests: number
  averageResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
}

export interface UptimeStats {
  uptime: number
  incidents: number
  mttr: number // Mean Time To Recovery
  availability: number
}

export interface PerformanceRecommendation {
  type: string
  priority: 'low' | 'medium' | 'high'
  description: string
  impact: string
  implementation: string
}

// === MAIN CLASS ===

export class AdvancedMetrics {
  private config: AdvancedMetricsConfig
  private metricsBuffer: MetricData[] = []
  private timeSeries: Map<string, TimeSeriesPoint[]> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private userSessions: Map<string, UserSession> = new Map()
  private apiCalls: APICallMetrics[] = []
  private serviceStatus: Map<string, { isUp: boolean; timestamp: number }[]> =
    new Map()
  private running = false
  private flushInterval?: NodeJS.Timeout
  private cacheMetricsInterval?: NodeJS.Timeout

  constructor(config: Partial<AdvancedMetricsConfig> = {}) {
    this.config = advancedMetricsConfigSchema.parse(config)
    this.start()
  }

  private start(): void {
    this.running = true

    // Periodic flush of buffered metrics
    this.flushInterval = setInterval(() => {
      this.flushMetrics()
    }, this.config.flushInterval)

    // Periodic cache metrics collection
    if (this.config.cacheManager) {
      this.cacheMetricsInterval = setInterval(() => {
        this.collectCacheMetrics()
      }, this.config.flushInterval)
    }

    // Periodic cleanup of old data
    setInterval(() => {
      this.cleanup()
    }, 24 * 60 * 60 * 1000) // Daily cleanup

    logger.info('AdvancedMetrics system started', {
      bufferSize: this.config.bufferSize,
      flushInterval: this.config.flushInterval,
      enableAlerts: this.config.enableAlerts,
    })
  }

  async stop(): Promise<void> {
    this.running = false

    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }

    if (this.cacheMetricsInterval) {
      clearInterval(this.cacheMetricsInterval)
    }

    // Final flush
    await this.flushMetrics()

    logger.info('AdvancedMetrics system stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  // === CORE METRICS RECORDING ===

  async recordMetric(
    type: MetricType,
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const timestamp = metadata?.timestamp || Date.now()

    const metricData: MetricData = {
      type,
      name,
      value,
      timestamp,
      metadata,
    }

    // Validate the data
    metricDataSchema.parse(metricData)

    // Add to buffer
    this.metricsBuffer.push(metricData)

    // Add to time series
    const seriesKey = `${type}:${name}`
    if (!this.timeSeries.has(seriesKey)) {
      this.timeSeries.set(seriesKey, [])
    }

    this.timeSeries.get(seriesKey)!.push({
      timestamp,
      value,
      metadata,
    })

    // Check for alerts
    if (this.config.enableAlerts) {
      await this.checkAlerts(type, name, value, metadata)
    }

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.config.bufferSize) {
      await this.flushMetrics()
    }
  }

  async recordAPICall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const apiCall: APICallMetrics = {
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: Date.now(),
      metadata,
    }

    this.apiCalls.push(apiCall)

    // Record as metric
    await this.recordMetric(
      MetricType.API_RESPONSE_TIME,
      endpoint,
      responseTime,
      { method, statusCode, ...metadata }
    )

    // Calculate error rate
    const errorRate = statusCode >= 400 ? 1 : 0
    await this.recordMetric(MetricType.ERROR_RATE, endpoint, errorRate, {
      method,
      statusCode,
      ...metadata,
    })
  }

  // === USER SESSION TRACKING ===

  async startUserSession(
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const session: UserSession = {
      userId,
      startTime: Date.now(),
      actions: [],
      metadata,
    }

    this.userSessions.set(userId, session)

    await this.recordMetric(MetricType.USER_SESSION, 'session_start', 1, {
      userId,
      ...metadata,
    })
  }

  async recordUserAction(
    userId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const session = this.userSessions.get(userId)
    if (!session) {
      logger.warn('Recording action for non-existent session', {
        userId,
        action,
      })
      return
    }

    session.actions.push({
      action,
      timestamp: Date.now(),
      metadata,
    })

    await this.recordMetric(MetricType.USER_SESSION, `action_${action}`, 1, {
      userId,
      ...metadata,
    })
  }

  async endUserSession(userId: string): Promise<void> {
    const session = this.userSessions.get(userId)
    if (!session) {
      logger.warn('Ending non-existent session', { userId })
      return
    }

    session.endTime = Date.now()
    const sessionDuration = session.endTime - session.startTime

    await this.recordMetric(
      MetricType.USER_SESSION,
      'session_duration',
      sessionDuration,
      { userId, actionCount: session.actions.length }
    )

    // Keep session for reporting but mark as ended
  }

  // === SERVICE STATUS TRACKING ===

  async recordServiceStatus(
    serviceName: string,
    isUp: boolean,
    timestamp?: number
  ): Promise<void> {
    const ts = timestamp || Date.now()

    if (!this.serviceStatus.has(serviceName)) {
      this.serviceStatus.set(serviceName, [])
    }

    this.serviceStatus.get(serviceName)!.push({ isUp, timestamp: ts })

    await this.recordMetric(
      MetricType.THROUGHPUT,
      `service_${serviceName}_status`,
      isUp ? 1 : 0,
      { serviceName }
    )
  }

  // === CACHE INTEGRATION ===

  async collectCacheMetrics(): Promise<void> {
    if (!this.config.cacheManager) return

    const stats = await this.config.cacheManager.getStats()

    const totalRequests = (stats.hits || 0) + (stats.misses || 0)
    const hitRate = totalRequests > 0 ? (stats.hits || 0) / totalRequests : 0

    await this.recordMetric(
      MetricType.CACHE_HIT_RATE,
      'cache_hit_rate',
      hitRate
    )
    await this.recordMetric(
      MetricType.MEMORY_USAGE,
      'cache_memory',
      stats.memoryUsage || 0
    )

    // Record individual cache metrics
    await this.recordMetric(
      MetricType.THROUGHPUT,
      'cache_hits',
      stats.hits || 0
    )
    await this.recordMetric(
      MetricType.THROUGHPUT,
      'cache_misses',
      stats.misses || 0
    )
  }

  // === ALERTING SYSTEM ===

  private async checkAlerts(
    type: MetricType,
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const thresholds = this.config.alertThresholds

    let shouldAlert = false
    let alertType = ''
    let level = AlertLevel.INFO
    let threshold = 0

    switch (type) {
      case MetricType.API_RESPONSE_TIME:
        if (value > thresholds.responseTimeMs) {
          shouldAlert = true
          alertType = 'high_response_time'
          level =
            value > thresholds.responseTimeMs * 2
              ? AlertLevel.CRITICAL
              : AlertLevel.WARNING
          threshold = thresholds.responseTimeMs
        }
        break

      case MetricType.ERROR_RATE:
        if (value > thresholds.errorRatePercent / 100) {
          shouldAlert = true
          alertType = 'high_error_rate'
          level =
            value > thresholds.errorRatePercent / 50
              ? AlertLevel.CRITICAL
              : AlertLevel.WARNING
          threshold = thresholds.errorRatePercent / 100
        }
        break

      case MetricType.CACHE_HIT_RATE:
        if (value < thresholds.cacheHitRatePercent / 100) {
          shouldAlert = true
          alertType = 'cache_hit_rate_low'
          level = AlertLevel.WARNING
          threshold = thresholds.cacheHitRatePercent / 100
        }
        break

      case MetricType.MEMORY_USAGE:
        if (value > thresholds.memoryUsagePercent) {
          shouldAlert = true
          alertType = 'high_memory_usage'
          level =
            value > thresholds.memoryUsagePercent * 1.1
              ? AlertLevel.CRITICAL
              : AlertLevel.WARNING
          threshold = thresholds.memoryUsagePercent
        }
        break

      case MetricType.CPU_USAGE:
        if (value > thresholds.cpuUsagePercent) {
          shouldAlert = true
          alertType = 'high_cpu_usage'
          level =
            value > thresholds.cpuUsagePercent * 1.1
              ? AlertLevel.CRITICAL
              : AlertLevel.WARNING
          threshold = thresholds.cpuUsagePercent
        }
        break
    }

    if (shouldAlert) {
      await this.createAlert(alertType, level, name, value, threshold, metadata)
    } else {
      // Check if we should resolve existing alerts
      await this.checkAlertResolution(type, name, value)
    }
  }

  private async createAlert(
    type: string,
    level: AlertLevel,
    metric: string,
    value: number,
    threshold: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const alertId = `${type}_${metric}_${Date.now()}`

    const alert: Alert = {
      id: alertId,
      type,
      level,
      metric,
      value,
      threshold,
      message: this.generateAlertMessage(type, metric, value, threshold),
      timestamp: Date.now(),
      resolved: false,
    }

    this.alerts.set(alertId, alert)

    logger.warn('Alert created', alert)
  }

  private async checkAlertResolution(
    type: MetricType,
    name: string,
    value: number
  ): Promise<void> {
    // Simple auto-resolution logic - can be enhanced
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.resolved || alert.metric !== name) continue

      let shouldResolve = false

      switch (alert.type) {
        case 'high_response_time':
          shouldResolve = value < alert.threshold * 0.8 // 20% below threshold
          break
        case 'high_error_rate':
          shouldResolve = value < alert.threshold * 0.5 // 50% below threshold
          break
        case 'cache_hit_rate_low':
          shouldResolve = value > alert.threshold * 1.1 // 10% above threshold
          break
        case 'high_memory_usage':
        case 'high_cpu_usage':
          shouldResolve = value < alert.threshold * 0.9 // 10% below threshold
          break
      }

      if (shouldResolve) {
        alert.resolved = true
        alert.resolvedAt = Date.now()
        logger.info('Alert auto-resolved', { alertId, metric: alert.metric })
      }
    }
  }

  async checkCacheAlerts(): Promise<void> {
    if (!this.config.cacheManager) return

    const stats = await this.config.cacheManager.getStats()
    const totalRequests = (stats.hits || 0) + (stats.misses || 0)
    const hitRate = totalRequests > 0 ? (stats.hits || 0) / totalRequests : 1

    await this.checkAlerts(MetricType.CACHE_HIT_RATE, 'cache_hit_rate', hitRate)
  }

  private generateAlertMessage(
    type: string,
    metric: string,
    value: number,
    threshold: number
  ): string {
    switch (type) {
      case 'high_response_time':
        return `High response time detected for ${metric}: ${value}ms (threshold: ${threshold}ms)`
      case 'high_error_rate':
        return `High error rate detected for ${metric}: ${(value * 100).toFixed(
          2
        )}% (threshold: ${(threshold * 100).toFixed(2)}%)`
      case 'cache_hit_rate_low':
        return `Low cache hit rate detected: ${(value * 100).toFixed(
          2
        )}% (threshold: ${(threshold * 100).toFixed(2)}%)`
      case 'high_memory_usage':
        return `High memory usage detected: ${value}% (threshold: ${threshold}%)`
      case 'high_cpu_usage':
        return `High CPU usage detected: ${value}% (threshold: ${threshold}%)`
      default:
        return `Alert for ${metric}: ${value} (threshold: ${threshold})`
    }
  }

  // === DATA RETRIEVAL ===

  async getStats(): Promise<{
    totalMetrics: number
    metricsByType: Record<MetricType, number>
    bufferSize: number
    alertsCount: number
    activeSessionsCount: number
  }> {
    const metricsByType: Record<MetricType, number> = {} as any

    for (const metric of this.metricsBuffer) {
      metricsByType[metric.type] = (metricsByType[metric.type] || 0) + 1
    }

    return {
      totalMetrics: this.metricsBuffer.length,
      metricsByType,
      bufferSize: this.metricsBuffer.length,
      alertsCount: this.alerts.size,
      activeSessionsCount: Array.from(this.userSessions.values()).filter(
        s => !s.endTime
      ).length,
    }
  }

  async getUserSessionStats(userId: string): Promise<{
    totalSessions: number
    totalActions: number
    averageSessionDuration: number
  }> {
    const sessions = Array.from(this.userSessions.values()).filter(
      s => s.userId === userId
    )

    const totalActions = sessions.reduce(
      (sum, session) => sum + session.actions.length,
      0
    )
    const completedSessions = sessions.filter(s => s.endTime)
    const averageSessionDuration =
      completedSessions.length > 0
        ? completedSessions.reduce(
            (sum, session) => sum + (session.endTime! - session.startTime),
            0
          ) / completedSessions.length
        : 0

    return {
      totalSessions: sessions.length,
      totalActions,
      averageSessionDuration,
    }
  }

  async getAPIUsageStats(): Promise<{
    totalCalls: number
    averageResponseTime: number
    errorRate: number
    endpointStats: Record<
      string,
      { calls: number; avgResponseTime: number; errorRate: number }
    >
  }> {
    const totalCalls = this.apiCalls.length
    const averageResponseTime =
      totalCalls > 0
        ? this.apiCalls.reduce((sum, call) => sum + call.responseTime, 0) /
          totalCalls
        : 0

    const errors = this.apiCalls.filter(call => call.statusCode >= 400).length
    const errorRate = totalCalls > 0 ? errors / totalCalls : 0

    const endpointStats: Record<
      string,
      { calls: number; avgResponseTime: number; errorRate: number }
    > = {}

    for (const call of this.apiCalls) {
      if (!endpointStats[call.endpoint]) {
        endpointStats[call.endpoint] = {
          calls: 0,
          avgResponseTime: 0,
          errorRate: 0,
        }
      }

      const stats = endpointStats[call.endpoint]
      const prevTotal = stats.avgResponseTime * stats.calls
      stats.calls++
      stats.avgResponseTime = (prevTotal + call.responseTime) / stats.calls

      if (call.statusCode >= 400) {
        stats.errorRate =
          (stats.errorRate * (stats.calls - 1) + 1) / stats.calls
      } else {
        stats.errorRate = (stats.errorRate * (stats.calls - 1)) / stats.calls
      }
    }

    return {
      totalCalls,
      averageResponseTime,
      errorRate,
      endpointStats,
    }
  }

  async getSLAStats(): Promise<SLAStats> {
    const responseTimeMetrics = this.metricsBuffer.filter(
      m => m.type === MetricType.API_RESPONSE_TIME
    )

    if (responseTimeMetrics.length === 0) {
      return {
        overallCompliance: 1.0,
        violations: 0,
        totalRequests: 0,
        averageResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
      }
    }

    const responseTimes = responseTimeMetrics
      .map(m => m.value)
      .sort((a, b) => a - b)
    const totalRequests = responseTimes.length
    const averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests

    const p95Index = Math.floor(totalRequests * 0.95)
    const p99Index = Math.floor(totalRequests * 0.99)
    const p95ResponseTime = responseTimes[p95Index] || 0
    const p99ResponseTime = responseTimes[p99Index] || 0

    const slaThreshold = this.config.alertThresholds.responseTimeMs
    const violations = responseTimes.filter(time => time > slaThreshold).length
    const overallCompliance = (totalRequests - violations) / totalRequests

    return {
      overallCompliance,
      violations,
      totalRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
    }
  }

  async getUptimeStats(serviceName: string): Promise<UptimeStats> {
    const statusEvents = this.serviceStatus.get(serviceName) || []

    if (statusEvents.length === 0) {
      return { uptime: 1.0, incidents: 0, mttr: 0, availability: 1.0 }
    }

    let totalTime = 0
    let upTime = 0
    let incidents = 0
    let totalDownTime = 0
    let currentIncidentStart: number | null = null

    for (let i = 0; i < statusEvents.length; i++) {
      const event = statusEvents[i]
      const nextEvent = statusEvents[i + 1]

      if (nextEvent) {
        const duration = nextEvent.timestamp - event.timestamp
        totalTime += duration

        if (event.isUp) {
          upTime += duration
        } else {
          if (currentIncidentStart === null) {
            currentIncidentStart = event.timestamp
            incidents++
          }
        }
      }

      if (
        !event.isUp &&
        currentIncidentStart !== null &&
        (nextEvent?.isUp || !nextEvent)
      ) {
        const incidentEnd = nextEvent?.timestamp || Date.now()
        totalDownTime += incidentEnd - currentIncidentStart
        currentIncidentStart = null
      }
    }

    const uptime = totalTime > 0 ? upTime / totalTime : 1.0
    const availability = uptime
    const mttr = incidents > 0 ? totalDownTime / incidents : 0

    return { uptime, incidents, mttr, availability }
  }

  async getCacheMetrics(): Promise<CacheMetrics> {
    if (!this.config.cacheManager) {
      return {
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0,
        memoryUsage: 0,
        compressionRatio: 0,
        avgAccessTime: 0,
      }
    }

    // Always use cache manager stats directly - more reliable
    const stats = await this.config.cacheManager.getStats()
    const totalRequests = (stats.hits || 0) + (stats.misses || 0)

    return {
      hitRate: totalRequests > 0 ? (stats.hits || 0) / totalRequests : 0,
      totalHits: stats.hits || 0,
      totalMisses: stats.misses || 0,
      memoryUsage: stats.memoryUsage || 0,
      compressionRatio: stats.compressionRatio || 0,
      avgAccessTime: stats.averageAccessTime || 0,
    }
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  async getTimeSeriesData(
    type: MetricType,
    name: string,
    startTime: number,
    endTime: number
  ): Promise<TimeSeriesPoint[]> {
    const seriesKey = `${type}:${name}`
    const series = this.timeSeries.get(seriesKey) || []

    return series.filter(
      point => point.timestamp >= startTime && point.timestamp <= endTime
    )
  }

  async getCacheTimeSeriesData(
    startTime: number,
    endTime: number
  ): Promise<
    Array<{
      timestamp: number
      hitRate: number
      memoryUsage: number
      compressionRatio: number
    }>
  > {
    const hitRateData = await this.getTimeSeriesData(
      MetricType.CACHE_HIT_RATE,
      'cache_hit_rate',
      startTime,
      endTime
    )
    const memoryData = await this.getTimeSeriesData(
      MetricType.MEMORY_USAGE,
      'cache_memory',
      startTime,
      endTime
    )

    // Combine the data points
    const combined: Array<{
      timestamp: number
      hitRate: number
      memoryUsage: number
      compressionRatio: number
    }> = []

    for (const hitPoint of hitRateData) {
      const memoryPoint = memoryData.find(
        p => Math.abs(p.timestamp - hitPoint.timestamp) < 1000
      ) // Within 1 second

      combined.push({
        timestamp: hitPoint.timestamp,
        hitRate: hitPoint.value,
        memoryUsage: memoryPoint?.value || 0,
        compressionRatio: this.config.cacheManager
          ? (await this.config.cacheManager.getStats()).compressionRatio
          : 0,
      })
    }

    return combined
  }

  async getAggregatedData(
    type: MetricType,
    name: string,
    startTime: number,
    endTime: number,
    aggregationType: 'avg' | 'sum' | 'min' | 'max' | 'p95' | 'p99'
  ): Promise<AggregatedData> {
    const data = await this.getTimeSeriesData(type, name, startTime, endTime)

    if (data.length === 0) {
      return {
        value: 0,
        count: 0,
        aggregationType,
        timeRange: { start: startTime, end: endTime },
      }
    }

    const values = data.map(point => point.value).sort((a, b) => a - b)
    let aggregatedValue = 0

    switch (aggregationType) {
      case 'avg':
        aggregatedValue =
          values.reduce((sum, val) => sum + val, 0) / values.length
        break
      case 'sum':
        aggregatedValue = values.reduce((sum, val) => sum + val, 0)
        break
      case 'min':
        aggregatedValue = Math.min(...values)
        break
      case 'max':
        aggregatedValue = Math.max(...values)
        break
      case 'p95':
        aggregatedValue = values[Math.floor(values.length * 0.95)] || 0
        break
      case 'p99':
        aggregatedValue = values[Math.floor(values.length * 0.99)] || 0
        break
    }

    return {
      value: aggregatedValue,
      count: values.length,
      aggregationType,
      timeRange: { start: startTime, end: endTime },
    }
  }

  // === ANALYTICS ===

  async getPerformanceTrends(metricName: string): Promise<PerformanceTrend> {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const data = await this.getTimeSeriesData(
      MetricType.API_RESPONSE_TIME,
      metricName,
      oneHourAgo,
      now
    )

    if (data.length < 2) {
      return {
        metric: metricName,
        trend: TrendDirection.STABLE,
        slope: 0,
        confidence: 0,
        dataPoints: data.length,
      }
    }

    // Simple linear regression to calculate trend
    const n = data.length
    const sumX = data.reduce((sum, point, index) => sum + index, 0)
    const sumY = data.reduce((sum, point) => sum + point.value, 0)
    const sumXY = data.reduce(
      (sum, point, index) => sum + index * point.value,
      0
    )
    const sumXX = data.reduce((sum, point, index) => sum + index * index, 0)

    // Avoid division by zero
    const denominator = n * sumXX - sumX * sumX
    const slope =
      denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0

    let trend: TrendDirection
    // Use very low threshold for degrading trend detection - super sensitive
    if (Math.abs(slope) < 0.1) {
      // Very low threshold for sensitivity
      trend = TrendDirection.STABLE
    } else if (slope > 0) {
      trend = TrendDirection.DEGRADING
    } else {
      trend = TrendDirection.IMPROVING
    }

    // Simple confidence calculation based on data consistency
    const avgValue = sumY / n
    const variance =
      data.reduce(
        (sum, point) => sum + Math.pow(point.value - avgValue, 2),
        0
      ) / n
    const confidence =
      avgValue > 0
        ? Math.max(0, Math.min(1, 1 - variance / (avgValue * avgValue)))
        : 0

    return {
      metric: metricName,
      trend,
      slope,
      confidence,
      dataPoints: n,
    }
  }

  async getPerformanceRecommendations(): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = []

    // Check memory usage
    const memoryMetrics = this.metricsBuffer.filter(
      m =>
        m.type === MetricType.MEMORY_USAGE &&
        m.value > this.config.alertThresholds.memoryUsagePercent
    )

    if (memoryMetrics.length > 0) {
      recommendations.push({
        type: 'memory_optimization',
        priority: 'high',
        description: 'High memory usage detected',
        impact:
          'System performance may degrade, potential out-of-memory errors',
        implementation:
          'Implement garbage collection tuning, optimize data structures, add memory monitoring',
      })
    }

    // Check cache hit rate - use actual cache manager stats AND check recent metrics
    if (this.config.cacheManager) {
      const cacheStats = await this.config.cacheManager.getStats()
      const totalRequests = (cacheStats.hits || 0) + (cacheStats.misses || 0)
      const hitRate =
        totalRequests > 0 ? (cacheStats.hits || 0) / totalRequests : 1

      // Also check if we recently recorded low hit rate metrics in our buffer
      const recentCacheMetrics = this.metricsBuffer.filter(
        m =>
          m.type === MetricType.CACHE_HIT_RATE &&
          m.name === 'cache_hit_rate' &&
          m.value < this.config.alertThresholds.cacheHitRatePercent / 100
      )

      if (
        hitRate < this.config.alertThresholds.cacheHitRatePercent / 100 ||
        recentCacheMetrics.length > 0
      ) {
        recommendations.push({
          type: 'cache_optimization',
          priority: 'medium',
          description: 'Low cache hit rate affecting performance',
          impact: 'Increased response times, higher resource usage',
          implementation:
            'Review cache TTL settings, implement cache prewarming, optimize cache keys',
        })
      }
    }

    // Check API response times
    const slowAPIs = this.apiCalls.filter(
      call => call.responseTime > this.config.alertThresholds.responseTimeMs
    )

    if (slowAPIs.length > this.apiCalls.length * 0.1) {
      // More than 10% of calls are slow
      recommendations.push({
        type: 'api_optimization',
        priority: 'high',
        description: 'High percentage of slow API responses',
        impact: 'Poor user experience, potential SLA violations',
        implementation:
          'Optimize database queries, implement connection pooling, add API caching',
      })
    }

    return recommendations
  }

  // === DATA EXPORT ===

  async exportData(
    startTime: number,
    endTime: number
  ): Promise<{
    metrics: MetricData[]
    alerts: Alert[]
    userSessions: UserSession[]
    apiCalls: APICallMetrics[]
    exportedAt: number
  }> {
    const filteredMetrics = this.metricsBuffer.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    )

    const filteredAlerts = Array.from(this.alerts.values()).filter(
      a => a.timestamp >= startTime && a.timestamp <= endTime
    )

    // Fix user session filtering to include sessions that overlap with the time range
    const filteredSessions = Array.from(this.userSessions.values()).filter(
      s => {
        const sessionStart = s.startTime
        const sessionEnd = s.endTime || Date.now()

        // Include sessions that overlap with the time range
        return sessionStart <= endTime && sessionEnd >= startTime
      }
    )

    const filteredAPICalls = this.apiCalls.filter(
      c => c.timestamp >= startTime && c.timestamp <= endTime
    )

    return {
      metrics: filteredMetrics,
      alerts: filteredAlerts,
      userSessions: filteredSessions,
      apiCalls: filteredAPICalls,
      exportedAt: Date.now(),
    }
  }

  async generatePerformanceReport(): Promise<{
    summary: {
      totalMetrics: number
      averageResponseTime: number
      errorRate: number
      uptime: number
      alertsCount: number
    }
    apiMetrics: {
      totalCalls: number
      averageResponseTime: number
      slowestEndpoint: string
      errorRate: number
    }
    cacheMetrics: CacheMetrics
    systemMetrics: {
      memoryUsage: number
      cpuUsage: number
    }
    recommendations: PerformanceRecommendation[]
    generatedAt: number
  }> {
    const stats = await this.getStats()
    const apiStats = await this.getAPIUsageStats()
    const cacheMetrics = await this.getCacheMetrics()
    const slaStats = await this.getSLAStats()
    const recommendations = await this.getPerformanceRecommendations()

    // Find slowest endpoint
    let slowestEndpoint = 'N/A'
    let slowestTime = 0

    for (const [endpoint, endpointStats] of Object.entries(
      apiStats.endpointStats
    )) {
      if (endpointStats.avgResponseTime > slowestTime) {
        slowestTime = endpointStats.avgResponseTime
        slowestEndpoint = endpoint
      }
    }

    // Get latest system metrics
    const memoryMetrics = this.metricsBuffer.filter(
      m => m.type === MetricType.MEMORY_USAGE
    )
    const latestMemory =
      memoryMetrics.length > 0
        ? memoryMetrics[memoryMetrics.length - 1].value
        : 0

    const cpuMetrics = this.metricsBuffer.filter(
      m => m.type === MetricType.CPU_USAGE
    )
    const latestCPU =
      cpuMetrics.length > 0 ? cpuMetrics[cpuMetrics.length - 1].value : 0

    return {
      summary: {
        totalMetrics: stats.totalMetrics,
        averageResponseTime: slaStats.averageResponseTime,
        errorRate: apiStats.errorRate,
        uptime: slaStats.overallCompliance,
        alertsCount: stats.alertsCount,
      },
      apiMetrics: {
        totalCalls: apiStats.totalCalls,
        averageResponseTime: apiStats.averageResponseTime,
        slowestEndpoint,
        errorRate: apiStats.errorRate,
      },
      cacheMetrics,
      systemMetrics: {
        memoryUsage: latestMemory,
        cpuUsage: latestCPU,
      },
      recommendations,
      generatedAt: Date.now(),
    }
  }

  // === MAINTENANCE ===

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return

    logger.info('Flushing metrics buffer', { count: this.metricsBuffer.length })

    // In a real implementation, you might persist to database here
    // For now, we keep them in memory

    // Clear buffer but keep time series data
    this.metricsBuffer = []
  }

  async cleanup(): Promise<void> {
    const cutoffTime =
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000

    // Clean up old time series data
    for (const [key, series] of this.timeSeries.entries()) {
      const filteredSeries = series.filter(
        point => point.timestamp > cutoffTime
      )
      this.timeSeries.set(key, filteredSeries)
    }

    // Clean up old API calls
    this.apiCalls = this.apiCalls.filter(call => call.timestamp > cutoffTime)

    // Clean up old alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoffTime && alert.resolved) {
        this.alerts.delete(alertId)
      }
    }

    // Clean up old service status
    for (const [serviceName, statusList] of this.serviceStatus.entries()) {
      const filteredStatus = statusList.filter(
        status => status.timestamp > cutoffTime
      )
      this.serviceStatus.set(serviceName, filteredStatus)
    }

    logger.info('Cleanup completed', {
      cutoffTime,
      retentionDays: this.config.retentionDays,
    })
  }
}
