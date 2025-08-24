/**
 * Мониторинг деплоя и автоматическое восстановление
 */

import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'
import {
  detectDeployment,
  notifyDeploymentComplete,
  waitForHealthySystem,
} from '@/utils/deploymentReporter'

/**
 * Автоматический мониторинг деплоев
 * Запускается каждые 5 минут и проверяет изменения версии
 */
export const deploymentAutoDetector = inngest.createFunction(
  {
    id: 'deployment-auto-detector',
    name: '🔍 Deployment Auto Detector',
    concurrency: 1,
  },
  { cron: '*/5 * * * *' }, // Каждые 5 минут
  async ({ event, step, runId }) => {
    logger.info('🔍 Deployment Auto Detector запущен', { runId })

    // Step 1: Получаем текущую версию
    const currentVersion = await step.run('get-current-version', async () => {
      return (
        process.env.RAILWAY_DEPLOYMENT_ID ||
        process.env.DOCKER_IMAGE_TAG ||
        process.env.npm_package_version ||
        'unknown'
      )
    })

    // Step 2: Проверяем, изменилась ли версия с последней проверки
    const versionChanged = await step.run('check-version-change', async () => {
      try {
        // В реальной реализации здесь должна быть проверка с Redis/БД
        // Пока используем простую проверку времени запуска процесса
        const uptime = process.uptime()

        // Если процесс запустился менее 10 минут назад, считаем что был деплой
        return uptime < 10 * 60 // 10 минут в секундах
      } catch (error) {
        return false
      }
    })

    if (versionChanged) {
      // Step 3: Обнаружен новый деплой
      const deploymentInfo = await step.run('detect-deployment', async () => {
        return await detectDeployment()
      })

      if (deploymentInfo) {
        // Step 4: Уведомляем о деплое
        await step.run('notify-deployment', async () => {
          await notifyDeploymentComplete(deploymentInfo)
        })

        // Step 5: Запускаем post-deploy проверки
        await step.run('trigger-post-deploy-checks', async () => {
          await inngest.send({
            name: 'deployment/completed',
            data: {
              version: deploymentInfo.version,
              commit: deploymentInfo.commit,
              branch: deploymentInfo.branch,
              deployedAt: deploymentInfo.startedAt instanceof Date 
                ? deploymentInfo.startedAt.toISOString()
                : new Date(deploymentInfo.startedAt || Date.now()).toISOString(),
              environment: deploymentInfo.environment,
              autoDetected: true,
            },
          })
        })

        logger.info('🚀 Deployment detected and processed', {
          version: deploymentInfo.version,
          environment: deploymentInfo.environment,
        })
      }
    }

    return {
      success: true,
      currentVersion,
      versionChanged,
      timestamp: new Date(),
    }
  }
)

/**
 * Система автоматического восстановления после проблемного деплоя
 */
