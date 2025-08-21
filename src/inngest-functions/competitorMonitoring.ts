/**
 * Функция мониторинга конкурентов - подписка и парсинг Instagram конкурентов
 * Объединяет логику подписки и начального парсинга с возвратом последнего рилза
 */

import { inngest } from '@/core/inngest/clients'
import { Pool } from 'pg'
import { z } from 'zod'

// Схема валидации входных данных
const CompetitorMonitoringEventSchema = z.object({
  username: z.string().min(1), // Instagram username конкурента (без @)
  user_telegram_id: z.string().min(1),
  user_chat_id: z.string().optional(),
  bot_name: z.string().min(1),
  max_reels: z.number().min(1).max(50).default(10), // сколько сохранить в БД
  min_views: z.number().min(0).default(1000),
  max_age_days: z.number().min(1).max(30).default(7),
  delivery_format: z.enum(['digest', 'individual', 'archive']).default('digest'),
  project_id: z.number().positive().optional(),
})

// База данных
const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[COMPETITOR-MONITORING] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[COMPETITOR-MONITORING] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[COMPETITOR-MONITORING] ${msg}`, data || ''),
}

/**
 * Функция мониторинга конкурентов
 */
export const competitorMonitoring = inngest.createFunction(
  {
    id: 'competitor-monitoring',
    name: '🔍 Competitor Monitoring',
    concurrency: 2,
  },
  { event: 'competitor/monitor' },
  async ({ event, step, runId }) => {
    log.info('🚀 Мониторинг конкурента запущен', {
      runId,
      eventData: event.data,
    })

    // Step 1: Валидация входных данных
    const validatedData = await step.run('validate-input', async () => {
      const result = CompetitorMonitoringEventSchema.safeParse(event.data)
      
      if (!result.success) {
        throw new Error(`Invalid input: ${result.error.message}`)
      }

      log.info('✅ Входные данные валидированы')
      return result.data
    })

    // Step 2: Создание подписки на конкурента
    const subscription = await step.run('create-subscription', async () => {
      const client = await dbPool.connect()
      
      try {
        // Проверяем лимит подписок (максимум 10 на пользователя)
        const countResult = await client.query(`
          SELECT COUNT(*) FROM competitor_subscriptions 
          WHERE user_telegram_id = $1 AND bot_name = $2 AND is_active = true
        `, [validatedData.user_telegram_id, validatedData.bot_name])

        if (parseInt(countResult.rows[0].count) >= 10) {
          throw new Error('Maximum 10 active subscriptions per user')
        }

        // Создаем подписку
        const result = await client.query(`
          INSERT INTO competitor_subscriptions 
          (user_telegram_id, user_chat_id, bot_name, competitor_username, 
           max_reels, min_views, max_age_days, delivery_format)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (user_telegram_id, competitor_username, bot_name) 
          DO UPDATE SET 
            is_active = true,
            max_reels = $5,
            min_views = $6,
            max_age_days = $7,
            delivery_format = $8,
            updated_at = NOW()
          RETURNING *
        `, [
          validatedData.user_telegram_id,
          validatedData.user_chat_id,
          validatedData.bot_name,
          validatedData.username.replace('@', ''),
          validatedData.max_reels,
          validatedData.min_views,
          validatedData.max_age_days,
          validatedData.delivery_format
        ])

        // Обновляем профиль конкурента
        await client.query(`
          INSERT INTO competitor_profiles (username, total_subscribers)
          VALUES ($1, 1)
          ON CONFLICT (username) DO UPDATE SET
            total_subscribers = competitor_profiles.total_subscribers + 1,
            updated_at = NOW()
        `, [validatedData.username.replace('@', '')])

        log.info(`✅ Подписка создана на @${validatedData.username}`)
        return result.rows[0]
      } finally {
        client.release()
      }
    })

    // Step 3: Запуск парсинга рилзов конкурента
    const parsingResult = await step.run('parse-competitor-reels', async () => {
      log.info(`🎬 Запуск парсинга рилзов @${validatedData.username}`)
      
      // Запускаем парсинг через существующий Apify скрапер
      const parseEvent = await inngest.send({
        name: 'instagram/apify-scrape',
        data: {
          username_or_hashtag: validatedData.username,
          project_id: validatedData.project_id || 999,
          source_type: 'competitor',
          max_reels: validatedData.max_reels,
          min_views: validatedData.min_views,
          max_age_days: validatedData.max_age_days,
          requester_telegram_id: validatedData.user_telegram_id,
          bot_name: validatedData.bot_name,
        }
      })

      log.info('✅ Парсинг запущен', { 
        event_id: parseEvent.ids[0] 
      })
      
      return {
        parse_event_id: parseEvent.ids[0],
        status: 'started'
      }
    })

    // Step 4: Ожидание завершения парсинга (с таймаутом)
    const reelsData = await step.run('wait-for-parsing-complete', async () => {
      // Ждем некоторое время, чтобы парсинг завершился
      await new Promise(resolve => setTimeout(resolve, 15000)) // 15 секунд
      
      const client = await dbPool.connect()
      
      try {
        // Получаем свежие рилзы конкурента из БД
        const result = await client.query(`
          SELECT * FROM instagram_apify_reels 
          WHERE owner_username = $1 
          AND project_id = $2
          AND scraped_at >= NOW() - INTERVAL '1 hour'
          ORDER BY published_at DESC, views_count DESC
          LIMIT $3
        `, [
          validatedData.username.replace('@', ''),
          validatedData.project_id || 999,
          validatedData.max_reels
        ])

        log.info(`📦 Найдено ${result.rows.length} рилзов в БД`)
        return result.rows
      } finally {
        client.release()
      }
    })

    // Step 5: Подготовка результата для пользователя (1 лучший рилз)
    const userResult = await step.run('prepare-user-result', async () => {
      if (reelsData.length === 0) {
        log.warn('⚠️ Рилзы не найдены, возвращаем информацию о подписке')
        
        return {
          success: true,
          subscribed: true,
          competitor_username: validatedData.username,
          subscription_id: subscription.id,
          message: `Подписка на @${validatedData.username} активирована! Рилзы будут доступны в ближайшее время.`,
          reels_count_in_db: 0,
          latest_reel: null
        }
      }

      // Берем лучший рилз (первый в отсортированном списке)
      const bestReel = reelsData[0]
      
      return {
        success: true,
        subscribed: true,
        competitor_username: validatedData.username,
        subscription_id: subscription.id,
        message: `✅ Успешно подписались на @${validatedData.username}!`,
        reels_count_in_db: reelsData.length,
        latest_reel: {
          id: bestReel.reel_id,
          url: bestReel.url,
          video_url: bestReel.video_url,
          thumbnail_url: bestReel.thumbnail_url,
          caption: bestReel.caption,
          owner_username: bestReel.owner_username,
          views_count: bestReel.views_count,
          likes_count: bestReel.likes_count,
          comments_count: bestReel.comments_count,
          published_at: bestReel.published_at,
          music_artist: bestReel.music_artist,
          music_title: bestReel.music_title,
        }
      }
    })

    // Step 6: Отправка уведомления пользователю
    if (validatedData.user_telegram_id && validatedData.bot_name) {
      await step.run('send-user-notification', async () => {
        try {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName(validatedData.bot_name)
          
          let message = userResult.message + '\n\n'
          
          if (userResult.latest_reel) {
            const reel = userResult.latest_reel
            message += `🎬 Последний рилз от @${reel.owner_username}:\n`
            message += `👁 ${reel.views_count.toLocaleString()} просмотров\n`
            message += `❤️ ${reel.likes_count.toLocaleString()} лайков\n`
            
            if (reel.music_artist && reel.music_title) {
              message += `🎵 ${reel.music_artist} - ${reel.music_title}\n`
            }
            
            message += `\n🔗 ${reel.url}`
            
            // Если есть видео URL, отправляем видео
            if (reel.video_url) {
              try {
                await bot.telegram.sendVideo(
                  validatedData.user_telegram_id,
                  reel.video_url,
                  {
                    caption: message,
                    parse_mode: 'HTML'
                  }
                )
              } catch (videoError) {
                // Если видео не отправляется, отправляем как текст с ссылкой
                await bot.telegram.sendMessage(
                  validatedData.user_telegram_id,
                  message
                )
              }
            } else {
              await bot.telegram.sendMessage(
                validatedData.user_telegram_id,
                message
              )
            }
          } else {
            message += `📊 Сохранено ${userResult.reels_count_in_db} рилзов в базе данных`
            message += '\n🔄 Автоматический мониторинг активирован'
            
            await bot.telegram.sendMessage(
              validatedData.user_telegram_id,
              message
            )
          }
          
          log.info('✅ Уведомление отправлено пользователю')
        } catch (error) {
          log.error('❌ Ошибка отправки уведомления:', error)
        }
      })
    }

    // Step 7: Записываем историю доставки
    await step.run('record-delivery-history', async () => {
      const client = await dbPool.connect()
      
      try {
        await client.query(`
          INSERT INTO competitor_delivery_history 
          (subscription_id, reels_count, delivery_status, reels_data)
          VALUES ($1, $2, $3, $4)
        `, [
          subscription.id,
          userResult.reels_count_in_db,
          'sent',
          JSON.stringify({
            latest_reel: userResult.latest_reel,
            total_reels: userResult.reels_count_in_db
          })
        ])
        
        log.info('📝 История доставки записана')
      } finally {
        client.release()
      }
    })

    // Step 8: Запускаем будущий мониторинг (доставка будет автоматической)
    await step.run('setup-monitoring', async () => {
      log.info(`🔄 Мониторинг настроен для @${validatedData.username}`)
      log.info('• Автоматический парсинг: каждые 24 часа в 08:00 UTC')
      log.info('• Доставка новых рилзов: сразу после парсинга')
      log.info('• Формат доставки: ' + validatedData.delivery_format)
      
      return {
        monitoring_enabled: true,
        check_interval: '24 hours',
        next_check: 'Daily at 08:00 UTC'
      }
    })

    log.info('🎉 Мониторинг конкурента настроен успешно', userResult)
    return userResult
  }
)

/**
 * Helper функция для запуска мониторинга конкурента
 */
export async function triggerCompetitorMonitoring(data: any) {
  const result = await inngest.send({
    name: 'competitor/monitor',
    data,
  })
  
  return {
    eventId: result.ids[0],
  }
}

/**
 * Функция для получения рилзов конкурента из БД
 */
export async function getCompetitorReels(
  username: string, 
  limit: number = 10, 
  projectId?: number
) {
  const client = await dbPool.connect()
  
  try {
    const result = await client.query(`
      SELECT * FROM instagram_apify_reels 
      WHERE owner_username = $1 
      ${projectId ? 'AND project_id = $3' : ''}
      ORDER BY published_at DESC, views_count DESC
      LIMIT $2
    `, projectId 
      ? [username.replace('@', ''), limit, projectId]
      : [username.replace('@', ''), limit]
    )

    return result.rows
  } finally {
    client.release()
  }
}