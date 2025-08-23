/**
 * Ежедневный отчет о состоянии системы с анализом всех логов
 */

import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'
import { OpenAI } from 'openai'
import pkg from 'pg'
const { Pool } = pkg

const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_KEY
    ? 'https://api.deepseek.com'
    : undefined,
})

interface DailyStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  avgResponseTime: number
  topErrors: Array<{ error: string; count: number }>
  networkCheckResults: Array<{
    endpoint: string
    successRate: number
    avgResponseTime: number
  }>
  deploymentsCount: number
  criticalIssues: number
}

/**
 * Собираем статистику за последние 24 часа
 */
async function collectDailyStats(): Promise<DailyStats> {
  const client = await dbPool.connect()

  try {
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    // Статистика network checks
    const networkStats = await client.query(
      `
      SELECT 
        endpoint,
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_checks,
        AVG(response_time) as avg_response_time
      FROM network_check_history 
      WHERE checked_at >= $1
      GROUP BY endpoint
    `,
      [yesterday]
    )

    // Статистика системных логов (если есть)
    const systemStats = await client.query(
      `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_logs,
        COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_logs
      FROM system_logs 
      WHERE created_at >= $1
    `,
      [yesterday]
    )

    // Топ ошибок
    const topErrors = await client.query(
      `
      SELECT 
        data->>'error' as error,
        COUNT(*) as count
      FROM system_logs 
      WHERE level = 'error' AND created_at >= $1
      GROUP BY data->>'error'
      ORDER BY count DESC
      LIMIT 5
    `,
      [yesterday]
    )

    client.release()

    return {
      totalRequests: parseInt(systemStats.rows[0]?.total_logs || '0'),
      successfulRequests:
        parseInt(systemStats.rows[0]?.total_logs || '0') -
        parseInt(systemStats.rows[0]?.error_logs || '0'),
      failedRequests: parseInt(systemStats.rows[0]?.error_logs || '0'),
      avgResponseTime: 0, // Будет рассчитано отдельно
      topErrors: topErrors.rows.map(row => ({
        error: row.error || 'Unknown error',
        count: parseInt(row.count),
      })),
      networkCheckResults: networkStats.rows.map(row => ({
        endpoint: row.endpoint,
        successRate:
          (parseInt(row.successful_checks) / parseInt(row.total_checks)) * 100,
        avgResponseTime: parseFloat(row.avg_response_time || '0'),
      })),
      deploymentsCount: 0, // Будет обновлено если есть данные о деплоях
      criticalIssues: parseInt(systemStats.rows[0]?.error_logs || '0'),
    }
  } catch (error) {
    client.release()
    logger.error('Error collecting daily stats:', error)

    // Fallback статистика
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      topErrors: [],
      networkCheckResults: [],
      deploymentsCount: 0,
      criticalIssues: 0,
    }
  }
}

/**
 * Получение дополнительного контекста системы
 */
async function getSystemContext(): Promise<string> {
  try {
    const client = await dbPool.connect()

    // Собираем информацию о системе
    const systemInfo = []

    // Информация о процессе
    const uptimeHours = Math.floor(process.uptime() / 3600)
    const memoryUsage = process.memoryUsage()
    const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024)

    systemInfo.push(`Аптайм: ${uptimeHours} часов, память: ${memoryMB}MB`)

    // Версия и среда
    const version =
      process.env.RAILWAY_DEPLOYMENT_ID?.substring(0, 8) || 'unknown'
    const env = process.env.NODE_ENV || 'development'
    systemInfo.push(`Версия: ${version}, среда: ${env}`)

    // Последние деплои
    try {
      const lastDeploy = await client.query(`
        SELECT data->>'version' as version, created_at 
        FROM system_logs 
        WHERE data->>'event' = 'deployment' 
        ORDER BY created_at DESC 
        LIMIT 1
      `)

      if (lastDeploy.rows.length > 0) {
        const deployAge = Math.round(
          (Date.now() - new Date(lastDeploy.rows[0].created_at).getTime()) /
            1000 /
            3600
        )
        systemInfo.push(`Последний деплой: ${deployAge} часов назад`)
      }
    } catch (e) {
      // Игнорируем если таблица не существует
    }

    // База данных
    const dbResult = await client.query('SELECT version()')
    systemInfo.push(
      `БД: ${dbResult.rows[0].version.split(' ')[0]} ${
        dbResult.rows[0].version.split(' ')[1]
      }`
    )

    client.release()
    return systemInfo.join(', ')
  } catch (error) {
    logger.warn('Could not get system context:', error)
    return `Аптайм: ${Math.floor(
      process.uptime() / 3600
    )} часов, память: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`
  }
}

