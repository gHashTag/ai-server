import { Request, Response } from 'express'
import { inngest } from '@/core/inngest-client/clients'
import { updateLatestModelTraining } from '@/core/supabase'
import { NotificationService } from '@/services'
import { getTrainingWithUser } from '@/core/supabase/getTrainingWithUser'
import { logger } from '@utils/logger'

export class ReplicateWebhookController {
  private notificationService = new NotificationService()

  async handleWebhook(req: Request, res: Response) {
    try {
      const event = req.body
      logger.info({
        message: '🔔 Входящий вебхук от Replicate',
        predictionId: event.id,
        status: event.status,
      })

      // 🔒 Усиленная валидация
      if (!event.id || !event.status) {
        logger.warn({
          message: '⚠️ Получен некорректный вебхук',
          payload: JSON.stringify(event).substring(0, 500) + '...', // Ограничиваем вывод для логов
        })
        return res.status(400).json({ error: 'Missing required fields' })
      }

      logger.debug({
        message: '🔍 Поиск тренировки в базе данных',
        predictionId: event.id,
      })

      try {
        // Получаем данные о тренировке из базы
        const training = await getTrainingWithUser(event.id)

        // Проверяем результат
        if (!training || !training.users) {
          logger.error({
            message: '❌ Тренировка не найдена в базе данных',
            predictionId: event.id,
          })

          // Отвечаем успехом, чтобы Replicate не повторял запрос, но логируем ошибку
          return res.status(200).json({
            success: false,
            message: 'Training not found in database, but webhook acknowledged',
          })
        }

        logger.info({
          message: '✅ Тренировка найдена в базе данных',
          predictionId: event.id,
          telegram_id: training.users.telegram_id,
          model_name: training.model_name,
          status: event.status,
        })

        // 🔄 Обработка всех терминальных статусов
        const terminalStatuses = ['succeeded', 'failed', 'canceled']

        if (terminalStatuses.includes(event.status)) {
          await updateLatestModelTraining(
            training.users.telegram_id.toString(),
            training.model_name,
            {
              status: event.status.toUpperCase(),
              model_url: event.output?.weights || event.output?.model_url,
              error: event.error,
            },
            'replicate'
          )

          logger.info({
            message: '📝 Статус тренировки обновлен в базе данных',
            predictionId: event.id,
            telegram_id: training.users.telegram_id,
            model_name: training.model_name,
            status: event.status.toUpperCase(),
          })
        }

        // 🚨 Отправка ошибок только для реальных сбоев
        if (['failed', 'canceled'].includes(event.status)) {
          try {
            await this.notificationService.sendTrainingError(
              training.users.telegram_id.toString(),
              training.users.bot_name,
              event.error || 'Unknown error'
            )
            logger.info({
              message: '🚨 Отправлено уведомление об ошибке',
              predictionId: event.id,
              telegram_id: training.users.telegram_id,
            })
          } catch (notifyError) {
            logger.error({
              message: '❌ Ошибка отправки уведомления об ошибке',
              error: notifyError.message,
              telegram_id: training.users.telegram_id,
            })
          }
        }

        if (event.status === 'succeeded') {
          try {
            await this.notificationService.sendSuccessNotification(
              training.users.telegram_id.toString(),
              training.users.bot_name,
              training.users.language_code === 'ru'
            )
            logger.info({
              message: '🎉 Отправлено уведомление об успехе',
              predictionId: event.id,
              telegram_id: training.users.telegram_id,
            })
          } catch (notifyError) {
            logger.error({
              message: '❌ Ошибка отправки уведомления об успехе',
              error: notifyError.message,
              telegram_id: training.users.telegram_id,
            })
          }
        }

        // 🚀 Отправка события в Inngest
        await inngest.send({
          name: 'model/training.completed',
          data: {
            training_id: event.id,
            telegram_id: training.users.telegram_id.toString(),
            model_name: training.model_name,
            status: event.status,
            is_terminal: terminalStatuses.includes(event.status),
            metadata: {
              ...(event.metadata || {}),
              bot_name: training.users.bot_name,
            },
            error: event.error,
            output: event.output,
          },
        })

        logger.info({
          message: '🚀 Отправлено событие в Inngest',
          event_name: 'model/training.completed',
          predictionId: event.id,
          status: event.status,
        })

        res.status(200).json({ success: true })
      } catch (dbError) {
        logger.error({
          message: '❌ Ошибка запроса к базе данных',
          error: dbError.message,
          stack: dbError.stack,
          predictionId: event.id,
        })

        // При ошибке БД все равно отвечаем 200, чтобы Replicate не повторял запрос
        return res.status(200).json({
          success: false,
          message: 'Database error, but webhook acknowledged',
        })
      }
    } catch (error) {
      logger.error({
        message: '❌ Критическая ошибка при обработке вебхука',
        error: error.message,
        stack: error.stack,
        request_id: req.headers['x-request-id'],
      })

      // Даже при критической ошибке отвечаем 200, чтобы избежать повторных запросов
      res.status(200).json({
        success: false,
        message: 'Critical error but webhook acknowledged',
        request_id: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      })
    }
  }
}
