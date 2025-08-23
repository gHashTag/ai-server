/**
 * Мониторинг Network Check ошибок
 * Отслеживание сетевых проблем, особенно после деплоя
 */

import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'
import { OpenAI } from 'openai'
import pkg from 'pg'
const { Pool } = pkg

// База данных для отслеживания проблем
const dbPool = new Pool({
  connectionString: process.env.SUPABASE_URL || '',
  ssl: { rejectUnauthorized: false },
})

// Инициализация OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_API_KEY
    ? 'https://api.deepseek.com'
    : undefined,
})

/**
 * AI анализ проблем с сетевыми проверками
 */
async function analyzeNetworkIssueWithAI(
  failedChecks: any[],
  trends: any,
  isPostDeploy: boolean
): Promise<{
  analysis: string
  recommendations: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  rootCause: string
}> {
  const now = new Date()
  const timeContext = {
    hour: now.getHours(),
    isWeekend: [0, 6].includes(now.getDay()),
    isBusinessHours: now.getHours() >= 9 && now.getHours() <= 18,
    timeOfDay:
      now.getHours() < 6
        ? 'ночь'
        : now.getHours() < 12
        ? 'утро'
        : now.getHours() < 18
        ? 'день'
        : 'вечер',
  }

  const failureRate =
    trends.totalChecks > 0
      ? (trends.recentFailures / trends.totalChecks) * 100
      : 0

  const prompt = `Ты опытный DevOps инженер. Анализируешь проблемы с доступностью production системы.

КОНТЕКСТ:
- Время: ${timeContext.timeOfDay}, ${
    timeContext.isWeekend ? 'выходной' : 'рабочий день'
  }
- ${
    timeContext.isBusinessHours
      ? 'Рабочие часы - пользователи активны'
      : 'Внерабочее время'
  }
- ${isPostDeploy ? '⚠️ ПРОБЛЕМА ПОСЛЕ ДЕПЛОЯ!' : 'Плановая проверка'}

ПРОБЛЕМЫ:
- Всего проверок: ${trends.totalChecks}
- Неудачных: ${trends.recentFailures} (${failureRate.toFixed(1)}%)
- Проблемные эндпоинты: ${trends.problematicEndpoints?.join(', ') || 'все'}

ДЕТАЛИ ОШИБОК:
${failedChecks
  .map(check => `- ${check.endpoint}: ${check.error || check.status}`)
  .join('\n')}

Проанализируй ситуацию и дай практичные рекомендации. Учитывай время и контекст.

Ответь в JSON формате:
{
  "analysis": "Твой анализ ситуации - что происходит и почему",
  "recommendations": ["конкретная рекомендация 1", "конкретная рекомендация 2"],
  "severity": "low|medium|high|critical",
  "rootCause": "наиболее вероятная причина проблемы"
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
            'Ты опытный DevOps инженер. Анализируешь production проблемы практично и по делу.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 600,
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')

    return {
      analysis:
        result.analysis || 'Обнаружены проблемы с доступностью эндпоинтов',
      recommendations: result.recommendations || [
        'Проверить логи сервера',
        'Перезапустить сервисы',
      ],
      severity:
        result.severity ||
        (failureRate > 50 ? 'critical' : failureRate > 20 ? 'high' : 'medium'),
      rootCause: result.rootCause || 'Сетевые проблемы или перегрузка сервера',
    }
  } catch (error) {
    logger.error('Error in network issue AI analysis:', error)

    // Intelligent fallback
    const severity =
      isPostDeploy && failureRate > 30
        ? 'critical'
        : failureRate > 50
        ? 'critical'
        : failureRate > 20
        ? 'high'
        : 'medium'

    return {
      analysis: `${
        isPostDeploy ? 'После деплоя' : 'В ходе мониторинга'
      } обнаружены проблемы с доступностью ${trends.recentFailures} из ${
        trends.totalChecks
      } проверок (${failureRate.toFixed(1)}%). ${
        timeContext.isBusinessHours
          ? 'Это критично - пользователи могут быть затронуты.'
          : 'Проблема во внерабочее время, но требует внимания.'
      }`,
      recommendations: isPostDeploy
        ? [
            'Проверить успешность деплоя',
            'Рассмотреть откат изменений',
            'Проверить логи приложения',
          ]
        : [
            'Проверить состояние серверов',
            'Изучить системные логи',
            'Мониторить нагрузку',
          ],
      severity,
      rootCause: isPostDeploy
        ? 'Проблемы связанные с деплоем'
        : 'Возможная перегрузка или сетевые проблемы',
    }
  }
}

interface NetworkCheckResult {
  endpoint: string
  status: 'success' | 'failure' | 'timeout'
  responseTime: number
  error?: string
  timestamp: Date
}

interface DeploymentInfo {
  version?: string
  deployedAt: Date
  successful: boolean
}

// Критичные эндпоинты для проверки
const CRITICAL_ENDPOINTS = [
  {
    url:
      process.env.APP_URL || 'https://ai-server-production-4a5f.up.railway.app',
    name: 'Main API',
  },
  { url: `${process.env.APP_URL}/health`, name: 'Health Check' },
  { url: `${process.env.APP_URL}/api/user/balance`, name: 'User Balance API' },
  {
    url: `${process.env.APP_URL}/api/generation/status`,
    name: 'Generation Status',
  },
]

/**
 * Проверка доступности критичных эндпоинтов
 */
async function checkNetworkEndpoints(): Promise<NetworkCheckResult[]> {
  const results: NetworkCheckResult[] = []

  for (const endpoint of CRITICAL_ENDPOINTS) {
    const startTime = Date.now()
    let result: NetworkCheckResult

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 сек таймаут

      const response = await fetch(endpoint.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'NetworkMonitor/1.0',
        },
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      result = {
        endpoint: endpoint.name,
        status: response.ok ? 'success' : 'failure',
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}`,
        timestamp: new Date(),
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime

      result = {
        endpoint: endpoint.name,
        status: error.name === 'AbortError' ? 'timeout' : 'failure',
        responseTime,
        error: error.message,
        timestamp: new Date(),
      }
    }

    results.push(result)
  }

  return results
}

