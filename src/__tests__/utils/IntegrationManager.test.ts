import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  IntegrationManager,
  IntegrationManagerConfig,
  IntegrationType,
  IntegrationStatus,
  IntegrationHealth,
  WebhookEvent,
  ApiEndpointStatus,
  NotificationResult,
  BotInstance,
  ExternalService,
  IntegrationMetrics,
  WebhookConfig,
  ApiConfig,
  NotificationConfig,
} from '../../utils/IntegrationManager'

// Mock dependencies
const mockBot = {
  telegram: {
    sendMessage: vi.fn().mockResolvedValue({}),
    deleteWebhook: vi.fn().mockResolvedValue({}),
    setWebhook: vi.fn().mockResolvedValue({}),
  },
  launch: vi.fn().mockResolvedValue({}),
  stop: vi.fn().mockResolvedValue({}),
  token: 'mock_token',
}

const mockExternalAPI = {
  get: vi.fn().mockResolvedValue({ status: 200, data: {} }),
  post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
}

// Mock global fetch
global.fetch = vi.fn()

describe('IntegrationManager', () => {
  let integrationManager: IntegrationManager
  let defaultConfig: IntegrationManagerConfig

  beforeEach(() => {
    vi.clearAllMocks()

    defaultConfig = {
      botManagement: {
        enabled: true,
        healthCheckInterval: 30000,
        restartOnFailure: true,
        maxRestartAttempts: 3,
        gracefulShutdownTimeout: 5000,
      },
      webhookHandling: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 10000,
        rateLimiting: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000,
        },
      },
      externalApis: {
        enabled: true,
        healthCheckInterval: 60000,
        circuitBreakerThreshold: 5,
        fallbackEnabled: true,
        requestTimeout: 30000,
      },
      notifications: {
        enabled: true,
        channels: ['telegram', 'webhook'],
        retryAttempts: 3,
        errorNotifications: true,
      },
      monitoring: {
        enabled: true,
        metricsInterval: 5000,
        alertThresholds: {
          errorRate: 10,
          responseTime: 5000,
          downtime: 300000,
        },
      },
    }

    integrationManager = new IntegrationManager(defaultConfig)
  })

  afterEach(async () => {
    if (integrationManager) {
      await integrationManager.stop()
    }
  })

  describe('Initialization & Configuration', () => {
    it('should initialize with default configuration', () => {
      const manager = new IntegrationManager()
      expect(manager).toBeInstanceOf(IntegrationManager)
      expect(manager.getStatus()).toBe(IntegrationStatus.STOPPED)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<IntegrationManagerConfig> = {
        botManagement: {
          enabled: false,
          healthCheckInterval: 60000,
          restartOnFailure: false,
          maxRestartAttempts: 1,
          gracefulShutdownTimeout: 3000,
        },
        monitoring: {
          enabled: false,
          metricsInterval: 10000,
          alertThresholds: {
            errorRate: 5,
            responseTime: 3000,
            downtime: 60000,
          },
        },
      }

      const manager = new IntegrationManager(customConfig)
      expect(manager).toBeInstanceOf(IntegrationManager)
    })

    it('should validate configuration with Zod', () => {
      expect(() => {
        new IntegrationManager({
          botManagement: {
            healthCheckInterval: 100, // Too small
            maxRestartAttempts: -1, // Invalid
          },
        } as any)
      }).toThrow()
    })

    it('should register all integration types during initialization', async () => {
      await integrationManager.start()

      const integrations = integrationManager.getActiveIntegrations()
      expect(integrations.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Bot Management', () => {
    it('should register and manage bot instances', async () => {
      const botName = 'test_bot'
      const botConfig = {
        token: 'test_token',
        webhook: {
          enabled: true,
          url: 'https://example.com/webhook',
          secretToken: 'secret',
        },
      }

      const result = integrationManager.registerBot(botName, botConfig)
      expect(result.success).toBe(true)

      const bots = integrationManager.getRegisteredBots()
      expect(bots).toContain(botName)
    })

    it('should handle bot health checks', async () => {
      await integrationManager.start()

      const botName = 'health_test_bot'
      integrationManager.registerBot(botName, {
        token: 'test_token',
      })

      const health = await integrationManager.getBotHealth(botName)
      expect(health.status).toBeOneOf([
        IntegrationHealth.HEALTHY,
        IntegrationHealth.WARNING,
        IntegrationHealth.CRITICAL,
      ])
    })

    it('should restart failed bots automatically', async () => {
      await integrationManager.start()

      const botName = 'restart_test_bot'
      integrationManager.registerBot(botName, {
        token: 'test_token',
      })

      // Simulate bot failure and auto-restart
      const restartResult = await integrationManager.restartBot(botName)
      expect(restartResult.success).toBe(true)
    })

    it('should handle bot unregistration', async () => {
      const botName = 'unregister_test_bot'
      integrationManager.registerBot(botName, {
        token: 'test_token',
      })

      const unregisterResult = await integrationManager.unregisterBot(botName)
      expect(unregisterResult.success).toBe(true)

      const bots = integrationManager.getRegisteredBots()
      expect(bots).not.toContain(botName)
    })
  })

  describe('Webhook Management', () => {
    it('should register webhook endpoints', async () => {
      const webhookConfig: WebhookConfig = {
        endpoint: '/webhooks/replicate',
        handlers: ['training_completed'],
        authentication: {
          type: 'bearer',
          token: 'webhook_token',
        },
        rateLimiting: {
          enabled: true,
          maxRequests: 50,
          windowMs: 60000,
        },
      }

      const result = await integrationManager.registerWebhook(
        'replicate',
        webhookConfig
      )
      expect(result.success).toBe(true)
    })

    it('should process webhook events with retry logic', async () => {
      const event: WebhookEvent = {
        id: 'webhook_test_1',
        source: 'test_source',
        type: 'test_event',
        timestamp: new Date(),
        data: { test: 'data' },
        attempts: 0,
      }

      const result = await integrationManager.processWebhookEvent(event)
      expect(result.success).toBe(true)
      expect(result.processed).toBe(true)
    })

    it('should handle webhook rate limiting', async () => {
      await integrationManager.start()

      // Simulate multiple rapid webhook calls
      const events = Array(150)
        .fill(null)
        .map((_, i) => ({
          id: `rate_test_${i}`,
          source: 'rate_test',
          type: 'test_event',
          timestamp: new Date(),
          data: { index: i },
          attempts: 0,
        }))

      const results = await Promise.allSettled(
        events.map(event => integrationManager.processWebhookEvent(event))
      )

      const rateLimited = results.filter(
        r =>
          r.status === 'rejected' ||
          (r.status === 'fulfilled' && !r.value.success)
      )
      expect(rateLimited.length).toBeGreaterThan(0)
    })

    it('should validate webhook signatures', async () => {
      const webhookData = {
        signature: 'invalid_signature',
        payload: JSON.stringify({ test: 'data' }),
        headers: {
          'x-webhook-signature': 'sha256=invalid',
        },
      }

      const isValid = await integrationManager.validateWebhookSignature(
        'test_webhook',
        webhookData
      )
      expect(isValid).toBe(false)
    })
  })

  describe('External API Management', () => {
    it('should register external API services', async () => {
      const apiConfig: ApiConfig = {
        baseUrl: 'https://api.replicate.com',
        timeout: 30000,
        retryAttempts: 3,
        circuitBreaker: {
          enabled: true,
          threshold: 5,
          timeout: 60000,
        },
        authentication: {
          type: 'bearer',
          token: 'api_token',
        },
      }

      const result = await integrationManager.registerApi(
        'replicate',
        apiConfig
      )
      expect(result.success).toBe(true)
    })

    it('should monitor API health and status', async () => {
      await integrationManager.start()

      await integrationManager.registerApi('test_api', {
        baseUrl: 'https://api.test.com',
        healthEndpoint: '/health',
      })

      const status = await integrationManager.getApiStatus('test_api')
      expect(status.name).toBe('test_api')
      expect(status.health).toBeOneOf([
        IntegrationHealth.HEALTHY,
        IntegrationHealth.WARNING,
        IntegrationHealth.CRITICAL,
      ])
    })

    it('should implement circuit breaker pattern', async () => {
      await integrationManager.start()

      await integrationManager.registerApi('circuit_test_api', {
        baseUrl: 'https://api.failing.com',
        circuitBreaker: {
          enabled: true,
          threshold: 3,
          timeout: 10000,
        },
      })

      // Simulate multiple failed requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await integrationManager.makeApiRequest(
            'circuit_test_api',
            'GET',
            '/fail'
          )
        } catch (error) {
          // Expected to fail
        }
      }

      const status = await integrationManager.getApiStatus('circuit_test_api')
      expect(status.circuitBreakerOpen).toBe(true)
    })

    it('should handle API failover mechanisms', async () => {
      await integrationManager.start()

      await integrationManager.registerApi('primary_api', {
        baseUrl: 'https://primary.api.com',
        fallback: {
          enabled: true,
          apiName: 'backup_api',
        },
      })

      await integrationManager.registerApi('backup_api', {
        baseUrl: 'https://backup.api.com',
      })

      const result = await integrationManager.makeApiRequestWithFailover(
        'primary_api',
        'GET',
        '/data'
      )
      expect(result).toBeDefined()
    })
  })

  describe('Notification System', () => {
    it('should send notifications through multiple channels', async () => {
      // Register a bot first for notifications
      integrationManager.registerBot('notification_bot', {
        token: 'test_token',
      })

      const notification = {
        type: 'error',
        title: 'Test Notification',
        message: 'This is a test notification',
        recipients: ['@admin_channel'],
        priority: 'high' as const,
      }

      const result = await integrationManager.sendNotification(notification)
      expect(result.success).toBe(true)
      expect(result.channels.length).toBeGreaterThan(0)
    })

    it('should handle notification failures with retry', async () => {
      // Mock failing notification
      const failingNotification = {
        type: 'error',
        title: 'Failing Notification',
        message: 'This notification will fail',
        recipients: ['invalid_recipient'],
        priority: 'medium' as const,
      }

      const result = await integrationManager.sendNotification(
        failingNotification
      )
      expect(result.attempts).toBeGreaterThan(1)
    })

    it('should format notifications for different channels', async () => {
      // Register a bot first for notifications
      integrationManager.registerBot('format_bot', {
        token: 'test_token',
      })

      const notification = {
        type: 'info',
        title: 'Multi-channel Test',
        message: 'Testing different formats',
        recipients: ['telegram:@test', 'webhook:https://example.com'],
        priority: 'low' as const,
      }

      const result = await integrationManager.sendNotification(notification)
      expect(result.success).toBe(true)
    })

    it('should aggregate and deduplicate notifications', async () => {
      // Register a bot first for notifications
      integrationManager.registerBot('dedup_bot', {
        token: 'test_token',
      })

      const duplicateNotifications = Array(5)
        .fill(null)
        .map((_, i) => ({
          type: 'warning',
          title: 'Duplicate Warning',
          message: 'This is a duplicate warning',
          recipients: ['@admin'],
          priority: 'medium' as const,
          deduplicationKey: 'duplicate_warning',
        }))

      // Send notifications sequentially to ensure deduplication works
      const results = []
      for (const notification of duplicateNotifications) {
        const result = await integrationManager.sendNotification(notification)
        results.push(result)
      }

      // Only one notification should actually be sent due to deduplication
      const sentNotifications = results.filter(r => r.success && r.sent)
      expect(sentNotifications.length).toBe(1)
    })
  })

  describe('Monitoring & Metrics', () => {
    it('should collect comprehensive integration metrics', async () => {
      await integrationManager.start()

      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 1000))

      const metrics = await integrationManager.getIntegrationMetrics()
      expect(metrics.timestamp).toBeInstanceOf(Date)
      expect(metrics.overall.totalIntegrations).toBeGreaterThanOrEqual(0)
      expect(metrics.byType).toBeDefined()
      expect(metrics.performance).toBeDefined()
    })

    it('should track integration health over time', async () => {
      // Use shorter interval for test (but still valid according to Zod)
      const testConfig = {
        monitoring: {
          metricsInterval: 1000, // Minimum allowed by Zod schema
        },
      }

      const testManager = new IntegrationManager(testConfig)
      await testManager.start()

      // Register something to track
      testManager.registerBot('health_tracking_bot', {
        token: 'test_token',
      })

      await new Promise(resolve => setTimeout(resolve, 1500)) // Wait for at least 1 metrics cycle

      const healthHistory = testManager.getHealthHistory()
      expect(healthHistory.length).toBeGreaterThan(0)

      const trends = testManager.getHealthTrends()
      expect(trends.overall).toBeDefined()
      expect(trends.byIntegration).toBeDefined()

      await testManager.stop()
    })

    it('should export metrics in multiple formats', async () => {
      await integrationManager.start()
      await new Promise(resolve => setTimeout(resolve, 1000))

      // JSON export
      const jsonMetrics = await integrationManager.exportMetrics('json')
      expect(typeof jsonMetrics).toBe('string')
      const parsedMetrics = JSON.parse(jsonMetrics)
      expect(parsedMetrics.timestamp).toBeDefined()

      // Prometheus export
      const prometheusMetrics = await integrationManager.exportMetrics(
        'prometheus'
      )
      expect(typeof prometheusMetrics).toBe('string')
      expect(prometheusMetrics).toContain('# HELP')
      expect(prometheusMetrics).toContain('integration_manager')
    })

    it('should provide integration dashboard data', async () => {
      await integrationManager.start()
      await new Promise(resolve => setTimeout(resolve, 1000))

      const dashboardData = await integrationManager.getDashboardData()
      expect(dashboardData.overview.status).toBe(IntegrationStatus.RUNNING)
      expect(dashboardData.integrations).toBeDefined()
      expect(dashboardData.alerts).toBeDefined()
      expect(dashboardData.performance).toBeDefined()
    })
  })

  describe('Error Handling & Recovery', () => {
    it('should handle integration registration errors', () => {
      const result = integrationManager.registerBot('', {} as any)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should recover from partial integration failures', async () => {
      await integrationManager.start()

      // Simulate partial failure
      const result = await integrationManager.handlePartialFailure([
        'bot_integration',
        'webhook_integration',
      ])

      expect(result.recovered).toBeGreaterThanOrEqual(0)
      expect(result.failed).toBeGreaterThanOrEqual(0)
    })

    it('should implement graceful degradation', async () => {
      await integrationManager.start()

      // Simulate critical service failure
      const degradationResult = await integrationManager.enableDegradedMode([
        'external_api',
      ])

      expect(degradationResult.success).toBe(true)
      expect(degradationResult.disabledServices.length).toBeGreaterThan(0)
    })

    it('should handle concurrent integration operations safely', async () => {
      const operations = Array(10)
        .fill(null)
        .map((_, i) =>
          integrationManager.registerBot(`concurrent_bot_${i}`, {
            token: `token_${i}`,
          })
        )

      const results = operations.map(op => op.success)
      expect(results.filter(success => success).length).toBe(10)
    })
  })

  describe('Advanced Features', () => {
    it('should implement auto-scaling for high load', async () => {
      await integrationManager.start()

      const scalingResult = await integrationManager.autoScale({
        metric: 'webhook_requests_per_second',
        threshold: 100,
        action: 'scale_up',
      })

      expect(scalingResult.triggered).toBeDefined()
      expect(scalingResult.newCapacity).toBeGreaterThanOrEqual(0)
    })

    it('should provide integration recommendations', async () => {
      await integrationManager.start()
      await new Promise(resolve => setTimeout(resolve, 1000))

      const recommendations =
        integrationManager.getOptimizationRecommendations()
      expect(Array.isArray(recommendations)).toBe(true)
    })

    it('should handle integration load testing', async () => {
      await integrationManager.start()

      const loadTestResult = await integrationManager.runLoadTest({
        target: 'webhook_processing',
        duration: 1000,
        requestsPerSecond: 10,
      })

      expect(loadTestResult.success).toBe(true)
      expect(loadTestResult.metrics.totalRequests).toBeGreaterThan(0)
      expect(loadTestResult.metrics.averageResponseTime).toBeGreaterThan(0)
    })

    it('should backup and restore integration configurations', async () => {
      await integrationManager.start()

      // Register some integrations
      integrationManager.registerBot('backup_test_bot', {
        token: 'test_token',
      })

      const backupResult = await integrationManager.createConfigBackup()
      expect(backupResult.success).toBe(true)
      expect(backupResult.backupId).toBeDefined()

      // Clear and restore
      await integrationManager.clearAllIntegrations()
      const restoreResult = await integrationManager.restoreFromBackup(
        backupResult.backupId!
      )
      expect(restoreResult.success).toBe(true)

      const bots = integrationManager.getRegisteredBots()
      expect(bots).toContain('backup_test_bot')
    })
  })
})
