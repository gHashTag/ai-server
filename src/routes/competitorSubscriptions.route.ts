/**
 * API для управления подписками на конкурентов
 */

import { Router } from 'express'
import pkg from 'pg'
import { z } from 'zod'
const { Pool } = pkg

const router = Router()

// База данных
const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
})

// Схемы валидации
const CreateSubscriptionSchema = z.object({
  user_telegram_id: z.string(),
  user_chat_id: z.string().optional(),
  bot_name: z.string(),
  competitor_username: z.string().min(1),
  competitor_display_name: z.string().optional(),
  max_reels: z.number().min(1).max(50).default(10),
  min_views: z.number().min(0).default(1000),
  max_age_days: z.number().min(1).max(30).default(7),
  delivery_format: z.enum(['digest', 'individual', 'archive']).default('digest')
})

const UpdateSubscriptionSchema = z.object({
  max_reels: z.number().min(1).max(50).optional(),
  min_views: z.number().min(0).optional(),
  max_age_days: z.number().min(1).max(30).optional(),
  delivery_format: z.enum(['digest', 'individual', 'archive']).optional(),
  is_active: z.boolean().optional()
})

/**
 * GET /api/competitor-subscriptions
 * Получение подписок пользователя
 */
router.get('/', async (req, res) => {
  try {
    const { user_telegram_id, bot_name } = req.query

    if (!user_telegram_id || !bot_name) {
      return res.status(400).json({
        error: 'user_telegram_id and bot_name are required'
      })
    }

    const client = await dbPool.connect()
    
    try {
      const result = await client.query(`
        SELECT 
          cs.*,
          cp.display_name,
          cp.followers_count,
          cp.is_verified,
          cdh.delivered_at as last_delivery,
          cdh.reels_count as last_delivery_reels_count
        FROM competitor_subscriptions cs
        LEFT JOIN competitor_profiles cp ON cs.competitor_username = cp.username
        LEFT JOIN LATERAL (
          SELECT delivered_at, reels_count 
          FROM competitor_delivery_history 
          WHERE subscription_id = cs.id 
          ORDER BY delivered_at DESC 
          LIMIT 1
        ) cdh ON true
        WHERE cs.user_telegram_id = $1 AND cs.bot_name = $2
        ORDER BY cs.created_at DESC
      `, [user_telegram_id, bot_name])

      res.json({
        success: true,
        subscriptions: result.rows
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error getting subscriptions:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/competitor-subscriptions
 * Создание новой подписки
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = CreateSubscriptionSchema.parse(req.body)
    
    const client = await dbPool.connect()
    
    try {
      // Проверяем лимит подписок (максимум 10 на пользователя)
      const countResult = await client.query(`
        SELECT COUNT(*) FROM competitor_subscriptions 
        WHERE user_telegram_id = $1 AND bot_name = $2 AND is_active = true
      `, [validatedData.user_telegram_id, validatedData.bot_name])

      if (parseInt(countResult.rows[0].count) >= 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 active subscriptions per user'
        })
      }

      // Создаем подписку
      const result = await client.query(`
        INSERT INTO competitor_subscriptions 
        (user_telegram_id, user_chat_id, bot_name, competitor_username, 
         competitor_display_name, max_reels, min_views, max_age_days, delivery_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        validatedData.user_telegram_id,
        validatedData.user_chat_id,
        validatedData.bot_name,
        validatedData.competitor_username.replace('@', ''),
        validatedData.competitor_display_name,
        validatedData.max_reels,
        validatedData.min_views,
        validatedData.max_age_days,
        validatedData.delivery_format
      ])

      // Обновляем профиль конкурента если нужно
      await client.query(`
        INSERT INTO competitor_profiles (username, display_name, total_subscribers)
        VALUES ($1, $2, 1)
        ON CONFLICT (username) DO UPDATE SET
          total_subscribers = competitor_profiles.total_subscribers + 1,
          display_name = COALESCE(competitor_profiles.display_name, $2),
          updated_at = NOW()
      `, [
        validatedData.competitor_username.replace('@', ''),
        validatedData.competitor_display_name
      ])

      res.json({
        success: true,
        subscription: result.rows[0],
        message: `Subscribed to @${validatedData.competitor_username}`
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error creating subscription:', error)
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        error: 'Already subscribed to this competitor'
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * PUT /api/competitor-subscriptions/:id
 * Обновление подписки
 */
router.put('/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id
    const validatedData = UpdateSubscriptionSchema.parse(req.body)
    
    const client = await dbPool.connect()
    
    try {
      const updateFields = []
      const values = []
      let paramIndex = 1

      // Динамически строим запрос обновления
      Object.entries(validatedData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        })
      }

      updateFields.push(`updated_at = NOW()`)
      values.push(subscriptionId)

      const result = await client.query(`
        UPDATE competitor_subscriptions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, values)

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        })
      }

      res.json({
        success: true,
        subscription: result.rows[0],
        message: 'Subscription updated'
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error updating subscription:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/competitor-subscriptions/:id
 * Удаление подписки
 */
router.delete('/:id', async (req, res) => {
  try {
    const subscriptionId = req.params.id
    
    const client = await dbPool.connect()
    
    try {
      const result = await client.query(`
        DELETE FROM competitor_subscriptions 
        WHERE id = $1 
        RETURNING competitor_username
      `, [subscriptionId])

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subscription not found'
        })
      }

      const competitor = result.rows[0].competitor_username

      // Уменьшаем счетчик подписчиков
      await client.query(`
        UPDATE competitor_profiles 
        SET total_subscribers = GREATEST(0, total_subscribers - 1)
        WHERE username = $1
      `, [competitor])

      res.json({
        success: true,
        message: `Unsubscribed from @${competitor}`
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error deleting subscription:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/competitor-subscriptions/:id/history
 * История доставок для подписки
 */
router.get('/:id/history', async (req, res) => {
  try {
    const subscriptionId = req.params.id
    const limit = parseInt(req.query.limit as string) || 10
    
    const client = await dbPool.connect()
    
    try {
      const result = await client.query(`
        SELECT * FROM competitor_delivery_history 
        WHERE subscription_id = $1 
        ORDER BY delivered_at DESC 
        LIMIT $2
      `, [subscriptionId, limit])

      res.json({
        success: true,
        history: result.rows
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error getting delivery history:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/competitor-subscriptions/stats
 * Общая статистика подписок
 */
router.get('/stats', async (req, res) => {
  try {
    const client = await dbPool.connect()
    
    try {
      const stats = await client.query(`
        SELECT 
          COUNT(DISTINCT cs.user_telegram_id) as total_users,
          COUNT(cs.id) as total_subscriptions,
          COUNT(CASE WHEN cs.is_active THEN 1 END) as active_subscriptions,
          COUNT(DISTINCT cs.competitor_username) as unique_competitors,
          AVG(cs.max_reels) as avg_reels_per_subscription,
          COUNT(DISTINCT cs.bot_name) as total_bots
        FROM competitor_subscriptions cs
      `)

      const topCompetitors = await client.query(`
        SELECT 
          competitor_username,
          COUNT(*) as subscribers_count,
          MAX(created_at) as latest_subscription
        FROM competitor_subscriptions
        WHERE is_active = true
        GROUP BY competitor_username
        ORDER BY subscribers_count DESC
        LIMIT 10
      `)

      res.json({
        success: true,
        stats: stats.rows[0],
        top_competitors: topCompetitors.rows
      })
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('Error getting stats:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export { router as competitorSubscriptionsRouter }