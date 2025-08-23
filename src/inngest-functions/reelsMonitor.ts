/**
 * 🎬 Мониторинг новых рилсов Instagram
 * Проверяет новые рилсы каждые 4 часа и отправляет подписчикам
 * Списывает звезды с баланса за каждое уведомление
 */

import { inngest } from '@/core/inngest/clients'
import pkg from 'pg'
import axios from 'axios'
import { getUserBalance } from '@/core/supabase/getUserBalance'
import { updateUserBalance } from '@/core/supabase/updateUserBalance'
const { Pool } = pkg

// База данных
const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[REELS-MONITOR] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[REELS-MONITOR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[REELS-MONITOR] ${msg}`, data || ''),
}

// Интерфейсы
interface ReelData {
  id: string
  code: string
  caption?: string
  video_url?: string
  thumbnail_url?: string
  view_count: number
  like_count: number
  comment_count: number
  created_time: string
  owner_username: string
  owner_id: string
}

interface SubscriptionWithUsers {
  instagram_username: string
  instagram_user_id: string
  display_name?: string
  subscribers: Array<{
    id: string
    telegram_id: string
    telegram_username?: string
    chat_id?: string
    bot_name: string
    max_reels: number
    min_views: number
    language?: string
  }>
}

/**
 * 🔄 Функция мониторинга новых рилсов - запускается каждые 4 часа
 */
export const reelsMonitor = inngest.createFunction(
  {
    id: 'reels-monitor-4h',
    name: '🎬 Reels Monitor (Every 4 Hours)',
    concurrency: 3, // Параллельно проверяем до 3 аккаунтов
  },
  { cron: '0 */4 * * *' }, // Каждые 4 часа
  async ({ event, step, runId }) => {
    log.info('🚀 Мониторинг рилсов запущен', {
      runId,
      time: new Date().toISOString(),
    })

    // Step 1: Получение активных подписок, сгруппированных по Instagram аккаунтам
    const subscriptionGroups = await step.run(
      'get-subscription-groups',
      async () => {
        const client = await dbPool.connect()

        try {
          // Получаем все активные подписки, сгруппированные по Instagram username
          // Также проверяем баланс пользователей
          const result = await client.query(`
            WITH subscription_data AS (
              SELECT 
                cs.id,
                cs.telegram_id,
                cs.telegram_username,
                cs.bot_name,
                cs.instagram_username,
                cs.instagram_user_id,
                cs.max_reels,
                cs.min_views,
                cs.language,
                cs.cost_per_check,
                u.chat_id,
                cp.display_name
              FROM instagram_subscriptions cs
              LEFT JOIN users u ON u.telegram_id = cs.telegram_id
              LEFT JOIN competitor_profiles cp ON cp.username = cs.instagram_username
              WHERE cs.is_active = true
                AND cs.notify_reels = true
            )
            SELECT 
              instagram_username,
              instagram_user_id,
              MAX(display_name) as display_name,
              json_agg(
                json_build_object(
                  'id', id,
                  'telegram_id', telegram_id,
                  'telegram_username', telegram_username,
                  'chat_id', chat_id,
                  'bot_name', bot_name,
                  'max_reels', max_reels,
                  'min_views', min_views,
                  'language', language
                )
              ) as subscribers
            FROM subscription_data
            GROUP BY instagram_username, instagram_user_id
          `)

          const groups: SubscriptionWithUsers[] = result.rows.map(row => ({
            instagram_username: row.instagram_username,
            instagram_user_id: row.instagram_user_id,
            display_name: row.display_name,
            subscribers: row.subscribers,
          }))

          log.info(
            `📊 Найдено ${groups.length} уникальных Instagram аккаунтов для мониторинга`
          )
          groups.forEach(g => {
            log.info(
              `  - @${g.instagram_username}: ${g.subscribers.length} подписчиков`
            )
          })

          return groups
        } finally {
          client.release()
        }
      }
    )

    if (subscriptionGroups.length === 0) {
      log.info('⏭️ Нет активных подписок для мониторинга')
      return { success: true, message: 'No active subscriptions' }
    }

    // Step 2: Проверка новых рилсов для каждого аккаунта
    const checkResults = await step.run('check-new-reels', async () => {
      const results = []

      for (const group of subscriptionGroups) {
        try {
          log.info(`🔍 Проверяем новые рилсы @${group.instagram_username}`)

          // Получаем последние рилсы через API
          const reels = await fetchLatestReels(
            group.instagram_username,
            group.instagram_user_id
          )

          if (!reels || reels.length === 0) {
            log.warn(`⚠️ Нет рилсов для @${group.instagram_username}`)
            results.push({
              username: group.instagram_username,
              status: 'no_reels',
              reels_count: 0,
            })
            continue
          }

          // Фильтруем только новые рилсы (опубликованные за последние 4 часа)
          const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
          const newReels = reels.filter(reel => {
            const reelDate = new Date(reel.created_time)
            return reelDate > fourHoursAgo
          })

          if (newReels.length === 0) {
            log.info(`📭 Нет новых рилсов для @${group.instagram_username}`)
            results.push({
              username: group.instagram_username,
              status: 'no_new_reels',
              reels_count: 0,
            })
            continue
          }

          log.info(
            `🎬 Найдено ${newReels.length} новых рилсов для @${group.instagram_username}`
          )

          // Сохраняем новые рилсы и готовим для отправки
          const savedReels = await saveNewReels(
            newReels,
            group.instagram_username
          )

          results.push({
            username: group.instagram_username,
            status: 'new_reels_found',
            reels_count: newReels.length,
            reels: savedReels,
            subscribers: group.subscribers,
          })
        } catch (error: any) {
          log.error(
            `❌ Ошибка проверки @${group.instagram_username}:`,
            error.message
          )
          results.push({
            username: group.instagram_username,
            status: 'error',
            error: error.message,
          })
        }

        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      return results
    })

    // Step 3: Отправка уведомлений подписчикам
    const notificationResults = await step.run(
      'send-notifications',
      async () => {
        const results = []

        for (const checkResult of checkResults) {
          if (checkResult.status !== 'new_reels_found' || !checkResult.reels) {
            continue
          }

          for (const subscriber of checkResult.subscribers) {
            try {
              // Проверяем баланс пользователя
              const balance = await getUserBalance(subscriber.telegram_id)
              const costPerNotification = 5 // 5 звезд за уведомление о рилсах

              if (balance < costPerNotification) {
                log.warn(
                  `⚠️ Недостаточно звезд у ${subscriber.telegram_id}: ${balance} < ${costPerNotification}`
                )

                // Деактивируем подписку если нет средств
                await deactivateSubscription(
                  subscriber.id,
                  subscriber.telegram_id
                )

                // Отправляем уведомление о недостатке средств
                await sendInsufficientFundsNotification(subscriber)

                results.push({
                  subscriber_id: subscriber.id,
                  telegram_id: subscriber.telegram_id,
                  username: checkResult.username,
                  status: 'insufficient_funds',
                  balance: balance,
                })
                continue
              }

              // Фильтруем рилсы по настройкам подписчика
              const filteredReels = checkResult.reels
                .filter(
                  (reel: ReelData) =>
                    reel.view_count >= (subscriber.min_views || 0)
                )
                .slice(0, subscriber.max_reels || 10)

              if (filteredReels.length === 0) {
                continue
              }

              // Отправляем уведомление в Telegram
              const sent = await sendTelegramNotification(
                subscriber,
                checkResult.username,
                filteredReels,
                checkResult.subscribers.find(s => s.id === subscriber.id)
                  ?.language || 'ru'
              )

              if (sent) {
                // Списываем звезды с баланса
                const costDescription = `Уведомление о ${filteredReels.length} новых рилсах от @${checkResult.username}`
                await updateUserBalance(
                  subscriber.telegram_id,
                  -costPerNotification, // Отрицательное значение для списания
                  'reels_notification',
                  costDescription,
                  subscriber.bot_name
                )

                log.info(
                  `💰 Списано ${costPerNotification} звезд с баланса ${subscriber.telegram_id}`
                )
              }

              results.push({
                subscriber_id: subscriber.id,
                telegram_id: subscriber.telegram_id,
                username: checkResult.username,
                reels_sent: filteredReels.length,
                status: sent ? 'sent' : 'failed',
                cost: sent ? costPerNotification : 0,
              })

              // Обновляем статистику
              await updateNotificationStats(subscriber.id, filteredReels.length)
            } catch (error: any) {
              log.error(
                `❌ Ошибка отправки ${subscriber.telegram_id}:`,
                error.message
              )
              results.push({
                subscriber_id: subscriber.id,
                telegram_id: subscriber.telegram_id,
                username: checkResult.username,
                status: 'error',
                error: error.message,
              })
            }
          }
        }

        return results
      }
    )

    // Step 4: Итоговая статистика
    const summary = {
      total_accounts_checked: subscriptionGroups.length,
      accounts_with_new_reels: checkResults.filter(
        r => r.status === 'new_reels_found'
      ).length,
      total_new_reels: checkResults.reduce(
        (sum, r) => sum + (r.reels_count || 0),
        0
      ),
      notifications_sent: notificationResults.filter(n => n.status === 'sent')
        .length,
      notifications_failed: notificationResults.filter(
        n => n.status === 'failed' || n.status === 'error'
      ).length,
    }

    log.info('✅ Мониторинг завершен', summary)
    return summary
  }
)

/**
 * Получение последних рилсов через Instagram API
 */
async function fetchLatestReels(
  username: string,
  userId?: string
): Promise<ReelData[]> {
  try {
    const apiKey = process.env.RAPIDAPI_INSTAGRAM_KEY
    const host =
      process.env.RAPIDAPI_INSTAGRAM_HOST ||
      'instagram-scraper-api3.p.rapidapi.com'

    const response = await axios.get(`https://${host}/user_reels`, {
      params: {
        username_or_id: userId || username,
        count: 12, // Получаем последние 12 рилсов
      },
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': host,
      },
      timeout: 30000,
    })

    if (response.data?.data?.items) {
      return response.data.data.items.map((item: any) => ({
        id: item.id,
        code: item.code,
        caption: item.caption?.text || '',
        video_url: item.video_url,
        thumbnail_url:
          item.thumbnail_url || item.image_versions2?.candidates?.[0]?.url,
        view_count: item.view_count || item.play_count || 0,
        like_count: item.like_count || 0,
        comment_count: item.comment_count || 0,
        created_time: new Date(item.taken_at * 1000).toISOString(),
        owner_username: username,
        owner_id: userId || item.user?.pk,
      }))
    }

    return []
  } catch (error: any) {
    log.error(`API Error for @${username}:`, error.message)
    return []
  }
}

