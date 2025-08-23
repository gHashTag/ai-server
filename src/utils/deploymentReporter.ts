/**
 * Система репортинга деплоя и интеграция с network monitoring
 */

import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'

interface DeploymentEvent {
  version?: string
  commit?: string
  branch?: string
  deployedBy?: string
  deploymentUrl?: string
  startedAt: Date
  status: 'started' | 'completed' | 'failed'
  environment?: 'production' | 'staging' | 'development'
}

/**
 * Автоматическое обнаружение деплоя по изменениям в Railway/Docker
 */
export async function detectDeployment(): Promise<DeploymentEvent | null> {
  try {
    // Проверяем переменные окружения Railway
    if (process.env.RAILWAY_DEPLOYMENT_ID && process.env.RAILWAY_GIT_COMMIT_SHA) {
      return {
        version: process.env.RAILWAY_DEPLOYMENT_ID,
        commit: process.env.RAILWAY_GIT_COMMIT_SHA,
        branch: process.env.RAILWAY_GIT_BRANCH,
        deploymentUrl: process.env.RAILWAY_DEPLOYMENT_URL,
        startedAt: new Date(),
        status: 'completed',
        environment: 'production'
      }
    }

    // Проверяем Docker контейнер
    if (process.env.DOCKER_IMAGE_TAG) {
      return {
        version: process.env.DOCKER_IMAGE_TAG,
        startedAt: new Date(),
        status: 'completed',
        environment: 'production'
      }
    }

    return null
  } catch (error) {
    logger.error('Failed to detect deployment:', error)
    return null
  }
}

/**
 * Отправка уведомления о начале деплоя
 */
export async function notifyDeploymentStart(deployment: DeploymentEvent): Promise<void> {
  try {
    const { bot } = getBotByName('neuro_blogger_bot')

    let message = '🚀 ДЕПЛОЙ НАЧАЛСЯ\n\n'
    
    if (deployment.version) {
      message += `📦 Версия: ${deployment.version}\n`
    }
    if (deployment.commit) {
      message += `🔗 Коммит: ${deployment.commit.substring(0, 8)}\n`
    }
    if (deployment.branch) {
      message += `🌿 Ветка: ${deployment.branch}\n`
    }
    if (deployment.deployedBy) {
      message += `👤 Автор: ${deployment.deployedBy}\n`
    }
    
    message += `🕐 Время: ${deployment.startedAt.toLocaleString('ru-RU')}\n`
    message += `🌍 Среда: ${deployment.environment || 'unknown'}\n\n`
    
    message += '⏳ Автоматические проверки network check начнутся через 2 минуты после завершения\n'
    message += '\n#deployment #started'

    await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message)
    
    logger.info('Deployment start notification sent', { version: deployment.version })
  } catch (error) {
    logger.error('Failed to send deployment start notification:', error)
  }
}

/**
 * Отправка уведомления о завершении деплоя
 */
export async function notifyDeploymentComplete(deployment: DeploymentEvent): Promise<void> {
  try {
    const { bot } = getBotByName('neuro_blogger_bot')

    let message = ''
    
    if (deployment.status === 'completed') {
      message = '✅ ДЕПЛОЙ ЗАВЕРШЕН\n\n'
    } else if (deployment.status === 'failed') {
      message = '❌ ДЕПЛОЙ НЕУДАЧЕН\n\n'
    }
    
    if (deployment.version) {
      message += `📦 Версия: ${deployment.version}\n`
    }
    if (deployment.commit) {
      message += `🔗 Коммит: ${deployment.commit.substring(0, 8)}\n`
    }
    if (deployment.branch) {
      message += `🌿 Ветка: ${deployment.branch}\n`
    }
    
    message += `🕐 Время: ${new Date().toLocaleString('ru-RU')}\n`
    
    if (deployment.deploymentUrl) {
      message += `🔗 URL: ${deployment.deploymentUrl}\n`
    }

    if (deployment.status === 'completed') {
      message += '\n🔍 Network check запускается автоматически...\n'
      message += '#deployment #completed #success'
    } else {
      message += '\n⚠️ Требуется проверка логов деплоя\n'
      message += '#deployment #failed #error'
    }

    await bot.api.sendMessage(process.env.ADMIN_CHAT_ID!, message)

    // Запускаем post-deploy network check если деплой успешен
    if (deployment.status === 'completed') {
      await inngest.send({
        name: 'deployment/completed',
        data: {
          version: deployment.version,
          commit: deployment.commit,
          branch: deployment.branch,
          deployedAt: deployment.startedAt.toISOString(),
          environment: deployment.environment
        }
      })
    }
    
    logger.info('Deployment complete notification sent', { 
      version: deployment.version, 
      status: deployment.status 
    })
  } catch (error) {
    logger.error('Failed to send deployment complete notification:', error)
  }
}

/**
 * Middleware для Express для автоматического обнаружения изменений версии
 */
export function deploymentDetectionMiddleware(req: any, res: any, next: any) {
  // Добавляем заголовок с версией приложения в ответ
  const version = process.env.RAILWAY_DEPLOYMENT_ID || 
                 process.env.DOCKER_IMAGE_TAG || 
                 process.env.npm_package_version || 
                 'unknown'
  
  res.setHeader('X-App-Version', version)
  next()
}

/**
 * Функция для ручного уведомления о деплое
 */
export async function manualDeploymentNotification(
  version: string, 
  environment: string = 'production'
): Promise<void> {
  const deployment: DeploymentEvent = {
    version,
    startedAt: new Date(),
    status: 'completed',
    environment: environment as any
  }

  await notifyDeploymentComplete(deployment)
}

/**
 * Проверка здоровья системы после деплоя с таймаутом
 */
export async function waitForHealthySystem(
  maxWaitMinutes: number = 10
): Promise<{ healthy: boolean; message: string }> {
  const startTime = Date.now()
  const maxWaitMs = maxWaitMinutes * 60 * 1000

  while (Date.now() - startTime < maxWaitMs) {
    try {
      // Проверяем основные эндпоинты
      const healthResponse = await fetch(`${process.env.APP_URL}/health`, {
        timeout: 10000
      })

      if (healthResponse.ok) {
        return {
          healthy: true,
          message: `Система стала доступна через ${Math.round((Date.now() - startTime) / 1000)} секунд`
        }
      }

      // Ждем 30 секунд перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, 30000))
    } catch (error) {
      // Ждем и пытаемся снова
      await new Promise(resolve => setTimeout(resolve, 30000))
    }
  }

  return {
    healthy: false,
    message: `Система не стала доступна в течение ${maxWaitMinutes} минут`
  }
}