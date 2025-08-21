/**
 * Функция мониторинга конкурентов - подписка и парсинг Instagram конкурентов
 * Объединяет логику подписки и начального парсинга с возвратом последнего рилза
 */

import { inngest } from '@/core/inngest/clients'
import { supabase } from '@/supabase/client'
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
      // Проверяем лимит подписок (максимум 10 на пользователя)
      const { count } = await supabase
        .from('competitor_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_telegram_id', validatedData.user_telegram_id)
        .eq('bot_name', validatedData.bot_name)
        .eq('is_active', true)

      if (count && count >= 10) {
        throw new Error('Maximum 10 active subscriptions per user')
      }

      // Создаем или обновляем подписку
      const subscriptionData = {
        user_telegram_id: validatedData.user_telegram_id,
        user_chat_id: validatedData.user_chat_id,
        bot_name: validatedData.bot_name,
        competitor_username: validatedData.username.replace('@', ''),
        max_reels: validatedData.max_reels,
        min_views: validatedData.min_views,
        max_age_days: validatedData.max_age_days,
        delivery_format: validatedData.delivery_format,
        is_active: true,
        updated_at: new Date().toISOString()
      }

      const { data: existingSubscription } = await supabase
        .from('competitor_subscriptions')
        .select('*')
        .eq('user_telegram_id', validatedData.user_telegram_id)
        .eq('competitor_username', validatedData.username.replace('@', ''))
        .eq('bot_name', validatedData.bot_name)
        .single()

      let subscriptionResult

      if (existingSubscription) {
        // Обновляем существующую подписку
        const { data, error } = await supabase
          .from('competitor_subscriptions')
          .update(subscriptionData)
          .eq('id', existingSubscription.id)
          .select()
          .single()

        if (error) throw error
        subscriptionResult = data
      } else {
        // Создаем новую подписку
        const { data, error } = await supabase
          .from('competitor_subscriptions')
          .insert(subscriptionData)
          .select()
          .single()

        if (error) throw error
        subscriptionResult = data
      }

      // Обновляем профиль конкурента
      const { data: existingProfile } = await supabase
        .from('competitor_profiles')
        .select('*')
        .eq('username', validatedData.username.replace('@', ''))
        .single()

      if (existingProfile) {
        await supabase
          .from('competitor_profiles')
          .update({
            total_subscribers: existingProfile.total_subscribers + 1,
            updated_at: new Date().toISOString()
          })
          .eq('username', validatedData.username.replace('@', ''))
      } else {
        await supabase
          .from('competitor_profiles')
          .insert({
            username: validatedData.username.replace('@', ''),
            total_subscribers: 1
          })
      }

      log.info(`✅ Подписка создана на @${validatedData.username}`)
      return subscriptionResult
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
      
      // Получаем свежие рилзы конкурента из БД
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const { data: reels, error } = await supabase
        .from('instagram_apify_reels')
        .select('*')
        .eq('owner_username', validatedData.username.replace('@', ''))
        .eq('project_id', validatedData.project_id || 999)
        .gte('scraped_at', oneHourAgo.toISOString())
        .order('published_at', { ascending: false })
        .order('views_count', { ascending: false })
        .limit(validatedData.max_reels)

      if (error) {
        log.error('❌ Ошибка получения рилзов:', error)
        return []
      }

      log.info(`📦 Найдено ${reels?.length || 0} рилзов в БД`)
      return reels || []
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
      const { error } = await supabase
        .from('competitor_delivery_history')
        .insert({
          subscription_id: subscription.id,
          reels_count: userResult.reels_count_in_db,
          delivery_status: 'sent',
          reels_data: {
            latest_reel: userResult.latest_reel,
            total_reels: userResult.reels_count_in_db
          }
        })

      if (error) {
        log.error('❌ Ошибка записи истории доставки:', error)
      } else {
        log.info('📝 История доставки записана')
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
  let query = supabase
    .from('instagram_apify_reels')
    .select('*')
    .eq('owner_username', username.replace('@', ''))
    .order('published_at', { ascending: false })
    .order('views_count', { ascending: false })
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    log.error('❌ Ошибка получения рилзов конкурента:', error)
    return []
  }

  return data || []
}