/**
 * Сохранение новых рилсов в БД
 */
async function saveNewReels(
  reels: ReelData[],
  username: string
): Promise<ReelData[]> {
  const client = await dbPool.connect()

  try {
    const savedReels = []

    for (const reel of reels) {
      // Проверяем, не сохранен ли уже этот рилс
      const exists = await client.query(
        'SELECT id FROM instagram_user_reels WHERE reel_id = $1',
        [reel.id]
      )

      if (exists.rows.length === 0) {
        // Сохраняем новый рилс
        await client.query(
          `
          INSERT INTO instagram_user_reels (
            instagram_user_id, username, reel_id, reel_code,
            caption, video_url, thumbnail_url,
            view_count, like_count, comment_count,
            created_time, project_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (reel_id) DO NOTHING
        `,
          [
            reel.owner_id,
            username,
            reel.id,
            reel.code,
            reel.caption,
            reel.video_url,
            reel.thumbnail_url,
            reel.view_count,
            reel.like_count,
            reel.comment_count,
            reel.created_time,
            999, // Специальный project_id для автоматического мониторинга
          ]
        )

        savedReels.push(reel)
      }
    }

    return savedReels
  } finally {
    client.release()
  }
}

/**
 * Отправка уведомления в Telegram
 */
async function sendTelegramNotification(
  subscriber: any,
  instagramUsername: string,
  reels: ReelData[],
  language: string
): Promise<boolean> {
  try {
    const botToken =
      process.env[`BOT_TOKEN_${subscriber.bot_name.toUpperCase()}`] ||
      process.env.BOT_TOKEN_NEURO_BLOGGER

    if (!botToken || !subscriber.chat_id) {
      log.warn(`⚠️ Нет токена бота или chat_id для ${subscriber.telegram_id}`)
      return false
    }

    // Формируем сообщение
    const isRu = language === 'ru'
    const header = isRu
      ? `🎬 Новые рилсы от @${instagramUsername}`
      : `🎬 New reels from @${instagramUsername}`

    const reelsText = reels
      .map((reel, index) => {
        const views = formatNumber(reel.view_count)
        const likes = formatNumber(reel.like_count)
        const caption = reel.caption ? reel.caption.substring(0, 100) : ''

        return isRu
          ? `${index + 1}. 👁 ${views} | ❤️ ${likes}\n${caption}${
              caption.length >= 100 ? '...' : ''
            }\n🔗 instagram.com/reel/${reel.code}`
          : `${index + 1}. 👁 ${views} | ❤️ ${likes}\n${caption}${
              caption.length >= 100 ? '...' : ''
            }\n🔗 instagram.com/reel/${reel.code}`
      })
      .join('\n\n')

    const footer = isRu
      ? `\n\n💎 Всего новых рилсов: ${reels.length}\n⏰ Следующая проверка через 4 часа`
      : `\n\n💎 Total new reels: ${reels.length}\n⏰ Next check in 4 hours`

    const message = `${header}\n\n${reelsText}${footer}`

    // Отправляем сообщение
    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: subscriber.chat_id,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }
    )

    return response.data.ok
  } catch (error: any) {
    log.error(`Telegram send error:`, error.message)
    return false
  }
}

