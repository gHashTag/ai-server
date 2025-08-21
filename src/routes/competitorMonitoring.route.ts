/**
 * API endpoint для мониторинга конкурентов
 * Упрощенный интерфейс для подписки на конкурентов
 */

import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '@/supabase/client'
import { triggerCompetitorMonitoring } from '@/inngest-functions/competitorMonitoring'

const router = Router()

// Схема валидации
const MonitoringRequestSchema = z.object({
  username: z.string().min(1).transform(val => val.replace('@', '')), // Удаляем @ если есть
  user_telegram_id: z.string().min(1),
  user_chat_id: z.string().optional(),
  bot_name: z.string().min(1),
  max_reels: z.number().min(1).max(50).default(10),
  min_views: z.number().min(0).default(1000),
  max_age_days: z.number().min(1).max(30).default(7),
  delivery_format: z.enum(['digest', 'individual', 'archive']).default('digest'),
  project_id: z.number().positive().optional(),
})

/**
 * POST /api/competitor-monitoring
 * Подписка на конкурента с начальным парсингом
 */
router.post('/', async (req, res) => {
  try {
    const validatedData = MonitoringRequestSchema.parse(req.body)
    
    // Запускаем функцию мониторинга
    const result = await triggerCompetitorMonitoring(validatedData)
    
    res.json({
      success: true,
      message: `Monitoring for @${validatedData.username} started successfully`,
      event_id: result.eventId,
      competitor_username: validatedData.username,
      expected_reels: validatedData.max_reels,
      monitoring_enabled: true,
      next_check: 'Daily at 08:00 UTC',
      delivery_format: validatedData.delivery_format
    })
    
  } catch (error: any) {
    console.error('Error starting competitor monitoring:', error)
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/competitor-monitoring/status/:username
 * Проверка статуса мониторинга конкурента
 */
router.get('/status/:username', async (req, res) => {
  try {
    const { username } = req.params
    const { user_telegram_id, bot_name } = req.query
    
    if (!user_telegram_id || !bot_name) {
      return res.status(400).json({
        error: 'user_telegram_id and bot_name are required'
      })
    }

    const { getCompetitorReels } = await import('@/inngest-functions/competitorMonitoring')
    
    // Проверяем подписку
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('competitor_subscriptions')
      .select(`
        *,
        competitor_profiles!inner(
          display_name,
          followers_count
        )
      `)
      .eq('competitor_username', username.replace('@', ''))
      .eq('user_telegram_id', user_telegram_id)
      .eq('bot_name', bot_name)
      .single()

    if (subscriptionError || !subscriptionData) {
      return res.status(404).json({
        success: false,
        monitoring: false,
        message: `No monitoring found for @${username}`
      })
    }

    const subscription = subscriptionData

    // Получаем последнюю доставку
    const { data: lastDelivery } = await supabase
      .from('competitor_delivery_history')
      .select('delivered_at, reels_count')
      .eq('subscription_id', subscription.id)
      .order('delivered_at', { ascending: false })
      .limit(1)
      .single()
      
      // Получаем рилзы из БД
      const reels = await getCompetitorReels(username, 5, 999)
      
      res.json({
        success: true,
        monitoring: true,
        subscription: {
          id: subscription.id,
          competitor_username: subscription.competitor_username,
          display_name: subscription.display_name,
          max_reels: subscription.max_reels,
          min_views: subscription.min_views,
          max_age_days: subscription.max_age_days,
          delivery_format: subscription.delivery_format,
          is_active: subscription.is_active,
          created_at: subscription.created_at,
          last_delivery: lastDelivery?.delivered_at,
          last_delivery_reels_count: lastDelivery?.reels_count
        },
        reels_in_database: reels.length,
        latest_reels: reels.slice(0, 3).map(reel => ({
          url: reel.url,
          views_count: reel.views_count,
          likes_count: reel.likes_count,
          published_at: reel.published_at
        })),
        monitoring: {
          enabled: subscription.is_active,
          check_interval: '24 hours',
          next_check: 'Daily at 08:00 UTC'
        }
      })
      
  } catch (error: any) {
    console.error('Error checking monitoring status:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/competitor-monitoring/trigger-delivery/:username
 * Ручной запуск доставки для конкурента (для тестирования)
 */
router.post('/trigger-delivery/:username', async (req, res) => {
  try {
    const { username } = req.params
    const { project_id = 999 } = req.body
    
    const { inngest } = await import('@/core/inngest/clients')
    
    const result = await inngest.send({
      name: 'competitor/delivery-reels',
      data: {
        competitor_username: username.replace('@', ''),
        project_id: project_id
      }
    })
    
    res.json({
      success: true,
      message: `Delivery triggered for @${username}`,
      event_id: result.ids[0]
    })
    
  } catch (error: any) {
    console.error('Error triggering delivery:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export { router as competitorMonitoringRouter }