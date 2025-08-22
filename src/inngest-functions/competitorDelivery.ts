/**
 * Доставка рилсов конкурентов подписчикам
 * Отправляет дайджесты, архивы и уведомления
 */

import { inngest } from '@/core/inngest/clients'
import pkg from 'pg'
import * as XLSX from 'xlsx'
import archiver from 'archiver'
import { promises as fs } from 'fs'
import path from 'path'
const { Pool } = pkg

// База данных
const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[COMPETITOR-DELIVERY] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[COMPETITOR-DELIVERY] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[COMPETITOR-DELIVERY] ${msg}`, data || ''),
}

/**
 * Функция доставки результатов парсинга подписчикам
 * Срабатывает когда RILS парсер завершает работу
 */
export const competitorDelivery = inngest.createFunction(
  {
    id: 'competitor-delivery',
    name: '📬 Competitor Delivery',
    concurrency: 3,
  },
  { event: 'competitor/delivery-reels' },
  async ({ event, step, runId }) => {
    log.info('📬 Доставка рилсов конкурентов запущена', {
      runId,
      competitor: event.data.competitor_username,
    })

    const { competitor_username, project_id } = event.data

    // Step 1: Получение подписчиков конкурента
    const subscribers = await step.run('get-subscribers', async () => {
      const client = await dbPool.connect()

      try {
        const result = await client.query(
          `
          SELECT * FROM competitor_subscriptions 
          WHERE competitor_username = $1 
            AND is_active = true
          ORDER BY created_at
        `,
          [competitor_username]
        )

        log.info(`👥 Найдено подписчиков: ${result.rows.length}`)
        return result.rows
      } finally {
        client.release()
      }
    })

    if (subscribers.length === 0) {
      log.info('⏭️ Нет активных подписчиков для доставки')
      return { success: true, message: 'No active subscribers' }
    }

    // Step 2: Получение свежих рилсов конкурента
    const reelsData = await step.run('get-fresh-reels', async () => {
      const client = await dbPool.connect()

      try {
        // Получаем рилсы за последние 24 часа
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        const result = await client.query(
          `
          SELECT * FROM instagram_apify_reels 
          WHERE owner_username = $1 
            AND scraped_at >= $2
            AND project_id = $3
          ORDER BY views_count DESC, likes_count DESC
        `,
          [competitor_username, yesterday, project_id]
        )

        log.info(`🎬 Найдено свежих рилсов: ${result.rows.length}`)
        return result.rows
      } finally {
        client.release()
      }
    })

    if (reelsData.length === 0) {
      log.info('📭 Нет новых рилсов для доставки')

      // Уведомляем подписчиков что нет новых рилсов
      for (const subscriber of subscribers) {
        try {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName(subscriber.bot_name)

          await bot.api.sendMessage(
            subscriber.user_telegram_id,
            `📭 Нет новых рилсов от @${competitor_username} за последние 24 часа`
          )
        } catch (error: any) {
          log.error(
            `❌ Ошибка уведомления пользователя ${subscriber.user_telegram_id}:`,
            error.message
          )
        }
      }

      return { success: true, message: 'No new reels to deliver' }
    }

    // Step 3: Доставка по типам подписок
    const deliveryResults = await step.run(
      'deliver-to-subscribers',
      async () => {
        const results = []

        for (const subscriber of subscribers) {
          try {
            const userReels = reelsData
              .filter(
                reel =>
                  reel.views_count >= (subscriber.min_views || 1000) &&
                  new Date(reel.published_at) >=
                    new Date(
                      Date.now() -
                        (subscriber.max_age_days || 7) * 24 * 60 * 60 * 1000
                    )
              )
              .slice(0, subscriber.max_reels || 10)

            if (userReels.length === 0) {
              results.push({
                user_id: subscriber.user_telegram_id,
                status: 'skipped',
                reason: 'No reels match user criteria',
              })
              continue
            }

            const { getBotByName } = await import('@/core/bot')
            const { bot } = getBotByName(subscriber.bot_name)

            // Определяем формат доставки
            const format = subscriber.delivery_format || 'digest'

            if (format === 'digest') {
              // Отправляем дайджест
              await sendDigest(bot, subscriber, userReels, competitor_username)
            } else if (format === 'individual') {
              // Отправляем каждый рилс отдельно
              await sendIndividualReels(bot, subscriber, userReels)
            } else if (format === 'archive') {
              // Создаем и отправляем архив
              await sendArchive(bot, subscriber, userReels, competitor_username)
            }

            // Записываем историю доставки
            await recordDelivery(
              subscriber.id,
              userReels.length,
              'sent',
              null,
              userReels
            )

            results.push({
              user_id: subscriber.user_telegram_id,
              status: 'delivered',
              reels_count: userReels.length,
              format: format,
            })

            log.info(
              `✅ Доставлено ${userReels.length} рилсов пользователю ${subscriber.user_telegram_id}`
            )

            // Задержка между отправками
            await new Promise(resolve => setTimeout(resolve, 1000))
          } catch (error: any) {
            log.error(
              `❌ Ошибка доставки пользователю ${subscriber.user_telegram_id}:`,
              error.message
            )

            await recordDelivery(
              subscriber.id,
              0,
              'failed',
              error.message,
              null
            )

            results.push({
              user_id: subscriber.user_telegram_id,
              status: 'failed',
              error: error.message,
            })
          }
        }

        return results
      }
    )

    const summary = deliveryResults.reduce(
      (acc, result) => {
        acc.total++
        if (result.status === 'delivered') acc.delivered++
        if (result.status === 'failed') acc.failed++
        if (result.status === 'skipped') acc.skipped++
        return acc
      },
      { total: 0, delivered: 0, failed: 0, skipped: 0 }
    )

    log.info('✅ Доставка завершена', {
      competitor: competitor_username,
      reels_found: reelsData.length,
      ...summary,
    })

    return {
      success: true,
      competitor_username,
      reels_count: reelsData.length,
      delivery_summary: summary,
      results: deliveryResults,
    }
  }
)

/**
 * Отправка дайджеста рилсов
 */
async function sendDigest(
  bot: any,
  subscriber: any,
  reels: any[],
  competitor: string
) {
  const topReel = reels[0]
  const totalViews = reels.reduce(
    (sum, reel) => sum + (reel.views_count || 0),
    0
  )
  const avgViews = Math.round(totalViews / reels.length)

  const message = `
