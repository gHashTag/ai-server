import { z } from 'zod'
import { CacheManager } from './CacheManager'
import { logger } from '@/utils/logger'

// === ENUMS ===

export enum MetricType {
  MEMORY_USAGE = 'memory_usage',
  CPU_USAGE = 'cpu_usage',
  EVENT_LOOP_LAG = 'event_loop_lag',
  CACHE_HIT_RATE = 'cache_hit_rate',
  CACHE_MEMORY = 'cache_memory',
  GC_METRICS = 'gc_metrics',
  REQUEST_COUNT = 'request_count',
  REQUEST_DURATION = 'request_duration',
}

export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DEGRADING = 'degrading',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// === ZOD SCHEMAS ===

export const monitorConfigSchema = z.object({
  collectInterval: z.number().min(100).default(5000), // 5 seconds
  retentionPeriod: z
    .number()
    .min(1000)
    .default(24 * 60 * 60 * 1000), // 24 hours, min 1 second for tests
  maxMetricsInMemory: z.number().min(100).default(10000),
  enableSystemMetrics: z.boolean().default(true),
  enableCacheMetrics: z.boolean().default(true),
  enableGCMetrics: z.boolean().default(true),
  cacheManager: z.instanceof(CacheManager).optional(),
})

export const metricSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(MetricType),
  name: z.string(),
  value: z.number(),
  timestamp: z.number(),
  metadata: z.record(z.any()).optional(),
})

export const alertThresholdSchema = z.object({
  metricType: z.nativeEnum(MetricType),
  condition: z.enum(['greater_than', 'less_than', 'equals']),
  value: z.number(),
  severity: z.nativeEnum(AlertSeverity),
  description: z.string().optional(),
})

export const alertSchema = z.object({
  id: z.string(),
  type: z.string(),
  metricType: z.nativeEnum(MetricType),
  severity: z.nativeEnum(AlertSeverity),
  threshold: z.number(),
  currentValue: z.number(),
  message: z.string(),
  timestamp: z.number(),
  resolved: z.boolean().default(false),
  resolvedAt: z.number().optional(),
})

// === TYPES ===

export type MonitorConfig = z.infer<typeof monitorConfigSchema>
export type Metric = z.infer<typeof metricSchema>
export type AlertThreshold = z.infer<typeof alertThresholdSchema>
export type Alert = z.infer<typeof alertSchema>

export interface PerformanceTrend {
  direction: TrendDirection
  slope: number
  confidence: number
  dataPoints: number
  timespan: number
}

export interface SystemMetrics {
  memoryUsage: number // Percentage
  heapUsed: number // Bytes
  heapTotal: number // Bytes
  rss: number // Bytes
  cpuUsage: number // Percentage
  eventLoopLag: number // Milliseconds
  gcMetrics?: {
    gcCount: number
    gcDuration: number
    majorGC: number
    minorGC: number
  }
}

export interface CacheMetrics {
  hitRate: number
  totalHits: number
  totalMisses: number
  memoryUsage: number
  compressionRatio: number
  averageAccessTime: number
}

export interface PerformanceScore {
  overall: number // 0-100
  memory: number
  cpu: number
  cache: number
  eventLoop: number
  breakdown: {
    memory: { score: number; weight: number }
    cpu: { score: number; weight: number }
    cache: { score: number; weight: number }
    eventLoop: { score: number; weight: number }
  }
}

export interface PerformanceTrends {
  memoryTrend: PerformanceTrend
  cpuTrend: PerformanceTrend
  cacheTrend?: PerformanceTrend
  eventLoopTrend: PerformanceTrend
}

export interface PerformanceRecommendation {
  type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  action: string
  estimatedImprovement: string
}

export interface DashboardData {
  timestamp: number
  performanceScore: PerformanceScore
  systemMetrics: SystemMetrics
  cacheMetrics?: CacheMetrics
  alerts: Alert[]
  recommendations: PerformanceRecommendation[]
  trends: PerformanceTrends
}

// === MAIN CLASS ===

export class PerformanceMonitor {
  private config: MonitorConfig
  private metrics: Map<string, Metric[]> = new Map()
  private alerts: Map<string, Alert> = new Map()
  private alertThresholds: Map<string, AlertThreshold> = new Map()
  private running = false
  private collectInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private gcMetricsEnabled = false
  private lastCpuUsage?: NodeJS.CpuUsage

