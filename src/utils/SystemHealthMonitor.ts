import { z } from 'zod'
import { EventEmitter } from 'events'

// =================== ENUMS ===================

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum RecoveryStrategy {
  RESTART_COMPONENT = 'RESTART_COMPONENT',
  CLEAR_CACHE = 'CLEAR_CACHE',
  GRACEFUL_DEGRADATION = 'GRACEFUL_DEGRADATION',
  SCALE_UP = 'SCALE_UP',
  FALLBACK_MODE = 'FALLBACK_MODE',
}

export enum ComponentType {
  CACHE = 'CACHE',
  RESOURCE_MANAGER = 'RESOURCE_MANAGER',
  PERFORMANCE_OPTIMIZER = 'PERFORMANCE_OPTIMIZER',
  DATABASE = 'DATABASE',
  API_ENDPOINT = 'API_ENDPOINT',
  CUSTOM = 'CUSTOM',
}

// =================== ZOD SCHEMAS ===================

export const HealthThresholdsSchema = z
  .object({
    warning: z.number().min(0).max(1),
    critical: z.number().min(0).max(1),
  })
  .refine(data => data.warning < data.critical, {
    message: 'Warning threshold must be less than critical threshold',
  })

export const AlertingConfigSchema = z.object({
  enabled: z.boolean().default(true),
  webhookUrl: z.string().url().optional(),
  retryAttempts: z.number().min(1).max(10).default(3),
  retryDelay: z.number().min(100).max(10000).default(1000),
  throttleWindow: z.number().min(1000).max(300000).default(60000), // 1 minute
})

export const RecoveryConfigSchema = z.object({
  enabled: z.boolean().default(true),
  maxRecoveryAttempts: z.number().min(1).max(10).default(3),
  recoveryDelay: z.number().min(1000).max(60000).default(5000),
  strategies: z
    .array(z.nativeEnum(RecoveryStrategy))
    .default([
      RecoveryStrategy.RESTART_COMPONENT,
      RecoveryStrategy.CLEAR_CACHE,
    ]),
  escalationDelay: z.number().min(60000).max(3600000).default(300000), // 5 minutes
})

export const ComponentConfigSchema = z.object({
  name: z.string().min(1),
  instance: z.any(), // Will be validated at runtime
  type: z.nativeEnum(ComponentType),
  weight: z.number().min(0).max(1).default(1),
  checkInterval: z.number().min(1000).max(300000).optional(),
})

export const HealthMonitorConfigSchema = z.object({
  checkInterval: z.number().min(1000).max(300000).default(30000), // 30 seconds
  healthThresholds: HealthThresholdsSchema.default({
    warning: 0.7,
    critical: 0.9,
  }),
  components: z.array(ComponentConfigSchema).default([]),
  alerting: AlertingConfigSchema.default({}),
  recovery: RecoveryConfigSchema.default({}),
  maxHistorySize: z.number().min(100).max(10000).default(1000),
  enableMetricsExport: z.boolean().default(true),
  metricsExportInterval: z.number().min(60000).max(3600000).default(300000), // 5 minutes
})

// =================== INTERFACES ===================

export type HealthMonitorConfig = z.infer<typeof HealthMonitorConfigSchema>
export type ComponentConfig = z.infer<typeof ComponentConfigSchema>
export type AlertingConfig = z.infer<typeof AlertingConfigSchema>
export type RecoveryConfig = z.infer<typeof RecoveryConfigSchema>
export type HealthThresholds = z.infer<typeof HealthThresholdsSchema>

export interface ComponentHealth {
  name: string
  type: ComponentType
  status: HealthStatus
  score: number
  message?: string
  metrics?: Record<string, any>
  lastCheck: Date
  checkDuration: number
  consecutiveFailures: number
  uptime: number
  customData?: Record<string, any>
}

export interface HealthAlert {
  id: string
  component: string
  level: AlertLevel
  message: string
  timestamp: Date
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  resolved: boolean
  resolvedAt?: Date
  escalated: boolean
  escalatedAt?: Date
  ruleName?: string
  metadata?: Record<string, any>
  customField?: string
}

