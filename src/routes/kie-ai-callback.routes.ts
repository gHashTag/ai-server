/**
 * 🔗 Kie.ai Callback Routes
 * Маршруты для обработки асинхронных уведомлений от Kie.ai API
 */

import express from 'express'
import {
  handleKieAiCallback,
  callbackHealthCheck,
} from '@/controllers/kie-ai-callback.controller'
import { logger } from '@/utils/logger'

const router = express.Router()

/**
 * Middleware для логирования всех callback запросов
 */
router.use((req, res, next) => {
  logger.info('🔗 Kie.ai callback request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  })
  next()
})

/**
 * POST /api/kie-ai/callback
 * Основной endpoint для callback от Kie.ai
 */
router.post('/callback', handleKieAiCallback)

/**
 * GET /api/kie-ai/callback/health
 * Health check для callback endpoint
 */
router.get('/callback/health', callbackHealthCheck)

/**
 * GET /api/kie-ai/callback (для тестирования)
 * Тестовый endpoint для проверки доступности
 */
router.get('/callback', (req, res) => {
  logger.info('🧪 Test GET request to callback endpoint', {
    query: req.query,
    timestamp: new Date().toISOString(),
  })

  res.status(200).json({
    message: 'Kie.ai callback endpoint is active',
    method: 'GET',
    expectedMethod: 'POST',
    timestamp: new Date().toISOString(),
    documentation: {
      endpoint: 'POST /api/kie-ai/callback',
      expectedBody: {
        taskId: 'string',
        status: '"completed" | "failed" | "processing"',
        videoUrl: 'string (optional)',
        error: 'string (optional)',
        progress: 'number (optional)',
        duration: 'number (optional)',
        cost: 'number (optional)',
      },
    },
  })
})

export default router
