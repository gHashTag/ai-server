/**
 * API роуты для управления подписками на конкурентов
 */

import { Router } from 'express'
import { CompetitorSubscriptionsController } from '@/controllers/competitorSubscriptions.controller'

const router = Router()

// Основные CRUD операции
router.get('/', CompetitorSubscriptionsController.getSubscriptions)
router.post('/', CompetitorSubscriptionsController.createSubscription)
router.put('/:id', CompetitorSubscriptionsController.updateSubscription)
router.delete('/:id', CompetitorSubscriptionsController.deleteSubscription)

// Статистика
router.get('/stats', CompetitorSubscriptionsController.getStats)

// Дополнительные действия
router.post('/:id/trigger-parsing', CompetitorSubscriptionsController.triggerParsing)

// История доставок (пока оставим старый код)
router.get('/:id/history', async (req, res) => {
  try {
    const pkg = await import('pg')
    const { Pool } = pkg.default
    
    const dbPool = new Pool({
      connectionString: process.env.SUPABASE_URL || '',
      ssl: { rejectUnauthorized: false },
    })

    const subscriptionId = req.params.id
    const limit = parseInt(req.query.limit as string) || 10

    const client = await dbPool.connect()

    try {
      const result = await client.query(
        `
        SELECT * FROM competitor_delivery_history 
        WHERE subscription_id = $1 
        ORDER BY delivered_at DESC 
        LIMIT $2
      `,
        [subscriptionId, limit]
      )

      res.json({
        success: true,
        history: result.rows,
      })
    } finally {
      client.release()
      await dbPool.end()
    }
  } catch (error: any) {
    console.error('Error getting delivery history:', error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

export { router as competitorSubscriptionsRouter }
