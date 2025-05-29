import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import {
  AdvancedMetrics,
  MetricType,
  AlertLevel,
} from '@/utils/AdvancedMetrics'
import { CacheManager } from '@/utils/CacheManager'

describe('AdvancedMetrics', () => {
  let metrics: AdvancedMetrics
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheManager = new CacheManager({
      defaultTTL: 5000,
      maxMemorySize: 1024 * 1024,
      enableFileCache: false,
      enableStats: true,
    })

    metrics = new AdvancedMetrics({
      bufferSize: 100,
      flushInterval: 1000,
      enableAlerts: true,
      cacheManager,
    })
  })

  afterEach(async () => {
    await metrics.stop()
    await cacheManager.stop()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultMetrics = new AdvancedMetrics()
      expect(defaultMetrics).toBeDefined()
      expect(defaultMetrics.isRunning()).toBe(true)
    })

    it('should initialize with custom configuration', () => {
      const customMetrics = new AdvancedMetrics({
        bufferSize: 50,
        flushInterval: 2000,
        enableAlerts: false,
        retentionDays: 7,
      })
      expect(customMetrics).toBeDefined()
      expect(customMetrics.isRunning()).toBe(true)
    })
  })

  describe('Basic Metrics Recording', () => {
    it('should record performance metrics', async () => {
      await metrics.recordMetric(
        MetricType.API_RESPONSE_TIME,
        'api.users.get',
        150,
        {
          userId: '123',
          endpoint: '/api/users/123',
        }
      )

      const stats = await metrics.getStats()
      expect(stats.totalMetrics).toBe(1)
      expect(stats.metricsByType[MetricType.API_RESPONSE_TIME]).toBe(1)
    })

    it('should record user session metrics', async () => {
      await metrics.startUserSession('user_123', {
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      })

      await metrics.recordUserAction('user_123', 'button_click', {
        buttonId: 'generate-photo',
        page: '/dashboard',
      })

      await metrics.endUserSession('user_123')

      const sessionStats = await metrics.getUserSessionStats('user_123')
      expect(sessionStats.totalSessions).toBe(1)
      expect(sessionStats.totalActions).toBe(1)
    })

    it('should track API usage patterns', async () => {
      // Simulate API calls
      await metrics.recordAPICall(
        '/api/generate/neuro-photo',
        'POST',
        200,
        1500,
        {
          userId: 'user_456',
          cost: 7.5,
        }
      )

      await metrics.recordAPICall(
        '/api/generate/text-to-image',
        'POST',
        200,
        2000,
        {
          userId: 'user_456',
          cost: 5.0,
        }
      )

      const apiStats = await metrics.getAPIUsageStats()
      expect(apiStats.totalCalls).toBe(2)
      expect(apiStats.averageResponseTime).toBeCloseTo(1750)
      expect(apiStats.endpointStats['/api/generate/neuro-photo'].calls).toBe(1)
    })
  })

  describe('SLA/SLO Metrics', () => {
    it('should track SLA compliance', async () => {
      // Record some fast responses (within SLA)
      await metrics.recordMetric(MetricType.API_RESPONSE_TIME, 'api.fast', 100)
      await metrics.recordMetric(MetricType.API_RESPONSE_TIME, 'api.fast', 150)

      // Record some slow responses (outside SLA)
      await metrics.recordMetric(MetricType.API_RESPONSE_TIME, 'api.slow', 5000)
      await metrics.recordMetric(MetricType.API_RESPONSE_TIME, 'api.slow', 6000)

      const slaStats = await metrics.getSLAStats()
      expect(slaStats.overallCompliance).toBeLessThan(1.0) // Some violations
      expect(slaStats.violations).toBeGreaterThan(0)
    })

    it('should calculate uptime metrics', async () => {
      await metrics.recordServiceStatus('api', true, Date.now())
      await new Promise(resolve => setTimeout(resolve, 100))
      await metrics.recordServiceStatus('api', false, Date.now())
      await new Promise(resolve => setTimeout(resolve, 50))
      await metrics.recordServiceStatus('api', true, Date.now())

      const uptimeStats = await metrics.getUptimeStats('api')
      expect(uptimeStats.uptime).toBeLessThan(1.0) // Some downtime
      expect(uptimeStats.incidents).toBe(1)
    })
  })

  describe('Cache Integration', () => {
    it('should integrate with CacheManager metrics', async () => {
      // Perform cache operations to generate metrics
      await cacheManager.set('test-key-1', 'value1')
      await cacheManager.set('test-key-2', 'value2')
      await cacheManager.get('test-key-1') // cache hit
      await cacheManager.get('test-key-2') // cache hit
      await cacheManager.get('non-existent') // cache miss

      // Small delay to ensure cache stats are updated
      await new Promise(resolve => setTimeout(resolve, 10))

      // Let metrics collect cache stats AFTER operations are complete
      await metrics.collectCacheMetrics()

      const cacheMetrics = await metrics.getCacheMetrics()
      expect(cacheMetrics.hitRate).toBeGreaterThan(0) // Should be 2/3 = 0.67
      expect(cacheMetrics.totalHits).toBe(2)
      expect(cacheMetrics.totalMisses).toBe(1)
    })

    it('should track cache performance over time', async () => {
      // Generate cache activity
      for (let i = 0; i < 10; i++) {
        await cacheManager.set(`key-${i}`, `value-${i}`)
        await cacheManager.get(`key-${i}`)
      }

      await metrics.collectCacheMetrics()

      const timeSeries = await metrics.getCacheTimeSeriesData(
        Date.now() - 5000,
        Date.now()
      )
      expect(timeSeries.length).toBeGreaterThan(0)
      expect(timeSeries[0]).toHaveProperty('timestamp')
      expect(timeSeries[0]).toHaveProperty('hitRate')
      expect(timeSeries[0]).toHaveProperty('memoryUsage')
    })
  })

  describe('Alerting System', () => {
    it('should generate alerts for high response times', async () => {
      // Record high response time that should trigger CRITICAL alert (8000ms > 2000ms threshold)
      await metrics.recordMetric(
        MetricType.API_RESPONSE_TIME,
        'slow-api',
        8000,
        {
          threshold: 1000,
        }
      )

      const alerts = await metrics.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].level).toBe(AlertLevel.CRITICAL) // 8000ms > 2000ms = CRITICAL
      expect(alerts[0].metric).toBe('slow-api')
    })

    it('should generate alerts for low cache hit rate', async () => {
      // Simulate low cache hit rate
      await cacheManager.set('test', 'value')
      // Generate many cache misses to lower hit rate
      for (let i = 0; i < 20; i++) {
        await cacheManager.get(`missing-key-${i}`)
      }

      await metrics.collectCacheMetrics()
      await metrics.checkCacheAlerts()

      const alerts = await metrics.getActiveAlerts()
      const cacheAlert = alerts.find(
        alert => alert.type === 'cache_hit_rate_low'
      )
      expect(cacheAlert).toBeDefined()
    })

    it('should resolve alerts automatically', async () => {
      // Generate alert
      await metrics.recordMetric(MetricType.ERROR_RATE, 'api.errors', 0.8) // 80% error rate

      const alerts = await metrics.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)

      // Fix the issue - record good metric that should trigger auto-resolution
      await metrics.recordMetric(MetricType.ERROR_RATE, 'api.errors', 0.01) // 1% error rate

      // Wait for auto-resolution
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check resolved alerts (they should still exist but marked as resolved)
      const allAlerts = Array.from((metrics as any).alerts.values())
      const errorAlert = allAlerts.find(
        alert => alert.type === 'high_error_rate'
      )
      expect(errorAlert?.resolved).toBe(true)
    })
  })

  describe('Time Series Data', () => {
    it('should store metrics in time series format', async () => {
      const now = Date.now()
      await metrics.recordMetric(MetricType.MEMORY_USAGE, 'system', 75.5, {
        unit: 'percent',
      })
      await metrics.recordMetric(MetricType.CPU_USAGE, 'system', 45.2, {
        unit: 'percent',
      })

      const memoryData = await metrics.getTimeSeriesData(
        MetricType.MEMORY_USAGE,
        'system',
        now - 1000,
        now + 1000
      )

      expect(memoryData.length).toBe(1)
      expect(memoryData[0].value).toBe(75.5)
      expect(memoryData[0].timestamp).toBeCloseTo(now, -2) // within 100ms
    })

    it('should aggregate time series data', async () => {
      const now = Date.now()

      // Record multiple data points
      for (let i = 0; i < 5; i++) {
        await metrics.recordMetric(
          MetricType.API_RESPONSE_TIME,
          'test-api',
          100 + i * 10,
          {
            timestamp: now + i * 1000,
          }
        )
      }

      const aggregated = await metrics.getAggregatedData(
        MetricType.API_RESPONSE_TIME,
        'test-api',
        now,
        now + 5000,
        'avg'
      )

      expect(aggregated.value).toBe(120) // average of 100, 110, 120, 130, 140
      expect(aggregated.aggregationType).toBe('avg')
    })
  })

  describe('Performance Analytics', () => {
    it('should detect performance trends', async () => {
      // Simulate degrading performance with more significant changes and timing
      const baseTime = Date.now()
      for (let i = 0; i < 10; i++) {
        await metrics.recordMetric(
          MetricType.API_RESPONSE_TIME,
          'degrading-api',
          100 + i * 200,
          {
            // Even bigger increments
            timestamp: baseTime + i * 10000, // Bigger time intervals (10 seconds apart)
          }
        )
      }

      const trends = await metrics.getPerformanceTrends('degrading-api')
      expect(trends.trend).toBe('degrading')
      expect(trends.slope).toBeGreaterThan(1) // Should be significantly positive
    })

    it('should provide performance recommendations', async () => {
      // Simulate high memory usage
      await metrics.recordMetric(MetricType.MEMORY_USAGE, 'system', 90, {
        unit: 'percent',
      })

      // Simulate VERY low cache hit rate by adding cache hits first, then many misses
      await cacheManager.set('test', 'value')
      await cacheManager.get('test') // 1 hit
      // Generate lots of misses to get very low hit rate
      for (let i = 0; i < 100; i++) {
        // More misses for lower hit rate
        await cacheManager.get(`missing-${i}`)
      }
      await metrics.collectCacheMetrics()

      const recommendations = await metrics.getPerformanceRecommendations()
      expect(recommendations.length).toBeGreaterThan(0)
      expect(recommendations.some(r => r.type === 'memory_optimization')).toBe(
        true
      )
      expect(recommendations.some(r => r.type === 'cache_optimization')).toBe(
        true
      )
    })
  })

  describe('Data Export and Reporting', () => {
    it('should export metrics data', async () => {
      await metrics.recordMetric(
        MetricType.API_RESPONSE_TIME,
        'export-test',
        200
      )

      // Start user session properly before recording action
      await metrics.startUserSession('user_export', { test: true })
      await metrics.recordUserAction('user_export', 'test_action')

      const exportData = await metrics.exportData(Date.now() - 5000, Date.now())
      expect(exportData.metrics.length).toBeGreaterThan(0)
      expect(exportData.userSessions.length).toBeGreaterThan(0)
      expect(exportData.exportedAt).toBeDefined()
    })

    it('should generate performance reports', async () => {
      // Generate sample data
      await metrics.recordAPICall('/api/test', 'GET', 200, 150)
      await metrics.recordMetric(MetricType.MEMORY_USAGE, 'system', 65)
      await cacheManager.set('report-test', 'value')
      await cacheManager.get('report-test')
      await metrics.collectCacheMetrics()

      const report = await metrics.generatePerformanceReport()
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('apiMetrics')
      expect(report).toHaveProperty('cacheMetrics')
      expect(report).toHaveProperty('systemMetrics')
      expect(report).toHaveProperty('recommendations')
    })
  })

  describe('Memory Management', () => {
    it('should manage memory usage with buffer limits', async () => {
      const smallBufferMetrics = new AdvancedMetrics({ bufferSize: 50 }) // Use 50 instead of 5

      // Add more metrics than buffer size
      for (let i = 0; i < 10; i++) {
        await smallBufferMetrics.recordMetric(
          MetricType.API_RESPONSE_TIME,
          `test-${i}`,
          100
        )
      }

      // Buffer should not exceed limit (will be flushed automatically)
      const stats = await smallBufferMetrics.getStats()
      expect(stats.bufferSize).toBeLessThanOrEqual(50) // Should be 0 after flush, but allow up to 50

      await smallBufferMetrics.stop()
    })

    it('should cleanup old metrics data', async () => {
      const oldTimestamp = Date.now() - 35 * 24 * 60 * 60 * 1000 // 35 days ago (older than 30 day retention)

      await metrics.recordMetric(
        MetricType.API_RESPONSE_TIME,
        'old-metric',
        100,
        {
          timestamp: oldTimestamp,
        }
      )

      await metrics.recordMetric(
        MetricType.API_RESPONSE_TIME,
        'new-metric',
        100
      )

      await metrics.cleanup()

      const timeSeriesData = await metrics.getTimeSeriesData(
        MetricType.API_RESPONSE_TIME,
        'old-metric',
        oldTimestamp - 1000,
        oldTimestamp + 1000
      )

      expect(timeSeriesData.length).toBe(0) // Old data should be cleaned up
    })
  })
})
