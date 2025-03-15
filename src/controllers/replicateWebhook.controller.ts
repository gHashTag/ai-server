import { Request, Response } from 'express'
import { inngest } from '@/core/inngest-client/clients'
import { updateLatestModelTraining } from '@/core/supabase'
import { NotificationService } from '@/services'
import { getTrainingWithUser } from '@/core/supabase/getTrainingWithUser'
export class ReplicateWebhookController {
  private notificationService = new NotificationService()

  async handleWebhook(req: Request, res: Response) {
    try {
      const event = req.body
      console.log('🔄 Получен вебхук', event)

      // 🔒 Усиленная валидация
      if (!event.id || !event.status) {
        console.warn(
          `⚠️ Invalid webhook payload: ${JSON.stringify(event, null, 2)}`
        )
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const training = await getTrainingWithUser(event.id)
      console.log('🔄 Полученная тренировка', training)
      if (!training?.users) {
        console.error(`❌ Training not found for ID: ${event.id}`)
        return res.status(404).end()
      }

      // 🔄 Обработка всех терминальных статусов
      const terminalStatuses = ['succeeded', 'failed', 'canceled']

      if (terminalStatuses.includes(event.status)) {
        await updateLatestModelTraining(
          training.users.telegram_id.toString(),
          training.model_name, // Используем model_name из БД
          {
            status: event.status.toUpperCase(),
            model_url: event.output?.model_url,
            error: event.error,
          },
          'replicate'
        )
      }

      // 🚨 Отправка ошибок только для реальных сбоев
      if (['failed', 'canceled'].includes(event.status)) {
        await this.notificationService.sendTrainingError(
          training.users.telegram_id.toString(), // Берем из БД, а не из вебхука
          training.users.bot_name,
          event.error || 'Unknown error'
        )
      }

      if (event.status === 'succeeded') {
        await this.notificationService.sendSuccessNotification(
          training.users.telegram_id.toString(), // Берем из БД, а не из вебхука
          training.users.bot_name,
          training.users.language_code === 'ru'
        )
      }

      // 🚀 Отправка события в Inngest
      await inngest.send({
        name: 'model/training.completed',
        data: {
          training_id: event.id,
          status: event.status,
          is_terminal: terminalStatuses.includes(event.status),
          metadata: {
            ...event.metadata,
            bot_name: training.users.bot_name, // Добавляем имя бота в метаданные
          },
          error: event.error,
          output: event.output,
        },
      })

      res.status(200).json({ success: true })
    } catch (error) {
      console.error(`❌ Critical webhook error: ${error.stack}`)
      res.status(500).json({
        error: 'Internal server error',
        request_id: req.headers['x-request-id'],
        timestamp: new Date().toISOString(),
      })
    }
  }
}