/**
 * Проверка последних деплоев
 */
async function checkRecentDeployments(): Promise<DeploymentInfo | null> {
  try {
    const client = await dbPool.connect()

    // Проверяем последние события деплоя в логах (если они есть)
    const deployQuery = await client.query(`
      SELECT 
        data->>'version' as version,
        created_at,
        data->>'status' as status
      FROM system_logs 
      WHERE data->>'event' = 'deployment' 
      ORDER BY created_at DESC 
      LIMIT 1
    `)

    client.release()

    if (deployQuery.rows.length > 0) {
      const row = deployQuery.rows[0]
      return {
        version: row.version,
        deployedAt: new Date(row.created_at),
        successful: row.status === 'success',
      }
    }

    return null
  } catch (error) {
    logger.warn('Could not check recent deployments:', error)
    return null
  }
}

/**
 * Сохранение результатов проверки в БД
 */
async function saveNetworkCheckResults(
  results: NetworkCheckResult[]
): Promise<void> {
  try {
    const client = await dbPool.connect()

    for (const result of results) {
      await client.query(
        `
        INSERT INTO network_check_history 
        (endpoint, status, response_time, error_message, checked_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `,
        [
          result.endpoint,
          result.status,
          result.responseTime,
          result.error,
          result.timestamp,
        ]
      )
    }

    client.release()
  } catch (error) {
    // Если таблица не существует, создаем её
    if (
      error.message.includes('relation "network_check_history" does not exist')
    ) {
      await createNetworkCheckTable()
      // Повторяем попытку
      await saveNetworkCheckResults(results)
    } else {
      logger.error('Failed to save network check results:', error)
    }
  }
}

/**
 * Создание таблицы для истории network checks
 */
async function createNetworkCheckTable(): Promise<void> {
  try {
    const client = await dbPool.connect()

    await client.query(`
      CREATE TABLE IF NOT EXISTS network_check_history (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL,
        response_time INTEGER NOT NULL,
        error_message TEXT,
        checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_network_check_endpoint_time 
      ON network_check_history (endpoint, checked_at);
    `)

    client.release()
    logger.info('Network check history table created')
  } catch (error) {
    logger.error('Failed to create network check table:', error)
  }
}