/**
 * Обновление статистики уведомлений
 */
async function updateNotificationStats(
  subscriptionId: string,
  reelsCount: number
): Promise<void> {
  const client = await dbPool.connect()

  try {
    await client.query(
      `
      UPDATE instagram_subscriptions
      SET 
        notifications_sent = COALESCE(notifications_sent, 0) + 1,
        last_notification_at = NOW()
      WHERE id = $1
    `,
      [subscriptionId]
    )

    // Записываем в историю
    await client.query(
      `
      INSERT INTO reels_notifications_history 
      (subscription_id, reels_count, sent_at, project_id)
      VALUES ($1, $2, NOW(), 999)
    `,
      [subscriptionId, reelsCount]
    )
  } finally {
    client.release()
  }
}

/**
 * Форматирование чисел
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

/**
 * Деактивация подписки при недостатке средств
 */
async function deactivateSubscription(
  subscriptionId: string,
  telegramId: string
): Promise<void> {
  const client = await dbPool.connect()

  try {
    await client.query(
      `
      UPDATE instagram_subscriptions
      SET 
        is_active = false,
        deactivation_reason = 'insufficient_funds',
        deactivated_at = NOW()
      WHERE id = $1
    `,
      [subscriptionId]
    )

    log.info(
      `🔴 Подписка ${subscriptionId} деактивирована для ${telegramId} (недостаточно средств)`
    )
  } finally {
    client.release()
  }
}

/**
 * Отправка уведомления о недостатке средств
 */
async function sendInsufficientFundsNotification(
  subscriber: any
): Promise<void> {
  try {
    const botToken =
      process.env[`BOT_TOKEN_${subscriber.bot_name.toUpperCase()}`] ||
      process.env.BOT_TOKEN_NEURO_BLOGGER

    if (!botToken || !subscriber.chat_id) {
      return
    }

    const message = `❌ Недостаточно звёзд на балансе!

Ваша подписка на рилсы временно приостановлена.
Пополните баланс, чтобы продолжить получать уведомления о новых рилсах.

Стоимость уведомления: 5 ⭐
Ваш текущий баланс можно проверить командой /balance

Для пополнения используйте команду /pay`

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: subscriber.chat_id,
      text: message,
      parse_mode: 'HTML',
    })
  } catch (error: any) {
    log.error(`Error sending insufficient funds notification:`, error.message)
  }
}