  // Event loop lag measurement
  private eventLoopStart = process.hrtime.bigint()

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = monitorConfigSchema.parse(config)
    this.setupGCMetrics()
    this.start()
  }

  private setupGCMetrics(): void {
    if (!this.config.enableGCMetrics) return

    try {
      // Try to enable GC metrics if available
      if (typeof global.gc === 'function') {
        this.gcMetricsEnabled = true
        logger.info('GC metrics enabled')
      }
    } catch (error) {
      logger.warn('Failed to setup GC metrics', { error })
    }
  }

  private start(): void {
    this.running = true

    // Start metrics collection
    this.collectInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.collectInterval)

    // Start cleanup process
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics()
    }, this.config.retentionPeriod / 4) // Cleanup every quarter of retention period

    logger.info('PerformanceMonitor started', {
      collectInterval: this.config.collectInterval,
      retentionPeriod: this.config.retentionPeriod,
    })
  }

  async stop(): Promise<void> {
    this.running = false

    if (this.collectInterval) {
      clearInterval(this.collectInterval)
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    logger.info('PerformanceMonitor stopped')
  }

  isRunning(): boolean {
    return this.running
  }

  // === METRIC COLLECTION ===

  private async collectMetrics(): Promise<void> {
    try {
      if (this.config.enableSystemMetrics) {
        await this.collectSystemMetrics()
      }

      if (this.config.enableCacheMetrics && this.config.cacheManager) {
        await this.collectCacheMetrics()
      }

      // Check alerts after collecting metrics
      await this.checkAlerts()
    } catch (error) {
      logger.error('Error collecting metrics', { error })
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Memory metrics
      const memUsage = process.memoryUsage()
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100

      await this.recordMetric(
        MetricType.MEMORY_USAGE,
        'heap_usage_percent',
        memoryUsagePercent,
        {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
        }
      )

      // CPU metrics
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage)
      this.lastCpuUsage = process.cpuUsage()

      const totalCpuTime = currentCpuUsage.user + currentCpuUsage.system
      const cpuPercent =
        (totalCpuTime / (this.config.collectInterval * 1000)) * 100 // Convert to percentage

      await this.recordMetric(
        MetricType.CPU_USAGE,
        'cpu_percent',
        Math.min(cpuPercent, 100),
        {
          user: currentCpuUsage.user,
          system: currentCpuUsage.system,
          total: totalCpuTime,
        }
      )

      // Event loop lag
      await this.measureEventLoopLag()

      // GC metrics
      if (this.gcMetricsEnabled) {
        await this.collectGCMetrics()
      }
    } catch (error) {
      logger.error('Error collecting system metrics', { error })
    }
  }

  private async measureEventLoopLag(): Promise<void> {
    const start = process.hrtime.bigint()
    setImmediate(async () => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000 // Convert to milliseconds

      await this.recordMetric(
        MetricType.EVENT_LOOP_LAG,
        'event_loop_lag',
        lag,
        {
          measurement: 'setImmediate_delay',
        }
      )
    })
  }

  private async collectGCMetrics(): Promise<void> {
    // This is a simplified version - in production you'd use something like
    // @nodejs/gc-stats or similar package for proper GC monitoring
    try {
      const gcInfo = {
        gcCount: 0,
        gcDuration: 0,
        majorGC: 0,
        minorGC: 0,
      }

      await this.recordMetric(
        MetricType.GC_METRICS,
        'gc_count',
        gcInfo.gcCount,
        gcInfo
      )
    } catch (error) {
      logger.error('Error collecting GC metrics', { error })
    }
  }

  private async collectCacheMetrics(): Promise<void> {
    if (!this.config.cacheManager) return

    try {
      const stats = await this.config.cacheManager.getStats()

      const totalRequests = (stats.hits || 0) + (stats.misses || 0)
      const hitRate = totalRequests > 0 ? (stats.hits || 0) / totalRequests : 0

      await this.recordMetric(
        MetricType.CACHE_HIT_RATE,
        'cache_hit_rate',
        hitRate * 100,
        {
          hits: stats.hits || 0,
          misses: stats.misses || 0,
          totalRequests,
        }
      )

      await this.recordMetric(
        MetricType.CACHE_MEMORY,
        'cache_memory_usage',
        stats.memoryUsage || 0,
        {
          compressionRatio: stats.compressionRatio || 0,
          averageAccessTime: stats.averageAccessTime || 0,
        }
      )
    } catch (error) {
      logger.error('Error collecting cache metrics', { error })
    }
  }

  // === METRIC RECORDING ===

  async recordMetric(
    type: MetricType,
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const metric: Metric = {
      id: `${type}_${name}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      type,
      name,
      value,
      timestamp: metadata?.timestamp || Date.now(),
      metadata,
    }

    // Validate metric
    metricSchema.parse(metric)

    // Store metric
    const key = `${type}:${name}`
    if (!this.metrics.has(key)) {
      this.metrics.set(key, [])
    }

    const metricArray = this.metrics.get(key)!
    metricArray.push(metric)

    // Enforce memory limits
    if (metricArray.length > this.config.maxMetricsInMemory) {
      // Remove oldest metrics (keep newest)
      metricArray.splice(0, metricArray.length - this.config.maxMetricsInMemory)
    }
  }

  // === ALERTS ===

  addAlertThreshold(name: string, threshold: AlertThreshold): void {
    alertThresholdSchema.parse(threshold)
    this.alertThresholds.set(name, threshold)
    logger.info('Alert threshold added', { name, threshold })
  }

  removeAlertThreshold(name: string): void {
    this.alertThresholds.delete(name)
    logger.info('Alert threshold removed', { name })
  }

  async checkAlerts(): Promise<void> {
    for (const [name, threshold] of this.alertThresholds.entries()) {
      await this.evaluateAlertThreshold(name, threshold)
    }
  }

  private async evaluateAlertThreshold(
    name: string,
    threshold: AlertThreshold
  ): Promise<void> {
    try {
      // Get recent metrics for this threshold type
      const recentMetrics = await this.getRecentMetrics(
        threshold.metricType,
        60000
      ) // Last minute

      if (recentMetrics.length === 0) return

      const latestMetric = recentMetrics[recentMetrics.length - 1]
      const currentValue = latestMetric.value

      let shouldAlert = false

      switch (threshold.condition) {
        case 'greater_than':
          shouldAlert = currentValue > threshold.value
          break
        case 'less_than':
          shouldAlert = currentValue < threshold.value
          break
        case 'equals':
          shouldAlert = Math.abs(currentValue - threshold.value) < 0.01
          break
      }

      const existingAlert = this.alerts.get(name)

      if (shouldAlert && (!existingAlert || existingAlert.resolved)) {
        // Create new alert
        const alert: Alert = {
          id: `alert_${name}_${Date.now()}`,
          type: name,
          metricType: threshold.metricType,
          severity: threshold.severity,
          threshold: threshold.value,
          currentValue,
          message: this.generateAlertMessage(name, threshold, currentValue),
          timestamp: Date.now(),
          resolved: false,
        }

        this.alerts.set(name, alert)
        logger.warn('Alert triggered', alert)
      } else if (!shouldAlert && existingAlert && !existingAlert.resolved) {
        // Resolve existing alert
        existingAlert.resolved = true
        existingAlert.resolvedAt = Date.now()
        logger.info('Alert resolved', { alertId: existingAlert.id })
      }
    } catch (error) {
      logger.error('Error evaluating alert threshold', { name, error })
    }
  }

  private generateAlertMessage(
    name: string,
    threshold: AlertThreshold,
    currentValue: number
  ): string {
    const condition = threshold.condition.replace('_', ' ')
    return `${name}: ${threshold.metricType} is ${currentValue.toFixed(
      2
    )} (${condition} ${threshold.value})`
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  // === DATA RETRIEVAL ===

  async getMetrics(startTime: number, endTime: number): Promise<Metric[]> {
    const allMetrics: Metric[] = []

    for (const metricArray of this.metrics.values()) {
      const filteredMetrics = metricArray.filter(
        m => m.timestamp >= startTime && m.timestamp <= endTime
      )
      allMetrics.push(...filteredMetrics)
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp)
  }

  private async getRecentMetrics(
    type: MetricType,
    timeWindow: number
  ): Promise<Metric[]> {
    const now = Date.now()
    const allMetrics: Metric[] = []

    for (const [key, metricArray] of this.metrics.entries()) {
      if (key.startsWith(`${type}:`)) {
        const recentMetrics = metricArray.filter(
          m => m.timestamp >= now - timeWindow
        )
        allMetrics.push(...recentMetrics)
      }
    }

    return allMetrics.sort((a, b) => a.timestamp - b.timestamp)
  }

  // === ANALYTICS ===

  async getPerformanceScore(): Promise<number> {
    const scoreData = await this.getDetailedPerformanceScore()
    return scoreData.overall
  }

  async getDetailedPerformanceScore(): Promise<PerformanceScore> {
    const now = Date.now()
    const timeWindow = 5 * 60 * 1000 // 5 minutes

    // Get recent metrics
    const memoryMetrics = await this.getRecentMetrics(
      MetricType.MEMORY_USAGE,
      timeWindow
    )
    const cpuMetrics = await this.getRecentMetrics(
      MetricType.CPU_USAGE,
      timeWindow
    )
    const eventLoopMetrics = await this.getRecentMetrics(
      MetricType.EVENT_LOOP_LAG,
      timeWindow
    )
    const cacheMetrics = await this.getRecentMetrics(
      MetricType.CACHE_HIT_RATE,
      timeWindow
    )

    // Calculate individual scores
    const memoryScore = this.calculateMemoryScore(memoryMetrics)
    const cpuScore = this.calculateCpuScore(cpuMetrics)
    const eventLoopScore = this.calculateEventLoopScore(eventLoopMetrics)
    const cacheScore = this.calculateCacheScore(cacheMetrics)

    // Weights for different metrics
    const weights = {
      memory: 0.3,
      cpu: 0.25,
      cache: this.config.enableCacheMetrics ? 0.25 : 0,
      eventLoop: 0.2,
    }

    // Adjust weights if cache is disabled
    if (!this.config.enableCacheMetrics) {
      weights.memory = 0.35
      weights.cpu = 0.35
      weights.eventLoop = 0.3
    }

    const overall = Math.round(
      memoryScore * weights.memory +
        cpuScore * weights.cpu +
        cacheScore * weights.cache +
        eventLoopScore * weights.eventLoop
    )

    return {
      overall,
      memory: memoryScore,
      cpu: cpuScore,
      cache: cacheScore,
      eventLoop: eventLoopScore,
      breakdown: {
        memory: { score: memoryScore, weight: weights.memory },
        cpu: { score: cpuScore, weight: weights.cpu },
        cache: { score: cacheScore, weight: weights.cache },
        eventLoop: { score: eventLoopScore, weight: weights.eventLoop },
      },
    }
  }

  private calculateMemoryScore(metrics: Metric[]): number {
    if (metrics.length === 0) return 100

    const latestMemory = metrics[metrics.length - 1].value

    // Score based on memory usage percentage
    if (latestMemory <= 50) return 100
    if (latestMemory <= 70) return 80
    if (latestMemory <= 85) return 60
    if (latestMemory <= 95) return 30
    return 10
  }

  private calculateCpuScore(metrics: Metric[]): number {
    if (metrics.length === 0) return 100

    const avgCpu = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length

    // Score based on CPU usage percentage
    if (avgCpu <= 30) return 100
    if (avgCpu <= 50) return 80
    if (avgCpu <= 70) return 60
    if (avgCpu <= 90) return 30
    return 10
  }

  private calculateEventLoopScore(metrics: Metric[]): number {
    if (metrics.length === 0) return 100

    const avgLag = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length

    // Score based on event loop lag in milliseconds
    if (avgLag <= 1) return 100
    if (avgLag <= 5) return 80
    if (avgLag <= 10) return 60
    if (avgLag <= 50) return 30
    return 10
  }

  private calculateCacheScore(metrics: Metric[]): number {
    if (metrics.length === 0) return 100

    const avgHitRate =
      metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length

    // Score based on cache hit rate percentage
    if (avgHitRate >= 90) return 100
    if (avgHitRate >= 80) return 80
    if (avgHitRate >= 70) return 60
    if (avgHitRate >= 50) return 40
    return 20
  }

  async getPerformanceTrends(): Promise<PerformanceTrends> {
    const timeWindow = 30 * 60 * 1000 // 30 minutes

    const memoryTrend = await this.calculateTrend(
      MetricType.MEMORY_USAGE,
      timeWindow
    )
    const cpuTrend = await this.calculateTrend(MetricType.CPU_USAGE, timeWindow)
    const eventLoopTrend = await this.calculateTrend(
      MetricType.EVENT_LOOP_LAG,
      timeWindow
    )
    const cacheTrend = this.config.enableCacheMetrics
      ? await this.calculateTrend(MetricType.CACHE_HIT_RATE, timeWindow)
      : undefined

    return {
      memoryTrend,
      cpuTrend,
      eventLoopTrend,
      cacheTrend,
    }
  }

  private async calculateTrend(
    metricType: MetricType,
    timeWindow: number
  ): Promise<PerformanceTrend> {
    const metrics = await this.getRecentMetrics(metricType, timeWindow)

    if (metrics.length < 3) {
      return {
        direction: TrendDirection.STABLE,
        slope: 0,
        confidence: 0,
        dataPoints: metrics.length,
        timespan: timeWindow,
      }
    }

    // Simple linear regression
    const n = metrics.length
    const sumX = metrics.reduce((sum, _, index) => sum + index, 0)
    const sumY = metrics.reduce((sum, m) => sum + m.value, 0)
    const sumXY = metrics.reduce((sum, m, index) => sum + index * m.value, 0)
    const sumXX = metrics.reduce((sum, _, index) => sum + index * index, 0)

    const denominator = n * sumXX - sumX * sumX
    const slope =
      denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0

    // Determine trend direction
    let direction: TrendDirection
    const threshold = 0.5 // Sensitivity threshold

    if (Math.abs(slope) < threshold) {
      direction = TrendDirection.STABLE
    } else if (slope > 0) {
      direction = TrendDirection.DEGRADING
    } else {
      direction = TrendDirection.IMPROVING
    }

    // Calculate confidence based on data consistency
    const avgValue = sumY / n
    const variance =
      metrics.reduce((sum, m) => sum + Math.pow(m.value - avgValue, 2), 0) / n
    const confidence =
      avgValue > 0
        ? Math.max(0, Math.min(1, 1 - variance / (avgValue * avgValue)))
        : 0

    return {
      direction,
      slope,
      confidence,
      dataPoints: n,
      timespan: timeWindow,
    }
  }

  async getPerformanceRecommendations(): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = []
    const scoreData = await this.getDetailedPerformanceScore()
    const trends = await this.getPerformanceTrends()

    // Memory recommendations
    if (scoreData.memory < 70) {
      recommendations.push({
        type: 'memory_optimization',
        priority: scoreData.memory < 30 ? 'critical' : 'high',
        description: 'High memory usage detected',
        impact:
          'System performance may degrade, potential out-of-memory errors',
        action:
          'Review memory usage patterns, implement garbage collection optimization, check for memory leaks',
        estimatedImprovement: '15-30% performance increase',
      })
    }

    // CPU recommendations
    if (scoreData.cpu < 60) {
      recommendations.push({
        type: 'cpu_optimization',
        priority: scoreData.cpu < 30 ? 'critical' : 'high',
        description: 'High CPU usage detected',
        impact: 'Slower response times, potential request timeouts',
        action:
          'Optimize CPU-intensive operations, implement better caching, review algorithms',
        estimatedImprovement: '20-40% response time improvement',
      })
    }

    // Cache recommendations
    if (this.config.enableCacheMetrics && scoreData.cache < 70) {
      recommendations.push({
        type: 'cache_optimization',
        priority: 'medium',
        description: 'Poor cache performance detected',
        impact: 'Increased response times, higher resource usage',
        action:
          'Review cache TTL settings, optimize cache keys, implement cache warming strategies',
        estimatedImprovement: '25-50% response time improvement',
      })
    }

    // Event loop recommendations
    if (scoreData.eventLoop < 60) {
      recommendations.push({
        type: 'event_loop_optimization',
        priority: scoreData.eventLoop < 30 ? 'critical' : 'high',
        description: 'High event loop lag detected',
        impact: 'Blocked event loop, unresponsive application',
        action:
          'Review synchronous operations, implement proper async patterns, use worker threads for CPU-intensive tasks',
        estimatedImprovement: '30-60% responsiveness improvement',
      })
    }

    // Trend-based recommendations
    if (trends.memoryTrend.direction === TrendDirection.DEGRADING) {
      recommendations.push({
        type: 'memory_trend_warning',
        priority: 'medium',
        description: 'Memory usage is trending upward',
        impact: 'Potential future memory issues',
        action:
          'Monitor memory usage closely, implement proactive memory management',
        estimatedImprovement: 'Prevention of future performance issues',
      })
    }

    return recommendations
  }

  // === DASHBOARD & EXPORT ===

  async getDashboardData(): Promise<DashboardData> {
    const performanceScore = await this.getDetailedPerformanceScore()
    const systemMetrics = await this.getCurrentSystemMetrics()
    const cacheMetrics = this.config.enableCacheMetrics
      ? await this.getCurrentCacheMetrics()
      : undefined
    const alerts = await this.getActiveAlerts()
    const recommendations = await this.getPerformanceRecommendations()
    const trends = await this.getPerformanceTrends()

    return {
      timestamp: Date.now(),
      performanceScore,
      systemMetrics,
      cacheMetrics,
      alerts,
      recommendations,
      trends,
    }
  }

  private async getCurrentSystemMetrics(): Promise<SystemMetrics> {
    const memUsage = process.memoryUsage()
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100

    // Get latest CPU and event loop metrics
    const cpuMetrics = await this.getRecentMetrics(MetricType.CPU_USAGE, 60000)
    const eventLoopMetrics = await this.getRecentMetrics(
      MetricType.EVENT_LOOP_LAG,
      60000
    )

    const latestCpu =
      cpuMetrics.length > 0 ? cpuMetrics[cpuMetrics.length - 1].value : 0
    const latestEventLoop =
      eventLoopMetrics.length > 0
        ? eventLoopMetrics[eventLoopMetrics.length - 1].value
        : 0

    return {
      memoryUsage: memoryUsagePercent,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss,
      cpuUsage: latestCpu,
      eventLoopLag: latestEventLoop,
    }
  }

  private async getCurrentCacheMetrics(): Promise<CacheMetrics | undefined> {
    if (!this.config.cacheManager) return undefined

    try {
      const stats = await this.config.cacheManager.getStats()
      const totalRequests = (stats.hits || 0) + (stats.misses || 0)

      return {
        hitRate: totalRequests > 0 ? (stats.hits || 0) / totalRequests : 0,
        totalHits: stats.hits || 0,
        totalMisses: stats.misses || 0,
        memoryUsage: stats.memoryUsage || 0,
        compressionRatio: stats.compressionRatio || 0,
        averageAccessTime: stats.averageAccessTime || 0,
      }
    } catch (error) {
      logger.error('Error getting current cache metrics', { error })
      return undefined
    }
  }

  async exportMetrics(format: 'json' | 'prometheus' = 'json'): Promise<string> {
    const now = Date.now()
    const timeRange = {
      start: now - this.config.retentionPeriod,
      end: now,
    }

    const metrics = await this.getMetrics(timeRange.start, timeRange.end)

    if (format === 'prometheus') {
      return this.exportPrometheusFormat(metrics)
    }

    return JSON.stringify(
      {
        exportedAt: new Date(now).toISOString(),
        timeRange,
        metrics,
        alerts: Array.from(this.alerts.values()),
      },
      null,
      2
    )
  }

  private exportPrometheusFormat(metrics: Metric[]): string {
    const prometheusMetrics: Map<string, string[]> = new Map()

    for (const metric of metrics) {
      const metricName = `perf_${metric.type}_${metric.name}`.replace(
        /[^a-zA-Z0-9_]/g,
        '_'
      )

      if (!prometheusMetrics.has(metricName)) {
        prometheusMetrics.set(metricName, [])
      }

      const labels = metric.metadata
        ? Object.entries(metric.metadata)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',')
        : ''

      const labelsStr = labels ? `{${labels}}` : ''
      prometheusMetrics
        .get(metricName)!
        .push(`${metricName}${labelsStr} ${metric.value} ${metric.timestamp}`)
    }

    let output = ''
    for (const [metricName, values] of prometheusMetrics.entries()) {
      output += `# HELP ${metricName} Performance metric\n`
      output += `# TYPE ${metricName} gauge\n`
      output += values.join('\n') + '\n\n'
    }

    return output
  }

  // === CLEANUP ===

  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod

    let totalCleaned = 0

    for (const [key, metricArray] of this.metrics.entries()) {
      const originalLength = metricArray.length
      const filteredMetrics = metricArray.filter(m => m.timestamp > cutoffTime)

      if (filteredMetrics.length !== originalLength) {
        this.metrics.set(key, filteredMetrics)
        totalCleaned += originalLength - filteredMetrics.length
      }
    }

    // Cleanup resolved alerts older than retention period
    const resolvedAlertsToRemove: string[] = []
    for (const [key, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt < cutoffTime) {
        resolvedAlertsToRemove.push(key)
      }
    }

    for (const key of resolvedAlertsToRemove) {
      this.alerts.delete(key)
    }

    if (totalCleaned > 0) {
      logger.info('Cleaned up old metrics', {
        metricsRemoved: totalCleaned,
        alertsRemoved: resolvedAlertsToRemove.length,
        cutoffTime: new Date(cutoffTime).toISOString(),
      })
    }
  }
}
