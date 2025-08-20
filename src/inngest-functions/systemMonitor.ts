/**
 * Системный мониторинг для автоматизации Instagram парсинга
 * Ежедневные отчеты о работе системы подписок на конкурентов
 */

import { inngest } from '@/core/inngest/clients'
import pkg from 'pg'
const { Pool } = pkg

// База данных
const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[SYSTEM-MONITOR] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[SYSTEM-MONITOR] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[SYSTEM-MONITOR] ${msg}`, data || ''),
}

/**
 * Системный мониторинг - ежедневные отчеты
 * Запускается каждый день в 09:00 UTC
 */
export const systemMonitor = inngest.createFunction(
  {
    id: 'system-monitor',
    name: '📊 System Monitor',
    concurrency: 1,
  },
  { cron: '0 9 * * *' }, // Каждый день в 09:00 UTC
  async ({ event, step, runId }) => {
    log.info('📊 Системный мониторинг запущен', { runId })

    // Step 1: Статистика активных подписок
    const subscriptionsStats = await step.run(
      'get-subscriptions-stats',
      async () => {
        const client = await dbPool.connect()

        try {
          // Активные подписки
          const activeResult = await client.query(`
          SELECT 
            COUNT(*) as total_active,
            COUNT(DISTINCT competitor_username) as unique_competitors,
            COUNT(DISTINCT user_telegram_id) as unique_subscribers
          FROM competitor_subscriptions 
          WHERE is_active = true
        `)

          // Статистика по bot_name
          const botStats = await client.query(`
          SELECT 
            bot_name,
            COUNT(*) as subscriptions_count,
            COUNT(DISTINCT competitor_username) as competitors_count,
            COUNT(DISTINCT user_telegram_id) as subscribers_count
          FROM competitor_subscriptions 
          WHERE is_active = true
          GROUP BY bot_name
          ORDER BY subscriptions_count DESC
        `)

          // Топ конкурентов по количеству подписчиков
          const topCompetitors = await client.query(`
          SELECT 
            competitor_username,
            COUNT(*) as subscribers_count,
            AVG(max_reels::float) as avg_max_reels,
            MIN(min_views) as min_views_threshold
          FROM competitor_subscriptions 
          WHERE is_active = true
          GROUP BY competitor_username
          ORDER BY subscribers_count DESC
          LIMIT 10
        `)

          log.info('📈 Статистика подписок получена')
          return {
            active: activeResult.rows[0],
            by_bot: botStats.rows,
            top_competitors: topCompetitors.rows,
          }
        } finally {
          client.release()
        }
      }
    )

    // Step 2: Статистика парсинга за последние 24 часа
    const parsingStats = await step.run('get-parsing-stats', async () => {
      const client = await dbPool.connect()

      try {
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        // Общая статистика парсинга
        const totalReels = await client.query(
          `
          SELECT 
            COUNT(*) as total_reels_parsed,
            COUNT(DISTINCT owner_username) as unique_accounts,
            AVG(views_count) as avg_views,
            MAX(views_count) as max_views,
            SUM(views_count) as total_views
          FROM instagram_apify_reels 
          WHERE scraped_at >= $1
        `,
          [yesterday]
        )

        // Статистика по конкурентам
        const competitorStats = await client.query(
          `
          SELECT 
            owner_username,
            COUNT(*) as reels_count,
            AVG(views_count) as avg_views,
            MAX(views_count) as max_views,
            SUM(likes_count) as total_likes
          FROM instagram_apify_reels 
          WHERE scraped_at >= $1
          GROUP BY owner_username
          ORDER BY reels_count DESC
          LIMIT 15
        `,
          [yesterday]
        )

        log.info('🎬 Статистика парсинга получена')
        return {
          total: totalReels.rows[0],
          by_competitor: competitorStats.rows,
        }
      } finally {
        client.release()
      }
    })

    // Step 3: Статистика доставки за последние 24 часа
    const deliveryStats = await step.run('get-delivery-stats', async () => {
      const client = await dbPool.connect()

      try {
        const yesterday = new Date()
        yesterday.setHours(yesterday.getHours() - 24)

        // Общая статистика доставки
        const totalDelivery = await client.query(
          `
          SELECT 
            COUNT(*) as total_deliveries,
            COUNT(*) FILTER (WHERE delivery_status = 'sent') as successful_deliveries,
            COUNT(*) FILTER (WHERE delivery_status = 'failed') as failed_deliveries,
            SUM(reels_count) as total_reels_delivered,
            AVG(reels_count) as avg_reels_per_delivery
          FROM competitor_delivery_history 
          WHERE delivered_at >= $1
        `,
          [yesterday]
        )

        // Статистика ошибок
        const errorStats = await client.query(
          `
          SELECT 
            error_message,
            COUNT(*) as error_count
          FROM competitor_delivery_history 
          WHERE delivered_at >= $1 
            AND delivery_status = 'failed'
            AND error_message IS NOT NULL
          GROUP BY error_message
          ORDER BY error_count DESC
          LIMIT 5
        `,
          [yesterday]
        )

        log.info('📬 Статистика доставки получена')
        return {
          total: totalDelivery.rows[0],
          errors: errorStats.rows,
        }
      } finally {
        client.release()
      }
    })

    // Step 4: Анализ производительности системы
    const performanceMetrics = await step.run(
      'analyze-performance',
      async () => {
        const stats = {
          parsing_efficiency: 0,
          delivery_success_rate: 0,
          avg_reels_per_competitor: 0,
          system_health_score: 100,
        }

        // Эффективность парсинга (рилсов на конкурента)
        if (parsingStats.by_competitor.length > 0) {
          stats.avg_reels_per_competitor =
            parsingStats.by_competitor.reduce(
              (sum, comp) => sum + parseInt(comp.reels_count),
              0
            ) / parsingStats.by_competitor.length

          stats.parsing_efficiency = Math.min(
            100,
            stats.avg_reels_per_competitor * 10
          )
        }

        // Успешность доставки
        const totalDeliveries =
          parseInt(deliveryStats.total.total_deliveries) || 1
        const successfulDeliveries =
          parseInt(deliveryStats.total.successful_deliveries) || 0
        stats.delivery_success_rate =
          (successfulDeliveries / totalDeliveries) * 100

        // Общий индекс здоровья системы
        stats.system_health_score = Math.round(
          stats.delivery_success_rate * 0.6 +
            Math.min(stats.parsing_efficiency, 100) * 0.4
        )

        return stats
      }
    )

    // Step 5: Отправка отчета админам
    await step.run('send-daily-report', async () => {
      try {
        if (!process.env.ADMIN_CHAT_ID) {
          log.warn('ADMIN_CHAT_ID не настроен, отчет не отправлен')
          return
        }

        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName('neuro_blogger_bot')

        // Формируем красивый отчет
        const report = `