/**
 * Интеллектуальный анализ всех логов и контекста системы
 */
async function analyzeSystemWithAI(stats: DailyStats): Promise<{
  analysis: string
  insights: string[]
  concerns: string[]
  healthScore: number
  personality: string
  actionItems: string[]
  mood: string
}> {
  // Собираем дополнительный контекст
  const now = new Date()
  const dayOfWeek = now.toLocaleDateString('ru-RU', { weekday: 'long' })
  const timeContext = {
    hour: now.getHours(),
    dayOfWeek,
    isWeekend: [0, 6].includes(now.getDay()),
    isBusinessHours: now.getHours() >= 9 && now.getHours() <= 18,
    isLateEvening: now.getHours() >= 22 || now.getHours() <= 6,
    season: [
      'зима',
      'зима',
      'весна',
      'весна',
      'весна',
      'лето',
      'лето',
      'лето',
      'осень',
      'осень',
      'осень',
      'зима',
    ][now.getMonth()],
  }

  // Получаем дополнительные данные о системе
  const systemContext = await getSystemContext()

  const prompt = `Ты Любовь, опытный DevOps-инженер с 10+ лет опыта. Анализируешь production систему как живой организм, заботливо и с пониманием.

КОНТЕКСТ ВРЕМЕНИ:
- Сейчас: ${dayOfWeek}, ${now.toLocaleString('ru-RU')} (${timeContext.season})
- ${timeContext.isWeekend ? 'Выходной' : 'Рабочий день'}, ${
    timeContext.isBusinessHours
      ? 'рабочие часы'
      : timeContext.isLateEvening
      ? 'поздний вечер/ночь'
      : 'внерабочее время'
  }

СИСТЕМНЫЕ ДАННЫЕ ЗА 24 ЧАСА:
- Активность: ${stats.totalRequests.toLocaleString()} запросов (${
    stats.totalRequests > 0
      ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
      : '100'
  }% успех)
- Инциденты: ${stats.criticalIssues} критичных проблем
- Деплои: ${stats.deploymentsCount}
- Система: ${systemContext}

ЗДОРОВЬЕ ЭНДПОИНТОВ:
${
  stats.networkCheckResults.length > 0
    ? stats.networkCheckResults
        .map(
          r =>
            `- ${r.endpoint}: ${r.successRate.toFixed(
              1
            )}% доступность (${r.avgResponseTime.toFixed(0)}ms отклик)`
        )
        .join('\n')
    : 'Данные о проверках эндпоинтов отсутствуют'
}

КАРТИНА ОШИБОК:
${
  stats.topErrors.length > 0
    ? stats.topErrors
        .map((e, i) => `${i + 1}. "${e.error}": ${e.count} раз`)
        .join('\n')
    : 'Критичных ошибок не зафиксировано'
}

Проанализируй как настоящий эксперт. Говори прямо, с пониманием дела. Каждый отчет должен быть уникальным!

Ответь в JSON формате:
{
  "analysis": "Твой живой анализ - что происходит, какие закономерности видишь, что это значит. Говори как коллеге, используй свой опыт и интуицию.",
  "insights": ["2-3 интересные находки из данных", "Неочевидные паттерны и выводы"],
  "concerns": ["О чем реально стоит беспокоиться", "Потенциальные проблемы на горизонте"],
  "healthScore": 85,
  "personality": "Как бы ты охарактеризовал 'характер' системы сегодня - одним предложением",
  "actionItems": ["Конкретные задачи на сегодня", "Что сделать в первую очередь"],
  "mood": "Твое настроение как DevOps'а после анализа - одним словом (спокойствие/беспокойство/удовлетворение/тревога и т.д.)"
}`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY
        ? 'deepseek-chat'
        : 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'Ты Любовь, DevOps с большим опытом. Говоришь тепло, заботливо, с пониманием и душой. Каждый анализ уникален. Не используешь шаблоны. Понимаешь систему как живой организм, который нуждается в заботе.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8, // Высокая креативность для уникальности
      max_tokens: 1200,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')

    // Добавляем контекстные данные в анализ
    return {
      ...result,
      // Обеспечиваем наличие всех полей с fallback'ами
      analysis:
        result.analysis ||
        `Система сегодня показывает себя неплохо - ${stats.totalRequests.toLocaleString()} запросов обработано`,
      insights: result.insights || ['Активность в норме для времени'],
      concerns:
        result.concerns ||
        (stats.criticalIssues > 0
          ? ['Есть критичные ошибки']
          : ['Пока всё спокойно']),
      healthScore: result.healthScore || calculateHealthScore(stats),
      personality: result.personality || 'стабильная рабочая лошадка',
      actionItems: result.actionItems || ['Мониторить как обычно'],
      mood:
        result.mood ||
        (stats.criticalIssues > 5 ? 'беспокойство' : 'спокойствие'),
    }
  } catch (error) {
    logger.error('Error in AI analysis:', error)

    // Интеллектуальный fallback с контекстом
    const successRate =
      stats.totalRequests > 0
        ? (stats.successfulRequests / stats.totalRequests) * 100
        : 100

    const contextualAnalysis = generateContextualFallback(
      stats,
      timeContext,
      successRate
    )

    return contextualAnalysis
  }
}