/**
 * Анализ трендов network check ошибок
 */
async function analyzeNetworkTrends(): Promise<{
  recentFailures: number
  totalChecks: number
  failureRate: number
  problematicEndpoints: string[]
}> {
  try {
    const client = await dbPool.connect()

    // Анализ за последние 2 часа
    const trendQuery = await client.query(`
      SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status != 'success' THEN 1 END) as recent_failures,
        ARRAY_AGG(DISTINCT endpoint) FILTER (WHERE status != 'success') as problematic_endpoints
      FROM network_check_history 
      WHERE checked_at >= NOW() - INTERVAL '2 hours'
    `)

    client.release()

    const row = trendQuery.rows[0]
    const totalChecks = parseInt(row.total_checks) || 0
    const recentFailures = parseInt(row.recent_failures) || 0
    const failureRate =
      totalChecks > 0 ? (recentFailures / totalChecks) * 100 : 0

    return {
      recentFailures,
      totalChecks,
      failureRate,
      problematicEndpoints: row.problematic_endpoints || [],
    }
  } catch (error) {
    logger.error('Failed to analyze network trends:', error)
    return {
      recentFailures: 0,
      totalChecks: 0,
      failureRate: 0,
      problematicEndpoints: [],
    }
  }
}

/**
 * Основная функция мониторинга Network Check
 */
