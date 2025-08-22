import { inngest } from '../clients'
import { NotificationService } from '@/services/notification.service'
import { logger } from '@/utils/logger'

const notificationService = new NotificationService()

export const sendTrainingErrorInngest = inngest.createFunction(
  { 
    id: 'send-training-error',
    name: 'Send Training Error Notification via Inngest',
    retries: 3
  },
  { event: 'notification/training-error.start' },
  async ({ event, step }) => {
    const { 
      telegramId, 
      botName, 
      error,
      options = {}
    } = event.data

    logger.info({
      message: 'Inngest: Отправляем уведомление об ошибке обучения',
      telegramId,
      botName,
      errorLength: error.length
    })

    return await step.run('send-training-error', async () => {
      try {
        await notificationService.sendTrainingError(
          telegramId,
          botName,
          error,
          options
        )

        logger.info({
          message: 'Inngest: Уведомление об ошибке успешно отправлено',
          telegramId,
          botName
        })

        return { success: true }
      } catch (sendError) {
        logger.error({
          message: 'Inngest: Ошибка отправки уведомления об ошибке',
          telegramId,
          botName,
          error: sendError.message,
          stack: sendError.stack
        })
        
        throw sendError
      }
    })
  }
)

export const sendSuccessNotificationInngest = inngest.createFunction(
  { 
    id: 'send-success-notification',
    name: 'Send Success Notification via Inngest',
    retries: 3
  },
  { event: 'notification/success.start' },
  async ({ event, step }) => {
    const { 
      telegramId, 
      botName, 
      message,
      data = {}
    } = event.data

    logger.info({
      message: 'Inngest: Отправляем уведомление об успехе',
      telegramId,
      botName,
      messageType: data.type || 'general'
    })

    return await step.run('send-success-notification', async () => {
      try {
        await notificationService.sendSuccessNotification(
          telegramId,
          botName,
          message,
          data
        )

        logger.info({
          message: 'Inngest: Уведомление об успехе отправлено',
          telegramId,
          botName
        })

        return { success: true }
      } catch (sendError) {
        logger.error({
          message: 'Inngest: Ошибка отправки уведомления об успехе',
          telegramId,
          botName,
          error: sendError.message,
          stack: sendError.stack
        })
        
        throw sendError
      }
    })
  }
)

// Универсальная функция для отправки любых уведомлений
export const sendGenericNotificationInngest = inngest.createFunction(
  { 
    id: 'send-generic-notification',
    name: 'Send Generic Notification via Inngest',
    retries: 3
  },
  { event: 'notification/generic.start' },
  async ({ event, step }) => {
    const { 
      telegramId, 
      botName, 
      message,
      parseMode = 'Markdown',
      extra = {}
    } = event.data

    logger.info({
      message: 'Inngest: Отправляем общее уведомление',
      telegramId,
      botName,
      messageLength: message.length
    })

    return await step.run('send-generic-notification', async () => {
      try {
        // Используем базовый getBotByName для отправки
        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName(botName)
        
        await bot.telegram.sendMessage(telegramId, message, {
          parse_mode: parseMode,
          ...extra
        })

        logger.info({
          message: 'Inngest: Общее уведомление отправлено',
          telegramId,
          botName
        })

        return { success: true }
      } catch (sendError) {
        logger.error({
          message: 'Inngest: Ошибка отправки общего уведомления',
          telegramId,
          botName,
          error: sendError.message,
          stack: sendError.stack
        })
        
        throw sendError
      }
    })
  }
)

// Функция для массовых уведомлений
export const sendBulkNotificationsInngest = inngest.createFunction(
  { 
    id: 'send-bulk-notifications',
    name: 'Send Bulk Notifications via Inngest',
    retries: 2,
    concurrency: {
      limit: 5 // Ограничиваем для защиты от rate limits
    }
  },
  { event: 'notification/bulk.start' },
  async ({ event, step }) => {
    const { notifications, batchIndex, totalBatches } = event.data

    logger.info({
      message: 'Inngest: Начинаем массовую отправку уведомлений',
      batchIndex,
      totalBatches,
      notificationCount: notifications.length
    })

    return await step.run('send-bulk-notifications', async () => {
      try {
        const results = []
        
        for (const notification of notifications) {
          try {
            // Отправляем через универсальную функцию
            await inngest.send({
              name: 'notification/generic.start',
              data: notification
            })
            
            results.push({ 
              telegramId: notification.telegramId, 
              status: 'sent' 
            })
          } catch (error) {
            logger.warn({
              message: 'Ошибка отправки уведомления в батче',
              telegramId: notification.telegramId,
              error: error.message
            })
            results.push({ 
              telegramId: notification.telegramId, 
              status: 'failed', 
              error: error.message 
            })
          }
        }

        logger.info({
          message: 'Inngest: Массовая отправка уведомлений завершена',
          batchIndex,
          successCount: results.filter(r => r.status === 'sent').length,
          failedCount: results.filter(r => r.status === 'failed').length
        })

        return results
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка массовой отправки уведомлений',
          batchIndex,
          error: error.message
        })
        
        throw error
      }
    })
  }
)