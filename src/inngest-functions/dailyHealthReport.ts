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
    const networkStats = await client.query(`
      SELECT 
        endpoint,
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_checks,
        AVG(response_time) as avg_response_time
      FROM network_check_history 
      WHERE checked_at >= $1
      GROUP BY endpoint
    `, [yesterday])

    // Статистика системных логов (если есть)
    const systemStats = await client.query(`
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_logs,
        COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_logs
      FROM system_logs 
      WHERE created_at >= $1
    `, [yesterday])

    // Топ ошибок
    const topErrors = await client.query(`
      SELECT 
        data->>'error' as error,
        COUNT(*) as count
      FROM system_logs 
      WHERE level = 'error' AND created_at >= $1
      GROUP BY data->>'error'
      ORDER BY count DESC
      LIMIT 5
    `, [yesterday])

    client.release()

    return {
      totalRequests: parseInt(systemStats.rows[0]?.total_logs || '0'),
      successfulRequests: parseInt(systemStats.rows[0]?.total_logs || '0') - parseInt(systemStats.rows[0]?.error_logs || '0'),
      failedRequests: parseInt(systemStats.rows[0]?.error_logs || '0'),
      avgResponseTime: 0, // Будет рассчитано отдельно
      topErrors: topErrors.rows.map(row => ({
        error: row.error || 'Unknown error',
        count: parseInt(row.count)
      })),
      networkCheckResults: networkStats.rows.map(row => ({
        endpoint: row.endpoint,
        successRate: (parseInt(row.successful_checks) / parseInt(row.total_checks)) * 100,
        avgResponseTime: parseFloat(row.avg_response_time || '0')
      })),
      deploymentsCount: 0, // Будет обновлено если есть данные о деплоях
      criticalIssues: parseInt(systemStats.rows[0]?.error_logs || '0')
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
      criticalIssues: 0
    }
  }
}

/**
 * Анализ логов с помощью AI и формирование выводов
 */