/**
 * Расчет оценки здоровья системы
 */
function calculateHealthScore(stats: DailyStats): number {
  const successRate =
    stats.totalRequests > 0
      ? (stats.successfulRequests / stats.totalRequests) * 100
      : 100

  let score = successRate

  // Штрафы за критичные проблемы
  score -= stats.criticalIssues * 5

  // Учитываем производительность эндпоинтов
  if (stats.networkCheckResults.length > 0) {
    const avgEndpointHealth =
      stats.networkCheckResults.reduce((sum, r) => sum + r.successRate, 0) /
      stats.networkCheckResults.length
    score = (score + avgEndpointHealth) / 2
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Контекстный fallback анализ
 */
function generateContextualFallback(
  stats: DailyStats,
  timeContext: any,
  successRate: number
) {
  const timeGreeting = timeContext.isLateEvening
    ? 'Ночная смена подходит к концу'
    : timeContext.isBusinessHours
    ? 'День в самом разгаре'
    : 'Спокойное внерабочее время'

  const systemMood =
    successRate > 95
      ? 'Система чувствует себя отлично'
      : successRate > 85
      ? 'Система работает с небольшими капризами'
      : 'Системе нужно внимание'

  return {
    analysis: `${timeGreeting}. ${systemMood} - за сутки обработано ${stats.totalRequests.toLocaleString()} запросов с результатом ${successRate.toFixed(
      1
    )}%. ${
      stats.criticalIssues > 0
        ? `Зафиксировано ${stats.criticalIssues} критичных инцидентов, требующих разбора.`
        : 'Критичных проблем не обнаружено.'
    }`,
    insights: [
      stats.topErrors.length > 0
        ? `Основная головная боль: "${stats.topErrors[0].error}" (${stats.topErrors[0].count} раз)`
        : 'В логах тишина - это хороший знак',
      timeContext.isWeekend
        ? 'Выходные проходят спокойно'
        : 'Рабочий день без сюрпризов',
    ],
    concerns:
      stats.criticalIssues > 3
        ? ['Многовато ошибок для одного дня', 'Стоит проверить что происходит']
        : stats.criticalIssues > 0
        ? ['Есть над чем поработать, но не критично']
        : ['Всё под контролем'],
    healthScore: calculateHealthScore(stats),
    personality:
      successRate > 95
        ? 'послушная и надежная'
        : successRate > 85
        ? 'иногда капризничает'
        : 'требует присмотра',
    actionItems:
      stats.criticalIssues > 0
        ? ['Разобраться с критичными ошибками', 'Проверить мониторинг алертов']
        : ['Профилактический чек систем', 'Можно заняться планами на завтра'],
    mood:
      stats.criticalIssues > 5
        ? 'тревога'
        : stats.criticalIssues > 0
        ? 'легкое беспокойство'
        : 'спокойствие',
  }
}

/**
 * Создание интерактивных кнопок для Telegram
 */
function createInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '📊 Подробные логи', callback_data: 'show_detailed_logs' },
        { text: '🔍 Network Check', callback_data: 'run_network_check' },
      ],
      [
        { text: '🚀 Статус деплоев', callback_data: 'deployment_status' },
        { text: '⚠️ Только ошибки', callback_data: 'show_errors_only' },
      ],
      [
        { text: '📈 Тренды', callback_data: 'show_trends' },
        { text: '🛠 Исправить проблемы', callback_data: 'auto_fix' },
      ],
    ],
  }
}

/**
 * Основная функция ежедневного отчета
 */
