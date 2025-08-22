/**
 * Сервис для управления подписками на конкурентов
 */

import pkg from 'pg'
import { inngest } from '@/core/inngest/clients'
const { Pool } = pkg

const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

export interface CompetitorSubscription {
  id?: string
  user_telegram_id: string
  user_chat_id?: string
  bot_name: string
  competitor_username: string
  competitor_display_name?: string
  max_reels: number
  min_views: number
  max_age_days: number
  delivery_format: 'digest' | 'individual' | 'archive'
  delivery_time?: string
  delivery_timezone?: string
  is_active?: boolean
  created_at?: Date
  updated_at?: Date
}

export class CompetitorSubscriptionService {
  /**
   * Создание новой подписки с автоматической настройкой cron
   */
  static async createSubscription(data: CompetitorSubscription): Promise<{
    success: boolean
    subscription?: any
    error?: string
  }> {
    const client = await dbPool.connect()

    try {
      // Проверяем лимит подписок (максимум 10 на пользователя)
      const countResult = await client.query(
        `
        SELECT COUNT(*) FROM competitor_subscriptions 
        WHERE user_telegram_id = $1 AND bot_name = $2 AND is_active = true
      `,
        [data.user_telegram_id, data.bot_name]
      )

      if (parseInt(countResult.rows[0].count) >= 10) {
        return {
          success: false,
          error: 'Maximum 10 active subscriptions per user',
        }
      }

      // Создаем подписку
      const result = await client.query(
        `
        INSERT INTO competitor_subscriptions 
        (user_telegram_id, user_chat_id, bot_name, competitor_username, 
         competitor_display_name, max_reels, min_views, max_age_days, delivery_format)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          data.user_telegram_id,
          data.user_chat_id,
          data.bot_name,
          data.competitor_username.replace('@', ''),
          data.competitor_display_name,
          data.max_reels,
          data.min_views,
          data.max_age_days,
          data.delivery_format,
        ]
      )

      const subscription = result.rows[0]

      // Обновляем профиль конкурента
      await client.query(
        `
        INSERT INTO competitor_profiles (username, display_name, total_subscribers)
        VALUES ($1, $2, 1)
        ON CONFLICT (username) DO UPDATE SET
          total_subscribers = competitor_profiles.total_subscribers + 1,
          display_name = COALESCE(competitor_profiles.display_name, $2),
          updated_at = NOW()
      `,
        [
          data.competitor_username.replace('@', ''),
          data.competitor_display_name,
        ]
      )

      // Запускаем первичный парсинг для нового конкурента
      try {
        await inngest.send({
          name: 'instagram/apify-scrape',
          data: {
            username_or_hashtag: data.competitor_username.replace('@', ''),
            project_id: 999, // Специальный ID для автоматических подписок
            source_type: 'competitor',
            max_reels: data.max_reels,
            min_views: data.min_views,
            max_age_days: data.max_age_days,
            requester_telegram_id: data.user_telegram_id,
            bot_name: data.bot_name,
          },
        })

        console.log(`✅ Запущен первичный парсинг для @${data.competitor_username}`)
      } catch (parseError: any) {
        console.error('❌ Ошибка запуска первичного парсинга:', parseError.message)
      }

      return {
        success: true,
        subscription,
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error)

      if (error.code === '23505') {
        return {
          success: false,
          error: 'Already subscribed to this competitor',
        }
      }

      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Получение всех подписок пользователя
   */
  static async getUserSubscriptions(userTelegramId: string, botName: string): Promise<{
    success: boolean
    subscriptions?: any[]
    error?: string
  }> {
    const client = await dbPool.connect()

    try {
      const result = await client.query(
        `
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
      `,
        [userTelegramId, botName]
      )

      return {
        success: true,
        subscriptions: result.rows,
      }
    } catch (error: any) {
      console.error('Error getting subscriptions:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Удаление подписки
   */
  static async deleteSubscription(subscriptionId: string): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    const client = await dbPool.connect()

    try {
      const result = await client.query(
        `
        DELETE FROM competitor_subscriptions 
        WHERE id = $1 
        RETURNING competitor_username
      `,
        [subscriptionId]
      )

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Subscription not found',
        }
      }

      const competitor = result.rows[0].competitor_username

      // Уменьшаем счетчик подписчиков
      await client.query(
        `
        UPDATE competitor_profiles 
        SET total_subscribers = GREATEST(0, total_subscribers - 1)
        WHERE username = $1
      `,
        [competitor]
      )

      return {
        success: true,
        message: `Unsubscribed from @${competitor}`,
      }
    } catch (error: any) {
      console.error('Error deleting subscription:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Обновление подписки
   */
  static async updateSubscription(
    subscriptionId: string, 
    updates: Partial<CompetitorSubscription>
  ): Promise<{
    success: boolean
    subscription?: any
    error?: string
  }> {
    const client = await dbPool.connect()

    try {
      const updateFields = []
      const values = []
      let paramIndex = 1

      // Динамически строим запрос обновления
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined && key !== 'id') {
          updateFields.push(`${key} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        return {
          success: false,
          error: 'No fields to update',
        }
      }

      updateFields.push(`updated_at = NOW()`)
      values.push(subscriptionId)

      const result = await client.query(
        `
        UPDATE competitor_subscriptions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `,
        values
      )

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Subscription not found',
        }
      }

      return {
        success: true,
        subscription: result.rows[0],
      }
    } catch (error: any) {
      console.error('Error updating subscription:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Получение статистики подписок
   */
  static async getSubscriptionStats(): Promise<{
    success: boolean
    stats?: any
    top_competitors?: any[]
    error?: string
  }> {
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

      return {
        success: true,
        stats: stats.rows[0],
        top_competitors: topCompetitors.rows,
      }
    } catch (error: any) {
      console.error('Error getting stats:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }

  /**
   * Ручной запуск парсинга для конкретной подписки
   */
  static async triggerParsingForSubscription(subscriptionId: string): Promise<{
    success: boolean
    message?: string
    event_id?: string
    error?: string
  }> {
    const client = await dbPool.connect()

    try {
      const result = await client.query(
        `
        SELECT * FROM competitor_subscriptions 
        WHERE id = $1 AND is_active = true
      `,
        [subscriptionId]
      )

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Subscription not found or inactive',
        }
      }

      const subscription = result.rows[0]

      // Запускаем парсинг
      const parseResult = await inngest.send({
        name: 'instagram/apify-scrape',
        data: {
          username_or_hashtag: subscription.competitor_username,
          project_id: 999,
          source_type: 'competitor',
          max_reels: subscription.max_reels,
          min_views: subscription.min_views,
          max_age_days: subscription.max_age_days,
          requester_telegram_id: subscription.user_telegram_id,
          bot_name: subscription.bot_name,
        },
      })

      // Обновляем время последнего парсинга
      await client.query(
        `UPDATE competitor_subscriptions SET last_parsed_at = NOW() WHERE id = $1`,
        [subscriptionId]
      )

      return {
        success: true,
        message: `Parsing started for @${subscription.competitor_username}`,
        event_id: parseResult.ids[0],
      }
    } catch (error: any) {
      console.error('Error triggering parsing:', error)
      return {
        success: false,
        error: error.message,
      }
    } finally {
      client.release()
    }
  }
}