export interface HealthMetrics {
  overall: {
    score: number
    status: HealthStatus
    uptime: number
    lastCheck: Date
  }
  components: ComponentHealth[]
  alerts: {
    total: number
    byLevel: Record<AlertLevel, number>
    active: number
    resolved: number
  }
  trends: {
    overall: string
    byComponent: Record<string, string>
  }
  performance: {
    avgCheckDuration: number
    checksPerMinute: number
    errorRate: number
  }
}

export interface DashboardData {
  overview: {
    overallHealth: number
    status: HealthStatus
    totalComponents: number
    healthyComponents: number
    warningComponents: number
    criticalComponents: number
    uptime: number
  }
  components: ComponentHealth[]
  alerts: {
    active: HealthAlert[]
    recent: HealthAlert[]
    summary: Record<AlertLevel, number>
  }
  metrics: HealthMetrics
  trends: {
    healthScore: Array<{ timestamp: Date; score: number }>
    componentStatus: Record<
      string,
      Array<{ timestamp: Date; status: HealthStatus }>
    >
  }
  recommendations: Array<{
    type: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
    message: string
    action?: string
  }>
}

export interface HealthRule {
  name: string
  description: string
  evaluate: (health: ComponentHealth) => HealthStatus
  weight: number
  enabled?: boolean
}

export interface AlertRule {
  name: string
  condition: (health: ComponentHealth) => boolean
  level: AlertLevel
  message: string
  cooldown: number
  enabled?: boolean
}

export interface RecoveryResult {
  success: boolean
  strategy: RecoveryStrategy
  message?: string
  duration: number
  timestamp: Date
}

export interface HealthReport {
  summary: {
    overallHealth: number
    totalComponents: number
    issuesFound: number
    alertsGenerated: number
    recoveryAttempts: number
  }
  detailedAnalysis: {
    componentBreakdown: ComponentHealth[]
    criticalIssues: HealthAlert[]
    performanceMetrics: HealthMetrics
  }
  recommendations: Array<{
    component: string
    issue: string
    recommendation: string
    priority: 'LOW' | 'MEDIUM' | 'HIGH'
  }>
  generatedAt: Date
  period: {
    start: Date
    end: Date
  }
}

export interface HealthPlugin {
  name: string
  initialize: (monitor: SystemHealthMonitor) => boolean
  onHealthCheck?: (health: ComponentHealth) => void
  onAlert?: (alert: HealthAlert) => void
  cleanup?: () => Promise<void>
}

export interface IHealthyComponent {
  isHealthy(): boolean
  getHealthStatus?(): {
    status: HealthStatus
    message?: string
    metrics?: Record<string, any>
  }
  restart?(): Promise<boolean>
  clearCache?(): Promise<boolean>
  enableDegradedMode?(): Promise<boolean>
}

// =================== MAIN CLASS ===================

export class SystemHealthMonitor extends EventEmitter {
  private config: HealthMonitorConfig
  private components: Map<
    string,
    {
      instance: IHealthyComponent
      config: ComponentConfig
      health: ComponentHealth
      lastRecoveryAttempt?: Date
      recoveryAttempts: number
    }
  > = new Map()

  private alerts: Map<string, HealthAlert> = new Map()
  private healthHistory: Map<string, ComponentHealth[]> = new Map()
  private alertRules: AlertRule[] = []
  private healthRules: HealthRule[] = []
  private plugins: Map<string, HealthPlugin> = new Map()

  private running = false
  private checkInterval?: NodeJS.Timeout
  private metricsInterval?: NodeJS.Timeout
  private startTime = new Date()

  private lastAlertTimes: Map<string, Date> = new Map()
  private recoveryAttempts: Map<string, number> = new Map()

  constructor(config: Partial<HealthMonitorConfig> = {}) {
    super()
    this.config = HealthMonitorConfigSchema.parse(config)

    // Register initial components
    this.config.components.forEach(componentConfig => {
      this.registerComponent(
        componentConfig.name,
        componentConfig.instance,
        componentConfig.type,
        componentConfig
      )
    })
  }

  // =================== LIFECYCLE METHODS ===================

  public start(): void {
    if (this.running) return

    this.running = true
    this.startTime = new Date()

    // Start health check interval
    this.checkInterval = setInterval(() => {
      this.performHealthChecks().catch(error => {
        this.emit('error', { message: 'Health check failed', error })
      })
    }, this.config.checkInterval)

    // Start metrics export interval
    if (this.config.enableMetricsExport) {
      this.metricsInterval = setInterval(() => {
        this.exportMetricsToWebhook().catch(error => {
          this.emit('error', { message: 'Metrics export failed', error })
        })
      }, this.config.metricsExportInterval)
    }

    this.emit('started')
  }

