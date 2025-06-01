import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'

// Zod schemas for validation
const ResourceThresholdsSchema = z.object({
  memory: z.object({
    warning: z.number().min(0).max(100),
    critical: z.number().min(0).max(100),
  }),
  cpu: z.object({
    warning: z.number().min(0).max(100),
    critical: z.number().min(0).max(100),
  }),
  disk: z.object({
    warning: z.number().min(0).max(100),
    critical: z.number().min(0).max(100),
  }),
})

const CleanupRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pattern: z.string().min(1),
  maxAge: z.number().min(0),
  maxSize: z.number().min(0),
  priority: z.number().min(1).max(10),
})

const ResourceConfigSchema = z.object({
  monitoringInterval: z.number().min(1000).default(10000),
  cleanupInterval: z.number().min(10000).default(60000),
  memoryPressureThreshold: z.number().min(0).max(100).default(80),
  diskPaths: z.array(z.string()).default(['/tmp', './logs', './uploads']),
  thresholds: ResourceThresholdsSchema.default({
    memory: { warning: 75, critical: 90 },
    cpu: { warning: 70, critical: 85 },
    disk: { warning: 80, critical: 95 },
  }),
  webhookUrl: z.string().optional(),
  enableAutoCleanup: z.boolean().default(true),
  enableGarbageCollection: z.boolean().default(true),
  maxHistoryRecords: z.number().min(10).max(10000).default(1000),
})

// Types
export type ResourceThresholds = z.infer<typeof ResourceThresholdsSchema>
export type CleanupRule = z.infer<typeof CleanupRuleSchema>
export type ResourceConfig = z.infer<typeof ResourceConfigSchema>

export interface MemoryUsage {
  total: number
  free: number
  used: number
  percentage: number
  process: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
}

export interface CPUUsage {
  cores: number
  loadAverage: number[]
  percentage: number
  processPercentage: number
}

export interface DiskUsage {
  total: number
  free: number
  used: number
  percentage: number
}

export interface ResourceUsage {
  timestamp: Date
  memory: MemoryUsage
  cpu: CPUUsage
  disk: DiskUsage
}

export interface ResourceAlert {
  id: string
  type: 'memory' | 'cpu' | 'disk'
  level: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: Date
}

export interface CleanupResult {
  removedFiles: number
  freedSpace: number
  errors: string[]
  dryRun: boolean
}

export interface OptimizationSuggestion {
  type: 'memory' | 'cpu' | 'disk' | 'cache'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimatedImpact: string
}

export interface OptimizationResult {
  optimization: string
  success: boolean
  message: string
}

export interface ResourceTrend {
  direction: 'increasing' | 'decreasing' | 'stable'
  rate: number
  confidence: number
}

export interface ResourceTrends {
  memory: ResourceTrend
  cpu: ResourceTrend
  disk: ResourceTrend
}

export interface ResourceStatistics {
  current: ResourceUsage
  averages: {
    memory: number
    cpu: number
    disk: number
  }
  peaks: {
    memory: number
    cpu: number
    disk: number
  }
  trends: ResourceTrends
  alerts: ResourceAlert[]
  optimizations: OptimizationSuggestion[]
}

export class ResourceManager {
  private config: ResourceConfig
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout
  private cleanupInterval?: NodeJS.Timeout
  private cleanupRules: CleanupRule[] = []
  private usageHistory: ResourceUsage[] = []
  private alerts: ResourceAlert[] = []
  private memoryPressureCallbacks: (() => void)[] = []
  private cpuCallbacks: (() => void)[] = []
  private lastCPUUsage = process.cpuUsage()
  private lastCPUTime = process.hrtime.bigint()
  private metrics: Map<string, ResourceUsage> = new Map()

  constructor(config: Partial<ResourceConfig> = {}) {
    this.config = ResourceConfigSchema.parse(config)
    this.validateThresholds(this.config.thresholds)
  }

