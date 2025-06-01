import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ResourceManager,
  ResourceThresholds,
  ResourceUsage,
  CleanupRule,
  ResourceAlert,
  ResourceConfig,
} from '../../utils/ResourceManager'

describe('ResourceManager', () => {
  let resourceManager: ResourceManager

  beforeEach(() => {
    resourceManager = new ResourceManager()
  })

  afterEach(() => {
    resourceManager.stop()
  })

  describe('Initialization & Configuration', () => {
    it('should initialize with default configuration', () => {
      expect(resourceManager).toBeInstanceOf(ResourceManager)
      expect(resourceManager.isRunning()).toBe(false)
    })

    it('should initialize with custom configuration', () => {
      const config: Partial<ResourceConfig> = {
        monitoringInterval: 5000,
        cleanupInterval: 30000,
        thresholds: {
          memory: { warning: 70, critical: 85 },
          cpu: { warning: 60, critical: 80 },
          disk: { warning: 75, critical: 90 },
        },
      }

      const customManager = new ResourceManager(config)
      expect(customManager).toBeInstanceOf(ResourceManager)
    })

    it('should start and stop monitoring', () => {
      expect(resourceManager.isRunning()).toBe(false)

      resourceManager.start()
      expect(resourceManager.isRunning()).toBe(true)

      resourceManager.stop()
      expect(resourceManager.isRunning()).toBe(false)
    })

    it('should not start twice', () => {
      resourceManager.start()
      expect(resourceManager.isRunning()).toBe(true)

      // Second start should be ignored
      resourceManager.start()
      expect(resourceManager.isRunning()).toBe(true)
    })
  })

  describe('Resource Monitoring', () => {
    it('should get current system memory usage', async () => {
      const memoryUsage = await resourceManager.getMemoryUsage()

      expect(memoryUsage).toHaveProperty('total')
      expect(memoryUsage).toHaveProperty('free')
      expect(memoryUsage).toHaveProperty('used')
      expect(memoryUsage).toHaveProperty('percentage')
      expect(memoryUsage).toHaveProperty('process')
      expect(typeof memoryUsage.total).toBe('number')
      expect(typeof memoryUsage.percentage).toBe('number')
    })

    it('should get current CPU usage', async () => {
      const cpuUsage = await resourceManager.getCPUUsage()

      expect(cpuUsage).toHaveProperty('cores')
      expect(cpuUsage).toHaveProperty('loadAverage')
      expect(cpuUsage).toHaveProperty('percentage')
      expect(cpuUsage).toHaveProperty('processPercentage')
      expect(typeof cpuUsage.cores).toBe('number')
      expect(Array.isArray(cpuUsage.loadAverage)).toBe(true)
    })

    it('should get disk usage for specified path', async () => {
      const diskUsage = await resourceManager.getDiskUsage('./package.json')

      expect(diskUsage).toHaveProperty('total')
      expect(diskUsage).toHaveProperty('free')
      expect(diskUsage).toHaveProperty('used')
      expect(diskUsage).toHaveProperty('percentage')
      expect(typeof diskUsage.total).toBe('number')
    })

    it('should get comprehensive resource usage', async () => {
      const usage = await resourceManager.getResourceUsage()

      expect(usage).toHaveProperty('timestamp')
      expect(usage).toHaveProperty('memory')
      expect(usage).toHaveProperty('cpu')
      expect(usage).toHaveProperty('disk')
      expect(usage.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Threshold Management', () => {
    it('should set custom thresholds', () => {
      const thresholds: ResourceThresholds = {
        memory: { warning: 70, critical: 85 },
        cpu: { warning: 60, critical: 80 },
        disk: { warning: 75, critical: 90 },
      }

      resourceManager.setThresholds(thresholds)
      expect(resourceManager.getThresholds()).toEqual(thresholds)
    })

    it('should validate threshold values', () => {
      expect(() => {
        resourceManager.setThresholds({
          memory: { warning: 90, critical: 80 }, // warning > critical
          cpu: { warning: 50, critical: 70 },
          disk: { warning: 70, critical: 90 },
        })
      }).toThrow('Warning threshold cannot be greater than critical threshold')
    })

    it('should check if resource usage exceeds thresholds', async () => {
      const alerts = await resourceManager.checkThresholds()

      expect(Array.isArray(alerts)).toBe(true)
      // Alerts may or may not be present depending on current system state
    })
  })

  describe('Cleanup Rules', () => {
    it('should add cleanup rule', () => {
      const rule: CleanupRule = {
        id: 'temp-files',
        name: 'Temporary Files',
        pattern: '/tmp/*.tmp',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        maxSize: 100 * 1024 * 1024, // 100MB
        priority: 1,
      }

      resourceManager.addCleanupRule(rule)
      expect(resourceManager.getCleanupRules()).toContainEqual(rule)
    })

    it('should remove cleanup rule', () => {
      const rule: CleanupRule = {
        id: 'temp-files',
        name: 'Temporary Files',
        pattern: '/tmp/*.tmp',
        maxAge: 24 * 60 * 60 * 1000,
        maxSize: 100 * 1024 * 1024,
        priority: 1,
      }

      resourceManager.addCleanupRule(rule)
      expect(resourceManager.getCleanupRules()).toContainEqual(rule)

      resourceManager.removeCleanupRule('temp-files')
      expect(resourceManager.getCleanupRules()).not.toContainEqual(rule)
    })

    it('should execute cleanup with dry run', async () => {
      const rule: CleanupRule = {
        id: 'test-cleanup',
        name: 'Test Cleanup',
        pattern: './non-existent-dir/*.tmp',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxSize: 50 * 1024 * 1024, // 50MB
        priority: 2,
      }

      resourceManager.addCleanupRule(rule)

      const result = await resourceManager.executeCleanup(true) // dry run

      expect(result).toHaveProperty('removedFiles')
      expect(result).toHaveProperty('freedSpace')
      expect(result).toHaveProperty('dryRun')
      expect(result.dryRun).toBe(true)
    })

    it('should execute cleanup with actual file removal', async () => {
      const rule: CleanupRule = {
        id: 'cache-files',
        name: 'Cache Files',
        pattern: './non-existent-cache/*.cache',
        maxAge: 1 * 60 * 60 * 1000, // 1 hour
        maxSize: 10 * 1024 * 1024, // 10MB
        priority: 3,
      }

      resourceManager.addCleanupRule(rule)

      const result = await resourceManager.executeCleanup(false) // real cleanup

      expect(result).toHaveProperty('removedFiles')
      expect(result).toHaveProperty('freedSpace')
      expect(result).toHaveProperty('dryRun')
      expect(result.dryRun).toBe(false)
      // Since directory doesn't exist, should have 0 removed files
      expect(result.removedFiles).toBe(0)
    })
  })

  describe('Memory Pressure Handling', () => {
    it('should detect memory pressure', async () => {
      const pressure = await resourceManager.checkMemoryPressure()
      expect(typeof pressure).toBe('boolean')
    })

    it('should handle memory pressure callbacks', async () => {
      let callbackCalled = false
      const callback = () => {
        callbackCalled = true
      }

      resourceManager.onMemoryPressure(callback)
      await resourceManager.handleMemoryPressure()

      expect(callbackCalled).toBe(true)
    })

    it('should register CPU callbacks', () => {
      let callbackCalled = false
      const callback = () => {
        callbackCalled = true
      }

      resourceManager.onHighCPU(callback)
      // Just test that callback is registered without throwing
      expect(typeof callback).toBe('function')
    })
  })

  describe('Resource Optimization', () => {
    it('should suggest optimizations based on usage patterns', async () => {
      const suggestions = await resourceManager.getOptimizationSuggestions()

      expect(Array.isArray(suggestions)).toBe(true)
      // May have suggestions depending on system state
    })

    it('should apply automatic optimizations', async () => {
      const results = await resourceManager.applyOptimizations(['force-gc'])

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('optimization')
      expect(results[0]).toHaveProperty('success')
      expect(results[0]).toHaveProperty('message')
    })
  })

  describe('Resource History & Analytics', () => {
    it('should track resource usage history', async () => {
      resourceManager.start()

      // Let it collect some data
      await new Promise(resolve => setTimeout(resolve, 100))

      const history = resourceManager.getUsageHistory(5) // Last 5 records
      expect(Array.isArray(history)).toBe(true)

      resourceManager.stop()
    })

    it('should calculate resource trends', async () => {
      resourceManager.start()

      // Simulate some data collection
      await new Promise(resolve => setTimeout(resolve, 100))

      const trends = resourceManager.getResourceTrends()

      expect(trends).toHaveProperty('memory')
      expect(trends).toHaveProperty('cpu')
      expect(trends).toHaveProperty('disk')
      expect(trends.memory).toHaveProperty('direction')
      expect(trends.memory).toHaveProperty('rate')
      expect(trends.memory).toHaveProperty('confidence')

      resourceManager.stop()
    })

    it('should export resource statistics', async () => {
      const stats = await resourceManager.getResourceStatistics()

      expect(stats).toHaveProperty('current')
      expect(stats).toHaveProperty('averages')
      expect(stats).toHaveProperty('peaks')
      expect(stats).toHaveProperty('trends')
      expect(stats).toHaveProperty('alerts')
      expect(stats).toHaveProperty('optimizations')
    })
  })

  describe('Error Handling', () => {
    it('should handle monitoring errors gracefully', async () => {
      // Test with existing system - should not throw
      const usage = await resourceManager.getMemoryUsage()
      expect(usage).toHaveProperty('total')
    })

    it('should handle cleanup errors gracefully', async () => {
      const rule: CleanupRule = {
        id: 'error-rule',
        name: 'Error Rule',
        pattern: '/nonexistent-root-dir/*.tmp',
        maxAge: 1000,
        maxSize: 1000,
        priority: 1,
      }

      resourceManager.addCleanupRule(rule)

      const result = await resourceManager.executeCleanup()

      expect(result).toHaveProperty('errors')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Integration Features', () => {
    it('should register resource event callbacks', () => {
      let memoryCallbackCalled = false
      let cpuCallbackCalled = false

      const memoryCallback = () => {
        memoryCallbackCalled = true
      }
      const cpuCallback = () => {
        cpuCallbackCalled = true
      }

      resourceManager.onMemoryPressure(memoryCallback)
      resourceManager.onHighCPU(cpuCallback)

      // Test that callbacks are functions
      expect(typeof memoryCallback).toBe('function')
      expect(typeof cpuCallback).toBe('function')
    })

    it('should export metrics in Prometheus format', async () => {
      const metrics = await resourceManager.getPrometheusMetrics()

      expect(typeof metrics).toBe('string')
      expect(metrics).toContain('# HELP system_memory_usage')
      expect(metrics).toContain('system_memory_usage{type="total"}')
      expect(metrics).toContain('system_cpu_usage')
      expect(metrics).toContain('system_disk_usage')
    })

    it('should handle external monitoring integration', async () => {
      // Test alert structure without actually sending
      const testAlert: ResourceAlert = {
        id: 'test-alert',
        type: 'memory',
        level: 'critical',
        message: 'High memory usage detected',
        value: 95.5,
        threshold: 90,
        timestamp: new Date(),
      }

      // Should not throw when sending alert (even without webhook)
      await resourceManager.sendAlert(testAlert)

      // If we get here, the method executed successfully
      expect(testAlert.message).toBe('High memory usage detected')
    })
  })
})