export const dailyHealthReport = inngest.createFunction(
  {
    id: 'daily-health-report',
    name: '📊 Daily Health Report',
    concurrency: 1,
  },
  { cron: '0 10 * * *' }, // Каждый день в 13:00 MSK (10:00 UTC)
  async ({ event, step, runId }) => {
    logger.info('📊 Daily Health Report запущен', { runId })

    // Step 1: Собираем статистику
    const stats = await step.run('collect-daily-stats', async () => {
      return await collectDailyStats()
    })

    // Step 2: Анализируем с помощью AI
    const analysis = await step.run('analyze-with-ai', async () => {
      return await analyzeSystemWithAI(stats)
    })

    // Step 3: Формируем и отправляем отчет
    await step.run('send-daily-report', async () => {
      const { bot } = getBotByName('neuro_blogger_bot')

      // Определяем emoji и настроение на основе AI анализа
      const moodEmojis = {
        спокойствие: '💚',
        удовлетворение: '😌',
        беспокойство: '😟',
        тревога: '🚨',
        'легкое беспокойство': '⚠️',
      }
      const statusEmoji =
        moodEmojis[analysis.mood] ||
        (analysis.healthScore < 50
          ? '🚨'
          : analysis.healthScore < 80
          ? '⚠️'
          : '💚')

      // Формируем живое сообщение от AI
      let message = `${statusEmoji} ОТЧЕТ ЛЮБОВИ (DevOps)\n\n`

      message += `📅 ${new Date().toLocaleDateString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}\n`
      message += `💭 Настроение: ${analysis.mood}\n`
      message += `🎯 Здоровье системы: ${analysis.healthScore}/100\n\n`

      // AI анализ - главная часть отчета
      message += `🧠 АНАЛИЗ СИТУАЦИИ:\n`
      message += `${analysis.analysis}\n\n`

      // Характер системы
      message += `🤖 Характер системы: ${analysis.personality}\n\n`

      // Ключевые находки
      if (analysis.insights && analysis.insights.length > 0) {
        message += `💡 КЛЮЧЕВЫЕ НАХОДКИ:\n`
        analysis.insights.forEach((insight, index) => {
          message += `• ${insight}\n`
        })
        message += '\n'
      }

      // Беспокойства
      if (analysis.concerns && analysis.concerns.length > 0) {
        message += `⚠️ ЧТО БЕСПОКОИТ:\n`
        analysis.concerns.forEach((concern, index) => {
          message += `• ${concern}\n`
        })
        message += '\n'
      }

      // Действия на сегодня
      if (analysis.actionItems && analysis.actionItems.length > 0) {
        message += `📋 ПЛАН НА СЕГОДНЯ:\n`
        analysis.actionItems.forEach((action, index) => {
          message += `${index + 1}. ${action}\n`
        })
        message += '\n'
      }

      // Краткая техническая сводка (компактно)
      const successRate =
        stats.totalRequests > 0
          ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
          : '100.0'
      message += `📊 Техническая сводка: ${stats.totalRequests.toLocaleString()} запросов (${successRate}% успех)`
      if (stats.criticalIssues > 0)
        message += `, ${stats.criticalIssues} критичных проблем`
      if (stats.deploymentsCount > 0)
        message += `, ${stats.deploymentsCount} деплоев`
      message += '\n\n'

      message += `⬇️ Используйте кнопки для дополнительных данных:`

      // Отправляем с интерактивными кнопками
      await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message, {
        reply_markup: createInlineKeyboard(),
        parse_mode: 'HTML',
      })

      // Если критические проблемы - дублируем админу с контекстом
      if (analysis.healthScore < 50 || analysis.mood === 'тревога') {
        const criticalMessage =
          `🚨 КРИТИЧЕСКАЯ СИТУАЦИЯ!\n\n` +
          `💭 Любовь (DevOps): ${analysis.mood}\n` +
          `🎯 Здоровье системы: ${analysis.healthScore}/100\n\n` +
          `❗ Основная проблема:\n${analysis.analysis.split('.')[0]}.\n\n` +
          (analysis.concerns.length > 0
            ? `⚠️ Критичные беспокойства:\n• ${analysis.concerns[0]}\n\n`
            : '') +
          `📞 Требуется НЕМЕДЛЕННОЕ вмешательство!`

        await bot.api.sendMessage(
          process.env.ADMIN_TELEGRAM_ID!,
          criticalMessage
        )
      }

      logger.info('📊 Daily report sent', {
        healthScore: analysis.healthScore,
        criticalIssues: stats.criticalIssues,
      })
    })

    return {
      success: true,
      healthScore: analysis.healthScore,
      criticalIssues: stats.criticalIssues,
      stats,
      analysis,
      timestamp: new Date(),
    }
  }
)