export const networkCheckMonitor = inngest.createFunction(
  {
    id: 'network-check-monitor',
    name: '🌐 Network Check Monitor',
    concurrency: 1,
  },
  { cron: '*/10 * * * *' }, // Каждые 10 минут
  async ({ event, step, runId }) => {
    logger.info('🌐 Network Check Monitor запущен', { runId })

    // Step 1: Проверка эндпоинтов
    const checkResults = await step.run('check-endpoints', async () => {
      return await checkNetworkEndpoints()
    })

    // Step 2: Сохранение результатов
    await step.run('save-results', async () => {
      await saveNetworkCheckResults(checkResults)
    })

    // Step 3: Проверка последних деплоев
    const deploymentInfo = await step.run('check-deployments', async () => {
      return await checkRecentDeployments()
    })

    // Step 4: Анализ трендов
    const trends = await step.run('analyze-trends', async () => {
      return await analyzeNetworkTrends()
    })

    // Step 5: Определение критичности
    const failedChecks = checkResults.filter(r => r.status !== 'success')
    const isCritical = failedChecks.length > 0
    const isPostDeploy =
      deploymentInfo &&
      Date.now() - deploymentInfo.deployedAt.getTime() < 30 * 60 * 1000 // 30 минут после деплоя

    // Step 6: Отправка уведомлений
    if (isCritical || (isPostDeploy && trends.failureRate > 10)) {
      await step.run('send-alerts', async () => {
        const { bot } = getBotByName('neuro_blogger_bot')

        let message = ''
        let emoji = ''

        if (isCritical) {
          emoji = '🚨🌐'
          message = `${emoji} NETWORK CHECK FAILURE!\n\n`
        } else {
          emoji = '⚠️🌐'
          message = `${emoji} Network issues after deployment\n\n`
        }

        message += `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n`

        if (deploymentInfo && isPostDeploy) {
          message += `🚀 Деплой: ${
            deploymentInfo.version || 'Unknown'
          } (${Math.round(
            (Date.now() - deploymentInfo.deployedAt.getTime()) / 1000 / 60
          )} мин назад)\n`
        }

        message += `\n📊 Статистика за 2 часа:\n`
        message += `• Всего проверок: ${trends.totalChecks}\n`
        message += `• Неудачных: ${
          trends.recentFailures
        } (${trends.failureRate.toFixed(1)}%)\n\n`

        message += `🔍 Результаты проверки:\n`
        checkResults.forEach(result => {
          const statusEmoji =
            result.status === 'success'
              ? '✅'
              : result.status === 'timeout'
              ? '⏰'
              : '❌'
          message += `${statusEmoji} ${result.endpoint} (${result.responseTime}ms)\n`
          if (result.error) {
            message += `   └ ${result.error}\n`
          }
        })

        if (trends.problematicEndpoints.length > 0) {
          message += `\n⚠️ Проблемные эндпоинты:\n${trends.problematicEndpoints
            .map(e => `• ${e}`)
            .join('\n')}\n`
        }

        // Получаем AI анализ ситуации
        const aiContext = await analyzeNetworkIssueWithAI(
          failedChecks,
          trends,
          isPostDeploy
        )

        message += `\n🤖 АНАЛИЗ AI:\n${aiContext.analysis}\n`

        if (aiContext.recommendations.length > 0) {
          message += `\n💡 РЕКОМЕНДАЦИИ:\n`
          aiContext.recommendations.forEach((rec, i) => {
            message += `${i + 1}. ${rec}\n`
          })
        }

        if (aiContext.rootCause) {
          message += `\n🔍 Возможная причина: ${aiContext.rootCause}\n`
        }

        message += `\n#network_check #monitoring #${aiContext.severity}`

        // Создаем интерактивные кнопки
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '🔄 Перезапустить проверку',
                callback_data: 'rerun_network_check',
              },
              {
                text: '📊 Подробная статистика',
                callback_data: 'network_stats',
              },
            ],
            [
              { text: '🛠 Попробовать исправить', callback_data: 'attempt_fix' },
              { text: '📞 Вызвать админа', callback_data: 'call_admin' },
            ],
            [
              { text: '📈 История проверок', callback_data: 'check_history' },
              { text: '🔍 Детали ошибок', callback_data: 'error_details' },
            ],
          ],
        }

        await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message, {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        })

        if (isCritical) {
          // Дублируем критические ошибки
          await bot.api.sendMessage(
            process.env.ADMIN_TELEGRAM_ID!,
            `🚨 КРИТИЧЕСКИЙ NETWORK CHECK!\n\n${failedChecks.length} из ${checkResults.length} эндпоинтов недоступны!\n\nТребуется немедленная проверка!`
          )
        }

        logger.info('🚨 Network check alert отправлен', {
          critical: isCritical,
          failedEndpoints: failedChecks.length,
          postDeploy: isPostDeploy,
        })
      })
    }

    return {
      success: true,
      timestamp: new Date(),
      totalEndpoints: checkResults.length,
      successfulChecks: checkResults.filter(r => r.status === 'success').length,
      failedChecks: failedChecks.length,
      trends,
      deploymentInfo,
      alertSent: isCritical || (isPostDeploy && trends.failureRate > 10),
    }
  }
)

/**
 * Функция для ручного запуска network check
 */
export const triggerNetworkCheck = inngest.createFunction(
  {
    id: 'trigger-network-check',
    name: '🔄 Trigger Network Check',
  },
  { event: 'network/trigger-check' },
  async ({ event, step }) => {
    logger.info('🔄 Ручной запуск network check')

    // Запускаем основную функцию
    const result = await inngest.send({
      name: 'inngest/function.invoked',
      data: {
        function_id: 'network-check-monitor',
        trigger: 'manual',
        userId: event.data.userId,
      },
    })

    return {
      success: true,
      message: 'Network check triggered manually',
      event_id: result.ids[0],
    }
  }
)

/**
 * Пост-деплой проверка (запускается после деплоя)
 */