  public async stop(): Promise<void> {
    if (!this.running) return

    this.running = false

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = undefined
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval)
      this.metricsInterval = undefined
    }

    // Cleanup plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        await plugin.cleanup()
      }
    }

    this.emit('stopped')
  }

  public isRunning(): boolean {
    return this.running
  }

  // =================== COMPONENT MANAGEMENT ===================

  public registerComponent(
    name: string,
    instance: IHealthyComponent,
    type: ComponentType,
    config?: Partial<ComponentConfig>
  ): void {
    if (!name || !instance) {
      throw new Error('Component name and instance are required')
    }

    if (typeof instance.isHealthy !== 'function') {
      throw new Error('Component must implement isHealthy() method')
    }

    const componentConfig = ComponentConfigSchema.parse({
      name,
      instance,
      type,
      ...config,
    })

    const initialHealth: ComponentHealth = {
      name,
      type,
      status: HealthStatus.UNKNOWN,
      score: 0,
      lastCheck: new Date(),
      checkDuration: 0,
      consecutiveFailures: 0,
      uptime: 0,
    }

    this.components.set(name, {
      instance,
      config: componentConfig,
      health: initialHealth,
      recoveryAttempts: 0,
    })

    this.healthHistory.set(name, [])
    this.emit('componentRegistered', { name, type })
  }

  public async unregisterComponent(name: string): Promise<void> {
    if (!this.components.has(name)) return

    this.components.delete(name)
    this.healthHistory.delete(name)
    this.recoveryAttempts.delete(name)

    // Remove component-specific alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.component === name) {
        this.alerts.delete(alertId)
      }
    }

    this.emit('componentUnregistered', { name })
  }

  public getRegisteredComponents(): string[] {
    return Array.from(this.components.keys())
  }

  // =================== HEALTH CHECKING ===================

  private async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.components.entries()).map(
      async ([name, componentData]) => {
        try {
          await this.checkComponentHealth(name)
        } catch (error) {
          // Handle individual component check failures gracefully
          this.updateComponentHealth(name, {
            status: HealthStatus.CRITICAL,
            message: `Health check failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            score: 0,
          })
        }
      }
    )

    await Promise.all(checkPromises)
    this.emit('healthCheckCompleted')
  }

  public async checkComponentHealth(name: string): Promise<ComponentHealth> {
    const componentData = this.components.get(name)
    if (!componentData) {
      throw new Error(`Component ${name} not found`)
    }

    const startTime = Date.now()

    try {
      // Get basic health status
      const isHealthy = componentData.instance.isHealthy()

      // Get detailed status if available
      let detailedStatus: any = {
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.CRITICAL,
        metrics: {},
      }

      if (componentData.instance.getHealthStatus) {
        try {
          detailedStatus = componentData.instance.getHealthStatus()
        } catch (error) {
          detailedStatus = {
            status: HealthStatus.CRITICAL,
            message: `getHealthStatus failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
            metrics: {},
          }
        }
      }

      // Validate and sanitize the response
      let status = HealthStatus.UNKNOWN
      const message = detailedStatus.message
      let metrics = detailedStatus.metrics || {}

      // Validate status
      if (Object.values(HealthStatus).includes(detailedStatus.status)) {
        status = detailedStatus.status
      } else if (typeof isHealthy === 'boolean') {
        status = isHealthy ? HealthStatus.HEALTHY : HealthStatus.CRITICAL
      }

      // Validate metrics
      if (typeof metrics !== 'object' || metrics === null) {
        metrics = {}
      }

      const checkDuration = Date.now() - startTime
      const currentHealth = componentData.health

      // Calculate score based on status
      let score = 1.0
      switch (status) {
        case HealthStatus.HEALTHY:
          score = 1.0
          break
        case HealthStatus.WARNING:
          score = 0.7
          break
        case HealthStatus.CRITICAL:
          score = 0.3
          break
        case HealthStatus.UNKNOWN:
          score = 0.0
          break
      }

      // Apply health rules
      for (const rule of this.healthRules) {
        if (rule.enabled !== false) {
          try {
            const ruleStatus = rule.evaluate(currentHealth)
            if (ruleStatus !== HealthStatus.HEALTHY) {
              status = ruleStatus
              score *= rule.weight
            }
          } catch (error) {
            // Ignore rule evaluation errors
          }
        }
      }

      // Update consecutive failures
      const consecutiveFailures =
        status === HealthStatus.HEALTHY
          ? 0
          : currentHealth.consecutiveFailures + 1

      // Calculate uptime
      const uptimeMs = Date.now() - this.startTime.getTime()
      const uptime = Math.floor(uptimeMs / 1000)

      const updatedHealth: ComponentHealth = {
        name,
        type: componentData.config.type,
        status,
        score: Math.max(0, Math.min(1, score)),
        message,
        metrics,
        lastCheck: new Date(),
        checkDuration,
        consecutiveFailures,
        uptime,
      }

      // Apply plugin hooks
      for (const plugin of this.plugins.values()) {
        if (plugin.onHealthCheck) {
          try {
            plugin.onHealthCheck(updatedHealth)
          } catch (error) {
            // Ignore plugin errors
          }
        }
      }

      this.updateComponentHealth(name, updatedHealth)

      // Check for alerts
      await this.evaluateAlerts(updatedHealth)

      // Check for recovery needs
      if (status === HealthStatus.CRITICAL && this.config.recovery.enabled) {
        await this.attemptRecovery(name)
      }

      return updatedHealth
    } catch (error) {
      const errorHealth: ComponentHealth = {
        name,
        type: componentData.config.type,
        status: HealthStatus.CRITICAL,
        score: 0,
        message: `Health check error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        metrics: {},
        lastCheck: new Date(),
        checkDuration: Date.now() - startTime,
        consecutiveFailures: componentData.health.consecutiveFailures + 1,
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      }

      this.updateComponentHealth(name, errorHealth)
      return errorHealth
    }
  }

  private updateComponentHealth(
    name: string,
    healthUpdate: Partial<ComponentHealth>
  ): void {
    const componentData = this.components.get(name)
    if (!componentData) return

    const updatedHealth = {
      ...componentData.health,
      ...healthUpdate,
    }

    componentData.health = updatedHealth

    // Update history
    const history = this.healthHistory.get(name) || []
    history.push({ ...updatedHealth })

    // Limit history size
    if (history.length > this.config.maxHistorySize) {
      history.splice(0, history.length - this.config.maxHistorySize)
    }

    this.healthHistory.set(name, history)

    this.emit('healthUpdate', updatedHealth)
  }

  public async getComponentHealth(name: string): Promise<ComponentHealth> {
    const componentData = this.components.get(name)
    if (!componentData) {
      throw new Error(`Component ${name} not found`)
    }

    // If never checked, perform check now
    if (componentData.health.status === HealthStatus.UNKNOWN) {
      return await this.checkComponentHealth(name)
    }

    return componentData.health
  }

  public async getHealthSummary(): Promise<{
    overall: HealthStatus
    score: number
    components: ComponentHealth[]
  }> {
    const components = Array.from(this.components.values()).map(c => c.health)

    if (components.length === 0) {
      return {
        overall: HealthStatus.UNKNOWN,
        score: 0,
        components: [],
      }
    }

    // Calculate overall score as weighted average
    let totalWeight = 0
    let weightedScore = 0

    for (const component of components) {
      const componentData = this.components.get(component.name)
      const weight = componentData?.config.weight || 1

      totalWeight += weight
      weightedScore += component.score * weight
    }

    const overallScore = totalWeight > 0 ? weightedScore / totalWeight : 0

    // Determine overall status
    let overallStatus = HealthStatus.HEALTHY
    if (overallScore < this.config.healthThresholds.critical) {
      overallStatus = HealthStatus.CRITICAL
    } else if (overallScore < this.config.healthThresholds.warning) {
      overallStatus = HealthStatus.WARNING
    }

    return {
      overall: overallStatus,
      score: overallScore,
      components,
    }
  }

  public async getHealthHistory(
    componentName: string
  ): Promise<ComponentHealth[]> {
    return this.healthHistory.get(componentName) || []
  }

  public async getHealthTrends(): Promise<{
    overall: string
    byComponent: Record<string, string>
  }> {
    const summary = await this.getHealthSummary()

    // Simple trend calculation based on recent history
    const trends = {
      overall: 'stable',
      byComponent: {} as Record<string, string>,
    }

    for (const component of summary.components) {
      const history = await this.getHealthHistory(component.name)
      if (history.length >= 5) {
        const recent = history.slice(-5)
        const scores = recent.map(h => h.score)

        const trend = this.calculateTrend(scores)
        trends.byComponent[component.name] = trend
      } else {
        trends.byComponent[component.name] = 'insufficient_data'
      }
    }

    return trends
  }

  private calculateTrend(scores: number[]): string {
    if (scores.length < 2) return 'stable'

    const first = scores[0]
    const last = scores[scores.length - 1]
    const change = last - first

    if (Math.abs(change) < 0.1) return 'stable'
    return change > 0 ? 'improving' : 'degrading'
  }

  // =================== ALERTING SYSTEM ===================

  private async evaluateAlerts(health: ComponentHealth): Promise<void> {
    // Check built-in alert conditions
    if (health.status === HealthStatus.CRITICAL) {
      await this.generateAlert({
        component: health.name,
        level: AlertLevel.CRITICAL,
        message: health.message || 'Component is in critical state',
        metadata: { health },
      })
    } else if (health.status === HealthStatus.WARNING) {
      await this.generateAlert({
        component: health.name,
        level: AlertLevel.WARNING,
        message: health.message || 'Component is in warning state',
        metadata: { health },
      })
    }

    // Evaluate custom alert rules
    for (const rule of this.alertRules) {
      if (rule.enabled !== false) {
        try {
          if (rule.condition(health)) {
            const lastAlert = this.lastAlertTimes.get(
              `${health.name}-${rule.name}`
            )
            const now = new Date()

            // Check cooldown
            if (
              !lastAlert ||
              now.getTime() - lastAlert.getTime() > rule.cooldown
            ) {
              await this.generateAlert({
                component: health.name,
                level: rule.level,
                message: rule.message,
                ruleName: rule.name,
                metadata: { health, rule },
              })
              this.lastAlertTimes.set(`${health.name}-${rule.name}`, now)
            }
          }
        } catch (error) {
          // Ignore rule evaluation errors
        }
      }
    }
  }

  private async generateAlert(alertData: {
    component: string
    level: AlertLevel
    message: string
    ruleName?: string
    metadata?: Record<string, any>
  }): Promise<HealthAlert> {
    const alertId = `${alertData.component}-${alertData.level}-${Date.now()}`

    const alert: HealthAlert = {
      id: alertId,
      component: alertData.component,
      level: alertData.level,
      message: alertData.message,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      escalated: false,
      ruleName: alertData.ruleName,
      metadata: alertData.metadata,
    }

    // Check for duplicate alerts (throttling)
    const existingAlerts = Array.from(this.alerts.values()).filter(
      a =>
        a.component === alert.component &&
        a.level === alert.level &&
        !a.resolved &&
        Date.now() - a.timestamp.getTime() < this.config.alerting.throttleWindow
    )

    if (existingAlerts.length > 0) {
      return existingAlerts[0] // Return existing alert instead of creating duplicate
    }

    this.alerts.set(alertId, alert)

    // Apply plugin hooks
    for (const plugin of this.plugins.values()) {
      if (plugin.onAlert) {
        try {
          plugin.onAlert(alert)
        } catch (error) {
          // Ignore plugin errors
        }
      }
    }

    this.emit('alert', alert)

    // Send webhook notification
    if (this.config.alerting.enabled && this.config.alerting.webhookUrl) {
      await this.sendAlertWebhook(alert)
    }

    return alert
  }

  private async sendAlertWebhook(alert: HealthAlert): Promise<void> {
    if (!this.config.alerting.webhookUrl) return

    const payload = {
      type: 'health_alert',
      alert,
      timestamp: new Date().toISOString(),
    }

    for (
      let attempt = 0;
      attempt < this.config.alerting.retryAttempts;
      attempt++
    ) {
      try {
        const response = await fetch(this.config.alerting.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          break // Success
        }
      } catch (error) {
        if (attempt === this.config.alerting.retryAttempts - 1) {
          this.emit('webhookError', { error, alert })
        }
      }

      if (attempt < this.config.alerting.retryAttempts - 1) {
        await new Promise(resolve =>
          setTimeout(resolve, this.config.alerting.retryDelay)
        )
      }
    }
  }

  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule)
  }

  public async getActiveAlerts(): Promise<HealthAlert[]> {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved)
  }

  public async getAlert(alertId: string): Promise<HealthAlert | undefined> {
    return this.alerts.get(alertId)
  }

  public async acknowledgeAlert(
    alertId: string,
    acknowledgedBy?: string
  ): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true
      alert.acknowledgedBy = acknowledgedBy
      alert.acknowledgedAt = new Date()
      this.emit('alertAcknowledged', alert)
    }
  }

  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.get(alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = new Date()
      this.emit('alertResolved', alert)
    }
  }

  public async getEscalatedAlerts(): Promise<HealthAlert[]> {
    const now = new Date()
    const escalatedAlerts: HealthAlert[] = []

    for (const alert of this.alerts.values()) {
      if (!alert.resolved && !alert.escalated) {
        const alertAge = now.getTime() - alert.timestamp.getTime()
        if (alertAge > this.config.recovery.escalationDelay) {
          alert.escalated = true
          alert.escalatedAt = new Date()
          escalatedAlerts.push(alert)
        }
      }
    }

    return escalatedAlerts
  }

  public onAlert(callback: (alert: HealthAlert) => void): void {
    this.on('alert', callback)
  }

  // =================== RECOVERY STRATEGIES ===================

  private async attemptRecovery(componentName: string): Promise<void> {
    const componentData = this.components.get(componentName)
    if (!componentData) return

    const currentAttempts = this.recoveryAttempts.get(componentName) || 0
    if (currentAttempts >= this.config.recovery.maxRecoveryAttempts) {
      // Escalate after max attempts
      await this.generateAlert({
        component: componentName,
        level: AlertLevel.CRITICAL,
        message: `Recovery failed after ${currentAttempts} attempts`,
        metadata: { recoveryAttempts: currentAttempts },
      })
      return
    }

    // Check recovery delay
    if (componentData.lastRecoveryAttempt) {
      const timeSinceLastAttempt =
        Date.now() - componentData.lastRecoveryAttempt.getTime()
      if (timeSinceLastAttempt < this.config.recovery.recoveryDelay) {
        return // Too soon for another attempt
      }
    }

    this.recoveryAttempts.set(componentName, currentAttempts + 1)
    componentData.lastRecoveryAttempt = new Date()

    // Try recovery strategies in order
    for (const strategy of this.config.recovery.strategies) {
      const result = await this.recoverComponent(componentName, strategy)
      if (result.success) {
        this.recoveryAttempts.delete(componentName) // Reset on success
        this.emit('recoverySuccess', {
          component: componentName,
          strategy,
          result,
        })
        return
      }
    }

    this.emit('recoveryFailed', {
      component: componentName,
      attempts: currentAttempts + 1,
    })
  }

  public async recoverComponent(
    componentName: string,
    strategy: RecoveryStrategy
  ): Promise<RecoveryResult> {
    const startTime = Date.now()
    const componentData = this.components.get(componentName)

    if (!componentData) {
      return {
        success: false,
        strategy,
        message: 'Component not found',
        duration: Date.now() - startTime,
        timestamp: new Date(),
      }
    }

    try {
      let success = false
      let message = ''

      switch (strategy) {
        case RecoveryStrategy.RESTART_COMPONENT:
          if (componentData.instance.restart) {
            success = await componentData.instance.restart()
            message = success
              ? 'Component restarted successfully'
              : 'Component restart failed'
          } else {
            message = 'Component does not support restart'
          }
          break

        case RecoveryStrategy.CLEAR_CACHE:
          if (componentData.instance.clearCache) {
            success = await componentData.instance.clearCache()
            message = success
              ? 'Cache cleared successfully'
              : 'Cache clear failed'
          } else {
            message = 'Component does not support cache clearing'
          }
          break

        case RecoveryStrategy.GRACEFUL_DEGRADATION:
          if (componentData.instance.enableDegradedMode) {
            success = await componentData.instance.enableDegradedMode()
            message = success
              ? 'Degraded mode enabled'
              : 'Failed to enable degraded mode'
          } else {
            message = 'Component does not support degraded mode'
          }
          break

        default:
          message = `Recovery strategy ${strategy} not implemented`
      }

      const result: RecoveryResult = {
        success,
        strategy,
        message,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      }

      if (success) {
        // Re-check component health after recovery
        setTimeout(() => {
          this.checkComponentHealth(componentName).catch(() => {
            // Ignore errors
          })
        }, 1000)
      }

      return result
    } catch (error) {
      return {
        success: false,
        strategy,
        message: `Recovery error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      }
    }
  }

  // =================== DASHBOARD & METRICS ===================

  public async getDashboardData(): Promise<DashboardData> {
    const healthSummary = await this.getHealthSummary()
    const metrics = await this.getHealthMetrics()
    const trends = await this.getHealthTrends()
    const activeAlerts = await this.getActiveAlerts()

    // Calculate overview stats
    const healthyCount = healthSummary.components.filter(
      c => c.status === HealthStatus.HEALTHY
    ).length
    const warningCount = healthSummary.components.filter(
      c => c.status === HealthStatus.WARNING
    ).length
    const criticalCount = healthSummary.components.filter(
      c => c.status === HealthStatus.CRITICAL
    ).length

    // Generate recommendations
    const recommendations: DashboardData['recommendations'] = []

    // High failure rate recommendation
    for (const component of healthSummary.components) {
      if (component.consecutiveFailures > 3) {
        recommendations.push({
          type: 'reliability',
          priority: 'HIGH',
          message: `Component ${component.name} has ${component.consecutiveFailures} consecutive failures`,
          action: `Consider investigating ${component.name} for reliability issues`,
        })
      }
    }

    // Performance recommendations
    const slowComponents = healthSummary.components.filter(
      c => c.checkDuration > 5000
    )
    if (slowComponents.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'MEDIUM',
        message: `${slowComponents.length} components have slow health checks`,
        action: 'Consider optimizing health check implementations',
      })
    }

    return {
      overview: {
        overallHealth: healthSummary.score,
        status: healthSummary.overall,
        totalComponents: healthSummary.components.length,
        healthyComponents: healthyCount,
        warningComponents: warningCount,
        criticalComponents: criticalCount,
        uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      },
      components: healthSummary.components,
      alerts: {
        active: activeAlerts,
        recent: Array.from(this.alerts.values())
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10),
        summary: {
          [AlertLevel.INFO]: activeAlerts.filter(
            a => a.level === AlertLevel.INFO
          ).length,
          [AlertLevel.WARNING]: activeAlerts.filter(
            a => a.level === AlertLevel.WARNING
          ).length,
          [AlertLevel.CRITICAL]: activeAlerts.filter(
            a => a.level === AlertLevel.CRITICAL
          ).length,
        },
      },
      metrics,
      trends: {
        healthScore: [], // Would be populated with historical data
        componentStatus: {}, // Would be populated with historical data
      },
      recommendations,
    }
  }

  public async getHealthMetrics(): Promise<HealthMetrics> {
    const healthSummary = await this.getHealthSummary()
    const trends = await this.getHealthTrends()
    const allAlerts = Array.from(this.alerts.values())
    const activeAlerts = allAlerts.filter(a => !a.resolved)

    // Calculate performance metrics
    const totalCheckDuration = healthSummary.components.reduce(
      (sum, c) => sum + c.checkDuration,
      0
    )
    const avgCheckDuration =
      healthSummary.components.length > 0
        ? totalCheckDuration / healthSummary.components.length
        : 0

    const uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000)
    const checksPerMinute =
      uptime > 0
        ? (healthSummary.components.length * 60) /
          (this.config.checkInterval / 1000)
        : 0

    const failedComponents = healthSummary.components.filter(
      c => c.status === HealthStatus.CRITICAL
    ).length
    const errorRate =
      healthSummary.components.length > 0
        ? failedComponents / healthSummary.components.length
        : 0

    return {
      overall: {
        score: healthSummary.score,
        status: healthSummary.overall,
        uptime,
        lastCheck: new Date(),
      },
      components: healthSummary.components,
      alerts: {
        total: allAlerts.length,
        byLevel: {
          [AlertLevel.INFO]: allAlerts.filter(a => a.level === AlertLevel.INFO)
            .length,
          [AlertLevel.WARNING]: allAlerts.filter(
            a => a.level === AlertLevel.WARNING
          ).length,
          [AlertLevel.CRITICAL]: allAlerts.filter(
            a => a.level === AlertLevel.CRITICAL
          ).length,
        },
        active: activeAlerts.length,
        resolved: allAlerts.filter(a => a.resolved).length,
      },
      trends,
      performance: {
        avgCheckDuration,
        checksPerMinute,
        errorRate,
      },
    }
  }

  public async exportMetrics(
    format: 'json' | 'prometheus' = 'json'
  ): Promise<string> {
    const metrics = await this.getHealthMetrics()

    if (format === 'json') {
      return JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          ...metrics,
        },
        null,
        2
      )
    }

    if (format === 'prometheus') {
      const lines: string[] = []

      // System health score
      lines.push('# HELP system_health_score Overall system health score (0-1)')
      lines.push('# TYPE system_health_score gauge')
      lines.push(`system_health_score ${metrics.overall.score}`)

      // Component health scores
      lines.push('# HELP component_health_score Component health score (0-1)')
      lines.push('# TYPE component_health_score gauge')
      for (const component of metrics.components) {
        lines.push(
          `component_health_score{component="${component.name}",type="${component.type}"} ${component.score}`
        )
      }

      // Active alerts
      lines.push('# HELP health_alerts_active Number of active alerts by level')
      lines.push('# TYPE health_alerts_active gauge')
      for (const [level, count] of Object.entries(metrics.alerts.byLevel)) {
        lines.push(`health_alerts_active{level="${level}"} ${count}`)
      }

      return lines.join('\n')
    }

    throw new Error(`Unsupported export format: ${format}`)
  }

  private async exportMetricsToWebhook(): Promise<void> {
    if (!this.config.alerting.webhookUrl) return

    const payload = {
      type: 'health_report',
      metrics: await this.getHealthMetrics(),
      timestamp: new Date().toISOString(),
    }

    try {
      await fetch(this.config.alerting.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    } catch (error) {
      this.emit('metricsExportError', { error })
    }
  }

  public onHealthUpdate(callback: (health: ComponentHealth) => void): void {
    this.on('healthUpdate', callback)
  }

  public async generateHealthReport(): Promise<HealthReport> {
    const metrics = await this.getHealthMetrics()
    const activeAlerts = await this.getActiveAlerts()
    const criticalIssues = activeAlerts.filter(
      a => a.level === AlertLevel.CRITICAL
    )

    // Generate recommendations
    const recommendations: HealthReport['recommendations'] = []

    for (const component of metrics.components) {
      if (component.status === HealthStatus.CRITICAL) {
        recommendations.push({
          component: component.name,
          issue: 'Component is in critical state',
          recommendation:
            'Investigate component health and consider restart or recovery',
          priority: 'HIGH',
        })
      }

      if (component.consecutiveFailures > 5) {
        recommendations.push({
          component: component.name,
          issue: `${component.consecutiveFailures} consecutive failures`,
          recommendation:
            'Review component implementation for stability issues',
          priority: 'HIGH',
        })
      }
    }

    return {
      summary: {
        overallHealth: metrics.overall.score,
        totalComponents: metrics.components.length,
        issuesFound: criticalIssues.length,
        alertsGenerated: metrics.alerts.total,
        recoveryAttempts: Array.from(this.recoveryAttempts.values()).reduce(
          (sum, attempts) => sum + attempts,
          0
        ),
      },
      detailedAnalysis: {
        componentBreakdown: metrics.components,
        criticalIssues,
        performanceMetrics: metrics,
      },
      recommendations,
      generatedAt: new Date(),
      period: {
        start: this.startTime,
        end: new Date(),
      },
    }
  }

  // =================== RULES & EXTENSIBILITY ===================

  public addHealthRule(rule: HealthRule): void {
    this.healthRules.push(rule)
  }

  public getHealthRules(): HealthRule[] {
    return [...this.healthRules]
  }

  public installPlugin(plugin: HealthPlugin): boolean {
    try {
      const success = plugin.initialize(this)
      if (success) {
        this.plugins.set(plugin.name, plugin)
        this.emit('pluginInstalled', { name: plugin.name })
        return true
      }
      return false
    } catch (error) {
      this.emit('pluginError', { name: plugin.name, error })
      return false
    }
  }

  public getInstalledPlugins(): string[] {
    return Array.from(this.plugins.keys())
  }
}
