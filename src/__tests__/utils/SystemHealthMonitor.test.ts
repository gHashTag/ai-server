import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  SystemHealthMonitor,
  HealthMonitorConfig,
  ComponentHealth,
  HealthStatus,
  AlertLevel,
  HealthAlert,
  RecoveryStrategy,
  HealthMetrics,
  DashboardData,
  ComponentType,
  HealthRule,
  AlertRule,
} from '../../utils/SystemHealthMonitor'
import { CacheManager } from '../../utils/CacheManager'
import { ResourceManager } from '../../utils/ResourceManager'
import { PerformanceOptimizer } from '../../utils/PerformanceOptimizer'

describe('SystemHealthMonitor', () => {
  let healthMonitor: SystemHealthMonitor
  let cacheManager: CacheManager
  let resourceManager: ResourceManager
  let performanceOptimizer: PerformanceOptimizer

  beforeEach(() => {
    cacheManager = new CacheManager({
      defaultTTL: 5000,
      maxMemorySize: 1024 * 1024,
      enableFileCache: false,
      enableStats: true,
    })

    resourceManager = new ResourceManager({
      monitoringInterval: 1000,
      thresholds: {
        memory: { warning: 70, critical: 85 },
        cpu: { warning: 60, critical: 80 },
        disk: { warning: 80, critical: 95 },
      },
    })

    performanceOptimizer = new PerformanceOptimizer({
      cacheManager,
      resourceManager,
      enableAutoOptimization: true,
    })

    healthMonitor = new SystemHealthMonitor({
      checkInterval: 1000,
      alerting: {
        enabled: true,
        webhookUrl: 'http://alerts.example.com/webhook',
        retryAttempts: 3,
        retryDelay: 1000,
      },
      recovery: {
        enabled: true,
        maxRecoveryAttempts: 3,
        recoveryDelay: 2000,
        strategies: [
          RecoveryStrategy.RESTART_COMPONENT,
          RecoveryStrategy.CLEAR_CACHE,
          RecoveryStrategy.GRACEFUL_DEGRADATION,
        ],
      },
    })
  })

  afterEach(async () => {
    await healthMonitor.stop()
    await cacheManager.stop()
    resourceManager.stop()
    await performanceOptimizer.stop()
  })

  describe('Initialization & Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultMonitor = new SystemHealthMonitor()
      expect(defaultMonitor).toBeInstanceOf(SystemHealthMonitor)
      expect(defaultMonitor.isRunning()).toBe(false)
    })

    it('should initialize with custom configuration', () => {
      const config: Partial<HealthMonitorConfig> = {
        checkInterval: 2000,
        healthThresholds: {
          warning: 0.7,
          critical: 0.9,
        },
        alerting: {
          enabled: false,
        },
        recovery: {
          enabled: false,
        },
      }

      const customMonitor = new SystemHealthMonitor(config)
      expect(customMonitor).toBeInstanceOf(SystemHealthMonitor)
    })

    it('should validate configuration with Zod', () => {
      expect(() => {
        new SystemHealthMonitor({
          checkInterval: 50, // Too small
          healthThresholds: {
            warning: 1.5, // Invalid range
            critical: 0.5, // Less than warning
          },
        })
      }).toThrow()
    })

    it('should start and stop health monitoring', () => {
      expect(healthMonitor.isRunning()).toBe(false)

      healthMonitor.start()
      expect(healthMonitor.isRunning()).toBe(true)

      healthMonitor.stop()
      expect(healthMonitor.isRunning()).toBe(false)
    })
  })

  describe('Component Health Monitoring', () => {
    it('should register and monitor components', async () => {
      const testComponent = {
        isHealthy: () => true,
        getHealthStatus: () => ({ status: HealthStatus.HEALTHY, metrics: {} }),
      }

      healthMonitor.registerComponent(
        'test-component',
        testComponent,
        ComponentType.CUSTOM
      )

      const registeredComponents = healthMonitor.getRegisteredComponents()
      expect(registeredComponents).toContain('test-component')
    })

    it('should check health of all registered components', async () => {
      healthMonitor.start()

      // Wait for at least one health check cycle
      await new Promise(resolve => setTimeout(resolve, 1200))

      const healthSummary = await healthMonitor.getHealthSummary()
      expect(healthSummary.overall).toBeDefined()
      expect(healthSummary.components.length).toBeGreaterThan(0)

      // All components should be healthy initially
      healthSummary.components.forEach(component => {
        expect([HealthStatus.HEALTHY, HealthStatus.WARNING]).toContain(
          component.status
        )
      })
    })

    it('should detect unhealthy components', async () => {
      const unhealthyComponent = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.CRITICAL,
          message: 'Component is failing',
          metrics: { errorRate: 0.8 },
        }),
      }

      healthMonitor.registerComponent(
        'unhealthy-component',
        unhealthyComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for health check
      await new Promise(resolve => setTimeout(resolve, 1200))

      const healthSummary = await healthMonitor.getHealthSummary()
      const unhealthyComp = healthSummary.components.find(
        c => c.name === 'unhealthy-component'
      )

      expect(unhealthyComp?.status).toBe(HealthStatus.CRITICAL)
      expect(unhealthyComp?.message).toBe('Component is failing')
    })

    it('should track health history and trends', async () => {
      healthMonitor.start()

      // Let it collect some data
      await new Promise(resolve => setTimeout(resolve, 2500))

      const healthHistory = await healthMonitor.getHealthHistory('cache')
      expect(healthHistory.length).toBeGreaterThan(1)

      const trends = await healthMonitor.getHealthTrends()
      expect(trends.overall).toBeDefined()
      expect(trends.byComponent).toBeDefined()
    })

    it('should calculate component health scores', async () => {
      const componentHealth = await healthMonitor.getComponentHealth('cache')

      expect(componentHealth.name).toBe('cache')
      expect(componentHealth.status).toBeDefined()
      expect(componentHealth.score).toBeGreaterThan(0)
      expect(componentHealth.score).toBeLessThanOrEqual(1)
      expect(componentHealth.lastCheck).toBeInstanceOf(Date)
    })
  })

  describe('Alerting System', () => {
    it('should generate alerts for unhealthy components', async () => {
      let alertReceived: HealthAlert | null = null

      // Mock webhook
      global.fetch = async (url: string, options?: any) => {
        alertReceived = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({}),
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic' as ResponseType,
          url: url,
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          text: async () => '',
        } as Response
      }

      const failingComponent = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.CRITICAL,
          message: 'Critical failure detected',
          metrics: { errorRate: 0.95 },
        }),
      }

      healthMonitor.registerComponent(
        'failing-component',
        failingComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for alert generation
      await new Promise(resolve => setTimeout(resolve, 1500))

      expect(alertReceived).toBeDefined()
      expect(alertReceived?.level).toBe(AlertLevel.CRITICAL)
      expect(alertReceived?.component).toBe('failing-component')
    })

    it('should implement alert throttling and deduplication', async () => {
      const alerts: HealthAlert[] = []

      // Mock alert handler
      healthMonitor.onAlert((alert: HealthAlert) => {
        alerts.push(alert)
      })

      // Simulate repeated failures
      const repeatedFailureComponent = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.CRITICAL,
          message: 'Repeated failure',
          metrics: {},
        }),
      }

      healthMonitor.registerComponent(
        'repeated-fail',
        repeatedFailureComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for multiple check cycles
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Should not generate duplicate alerts for the same issue
      const criticalAlerts = alerts.filter(
        a => a.level === AlertLevel.CRITICAL && a.component === 'repeated-fail'
      )
      expect(criticalAlerts.length).toBeLessThanOrEqual(2) // Allow some duplicates but not excessive
    })

    it('should support custom alert rules', async () => {
      const customRule: AlertRule = {
        name: 'high-memory-usage',
        condition: (health: ComponentHealth) => {
          return health.metrics?.memoryUsage > 0.8
        },
        level: AlertLevel.WARNING,
        message: 'Memory usage is high',
        cooldown: 30000,
      }

      healthMonitor.addAlertRule(customRule)

      const highMemoryComponent = {
        isHealthy: () => true,
        getHealthStatus: () => ({
          status: HealthStatus.WARNING,
          metrics: { memoryUsage: 0.85 },
        }),
      }

      healthMonitor.registerComponent(
        'high-memory',
        highMemoryComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for rule evaluation
      await new Promise(resolve => setTimeout(resolve, 1200))

      const alerts = await healthMonitor.getActiveAlerts()
      const memoryAlert = alerts.find(a => a.ruleName === 'high-memory-usage')
      expect(memoryAlert).toBeDefined()
      expect(memoryAlert?.level).toBe(AlertLevel.WARNING)
    })

    it('should manage alert lifecycle (create, acknowledge, resolve)', async () => {
      const temporaryFailureComponent = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.CRITICAL,
          message: 'Temporary failure',
        }),
      }

      healthMonitor.registerComponent(
        'temp-fail',
        temporaryFailureComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for alert creation
      await new Promise(resolve => setTimeout(resolve, 1200))

      const alerts = await healthMonitor.getActiveAlerts()
      expect(alerts.length).toBeGreaterThan(0)

      const alert = alerts[0]
      await healthMonitor.acknowledgeAlert(alert.id)

      const acknowledgedAlert = await healthMonitor.getAlert(alert.id)
      expect(acknowledgedAlert?.acknowledged).toBe(true)

      // Now fix the component
      temporaryFailureComponent.isHealthy = () => true
      temporaryFailureComponent.getHealthStatus = () => ({
        status: HealthStatus.HEALTHY,
        message: 'Component recovered',
      })

      // Wait for resolution
      await new Promise(resolve => setTimeout(resolve, 1200))

      const resolvedAlert = await healthMonitor.getAlert(alert.id)
      expect(resolvedAlert?.resolved).toBe(true)
    })
  })

  describe('Recovery Strategies', () => {
    it('should implement component restart recovery', async () => {
      let restartCount = 0
      const restartableComponent = {
        isHealthy: () => (restartCount === 0 ? false : true),
        getHealthStatus: () => ({
          status:
            restartCount === 0 ? HealthStatus.CRITICAL : HealthStatus.HEALTHY,
        }),
        restart: async () => {
          restartCount++
          return true
        },
      }

      healthMonitor.registerComponent(
        'restartable',
        restartableComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for recovery attempt
      await new Promise(resolve => setTimeout(resolve, 2500))

      expect(restartCount).toBeGreaterThan(0)
      const health = await healthMonitor.getComponentHealth('restartable')
      expect(health.status).toBe(HealthStatus.HEALTHY)
    })

    it('should implement cache clearing recovery', async () => {
      // Populate cache first
      await cacheManager.set('test-key', 'test-value')
      expect(await cacheManager.has('test-key')).toBe(true)

      // Simulate cache-related health issue
      const cacheHealthyAfterClear = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.WARNING,
          message: 'Cache corruption detected',
        }),
        clearCache: async () => {
          await cacheManager.clear()
          return true
        },
      }

      healthMonitor.registerComponent(
        'cache-dependent',
        cacheHealthyAfterClear,
        ComponentType.CACHE
      )

      // Trigger cache clear recovery
      await healthMonitor.recoverComponent(
        'cache-dependent',
        RecoveryStrategy.CLEAR_CACHE
      )

      // Verify cache was cleared
      expect(await cacheManager.has('test-key')).toBe(false)
    })

    it('should implement graceful degradation', async () => {
      const degradableComponent = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.CRITICAL,
          message: 'Service overloaded',
        }),
        degraded: false,
        enableDegradedMode: async function () {
          this.degraded = true
          return true
        },
      }

      healthMonitor.registerComponent(
        'degradable',
        degradableComponent,
        ComponentType.CUSTOM
      )

      const recoveryResult = await healthMonitor.recoverComponent(
        'degradable',
        RecoveryStrategy.GRACEFUL_DEGRADATION
      )
      expect(recoveryResult.success).toBe(true)
      expect(recoveryResult.strategy).toBe(
        RecoveryStrategy.GRACEFUL_DEGRADATION
      )
    })

    it('should limit recovery attempts and escalate', async () => {
      let recoveryAttempts = 0
      const persistentFailureComponent = {
        isHealthy: () => false,
        getHealthStatus: () => ({
          status: HealthStatus.CRITICAL,
          message: 'Persistent failure',
        }),
        restart: async () => {
          recoveryAttempts++
          return false // Always fail recovery
        },
      }

      healthMonitor.registerComponent(
        'persistent-fail',
        persistentFailureComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for multiple recovery attempts
      await new Promise(resolve => setTimeout(resolve, 8000))

      expect(recoveryAttempts).toBeLessThanOrEqual(3) // Should limit attempts

      const escalatedAlerts = await healthMonitor.getEscalatedAlerts()
      expect(escalatedAlerts.length).toBeGreaterThan(0)
    })
  })

  describe('Dashboard & Monitoring', () => {
    it('should provide comprehensive dashboard data', async () => {
      healthMonitor.start()

      // Wait for data collection
      await new Promise(resolve => setTimeout(resolve, 1500))

      const dashboardData = await healthMonitor.getDashboardData()

      expect(dashboardData.overview).toBeDefined()
      expect(dashboardData.overview.overallHealth).toBeDefined()
      expect(dashboardData.components.length).toBeGreaterThan(0)
      expect(dashboardData.alerts).toBeDefined()
      expect(dashboardData.metrics).toBeDefined()
      expect(dashboardData.trends).toBeDefined()
    })

    it('should export health metrics in multiple formats', async () => {
      healthMonitor.start()
      await new Promise(resolve => setTimeout(resolve, 1200))

      // JSON export
      const jsonMetrics = await healthMonitor.exportMetrics('json')
      expect(typeof jsonMetrics).toBe('string')
      const parsedMetrics = JSON.parse(jsonMetrics)
      expect(parsedMetrics.timestamp).toBeDefined()
      expect(parsedMetrics.components).toBeDefined()

      // Prometheus export
      const prometheusMetrics = await healthMonitor.exportMetrics('prometheus')
      expect(typeof prometheusMetrics).toBe('string')
      expect(prometheusMetrics).toContain('# HELP')
      expect(prometheusMetrics).toContain('system_health_score')
    })

    it('should provide real-time health status updates', async () => {
      const statusUpdates: ComponentHealth[] = []

      healthMonitor.onHealthUpdate((health: ComponentHealth) => {
        statusUpdates.push(health)
      })

      healthMonitor.start()

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 2500))

      expect(statusUpdates.length).toBeGreaterThan(0)
      statusUpdates.forEach(update => {
        expect(update.name).toBeDefined()
        expect(update.status).toBeDefined()
        expect(update.lastCheck).toBeInstanceOf(Date)
      })
    })

    it('should generate health reports with recommendations', async () => {
      healthMonitor.start()

      // Let it collect some data
      await new Promise(resolve => setTimeout(resolve, 2000))

      const healthReport = await healthMonitor.generateHealthReport()

      expect(healthReport.summary).toBeDefined()
      expect(healthReport.detailedAnalysis).toBeDefined()
      expect(healthReport.recommendations.length).toBeGreaterThanOrEqual(0)
      expect(healthReport.generatedAt).toBeInstanceOf(Date)
    })
  })

  describe('Integration & Extensibility', () => {
    it('should integrate with external monitoring systems', async () => {
      let webhookData: any = null

      // Mock external system
      global.fetch = async (url: string, options?: any) => {
        webhookData = JSON.parse(options.body)
        return {
          ok: true,
          json: async () => ({}),
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          redirected: false,
          type: 'basic' as ResponseType,
          url: url,
          clone: () => ({} as Response),
          body: null,
          bodyUsed: false,
          arrayBuffer: async () => new ArrayBuffer(0),
          blob: async () => new Blob(),
          formData: async () => new FormData(),
          text: async () => '',
        } as Response
      }

      healthMonitor.start()

      // Wait for external integration
      await new Promise(resolve => setTimeout(resolve, 1500))

      expect(webhookData).toBeDefined()
      expect(webhookData.type).toBe('health_report')
    })

    it('should support custom health rules and policies', () => {
      const customRule: HealthRule = {
        name: 'custom-business-rule',
        description: 'Custom business logic health check',
        evaluate: (health: ComponentHealth) => {
          return health.score > 0.9
            ? HealthStatus.HEALTHY
            : HealthStatus.WARNING
        },
        weight: 0.8,
      }

      healthMonitor.addHealthRule(customRule)

      const rules = healthMonitor.getHealthRules()
      expect(rules.find(r => r.name === 'custom-business-rule')).toBeDefined()
    })

    it('should provide plugin architecture for extensions', () => {
      const mockPlugin = {
        name: 'test-plugin',
        initialize: (monitor: SystemHealthMonitor) => {
          // Plugin initialization logic
          return true
        },
        onHealthCheck: (health: ComponentHealth) => {
          // Custom health check logic
          health.customData = { processed: true }
        },
        onAlert: (alert: HealthAlert) => {
          // Custom alert handling
          alert.customField = 'plugin-processed'
        },
      }

      const result = healthMonitor.installPlugin(mockPlugin)
      expect(result).toBe(true)

      const installedPlugins = healthMonitor.getInstalledPlugins()
      expect(installedPlugins).toContain('test-plugin')
    })

    it('should handle concurrent health checks efficiently', async () => {
      // Register multiple components
      for (let i = 0; i < 10; i++) {
        const component = {
          isHealthy: () => Math.random() > 0.1, // 90% healthy
          getHealthStatus: () => ({
            status:
              Math.random() > 0.1 ? HealthStatus.HEALTHY : HealthStatus.WARNING,
            metrics: { iteration: i },
          }),
        }
        healthMonitor.registerComponent(
          `component-${i}`,
          component,
          ComponentType.CUSTOM
        )
      }

      healthMonitor.start()

      const startTime = Date.now()
      await new Promise(resolve => setTimeout(resolve, 1500))
      const endTime = Date.now()

      const healthSummary = await healthMonitor.getHealthSummary()
      expect(healthSummary.components.length).toBe(13) // 10 custom + 3 original

      // Health checks should complete reasonably quickly even with many components
      expect(endTime - startTime).toBeLessThan(3000)
    })
  })

  describe('Error Handling & Edge Cases', () => {
    it('should handle component registration errors gracefully', () => {
      expect(() => {
        healthMonitor.registerComponent('', null as any, ComponentType.CUSTOM)
      }).toThrow()

      expect(() => {
        healthMonitor.registerComponent(
          'valid-name',
          {
            isHealthy: () => false,
          } as any,
          ComponentType.CUSTOM
        )
      }).toThrow()
    })

    it('should recover from monitoring system failures', async () => {
      // Simulate internal error in health monitor
      const originalCheckHealth = healthMonitor.checkComponentHealth
      let errorCount = 0

      // Mock method to throw errors initially
      healthMonitor.checkComponentHealth = async (componentName: string) => {
        if (errorCount < 2) {
          errorCount++
          throw new Error('Simulated monitoring failure')
        }
        return originalCheckHealth.call(healthMonitor, componentName)
      }

      healthMonitor.start()

      // Wait for error recovery
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Should recover and continue working
      const healthSummary = await healthMonitor.getHealthSummary()
      expect(healthSummary).toBeDefined()
      expect(errorCount).toBe(2)
    })

    it('should handle component unregistration and cleanup', async () => {
      const tempComponent = {
        isHealthy: () => true,
        getHealthStatus: () => ({ status: HealthStatus.HEALTHY }),
      }

      healthMonitor.registerComponent(
        'temp-component',
        tempComponent,
        ComponentType.CUSTOM
      )

      let components = healthMonitor.getRegisteredComponents()
      expect(components).toContain('temp-component')

      await healthMonitor.unregisterComponent('temp-component')

      components = healthMonitor.getRegisteredComponents()
      expect(components).not.toContain('temp-component')
    })

    it('should validate health data and handle invalid responses', async () => {
      const invalidComponent = {
        isHealthy: () => 'not-boolean' as any,
        getHealthStatus: () => ({
          status: 'INVALID_STATUS' as any,
          metrics: 'not-an-object' as any,
        }),
      }

      healthMonitor.registerComponent(
        'invalid-component',
        invalidComponent,
        ComponentType.CUSTOM
      )
      healthMonitor.start()

      // Wait for health check with invalid data
      await new Promise(resolve => setTimeout(resolve, 1200))

      const health = await healthMonitor.getComponentHealth('invalid-component')
      // Should handle invalid data gracefully
      expect(health.status).toBe(HealthStatus.UNKNOWN)
    })
  })
})