🎬 Дайджест рилсов @${competitor}

📊 За последние 24 часа:
• Новых рилсов: ${reels.length}
• Общие просмотры: ${totalViews.toLocaleString()}
• Средние просмотры: ${avgViews.toLocaleString()}

🏆 Топ рилс (${topReel.views_count?.toLocaleString()} просмотров):
${topReel.caption ? topReel.caption.substring(0, 100) + '...' : 'Без описания'}

🔗 ${topReel.url}

${reels.length > 1 ? `\n📋 Еще ${reels.length - 1} рилсов в списке` : ''}
  `

  await bot.api.sendMessage(subscriber.user_telegram_id, message)
}

/**
 * Отправка рилсов по отдельности
 */
async function sendIndividualReels(bot: any, subscriber: any, reels: any[]) {
  for (const reel of reels.slice(0, 5)) {
    // Максимум 5 штук чтобы не спамить
    const message = `
🎬 Новый рилс от конкурента

👀 Просмотров: ${reel.views_count?.toLocaleString() || 0}
❤️ Лайков: ${reel.likes_count?.toLocaleString() || 0}
💬 Комментариев: ${reel.comments_count?.toLocaleString() || 0}

${reel.caption ? reel.caption.substring(0, 200) + '...' : 'Без описания'}

🔗 ${reel.url}
    `

    await bot.api.sendMessage(subscriber.user_telegram_id, message)
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

/**
 * Создание и отправка архива
 */
async function sendArchive(
  bot: any,
  subscriber: any,
  reels: any[],
  competitor: string
) {
  // Создаем Excel файл
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(
    reels.map(reel => ({
      URL: reel.url,
      Просмотры: reel.views_count,
      Лайки: reel.likes_count,
      Комментарии: reel.comments_count,
      Опубликован: new Date(reel.published_at).toLocaleDateString('ru-RU'),
      Описание: reel.caption?.substring(0, 100) || '',
    }))
  )

  XLSX.utils.book_append_sheet(wb, ws, 'Reels')

  const fileName = `reels_${competitor}_${
    new Date().toISOString().split('T')[0]
  }.xlsx`
  const filePath = path.join('/tmp', fileName)

  XLSX.writeFile(wb, filePath)

  await bot.api.sendDocument(
    subscriber.user_telegram_id,
    new InputFile(filePath, fileName),
    {
      caption: `📊 Архив рилсов @${competitor}\n\n📈 Рилсов: ${reels.length}\n📅 За последние 24 часа`,
    }
  )

  // Удаляем временный файл
  await fs.unlink(filePath).catch(() => {})
}

/**
 * Запись истории доставки
 */
async function recordDelivery(
  subscriptionId: string,
  reelsCount: number,
  status: string,
  error: string | null,
  reelsData: any[] | null
) {
  const client = await dbPool.connect()

  try {
    await client.query(
      `
      INSERT INTO competitor_delivery_history 
      (subscription_id, reels_count, delivery_status, error_message, reels_data)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [
        subscriptionId,
        reelsCount,
        status,
        error,
        reelsData ? JSON.stringify(reelsData) : null,
      ]
    )
  } finally {
    client.release()
  }
}

// Имитация InputFile для примера (нужно будет импортировать из grammy)
class InputFile {
  constructor(public path: string, public filename: string) {}
}
