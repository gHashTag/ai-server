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

      // 🔒 Усиленная валидация
      if (!event.id || !event.status || !event.metadata?.telegram_id) {
        console.warn(
          `⚠️ Invalid webhook payload: ${JSON.stringify(event, null, 2)}`
        )
        return res.status(400).json({ error: 'Missing required fields' })
      }

      const training = await getTrainingWithUser(event.id)
      if (!training?.users) {
        console.error(`❌ Training not found for ID: ${event.id}`)
        return res.status(404).end()
      }

      // 🚨 Проверка соответствия telegram_id
      if (training.users.telegram_id !== event.metadata.telegram_id) {
        console.error(
          `🚫 ID mismatch: DB ${training.users.telegram_id} vs Webhook ${event.metadata.telegram_id}`
        )
        return res.status(403).end()
      }

      console.log(
        `🔄 [Bot: ${training.users.bot_name}] Processing ${event.status} for ${event.id}`
      )

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