export const postDeployNetworkCheck = inngest.createFunction(
  {
    id: 'post-deploy-network-check',
    name: '🚀 Post-Deploy Network Check',
    concurrency: 1,
  },
  { event: 'deployment/completed' },
  async ({ event, step }) => {
    logger.info('🚀 Post-deploy network check запущен')

    // Ждем 2 минуты после деплоя для стабилизации
    await step.sleep('wait-for-deployment', '2m')

    // Выполняем 3 проверки с интервалом в 1 минуту
    const allResults: NetworkCheckResult[][] = []

    for (let i = 0; i < 3; i++) {
      const results = await step.run(`post-deploy-check-${i + 1}`, async () => {
        return await checkNetworkEndpoints()
      })

      allResults.push(results)

      if (i < 2) {
        await step.sleep(`wait-between-checks-${i}`, '1m')
      }
    }

    // Анализируем результаты
    const flatResults = allResults.flat()
    const failedResults = flatResults.filter(r => r.status !== 'success')
    const failureRate = (failedResults.length / flatResults.length) * 100

    // Отправляем отчет
    await step.run('send-post-deploy-report', async () => {
      const { bot } = getBotByName('neuro_blogger_bot')

      let message = '🚀 POST-DEPLOY NETWORK CHECK REPORT\n\n'
      message += `📦 Версия: ${event.data.version || 'Unknown'}\n`
      message += `🕐 Время деплоя: ${new Date(
        event.data.deployedAt || Date.now()
      ).toLocaleString('ru-RU')}\n\n`

      message += `📊 Результат 3-х проверок:\n`
      message += `• Всего проверок: ${flatResults.length}\n`
      message += `• Успешных: ${flatResults.length - failedResults.length}\n`
      message += `• Неудачных: ${failedResults.length}\n`
      message += `• Процент неудач: ${failureRate.toFixed(1)}%\n\n`

      if (failureRate > 0) {
        message += `❌ Проблемные эндпоинты:\n`
        const problematicEndpoints = new Set(failedResults.map(r => r.endpoint))
        problematicEndpoints.forEach(endpoint => {
          const endpointFailures = failedResults.filter(
            r => r.endpoint === endpoint
          ).length
          message += `• ${endpoint}: ${endpointFailures}/3 неудач\n`
        })
        message += '\n'
      }

      // Определяем статус деплоя
      let status = ''
      if (failureRate === 0) {
        status = '✅ ДЕПЛОЙ УСПЕШЕН - все проверки пройдены'
      } else if (failureRate < 30) {
        status = '⚠️ ДЕПЛОЙ С ПРЕДУПРЕЖДЕНИЯМИ - частичные проблемы'
      } else {
        status = '🚨 ДЕПЛОЙ ПРОБЛЕМНЫЙ - требуется вмешательство'
      }

      message += status
      message += `\n\n#post_deploy #network_check #${
        failureRate === 0
          ? 'success'
          : failureRate < 30
          ? 'warning'
          : 'critical'
      }`

      // Кнопки для post-deploy отчета
      const postDeployKeyboard = {
        inline_keyboard:
          failureRate === 0
            ? [
                [
                  { text: '✅ Отлично!', callback_data: 'deploy_success_ack' },
                  {
                    text: '📊 Подробности',
                    callback_data: 'post_deploy_details',
                  },
                ],
              ]
            : [
                [
                  {
                    text: '🔄 Повторить проверку',
                    callback_data: 'retry_post_deploy',
                  },
                  {
                    text: '🚀 Откатить деплой',
                    callback_data: 'rollback_deployment',
                  },
                ],
                [
                  {
                    text: '🛠 Попробовать исправить',
                    callback_data: 'fix_post_deploy',
                  },
                  {
                    text: '📞 Вызвать разработчика',
                    callback_data: 'call_developer',
                  },
                ],
              ],
      }

      await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message, {
        reply_markup: postDeployKeyboard,
        parse_mode: 'HTML',
      })

      // Критические проблемы дублируем админу
      if (failureRate >= 30) {
        await bot.api.sendMessage(
          process.env.ADMIN_TELEGRAM_ID!,
          `🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ ПОСЛЕ ДЕПЛОЯ!\n\nПроцент неудач: ${failureRate.toFixed(
            1
          )}%\n\nРекомендуется откат!`
        )
      }

      logger.info('📋 Post-deploy report отправлен', {
        failureRate,
        version: event.data.version,
      })
    })

    return {
      success: true,
      version: event.data.version,
      totalChecks: flatResults.length,
      failedChecks: failedResults.length,
      failureRate,
      status:
        failureRate === 0
          ? 'success'
          : failureRate < 30
          ? 'warning'
          : 'critical',
    }
  }
)
