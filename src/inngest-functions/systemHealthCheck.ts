/**
 * Проверка здоровья системы Instagram автоматизации
 * Мониторинг ключевых компонентов каждые 30 минут
 */

import { inngest } from '@/core/inngest/clients'
import pkg from 'pg'
import { ApifyClient } from 'apify-client'
const { Pool } = pkg

// База данных
const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

// Логгер
const log = {
  info: (msg: string, data?: any) =>
    console.log(`[HEALTH-CHECK] ${msg}`, data || ''),
  error: (msg: string, data?: any) =>
    console.error(`[HEALTH-CHECK] ${msg}`, data || ''),
  warn: (msg: string, data?: any) =>
    console.warn(`[HEALTH-CHECK] ${msg}`, data || ''),
}

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'warning' | 'critical'
  response_time?: number
  message: string
  details?: any
}

/**
 * Проверка здоровья системы каждые 30 минут
 */
export const systemHealthCheck = inngest.createFunction(
  {
    id: 'system-health-check',
    name: '💚 System Health Check',
    concurrency: 1,
  },
  { cron: '*/30 * * * *' }, // Каждые 30 минут
  async ({ event, step, runId }) => {
    log.info('💚 Проверка здоровья системы запущена', { runId })

    const healthResults: HealthCheckResult[] = []

    // Step 1: Проверка PostgreSQL Database
    const dbHealth = await step.run('check-database', async () => {
      const startTime = Date.now()

      try {
        const client = await dbPool.connect()

        // Проверяем подключение и основные таблицы
        const tablesCheck = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
            AND table_name IN ('instagram_apify_reels', 'competitor_subscriptions', 'competitor_delivery_history')
        `)

        // Проверяем производительность
        const perfCheck = await client.query('SELECT NOW()')

        client.release()

        const responseTime = Date.now() - startTime

        const result: HealthCheckResult = {
          service: 'PostgreSQL Database',
          status: 'healthy',
          response_time: responseTime,
          message: `Подключение успешно. Найдено ${tablesCheck.rows.length}/3 таблиц`,
          details: {
            tables_found: tablesCheck.rows.length,
            expected_tables: 3,
            connection_pool_size: dbPool.totalCount,
          },
        }

        if (tablesCheck.rows.length < 3) {
          result.status = 'warning'
          result.message = `Некоторые таблицы отсутствуют (${tablesCheck.rows.length}/3)`
        }

        if (responseTime > 5000) {
          result.status = 'warning'
          result.message += '. Медленный отклик БД'
        }

        return result
      } catch (error: any) {
        return {
          service: 'PostgreSQL Database',
          status: 'critical' as const,
          response_time: Date.now() - startTime,
          message: `Ошибка подключения: ${error.message}`,
          details: { error: error.message },
        }
      }
    })
    healthResults.push(dbHealth)

    // Step 2: Проверка Apify API
    const apifyHealth = await step.run('check-apify', async () => {
      const startTime = Date.now()

      try {
        if (!process.env.APIFY_TOKEN) {
          return {
            service: 'Apify API',
            status: 'critical' as const,
            message: 'APIFY_TOKEN не настроен',
            details: { error: 'Missing token' },
          }
        }

        const client = new ApifyClient({
          token: process.env.APIFY_TOKEN!,
        })

        // Проверяем доступность API через получение информации об аккаунте
        const user = await client.user().get()

        const responseTime = Date.now() - startTime

        return {
          service: 'Apify API',
          status: 'healthy' as const,
          response_time: responseTime,
          message: `API доступно. Пользователь: ${user?.username || 'unknown'}`,
          details: {
            username: user?.username,
            plan: user?.plan,
            usage_credits: user?.usageCredits,
          },
        }
      } catch (error: any) {
        return {
          service: 'Apify API',
          status: 'critical' as const,
          response_time: Date.now() - startTime,
          message: `Ошибка API: ${error.message}`,
          details: { error: error.message },
        }
      }
    })
    healthResults.push(apifyHealth)

    // Step 3: Проверка Telegram Bot API
    const telegramHealth = await step.run('check-telegram', async () => {
      const startTime = Date.now()

      try {
        if (!process.env.BOT_TOKEN_1) {
          return {
            service: 'Telegram Bot API',
            status: 'critical' as const,
            message: 'BOT_TOKEN_1 не настроен',
            details: { error: 'Missing token' },
          }
        }

        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName('neuro_blogger_bot')

        // Проверяем API через getMe
        const botInfo = await bot.api.getMe()

        const responseTime = Date.now() - startTime

        return {
          service: 'Telegram Bot API',
          status: 'healthy' as const,
          response_time: responseTime,
          message: `Bot API доступен. @${botInfo.username}`,
          details: {
            username: botInfo.username,
            first_name: botInfo.first_name,
            can_join_groups: botInfo.can_join_groups,
            can_read_all_group_messages: botInfo.can_read_all_group_messages,
          },
        }
      } catch (error: any) {
        return {
          service: 'Telegram Bot API',
          status: 'critical' as const,
          response_time: Date.now() - startTime,
          message: `Ошибка Bot API: ${error.message}`,
          details: { error: error.message },
        }
      }
    })
    healthResults.push(telegramHealth)

    // Step 4: Проверка Inngest
    const inngestHealth = await step.run('check-inngest', async () => {
      const startTime = Date.now()

      try {
        // Проверяем отправку тестового события
        const testResult = await inngest.send({
          name: 'system/health-test',
          data: { timestamp: Date.now(), source: 'health-check' },
        })

        const responseTime = Date.now() - startTime

        return {
          service: 'Inngest',
          status: 'healthy' as const,
          response_time: responseTime,
          message: 'Inngest функционирует нормально',
          details: {
            event_id: testResult.ids[0],
            events_sent: testResult.ids.length,
          },
        }
      } catch (error: any) {
        return {
          service: 'Inngest',
          status: 'critical' as const,
          response_time: Date.now() - startTime,
          message: `Ошибка Inngest: ${error.message}`,
          details: { error: error.message },
        }
      }
    })
    healthResults.push(inngestHealth)

    // Step 5: Проверка активности парсинга
    const parsingActivity = await step.run(
      'check-parsing-activity',
      async () => {
        try {
          const client = await dbPool.connect()

          // Проверяем активность за последние 2 часа
          const twoHoursAgo = new Date()
          twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

          const recentActivity = await client.query(
            `
          SELECT 
            COUNT(*) as recent_reels,
            COUNT(DISTINCT owner_username) as active_competitors,
            MAX(scraped_at) as last_scraping
          FROM instagram_apify_reels 
          WHERE scraped_at >= $1
        `,
            [twoHoursAgo]
          )

          client.release()

          const activity = recentActivity.rows[0]
          const lastScrapingAge = activity.last_scraping
            ? Math.round(
                (Date.now() - new Date(activity.last_scraping).getTime()) /
                  (1000 * 60)
              )
            : null

          let status: 'healthy' | 'warning' | 'critical' = 'healthy'
          let message = 'Парсинг активен'

          if (!activity.recent_reels || activity.recent_reels === '0') {
            status = 'warning'
            message = 'Нет активности парсинга за последние 2 часа'
          }

          if (lastScrapingAge && lastScrapingAge > 180) {
            // 3 часа
            status = 'critical'
            message = `Последний парсинг был ${Math.round(
              lastScrapingAge / 60
            )} часов назад`
          }

          return {
            service: 'Parsing Activity',
            status,
            message,
            details: {
              recent_reels: parseInt(activity.recent_reels || '0'),
              active_competitors: parseInt(activity.active_competitors || '0'),
              last_scraping_minutes_ago: lastScrapingAge,
            },
          }
        } catch (error: any) {
          return {
            service: 'Parsing Activity',
            status: 'critical' as const,
            message: `Ошибка проверки активности: ${error.message}`,
            details: { error: error.message },
          }
        }
      }
    )
    healthResults.push(parsingActivity)

    // Анализ результатов (вынесено из step для доступности переменных)
    const criticalIssues = healthResults.filter(r => r.status === 'critical')
    const warningIssues = healthResults.filter(r => r.status === 'warning')
    const healthyServices = healthResults.filter(r => r.status === 'healthy')

    // Общий статус системы
    let systemStatus = 'healthy'
    if (criticalIssues.length > 0) systemStatus = 'critical'
    else if (warningIssues.length > 0) systemStatus = 'warning'

    // Step 6: Отправка алертов
    await step.run('send-alerts', async () => {
      // Отправляем алерты только при проблемах или раз в час
      const shouldSendReport =
        criticalIssues.length > 0 ||
        warningIssues.length > 0 ||
        new Date().getMinutes() < 30 // Каждый час в первые 30 минут

      if (shouldSendReport && process.env.ADMIN_CHAT_ID) {
        try {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName('neuro_blogger_bot')

          // Формируем сообщение в зависимости от статуса
          let message = ''
          let emoji = ''

          if (systemStatus === 'critical') {
            emoji = '🚨'
            message = `${emoji} КРИТИЧЕСКИЕ ПРОБЛЕМЫ В СИСТЕМЕ\n\n`
          } else if (systemStatus === 'warning') {
            emoji = '⚠️'
            message = `${emoji} Предупреждения в системе\n\n`
          } else {
            emoji = '💚'
            message = `${emoji} Система функционирует нормально\n\n`
          }

          // Добавляем детали по сервисам
          message += `📊 Статус сервисов:\n`

          healthResults.forEach(result => {
            const statusEmoji =
              result.status === 'healthy'
                ? '✅'
                : result.status === 'warning'
                ? '⚠️'
                : '❌'
            const responseTime = result.response_time
              ? ` (${result.response_time}ms)`
              : ''

            message += `${statusEmoji} ${result.service}${responseTime}\n`
            if (result.status !== 'healthy') {
              message += `   └ ${result.message}\n`
            }
          })

          message += `\n🕐 Проверка: ${new Date().toLocaleString('ru-RU')}`
          message += `\n🤖 Run ID: ${runId}`

          await bot.api.sendMessage(process.env.ADMIN_CHAT_ID, message)
          log.info('🚨 Health check alert отправлен', { status: systemStatus })
        } catch (error: any) {
          log.error('❌ Ошибка отправки health check alert:', error.message)
        }
      }
    })

    log.info('💚 Health check завершен', {
      system_status: systemStatus,
      healthy: healthyServices.length,
      warnings: warningIssues.length,
      critical: criticalIssues.length,
    })

    // Calculate status outside of step for return
    const finalCriticalIssues = healthResults.filter(
      r => r.status === 'critical'
    )
    const finalWarningIssues = healthResults.filter(r => r.status === 'warning')

    return {
      success: true,
      timestamp: new Date(),
      system_status:
        finalCriticalIssues.length > 0
          ? 'critical'
          : finalWarningIssues.length > 0
          ? 'warning'
          : 'healthy',
      results: healthResults,
      summary: {
        total_services: healthResults.length,
        healthy: healthResults.filter(r => r.status === 'healthy').length,
        warnings: finalWarningIssues.length,
        critical: finalCriticalIssues.length,
      },
    }
  }
)

/**
 * Функция для ручного запуска проверки здоровья
 */
export const triggerHealthCheck = inngest.createFunction(
  {
    id: 'trigger-health-check',
    name: '🔄 Trigger Health Check',
  },
  { event: 'system/trigger-health-check' },
  async ({ event, step }) => {
    log.info('🔄 Ручной запуск проверки здоровья системы')

    // Запускаем основную функцию
    const result = await inngest.send({
      name: 'inngest/function.invoked',
      data: {
        function_id: 'system-health-check',
        trigger: 'manual',
      },
    })

    return {
      success: true,
      message: 'Health check triggered manually',
      event_id: result.ids[0],
    }
  }
)

/**
 * Простая функция-заглушка для тестовых событий health check
 */
export const healthTestHandler = inngest.createFunction(
  {
    id: 'health-test-handler',
    name: '🧪 Health Test Handler',
  },
  { event: 'system/health-test' },
  async ({ event }) => {
    // Просто подтверждаем получение тестового события
    return {
      success: true,
      message: 'Health test event received',
      timestamp: event.data.timestamp,
    }
  }
)
