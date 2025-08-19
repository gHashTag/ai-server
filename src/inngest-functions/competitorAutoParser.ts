/**
 * Автоматический парсинг конкурентов для подписчиков
 * Запускается каждые 24 часа
 */

import { inngest } from '@/core/inngest/clients'
import pkg from 'pg'
const { Pool } = pkg

// База данных
const dbPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || '',
  ssl: { rejectUnauthorized: false }
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[COMPETITOR-AUTO] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[COMPETITOR-AUTO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[COMPETITOR-AUTO] ${msg}`, data || ''),
}

/**
 * Cron-функция для автоматического парсинга конкурентов
 * Запускается каждые 24 часа в 08:00 UTC
 */
export const competitorAutoParser = inngest.createFunction(
  {
    id: 'competitor-auto-parser',
    name: '🤖 Competitor Auto Parser',
    concurrency: 1,
  },
  { cron: '0 8 * * *' }, // Каждый день в 08:00 UTC
  async ({ event, step, runId }) => {
    log.info('🚀 Автоматический парсинг конкурентов запущен', { runId })

    // Step 1: Получение активных подписок
    const activeSubscriptions = await step.run('get-active-subscriptions', async () => {
      const client = await dbPool.connect()
      
      try {
        const result = await client.query(`
          SELECT 
            cs.*,
            cp.display_name,
            cp.followers_count,
            cp.is_verified,
            cp.is_private
          FROM competitor_subscriptions cs
          LEFT JOIN competitor_profiles cp ON cs.competitor_username = cp.username
          WHERE cs.is_active = true
            AND (cs.next_parse_at IS NULL OR cs.next_parse_at <= NOW())
          ORDER BY cs.competitor_username, cs.created_at
        `)
        
        log.info(`📋 Найдено активных подписок: ${result.rows.length}`)
        return result.rows
      } finally {
        client.release()
      }
    })

    if (activeSubscriptions.length === 0) {
      log.info('⏭️ Нет активных подписок для парсинга')
      return { success: true, message: 'No active subscriptions' }
    }

    // Step 2: Группировка по конкурентам для оптимизации
    const competitorGroups = await step.run('group-by-competitors', async () => {
      const groups = new Map()
      
      activeSubscriptions.forEach(sub => {
        const competitor = sub.competitor_username
        if (!groups.has(competitor)) {
          groups.set(competitor, {
            competitor_username: competitor,
            display_name: sub.display_name,
            subscribers: [],
            max_reels: 10,
            min_views: 1000,
            max_age_days: 7
          })
        }
        
        const group = groups.get(competitor)
        group.subscribers.push(sub)
        
        // Берем максимальные значения для парсинга
        group.max_reels = Math.max(group.max_reels, sub.max_reels || 10)
        group.min_views = Math.min(group.min_views, sub.min_views || 1000)
        group.max_age_days = Math.max(group.max_age_days, sub.max_age_days || 7)
      })
      
      const result = Array.from(groups.values())
      log.info(`🎯 Группировка: ${result.length} уникальных конкурентов`)
      return result
    })

    // Step 3: Запуск парсинга для каждого конкурента
    const parsingResults = await step.run('parse-competitors', async () => {
      const results = []
      
      for (const group of competitorGroups) {
        try {
          log.info(`🎬 Запуск парсинга для @${group.competitor_username}`)
          
          // Отправляем событие в наш RILS парсер
          const parseResult = await inngest.send({
            name: 'instagram/apify-scrape',
            data: {
              username_or_hashtag: group.competitor_username,
              project_id: 999, // Специальный ID для автоматических подписок
              source_type: 'competitor',
              max_reels: group.max_reels,
              min_views: group.min_views,
              max_age_days: group.max_age_days,
              requester_telegram_id: 'auto-system',
              bot_name: 'competitor-auto-parser'
            }
          })
          
          results.push({
            competitor: group.competitor_username,
            subscribers_count: group.subscribers.length,
            parse_event_id: parseResult.ids[0],
            status: 'started'
          })
          
          log.info(`✅ Парсинг запущен для @${group.competitor_username}`, {
            subscribers: group.subscribers.length,
            event_id: parseResult.ids[0]
          })
          
          // Небольшая задержка между запросами
          await new Promise(resolve => setTimeout(resolve, 2000))
          
        } catch (error: any) {
          log.error(`❌ Ошибка парсинга @${group.competitor_username}:`, error.message)
          results.push({
            competitor: group.competitor_username,
            subscribers_count: group.subscribers.length,
            status: 'failed',
            error: error.message
          })
        }
      }
      
      return results
    })

    // Step 4: Обновление времени следующего парсинга
    await step.run('update-next-parse-time', async () => {
      const client = await dbPool.connect()
      
      try {
        const nextParseTime = new Date()
        nextParseTime.setHours(nextParseTime.getHours() + 24) // Через 24 часа
        
        await client.query(`
          UPDATE competitor_subscriptions 
          SET 
            last_parsed_at = NOW(),
            next_parse_at = $1
          WHERE is_active = true
            AND (next_parse_at IS NULL OR next_parse_at <= NOW())
        `, [nextParseTime])
        
        log.info('⏰ Время следующего парсинга обновлено')
      } finally {
        client.release()
      }
    })

    // Step 5: Статистика и уведомления админам
    await step.run('send-admin-summary', async () => {
      try {
        const summary = parsingResults.reduce((acc, result) => {
          acc.total_competitors++
          acc.total_subscribers += result.subscribers_count
          if (result.status === 'started') acc.successful++
          if (result.status === 'failed') acc.failed++
          return acc
        }, {
          total_competitors: 0,
          total_subscribers: 0,
          successful: 0,
          failed: 0
        })

        const adminMessage = `
🤖 Автоматический парсинг конкурентов завершён

📊 Статистика:
• Конкурентов обработано: ${summary.total_competitors}
• Активных подписчиков: ${summary.total_subscribers}
• Успешных запусков: ${summary.successful}
• Ошибок: ${summary.failed}

⏰ Следующий запуск: через 24 часа
🔗 Run ID: ${runId}
        `

        // Отправляем админам (если настроен ADMIN_CHAT_ID)
        if (process.env.ADMIN_CHAT_ID && process.env.BOT_TOKEN_1) {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName('neuro_blogger_bot')
          
          await bot.api.sendMessage(process.env.ADMIN_CHAT_ID, adminMessage)
          log.info('📤 Отчёт отправлен админам')
        }

      } catch (error: any) {
        log.error('❌ Ошибка отправки отчёта админам:', error.message)
      }
    })

    const totalParsed = parsingResults.length
    const successful = parsingResults.filter(r => r.status === 'started').length

    log.info('✅ Автоматический парсинг завершён', {
      total: totalParsed,
      successful,
      failed: totalParsed - successful
    })

    return {
      success: true,
      results: parsingResults,
      summary: {
        total_competitors: totalParsed,
        successful_parses: successful,
        failed_parses: totalParsed - successful,
        next_run_in_hours: 24
      }
    }
  }
)

/**
 * Функция для ручного запуска автопарсинга (для тестирования)
 */
export const triggerCompetitorAutoParser = inngest.createFunction(
  {
    id: 'trigger-competitor-auto-parser',
    name: '🔄 Trigger Competitor Auto Parser',
  },
  { event: 'competitor/trigger-auto-parse' },
  async ({ event, step }) => {
    log.info('🔄 Ручной запуск автопарсинга конкурентов')
    
    // Запускаем основную функцию
    const result = await inngest.send({
      name: 'inngest/function.invoked',
      data: {
        function_id: 'competitor-auto-parser',
        trigger: 'manual'
      }
    })
    
    return {
      success: true,
      message: 'Auto parser triggered manually',
      event_id: result.ids[0]
    }
  }
)