📊 Ежедневный отчет системы Instagram подписок
🕐 ${new Date().toLocaleDateString('ru-RU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}

🎯 ПОДПИСКИ:
• Активные подписки: ${subscriptionsStats.active.total_active}
• Уникальных конкурентов: ${subscriptionsStats.active.unique_competitors}
• Подписчиков: ${subscriptionsStats.active.unique_subscribers}

🎬 ПАРСИНГ (за 24 часа):
• Рилсов собрано: ${parsingStats.total.total_reels_parsed || 0}
• Аккаунтов обработано: ${parsingStats.total.unique_accounts || 0}
• Общие просмотры: ${parseInt(
          parsingStats.total.total_views || 0
        ).toLocaleString()}
• Среднее на рилс: ${Math.round(
          parsingStats.total.avg_views || 0
        ).toLocaleString()}

📬 ДОСТАВКА (за 24 часа):
• Всего доставок: ${deliveryStats.total.total_deliveries || 0}
• Успешных: ${deliveryStats.total.successful_deliveries || 0}
• Ошибок: ${deliveryStats.total.failed_deliveries || 0}
• Рилсов доставлено: ${deliveryStats.total.total_reels_delivered || 0}

🏆 ТОП-5 КОНКУРЕНТОВ:
${parsingStats.by_competitor
  .slice(0, 5)
  .map(
    (comp, i) =>
      `${i + 1}. @${comp.owner_username}: ${
        comp.reels_count
      } рилсов (${Math.round(comp.avg_views).toLocaleString()} просмотров)`
  )
  .join('\n')}

📈 ПРОИЗВОДИТЕЛЬНОСТЬ:
• Рилсов на конкурента: ${performanceMetrics.avg_reels_per_competitor.toFixed(
          1
        )}
• Успешность доставки: ${performanceMetrics.delivery_success_rate.toFixed(1)}%
• Здоровье системы: ${performanceMetrics.system_health_score}%

${
  deliveryStats.errors.length > 0
    ? `
⚠️ ЧАСТЫЕ ОШИБКИ:
${deliveryStats.errors
  .map(err => `• ${err.error_message} (${err.error_count}x)`)
  .join('\n')}
`
    : '✅ Ошибок доставки не обнаружено'
}

🤖 Run ID: ${runId}
        `

        await bot.api.sendMessage(process.env.ADMIN_CHAT_ID, report)
        log.info('📤 Ежедневный отчет отправлен админам')
      } catch (error: any) {
        log.error('❌ Ошибка отправки ежедневного отчета:', error.message)
      }
    })

    const summary = {
      subscriptions: subscriptionsStats,
      parsing: parsingStats,
      delivery: deliveryStats,
      performance: performanceMetrics,
      report_sent: true,
    }

    log.info('✅ Системный мониторинг завершен', {
      active_subscriptions: subscriptionsStats.active.total_active,
      reels_parsed_24h: parsingStats.total.total_reels_parsed,
      deliveries_24h: deliveryStats.total.total_deliveries,
      system_health: performanceMetrics.system_health_score,
    })

    return {
      success: true,
      timestamp: new Date(),
      summary,
    }
  }
)

/**
 * Функция для ручного запуска системного мониторинга
 */
export const triggerSystemMonitor = inngest.createFunction(
  {
    id: 'trigger-system-monitor',
    name: '🔄 Trigger System Monitor',
  },
  { event: 'system/trigger-monitor' },
  async ({ event, step }) => {
    log.info('🔄 Ручной запуск системного мониторинга')

    // Запускаем основную функцию
    const result = await inngest.send({
      name: 'inngest/function.invoked',
      data: {
        function_id: 'system-monitor',
        trigger: 'manual',
      },
    })

    return {
      success: true,
      message: 'System monitor triggered manually',
      event_id: result.ids[0],
    }
  }
)