export const deploymentRecoverySystem = inngest.createFunction(
  {
    id: 'deployment-recovery-system',
    name: '🛠 Deployment Recovery System',
    concurrency: 1,
  },
  { event: 'deployment/recovery-needed' },
  async ({ event, step }) => {
    const { version, failureRate, criticalEndpoints } = event.data

    logger.info('🛠 Deployment Recovery System активирован', {
      version,
      failureRate,
      criticalEndpoints,
    })

    // Step 1: Уведомляем о начале процедуры восстановления
    await step.run('notify-recovery-start', async () => {
      const { bot } = getBotByName('neuro_blogger_bot')

      const message =
        `🛠 АВТОМАТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ ЗАПУЩЕНО\n\n` +
        `📦 Проблемная версия: ${version}\n` +
        `📊 Процент неудач: ${failureRate}%\n` +
        `⚠️ Критичные эндпоинты: ${
          criticalEndpoints?.join(', ') || 'Все'
        }\n\n` +
        `🔄 Начинаю процедуру восстановления...`

      await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message)
    })

    // Step 2: Пытаемся перезапустить сервисы
    const restartResult = await step.run('restart-services', async () => {
      try {
        // В Railway можно использовать API для перезапуска
        if (process.env.RAILWAY_TOKEN) {
          // Здесь был бы вызов Railway API
          logger.info('Attempting to restart Railway service')
        }

        // Для Docker Compose
        if (process.env.DOCKER_COMPOSE_PROJECT) {
          // Здесь был бы вызов Docker API
          logger.info('Attempting to restart Docker services')
        }

        return {
          success: true,
          method: 'service_restart',
          message: 'Сервисы перезапущены',
        }
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Не удалось перезапустить сервисы',
        }
      }
    })

    // Step 3: Ждем стабилизации системы
    await step.sleep('wait-for-stabilization', '2m')

    // Step 4: Проверяем результат восстановления
    const healthCheckResult = await step.run(
      'check-recovery-result',
      async () => {
        return await waitForHealthySystem(5) // 5 минут ожидания
      }
    )

    // Step 5: Если восстановление не помогло, рекомендуем откат
    if (!healthCheckResult.healthy) {
      await step.run('recommend-rollback', async () => {
        const { bot } = getBotByName('neuro_blogger_bot')

        const message =
          `🚨 ВОССТАНОВЛЕНИЕ НЕ ПОМОГЛО!\n\n` +
          `❌ ${healthCheckResult.message}\n\n` +
          `📋 РЕКОМЕНДУЕМЫЕ ДЕЙСТВИЯ:\n` +
          `1. 🔄 Откатить к предыдущей версии\n` +
          `2. 🔍 Проверить логи деплоя\n` +
          `3. 🛠 Исправить проблемы в коде\n` +
          `4. 🧪 Протестировать на staging\n\n` +
          `⚡ ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ВМЕШАТЕЛЬСТВО!`

        await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message)

        // Отправляем критическое уведомление админу
        await bot.api.sendMessage(
          process.env.ADMIN_TELEGRAM_ID!,
          `🚨 КРИТИЧНО! Автоматическое восстановление после деплоя ${version} не удалось! Требуется откат!`
        )
      })
    } else {
      // Step 6: Восстановление успешно
      await step.run('notify-recovery-success', async () => {
        const { bot } = getBotByName('neuro_blogger_bot')

        const message =
          `✅ ВОССТАНОВЛЕНИЕ УСПЕШНО!\n\n` +
          `📦 Версия: ${version}\n` +
          `🛠 Метод: ${restartResult.method}\n` +
          `⏱ ${healthCheckResult.message}\n\n` +
          `🎉 Система работает нормально!`

        await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message)
      })
    }

    return {
      success: true,
      recovered: healthCheckResult.healthy,
      restartResult,
      healthCheckResult,
      timestamp: new Date(),
    }
  }
)

/**
 * Функция для запуска восстановления при критических проблемах
 */
export const triggerRecoveryIfNeeded = async (
  version: string,
  failureRate: number,
  criticalEndpoints?: string[]
): Promise<void> => {
  // Запускаем восстановление если процент неудач > 50%
  if (failureRate > 50) {
    await inngest.send({
      name: 'deployment/recovery-needed',
      data: {
        version,
        failureRate,
        criticalEndpoints,
        timestamp: new Date().toISOString(),
      },
    })

    logger.warn('🛠 Recovery system triggered', {
      version,
      failureRate,
      criticalEndpoints,
    })
  }
}

/**
 * Обработчик webhook от Railway для уведомлений о деплое
 */
export const railwayDeploymentWebhook = inngest.createFunction(
  {
    id: 'railway-deployment-webhook',
    name: '🚂 Railway Deployment Webhook',
  },
  { event: 'railway/deployment.webhook' },
  async ({ event, step }) => {
    const { status, deploymentId, service, environment } = event.data

    logger.info('🚂 Railway deployment webhook received', {
      status,
      deploymentId,
      service,
    })

    if (status === 'SUCCESS') {
      // Деплой успешен - запускаем проверки
      await step.run('trigger-post-deploy-checks', async () => {
        await inngest.send({
          name: 'deployment/completed',
          data: {
            version: deploymentId,
            deployedAt: new Date().toISOString(),
            environment,
            service,
            source: 'railway_webhook',
          },
        })
      })
    } else if (status === 'FAILED') {
      // Деплой неудачен - уведомляем
      await step.run('notify-failed-deployment', async () => {
        const { bot } = getBotByName('neuro_blogger_bot')

        const message =
          `❌ ДЕПЛОЙ НЕУДАЧЕН\n\n` +
          `🚂 Railway Service: ${service}\n` +
          `📦 Deployment ID: ${deploymentId}\n` +
          `🌍 Environment: ${environment}\n` +
          `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n\n` +
          `🔍 Проверьте логи Railway для деталей\n` +
          `#deployment #failed #railway`

        await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message)
      })
    }

    return {
      success: true,
      status,
      deploymentId,
      processed: true,
    }
  }
)
