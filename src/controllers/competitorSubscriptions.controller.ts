import { Request, Response } from 'express'
import { CompetitorSubscriptionService } from '@/services/competitorSubscriptionService'

export class CompetitorSubscriptionsController {
  /**
   * GET /api/competitor-subscriptions
   * Получение подписок пользователя
   */
  static async getSubscriptions(req: Request, res: Response) {
    try {
      const { user_telegram_id, bot_name } = req.query

      if (!user_telegram_id || !bot_name) {
        return res.status(400).json({
          error: 'user_telegram_id and bot_name are required',
        })
      }

      const result = await CompetitorSubscriptionService.getUserSubscriptions(
        user_telegram_id as string,
        bot_name as string
      )

      if (result.success) {
        res.json({
          success: true,
          subscriptions: result.subscriptions,
        })
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        })
      }
    } catch (error: any) {
      console.error('Error in getSubscriptions:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }

  /**
   * POST /api/competitor-subscriptions
   * Создание новой подписки
   */
  static async createSubscription(req: Request, res: Response) {
    try {
      const {
        user_telegram_id,
        user_chat_id,
        bot_name,
        competitor_username,
        competitor_display_name,
        max_reels = 10,
        min_views = 1000,
        max_age_days = 7,
        delivery_format = 'digest',
      } = req.body

      if (!user_telegram_id || !bot_name || !competitor_username) {
        return res.status(400).json({
          success: false,
          error:
            'user_telegram_id, bot_name, and competitor_username are required',
        })
      }

      const result = await CompetitorSubscriptionService.createSubscription({
        user_telegram_id,
        user_chat_id,
        bot_name,
        competitor_username,
        competitor_display_name,
        max_reels,
        min_views,
        max_age_days,
        delivery_format,
      })

      if (result.success) {
        res.json({
          success: true,
          subscription: result.subscription,
          message: `Subscribed to @${competitor_username}`,
        })
      } else {
        res.status(400).json(result)
      }
    } catch (error: any) {
      console.error('Error in createSubscription:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }

  /**
   * PUT /api/competitor-subscriptions/:id
   * Обновление подписки
   */
  static async updateSubscription(req: Request, res: Response) {
    try {
      const subscriptionId = req.params.id
      const updates = req.body

      const result = await CompetitorSubscriptionService.updateSubscription(
        subscriptionId,
        updates
      )

      if (result.success) {
        res.json({
          success: true,
          subscription: result.subscription,
          message: 'Subscription updated',
        })
      } else {
        const statusCode = result.error === 'Subscription not found' ? 404 : 400
        res.status(statusCode).json(result)
      }
    } catch (error: any) {
      console.error('Error in updateSubscription:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }

  /**
   * DELETE /api/competitor-subscriptions/:id
   * Удаление подписки
   */
  static async deleteSubscription(req: Request, res: Response) {
    try {
      const subscriptionId = req.params.id

      const result = await CompetitorSubscriptionService.deleteSubscription(
        subscriptionId
      )

      if (result.success) {
        res.json(result)
      } else {
        const statusCode = result.error === 'Subscription not found' ? 404 : 500
        res.status(statusCode).json(result)
      }
    } catch (error: any) {
      console.error('Error in deleteSubscription:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }

  /**
   * GET /api/competitor-subscriptions/stats
   * Общая статистика подписок
   */
  static async getStats(req: Request, res: Response) {
    try {
      const result = await CompetitorSubscriptionService.getSubscriptionStats()

      if (result.success) {
        res.json({
          success: true,
          stats: result.stats,
          top_competitors: result.top_competitors,
        })
      } else {
        res.status(500).json(result)
      }
    } catch (error: any) {
      console.error('Error in getStats:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }

  /**
   * POST /api/competitor-subscriptions/:id/trigger-parsing
   * Ручной запуск парсинга для подписки
   */
  static async triggerParsing(req: Request, res: Response) {
    try {
      const subscriptionId = req.params.id

      const result =
        await CompetitorSubscriptionService.triggerParsingForSubscription(
          subscriptionId
        )

      if (result.success) {
        res.json(result)
      } else {
        const statusCode =
          result.error === 'Subscription not found or inactive' ? 404 : 500
        res.status(statusCode).json(result)
      }
    } catch (error: any) {
      console.error('Error in triggerParsing:', error)
      res.status(500).json({
        success: false,
        error: error.message,
      })
    }
  }
}
