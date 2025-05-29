import { Router } from 'express'
import { Routes } from '@interfaces/routes.interface'
import { supabaseReliable } from '@/core/supabase/withCircuitBreaker'
import { replicateReliable } from '@/core/replicate/withCircuitBreaker'
import { elevenLabsReliable } from '@/core/elevenlabs/withCircuitBreaker'
import { syncLabsReliable } from '@/core/synclabs/withCircuitBreaker'
import { huggingFaceReliable } from '@/core/huggingface/withCircuitBreaker'
import { bflReliable } from '@/core/bfl/withCircuitBreaker'
import { logger } from '@/utils/logger'
import { getAllCircuitBreakerStats } from '@/utils/circuitBreaker'
import fs from 'fs/promises'
import path from 'path'

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  error?: string
  details?: any
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: HealthCheckResult[]
  summary: {
    healthy: number
    degraded: number
    unhealthy: number
    total: number
  }
  circuitBreakers?: Record<string, any>
}

export class HealthRoute implements Routes {
  public path = '/health'
  public router: Router

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    // Базовый health check для Docker/K8s
    this.router.get(`${this.path}`, this.basicHealthCheck)

    // Детальный health check
    this.router.get(`${this.path}/detailed`, this.detailedHealthCheck)

    // Readiness probe
    this.router.get(`${this.path}/ready`, this.readinessCheck)

    // Liveness probe
    this.router.get(`${this.path}/live`, this.livenessCheck)
  }

  private basicHealthCheck = async (req: any, res: any) => {
    try {
      const health: SystemHealth = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks: [],
        summary: {
          healthy: 1,
          degraded: 0,
          unhealthy: 0,
          total: 1,
        },
      }

      res.status(200).json(health)
    } catch (error) {
      logger.error('Basic health check failed', { error })
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      })
    }
  }

  private detailedHealthCheck = async (req: any, res: any) => {
    try {
      const checks: HealthCheckResult[] = []

      // Проверка Supabase
      const supabaseStart = Date.now()
      try {
        const isSupabaseHealthy = await supabaseReliable.healthCheck(
          'health-check-supabase'
        )
        checks.push({
          service: 'supabase',
          status: isSupabaseHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - supabaseStart,
        })
      } catch (error) {
        checks.push({
          service: 'supabase',
          status: 'unhealthy',
          responseTime: Date.now() - supabaseStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка Replicate
      const replicateStart = Date.now()
      try {
        const isReplicateHealthy = await replicateReliable.healthCheck(
          'health-check-replicate'
        )
        checks.push({
          service: 'replicate',
          status: isReplicateHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - replicateStart,
        })
      } catch (error) {
        checks.push({
          service: 'replicate',
          status: 'unhealthy',
          responseTime: Date.now() - replicateStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка ElevenLabs
      const elevenLabsStart = Date.now()
      try {
        const isElevenLabsHealthy = await elevenLabsReliable.healthCheck(
          'health-check-elevenlabs'
        )
        checks.push({
          service: 'elevenlabs',
          status: isElevenLabsHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - elevenLabsStart,
        })
      } catch (error) {
        checks.push({
          service: 'elevenlabs',
          status: 'unhealthy',
          responseTime: Date.now() - elevenLabsStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка SyncLabs
      const syncLabsStart = Date.now()
      try {
        const isSyncLabsHealthy = await syncLabsReliable.healthCheck(
          'health-check-synclabs'
        )
        checks.push({
          service: 'synclabs',
          status: isSyncLabsHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - syncLabsStart,
        })
      } catch (error) {
        checks.push({
          service: 'synclabs',
          status: 'unhealthy',
          responseTime: Date.now() - syncLabsStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка HuggingFace
      const huggingFaceStart = Date.now()
      try {
        const isHuggingFaceHealthy = await huggingFaceReliable.healthCheck(
          'health-check-huggingface'
        )
        checks.push({
          service: 'huggingface',
          status: isHuggingFaceHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - huggingFaceStart,
        })
      } catch (error) {
        checks.push({
          service: 'huggingface',
          status: 'unhealthy',
          responseTime: Date.now() - huggingFaceStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка BFL
      const bflStart = Date.now()
      try {
        const isBflHealthy = await bflReliable.healthCheck('health-check-bfl')
        checks.push({
          service: 'bfl',
          status: isBflHealthy ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - bflStart,
        })
      } catch (error) {
        checks.push({
          service: 'bfl',
          status: 'unhealthy',
          responseTime: Date.now() - bflStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка файловой системы
      const fsStart = Date.now()
      try {
        const tempDir = path.join(process.cwd(), 'tmp')
        await fs.access(tempDir)
        checks.push({
          service: 'filesystem',
          status: 'healthy',
          responseTime: Date.now() - fsStart,
        })
      } catch (error) {
        checks.push({
          service: 'filesystem',
          status: 'unhealthy',
          responseTime: Date.now() - fsStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Проверка памяти
      const memoryStart = Date.now()
      try {
        const memUsage = process.memoryUsage()
        const memoryStatus =
          memUsage.heapUsed / memUsage.heapTotal < 0.9 ? 'healthy' : 'degraded'
        checks.push({
          service: 'memory',
          status: memoryStatus,
          responseTime: Date.now() - memoryStart,
          details: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
          },
        })
      } catch (error) {
        checks.push({
          service: 'memory',
          status: 'unhealthy',
          responseTime: Date.now() - memoryStart,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      // Подсчет статистики
      const summary = {
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        unhealthy: checks.filter(c => c.status === 'unhealthy').length,
        total: checks.length,
      }

      // Определение общего статуса
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      if (summary.unhealthy > 0) {
        overallStatus =
          summary.unhealthy > summary.healthy ? 'unhealthy' : 'degraded'
      } else if (summary.degraded > 0) {
        overallStatus = 'degraded'
      }

      const health: SystemHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks,
        summary,
        circuitBreakers: getAllCircuitBreakerStats(),
      }

      const statusCode =
        overallStatus === 'healthy'
          ? 200
          : overallStatus === 'degraded'
          ? 200
          : 503
      res.status(statusCode).json(health)
    } catch (error) {
      logger.error('Detailed health check failed', { error })
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      })
    }
  }

  private readinessCheck = async (req: any, res: any) => {
    try {
      // Проверяем критически важные сервисы для готовности
      const supabaseHealthy = await supabaseReliable.healthCheck(
        'readiness-check-supabase'
      )

      if (supabaseHealthy) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        })
      } else {
        res.status(503).json({
          status: 'not ready',
          timestamp: new Date().toISOString(),
          reason: 'Database not available',
        })
      }
    } catch (error) {
      logger.error('Readiness check failed', { error })
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
      })
    }
  }

  private livenessCheck = async (req: any, res: any) => {
    try {
      // Простая проверка жизнеспособности процесса
      const memUsage = process.memoryUsage()
      const isAlive = memUsage.heapUsed < memUsage.heapTotal * 0.95 // Не более 95% памяти

      if (isAlive) {
        res.status(200).json({
          status: 'alive',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      } else {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          reason: 'Memory usage too high',
        })
      }
    } catch (error) {
      logger.error('Liveness check failed', { error })
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Liveness check failed',
      })
    }
  }
}