async function analyzeLogsWithAI(stats: DailyStats): Promise<{
  summary: string
  recommendations: string[]
  healthScore: number
  trends: string
}> {
  const prompt = `Ты системный администратор. Проанализируй статистику системы за 24 часа и дай краткий отчет на русском языке:

Статистика:
- Всего запросов: ${stats.totalRequests}
- Успешных: ${stats.successfulRequests}
- Ошибок: ${stats.failedRequests}
- Критичных проблем: ${stats.criticalIssues}
- Деплоев: ${stats.deploymentsCount}

Network Check результаты:
${stats.networkCheckResults.map(r => 
  `- ${r.endpoint}: ${r.successRate.toFixed(1)}% успешности (${r.avgResponseTime.toFixed(0)}ms)`
).join('\n')}

Топ ошибок:
${stats.topErrors.map(e => `- ${e.error}: ${e.count} раз`).join('\n')}

Ответь в JSON формате:
{
  "summary": "Краткое резюме состояния системы за день",
  "recommendations": ["рекомендация 1", "рекомендация 2"],
  "healthScore": 85,
  "trends": "Описание трендов и изменений"
}`

  try {
    const response = await openai.chat.completions.create({
      model: process.env.DEEPSEEK_API_KEY ? 'deepseek-chat' : 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'Ты опытный DevOps инженер. Анализируй данные и давай практичные рекомендации.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 800,
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  } catch (error) {
    logger.error('Error analyzing logs with AI:', error)
    
    // Fallback анализ
    const successRate = stats.totalRequests > 0 
      ? (stats.successfulRequests / stats.totalRequests) * 100 
      : 100

    return {
      summary: `За сутки обработано ${stats.totalRequests} запросов с успешностью ${successRate.toFixed(1)}%. ${stats.criticalIssues > 0 ? `Обнаружено ${stats.criticalIssues} критичных проблем.` : 'Критичных проблем нет.'}`,
      recommendations: stats.criticalIssues > 0 
        ? ['Проверить логи ошибок', 'Мониторить производительность']
        : ['Система работает стабильно'],
      healthScore: Math.max(0, 100 - (stats.criticalIssues * 10) - Math.max(0, (100 - successRate) * 2)),
      trends: stats.criticalIssues > 5 ? 'Увеличение количества ошибок' : 'Стабильная работа'
    }
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
        { text: '🔍 Network Check', callback_data: 'run_network_check' }
      ],
      [
        { text: '🚀 Статус деплоев', callback_data: 'deployment_status' },
        { text: '⚠️ Только ошибки', callback_data: 'show_errors_only' }
      ],
      [
        { text: '📈 Тренды', callback_data: 'show_trends' },
        { text: '🛠 Исправить проблемы', callback_data: 'auto_fix' }
      ]
    ]
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
      return await analyzeLogsWithAI(stats)
    })

    // Step 3: Формируем и отправляем отчет
    await step.run('send-daily-report', async () => {
      const { bot } = getBotByName('neuro_blogger_bot')

      // Определяем emoji статуса
      let statusEmoji = '💚'
      if (analysis.healthScore < 50) statusEmoji = '🚨'
      else if (analysis.healthScore < 80) statusEmoji = '⚠️'

      let message = `${statusEmoji} ЕЖЕДНЕВНЫЙ ОТЧЕТ О СОСТОЯНИИ СИСТЕМЫ\n\n`
      
      message += `📅 ${new Date().toLocaleDateString('ru-RU', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}\n\n`

      // Общая оценка здоровья
      message += `🏥 Оценка здоровья: ${analysis.healthScore}/100\n`
      
      // Основные показатели
      message += `📊 ОСНОВНЫЕ ПОКАЗАТЕЛИ:\n`
      message += `• Всего запросов: ${stats.totalRequests.toLocaleString()}\n`
      message += `• Успешность: ${stats.totalRequests > 0 ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1) : '100.0'}%\n`
      message += `• Критичных проблем: ${stats.criticalIssues}\n`
      
      if (stats.deploymentsCount > 0) {
        message += `• Деплоев за день: ${stats.deploymentsCount}\n`
      }

      // Network Check результаты
      if (stats.networkCheckResults.length > 0) {
        message += `\n🌐 NETWORK CHECK:\n`
        stats.networkCheckResults.forEach(result => {
          const emoji = result.successRate >= 95 ? '✅' : result.successRate >= 80 ? '⚠️' : '❌'
          message += `${emoji} ${result.endpoint}: ${result.successRate.toFixed(1)}% (${result.avgResponseTime.toFixed(0)}ms)\n`
        })
      }

      // Топ ошибок
      if (stats.topErrors.length > 0) {
        message += `\n❌ ТОП ОШИБКИ:\n`
        stats.topErrors.slice(0, 3).forEach((error, index) => {
          message += `${index + 1}. ${error.error.substring(0, 50)}... (${error.count}x)\n`
        })
      }

      // AI анализ
      message += `\n🤖 АНАЛИЗ AI:\n`
      message += `${analysis.summary}\n`

      if (analysis.trends) {
        message += `\n📈 Тренды: ${analysis.trends}\n`
      }

      // Рекомендации
      if (analysis.recommendations.length > 0) {
        message += `\n💡 РЕКОМЕНДАЦИИ:\n`
        analysis.recommendations.forEach((rec, index) => {
          message += `${index + 1}. ${rec}\n`
        })
      }

      message += `\n⬇️ Используйте кнопки ниже для подробностей:`

      // Отправляем с интерактивными кнопками
      await bot.api.sendMessage(
        process.env.ADMIN_CHAT_ID!,
        message,
        {
          reply_markup: createInlineKeyboard(),
          parse_mode: 'HTML'
        }
      )

      // Если критические проблемы - дублируем админу
      if (analysis.healthScore < 50) {
        await bot.api.sendMessage(
          process.env.ADMIN_TELEGRAM_ID!,
          `🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ В СИСТЕМЕ!\n\nОценка здоровья: ${analysis.healthScore}/100\nКритичных проблем: ${stats.criticalIssues}\n\nТребуется немедленное внимание!`
        )
      }

      logger.info('📊 Daily report sent', { 
        healthScore: analysis.healthScore,
        criticalIssues: stats.criticalIssues
      })
    })

    return {
      success: true,
      healthScore: analysis.healthScore,
      criticalIssues: stats.criticalIssues,
      stats,
      analysis,
      timestamp: new Date()
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
        userId: event.data.userId
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
          data: { userId, source: 'telegram_button' }
        })
        await bot.api.sendMessage(chatId, '🌐 Network Check запущен! Результат придет через минуту.')
        break

      case 'deployment_status':
        await bot.api.sendMessage(
          chatId,
          '🚀 Статус деплоев:\n\n' +
          `Текущая версия: ${process.env.RAILWAY_DEPLOYMENT_ID || 'unknown'}\n` +
          `Ветка: ${process.env.RAILWAY_GIT_BRANCH || 'unknown'}\n` +
          `Коммит: ${process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 8) || 'unknown'}\n\n` +
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

        const errorMessage = errors.rows.length > 0 
          ? `❌ ОШИБКИ ЗА 24 ЧАСА (${errors.rows.length}):\n\n` +
            errors.rows.map((row, i) => 
              `${i + 1}. ${new Date(row.created_at).toLocaleTimeString('ru-RU')}: ${JSON.stringify(row.data).substring(0, 100)}...`
            ).join('\n')
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
      processed: true
    }
  }
)