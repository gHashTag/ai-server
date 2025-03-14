import { Request, Response } from 'express'
import { inngest } from '@/core/inngest-client/clients'
import { updateLatestModelTraining } from '@/core/supabase'

export class ReplicateWebhookController {
  async handleWebhook(req: Request, res: Response) {
    try {
      const event = req.body

      // 🎯 Основные этапы обработки:
      // 1. Отправка события в Inngest для дальнейшей обработки
      await inngest.send({
        name: 'model.training.completed',
        data: {
          training_id: event.id,
          status: event.status,
          error: event.error,
          output: event.output,
          metadata: event.metadata,
        },
      })

      // 2. Синхронное обновление статуса в БД
      if (event.status === 'succeeded') {
        await updateLatestModelTraining(
          event.metadata.telegram_id,
          event.metadata.model_name,
          {
            status: 'SUCCESS',
            model_url: event.output?.model_url,
          },
          'replicate'
        )
      }

      // 3. Отправка подтверждения Replicate
      res.status(200).json({ success: true })
    } catch (error) {
      console.error('❌ Webhook Error:', error)
      res.status(500).json({ error: error.message })
    }
  }
}