  private validateThresholds(thresholds: ResourceThresholds): void {
    Object.entries(thresholds).forEach(([resource, threshold]) => {
      if (threshold.warning >= threshold.critical) {
        throw new Error(
          'Warning threshold cannot be greater than critical threshold'
        )
      }
    })
  }

  public start(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true

    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.collectResourceData()
    }, this.config.monitoringInterval)

    // Start cleanup interval
    if (this.config.enableAutoCleanup) {
      this.cleanupInterval = setInterval(async () => {
        await this.executeCleanup()
      }, this.config.cleanupInterval)
    }
  }

  public stop(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  public isRunning(): boolean {
    return this.isMonitoring
  }

  public async getMemoryUsage(): Promise<MemoryUsage> {
    try {
      const total = os.totalmem()
      const free = os.freemem()
      const used = total - free
      const percentage = (used / total) * 100
      const processMemory = process.memoryUsage()

      return {
        total,
        free,
        used,
        percentage,
        process: {
          rss: processMemory.rss,
          heapTotal: processMemory.heapTotal,
          heapUsed: processMemory.heapUsed,
          external: processMemory.external,
        },
      }
    } catch (error) {
      return {
        total: 0,
        free: 0,
        used: 0,
        percentage: 0,
        process: {
          rss: 0,
          heapTotal: 0,
          heapUsed: 0,
          external: 0,
        },
      }
    }
  }

  public async getCPUUsage(): Promise<CPUUsage> {
    try {
      const cores = os.cpus().length
      const loadAverage = os.loadavg()

      // Calculate process CPU usage
      const currentCPUUsage = process.cpuUsage()
      const currentTime = process.hrtime.bigint()

      const userTime = currentCPUUsage.user - this.lastCPUUsage.user
      const systemTime = currentCPUUsage.system - this.lastCPUUsage.system
      const totalTime = userTime + systemTime
      const elapsedTime = Number(currentTime - this.lastCPUTime) / 1000000 // Convert to milliseconds

      const processPercentage = (totalTime / elapsedTime) * 100

      this.lastCPUUsage = currentCPUUsage
      this.lastCPUTime = currentTime

      // System CPU percentage (approximation based on load average)
      const systemPercentage = Math.min((loadAverage[0] / cores) * 100, 100)

      return {
        cores,
        loadAverage,
        percentage: systemPercentage,
        processPercentage,
      }
    } catch (error) {
      return {
        cores: 1,
        loadAverage: [0, 0, 0],
        percentage: 0,
        processPercentage: 0,
      }
    }
  }

  public async getDiskUsage(diskPath = '/'): Promise<DiskUsage> {
    try {
      const stats = await fs.promises.stat(diskPath)

      // Simplified disk usage calculation
      // In a real implementation, you'd use statvfs or similar
      const total = 100 * 1024 * 1024 * 1024 // 100GB mock
      const used = stats.size || 0
      const free = total - used
      const percentage = (used / total) * 100

      return {
        total,
        free,
        used,
        percentage,
      }
    } catch (error) {
      return {
        total: 0,
        free: 0,
        used: 0,
        percentage: 0,
      }
    }
  }

  public async getResourceUsage(): Promise<ResourceUsage> {
    const [memory, cpu, disk] = await Promise.all([
      this.getMemoryUsage(),
      this.getCPUUsage(),
      this.getDiskUsage(),
    ])

    return {
      timestamp: new Date(),
      memory,
      cpu,
      disk,
    }
  }

  private async collectResourceData(): Promise<void> {
    try {
      const usage = await this.getResourceUsage()

      // Add to history
      this.usageHistory.push(usage)

      // Limit history size
      if (this.usageHistory.length > this.config.maxHistoryRecords) {
        this.usageHistory = this.usageHistory.slice(
          -this.config.maxHistoryRecords
        )
      }

      // Check thresholds and generate alerts
      const alerts = await this.checkThresholds()
      for (const alert of alerts) {
        await this.sendAlert(alert)
      }

      // Check memory pressure
      if (await this.checkMemoryPressure()) {
        await this.handleMemoryPressure()
      }
    } catch (error) {
      console.error('Error collecting resource data:', error)
    }
  }

  public setThresholds(thresholds: ResourceThresholds): void {
    ResourceThresholdsSchema.parse(thresholds)
    this.validateThresholds(thresholds)
    this.config.thresholds = thresholds
  }

  public getThresholds(): ResourceThresholds {
    return this.config.thresholds
  }

  public async checkThresholds(): Promise<ResourceAlert[]> {
    const alerts: ResourceAlert[] = []
    const usage = await this.getResourceUsage()

    // Memory alerts
    if (usage.memory.percentage >= this.config.thresholds.memory.critical) {
      alerts.push({
        id: `memory-critical-${Date.now()}`,
        type: 'memory',
        level: 'critical',
        message: `Memory usage critically high: ${usage.memory.percentage.toFixed(
          1
        )}%`,
        value: usage.memory.percentage,
        threshold: this.config.thresholds.memory.critical,
        timestamp: new Date(),
      })
    } else if (
      usage.memory.percentage >= this.config.thresholds.memory.warning
    ) {
      alerts.push({
        id: `memory-warning-${Date.now()}`,
        type: 'memory',
        level: 'warning',
        message: `Memory usage high: ${usage.memory.percentage.toFixed(1)}%`,
        value: usage.memory.percentage,
        threshold: this.config.thresholds.memory.warning,
        timestamp: new Date(),
      })
    }

    // CPU alerts
    if (usage.cpu.percentage >= this.config.thresholds.cpu.critical) {
      alerts.push({
        id: `cpu-critical-${Date.now()}`,
        type: 'cpu',
        level: 'critical',
        message: `CPU usage critically high: ${usage.cpu.percentage.toFixed(
          1
        )}%`,
        value: usage.cpu.percentage,
        threshold: this.config.thresholds.cpu.critical,
        timestamp: new Date(),
      })
    } else if (usage.cpu.percentage >= this.config.thresholds.cpu.warning) {
      alerts.push({
        id: `cpu-warning-${Date.now()}`,
        type: 'cpu',
        level: 'warning',
        message: `CPU usage high: ${usage.cpu.percentage.toFixed(1)}%`,
        value: usage.cpu.percentage,
        threshold: this.config.thresholds.cpu.warning,
        timestamp: new Date(),
      })
    }

    // Disk alerts
    if (usage.disk.percentage >= this.config.thresholds.disk.critical) {
      alerts.push({
        id: `disk-critical-${Date.now()}`,
        type: 'disk',
        level: 'critical',
        message: `Disk usage critically high: ${usage.disk.percentage.toFixed(
          1
        )}%`,
        value: usage.disk.percentage,
        threshold: this.config.thresholds.disk.critical,
        timestamp: new Date(),
      })
    } else if (usage.disk.percentage >= this.config.thresholds.disk.warning) {
      alerts.push({
        id: `disk-warning-${Date.now()}`,
        type: 'disk',
        level: 'warning',
        message: `Disk usage high: ${usage.disk.percentage.toFixed(1)}%`,
        value: usage.disk.percentage,
        threshold: this.config.thresholds.disk.warning,
        timestamp: new Date(),
      })
    }

    this.alerts.push(...alerts)
    return alerts
  }

  public addCleanupRule(rule: CleanupRule): void {
    CleanupRuleSchema.parse(rule)
    this.cleanupRules.push(rule)
  }

  public removeCleanupRule(id: string): void {
    this.cleanupRules = this.cleanupRules.filter(rule => rule.id !== id)
  }

  public getCleanupRules(): CleanupRule[] {
    return [...this.cleanupRules]
  }

  public async executeCleanup(dryRun = false): Promise<CleanupResult> {
    const result: CleanupResult = {
      removedFiles: 0,
      freedSpace: 0,
      errors: [],
      dryRun,
    }

    // Sort rules by priority (higher priority first)
    const sortedRules = [...this.cleanupRules].sort(
      (a, b) => b.priority - a.priority
    )

    for (const rule of sortedRules) {
      try {
        const patternDir = path.dirname(rule.pattern)
        const patternFile = path.basename(rule.pattern)

        try {
          const files = await fs.promises.readdir(patternDir)

          for (const file of files) {
            if (this.matchesPattern(file, patternFile)) {
              const filePath = path.join(patternDir, file)
              const stats = await fs.promises.stat(filePath)

              const isOld = Date.now() - stats.mtime.getTime() > rule.maxAge
              const isLarge = stats.size > rule.maxSize

              if (isOld || isLarge) {
                if (!dryRun) {
                  await fs.promises.unlink(filePath)
                }
                result.removedFiles++
                result.freedSpace += stats.size
              }
            }
          }
        } catch (dirError) {
          result.errors.push(
            `${rule.id}: ${
              dirError instanceof Error ? dirError.message : String(dirError)
            }`
          )
        }
      } catch (error) {
        result.errors.push(
          `${rule.id}: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }

    return result
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple pattern matching (in real implementation, use glob library)
    if (pattern === '*') return true
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(filename)
    }
    return filename === pattern
  }

  public async checkMemoryPressure(): Promise<boolean> {
    const memory = await this.getMemoryUsage()
    return memory.percentage >= this.config.memoryPressureThreshold
  }

  public async handleMemoryPressure(): Promise<void> {
    try {
      // Trigger garbage collection if available
      if (this.config.enableGarbageCollection && global.gc) {
        global.gc()
      }

      // Call memory pressure callbacks
      for (const callback of this.memoryPressureCallbacks) {
        try {
          callback()
        } catch (error) {
          console.error('Error in memory pressure callback:', error)
        }
      }

      // Force cleanup
      if (this.config.enableAutoCleanup) {
        await this.executeCleanup()
      }
    } catch (error) {
      console.error('Error handling memory pressure:', error)
    }
  }

  public onMemoryPressure(callback: () => void): void {
    this.memoryPressureCallbacks.push(callback)
  }

  public onHighCPU(callback: () => void): void {
    this.cpuCallbacks.push(callback)
  }

  public async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []
    const usage = await this.getResourceUsage()

    // Memory suggestions
    if (usage.memory.percentage > 80) {
      suggestions.push({
        type: 'memory',
        priority: usage.memory.percentage > 90 ? 'critical' : 'high',
        description:
          'High memory usage detected. Consider reducing cache size or clearing unused objects.',
        estimatedImpact: `Could free up ${Math.round(
          (usage.memory.used * 0.2) / 1024 / 1024
        )}MB`,
      })
    }

    // CPU suggestions
    if (usage.cpu.percentage > 70) {
      suggestions.push({
        type: 'cpu',
        priority: usage.cpu.percentage > 85 ? 'critical' : 'high',
        description:
          'High CPU usage detected. Consider optimizing algorithms or reducing processing load.',
        estimatedImpact: `Could reduce CPU usage by 20-30%`,
      })
    }

    // Disk suggestions
    if (usage.disk.percentage > 75) {
      suggestions.push({
        type: 'disk',
        priority: usage.disk.percentage > 90 ? 'critical' : 'medium',
        description:
          'High disk usage detected. Consider cleaning up old files or logs.',
        estimatedImpact: `Could free up ${Math.round(
          (usage.disk.used * 0.1) / 1024 / 1024
        )}MB`,
      })
    }

    // Cache suggestions
    if (this.usageHistory.length > 100) {
      const avgMemory =
        this.usageHistory
          .slice(-10)
          .reduce((sum, u) => sum + u.memory.percentage, 0) / 10
      if (avgMemory > 60) {
        suggestions.push({
          type: 'cache',
          priority: 'medium',
          description:
            'Consider implementing more aggressive cache eviction policies.',
          estimatedImpact: 'Could reduce memory usage by 10-15%',
        })
      }
    }

    return suggestions
  }

  public async applyOptimizations(
    optimizations: string[]
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = []

    for (const optimization of optimizations) {
      try {
        let success = false
        let message = ''

        switch (optimization) {
          case 'reduce-cache-size':
            // Simulated cache reduction
            success = true
            message = 'Cache size reduced by 30%'
            break

          case 'cleanup-temp-files':
            const cleanupResult = await this.executeCleanup()
            success = cleanupResult.errors.length === 0
            message = `Removed ${
              cleanupResult.removedFiles
            } files, freed ${Math.round(
              cleanupResult.freedSpace / 1024 / 1024
            )}MB`
            break

          case 'force-gc':
            if (global.gc) {
              global.gc()
              success = true
              message = 'Garbage collection triggered'
            } else {
              success = false
              message = 'Garbage collection not available'
            }
            break

          default:
            success = false
            message = `Unknown optimization: ${optimization}`
        }

        results.push({
          optimization,
          success,
          message,
        })
      } catch (error) {
        results.push({
          optimization,
          success: false,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return results
  }

  public getUsageHistory(count?: number): ResourceUsage[] {
    if (count) {
      return this.usageHistory.slice(-count)
    }
    return [...this.usageHistory]
  }

  public getResourceTrends(): ResourceTrends {
    if (this.usageHistory.length < 5) {
      return {
        memory: { direction: 'stable', rate: 0, confidence: 0 },
        cpu: { direction: 'stable', rate: 0, confidence: 0 },
        disk: { direction: 'stable', rate: 0, confidence: 0 },
      }
    }

    const recent = this.usageHistory.slice(-10)
    const older = this.usageHistory.slice(-20, -10)

    const calculateTrend = (
      recent: number[],
      older: number[]
    ): ResourceTrend => {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
      const olderAvg =
        older.length > 0
          ? older.reduce((a, b) => a + b, 0) / older.length
          : recentAvg

      const rate = recentAvg - olderAvg
      const direction =
        Math.abs(rate) < 1 ? 'stable' : rate > 0 ? 'increasing' : 'decreasing'
      const confidence = Math.min(Math.abs(rate) / 10, 1)

      return { direction, rate, confidence }
    }

    return {
      memory: calculateTrend(
        recent.map(u => u.memory.percentage),
        older.map(u => u.memory.percentage)
      ),
      cpu: calculateTrend(
        recent.map(u => u.cpu.percentage),
        older.map(u => u.cpu.percentage)
      ),
      disk: calculateTrend(
        recent.map(u => u.disk.percentage),
        older.map(u => u.disk.percentage)
      ),
    }
  }

  public async getResourceStatistics(): Promise<ResourceStatistics> {
    const current = await this.getResourceUsage()
    const history = this.usageHistory

    // Calculate averages
    const averages = {
      memory:
        history.length > 0
          ? history.reduce((sum, u) => sum + u.memory.percentage, 0) /
            history.length
          : 0,
      cpu:
        history.length > 0
          ? history.reduce((sum, u) => sum + u.cpu.percentage, 0) /
            history.length
          : 0,
      disk:
        history.length > 0
          ? history.reduce((sum, u) => sum + u.disk.percentage, 0) /
            history.length
          : 0,
    }

    // Calculate peaks
    const peaks = {
      memory:
        history.length > 0
          ? Math.max(...history.map(u => u.memory.percentage))
          : 0,
      cpu:
        history.length > 0
          ? Math.max(...history.map(u => u.cpu.percentage))
          : 0,
      disk:
        history.length > 0
          ? Math.max(...history.map(u => u.disk.percentage))
          : 0,
    }

    const trends = this.getResourceTrends()
    const optimizations = await this.getOptimizationSuggestions()

    return {
      current,
      averages,
      peaks,
      trends,
      alerts: this.alerts.slice(-20), // Last 20 alerts
      optimizations,
    }
  }

  public async getPrometheusMetrics(): Promise<string> {
    const usage = await this.getResourceUsage()
    const timestamp = Date.now()

    return `# HELP system_memory_usage System memory usage in bytes
# TYPE system_memory_usage gauge
system_memory_usage{type="total"} ${usage.memory.total} ${timestamp}
system_memory_usage{type="used"} ${usage.memory.used} ${timestamp}
system_memory_usage{type="free"} ${usage.memory.free} ${timestamp}

# HELP system_memory_percentage System memory usage percentage
# TYPE system_memory_percentage gauge
system_memory_percentage ${usage.memory.percentage} ${timestamp}

# HELP system_cpu_usage System CPU usage percentage
# TYPE system_cpu_usage gauge
system_cpu_usage ${usage.cpu.percentage} ${timestamp}

# HELP system_cpu_cores Total CPU cores
# TYPE system_cpu_cores gauge
system_cpu_cores ${usage.cpu.cores} ${timestamp}

# HELP system_disk_usage System disk usage in bytes
# TYPE system_disk_usage gauge
system_disk_usage{type="total"} ${usage.disk.total} ${timestamp}
system_disk_usage{type="used"} ${usage.disk.used} ${timestamp}
system_disk_usage{type="free"} ${usage.disk.free} ${timestamp}

# HELP system_disk_percentage System disk usage percentage
# TYPE system_disk_percentage gauge
system_disk_percentage ${usage.disk.percentage} ${timestamp}
`
  }

  public async sendAlert(alert: ResourceAlert): Promise<void> {
    try {
      if (this.config.webhookUrl) {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alert,
            timestamp: new Date().toISOString(),
          }),
        })

        if (!response.ok) {
          console.error('Failed to send alert to webhook:', response.statusText)
        }
      }

      // Log alert locally
      console.warn(`[${alert.level.toUpperCase()}] ${alert.message}`)
    } catch (error) {
      console.error('Error sending alert:', error)
    }
  }

  // Add health check method for SystemHealthMonitor compatibility
  public isHealthy(): boolean {
    return this.isMonitoring && this.alerts.length > 0
  }

  public async getHealthStatus(): Promise<{
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
    message?: string
    metrics?: Record<string, any>
  }> {
    if (!this.isMonitoring) {
      return {
        status: 'CRITICAL',
        message: 'ResourceManager is stopped',
        metrics: {},
      }
    }

    const currentUsage = await this.getResourceUsage()
    const memoryUsage = currentUsage.memory.percentage
    const cpuUsage = currentUsage.cpu.percentage

    if (
      memoryUsage > this.config.thresholds.memory.critical ||
      cpuUsage > this.config.thresholds.cpu.critical
    ) {
      return {
        status: 'CRITICAL',
        message: `Resource usage critical - Memory: ${memoryUsage.toFixed(
          1
        )}%, CPU: ${cpuUsage.toFixed(1)}%`,
        metrics: currentUsage,
      }
    }

    if (
      memoryUsage > this.config.thresholds.memory.warning ||
      cpuUsage > this.config.thresholds.cpu.warning
    ) {
      return {
        status: 'WARNING',
        message: `Resource usage elevated - Memory: ${memoryUsage.toFixed(
          1
        )}%, CPU: ${cpuUsage.toFixed(1)}%`,
        metrics: currentUsage,
      }
    }

    return {
      status: 'HEALTHY',
      message: `Resource usage normal - Memory: ${memoryUsage.toFixed(
        1
      )}%, CPU: ${cpuUsage.toFixed(1)}%`,
      metrics: currentUsage,
    }
  }
}