/**
 * Ручной запуск ежедневного отчета
 */
export const triggerDailyReport = inngest.createFunction(
  {
    id: 'trigger-daily-report',
    name: '🔄 Trigger Daily Report',
  },
  { event: 'system/trigger-daily-report' },
  async ({ event, step }) => {
    logger.info('🔄 Ручной запуск ежедневного отчета')

    const result = await inngest.send({
      name: 'inngest/function.invoked',
      data: {
        function_id: 'daily-health-report',
        trigger: 'manual',
        userId: event.data.userId,
      },
    })

    return {
      success: true,
      message: 'Daily report triggered manually',
      event_id: result.ids[0],
    }
  }
)

/**
 * Обработчик callback кнопок от Telegram
 */
export const handleTelegramCallbacks = inngest.createFunction(
  {
    id: 'handle-telegram-callbacks',
    name: '🔘 Handle Telegram Callbacks',
  },
  { event: 'telegram/callback' },
  async ({ event, step }) => {
    const { callbackData, chatId, messageId, userId } = event.data

    const { bot } = getBotByName('neuro_blogger_bot')

    switch (callbackData) {
      case 'show_detailed_logs':
        await bot.api.sendMessage(
          chatId,
          '📋 Подробные логи за 24 часа:\n\n' +
            'Используйте команду для просмотра:\n' +
            '```bash\ntail -n 100 /tmp/logs/combined.log\n```',
          { parse_mode: 'Markdown' }
        )
        break

      case 'run_network_check':
        // Запускаем network check
        await inngest.send({
          name: 'network/trigger-check',
          data: { userId, source: 'telegram_button' },
        })
        await bot.api.sendMessage(
          chatId,
          '🌐 Network Check запущен! Результат придет через минуту.'
        )
        break

      case 'deployment_status':
        await bot.api.sendMessage(
          chatId,
          '🚀 Статус деплоев:\n\n' +
            `Текущая версия: ${
              process.env.RAILWAY_DEPLOYMENT_ID || 'unknown'
            }\n` +
            `Ветка: ${process.env.RAILWAY_GIT_BRANCH || 'unknown'}\n` +
            `Коммит: ${
              process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 8) || 'unknown'
            }\n\n` +
            'Последние деплои отслеживаются автоматически.'
        )
        break

      case 'show_errors_only':
        // Показываем только ошибки за день
        const client = await dbPool.connect()
        const errors = await client.query(`
          SELECT data, created_at 
          FROM system_logs 
          WHERE level = 'error' AND created_at >= NOW() - INTERVAL '24 hours'
          ORDER BY created_at DESC 
          LIMIT 10
        `)
        client.release()

        const errorMessage =
          errors.rows.length > 0
            ? `❌ ОШИБКИ ЗА 24 ЧАСА (${errors.rows.length}):\n\n` +
              errors.rows
                .map(
                  (row, i) =>
                    `${i + 1}. ${new Date(row.created_at).toLocaleTimeString(
                      'ru-RU'
                    )}: ${JSON.stringify(row.data).substring(0, 100)}...`
                )
                .join('\n')
            : '✅ Ошибок за последние 24 часа не найдено!'

        await bot.api.sendMessage(chatId, errorMessage)
        break

      case 'show_trends':
        await bot.api.sendMessage(
          chatId,
          '📈 АНАЛИЗ ТРЕНДОВ:\n\n' +
            'Для подробного анализа трендов используйте дашборды мониторинга.\n\n' +
            'Доступные метрики:\n' +
            '• Время отклика эндпоинтов\n' +
            '• Количество ошибок по времени\n' +
            '• Успешность network checks\n' +
            '• Производительность после деплоев'
        )
        break

      case 'auto_fix':
        await bot.api.sendMessage(
          chatId,
          '🛠 АВТОМАТИЧЕСКОЕ ИСПРАВЛЕНИЕ:\n\n' +
            'Доступные действия:\n' +
            '1. Перезапуск сервисов\n' +
            '2. Очистка кэшей\n' +
            '3. Проверка сетевых соединений\n\n' +
            '⚠️ Критические операции требуют подтверждения администратора.'
        )
        break
    }

    return {
      success: true,
      callbackData,
      chatId,
      processed: true,
    }
  }
)
