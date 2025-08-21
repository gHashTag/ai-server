import { Request, Response } from 'express'
import { notifyTrainingSuccess } from '@/core/supabase/notifyTrainingSuccess'
import { logger } from '@/utils/logger'
export class WebhookBFLController {
  public async handleWebhookBFL(req: Request, res: Response): Promise<void> {
    try {
      const { task_id, status, result } = req.body

      logger.info({
        message: '🌐 Webhook received',
        task_id,
        status,
        result,
      })
      if (status === 'SUCCESS') {
        await notifyTrainingSuccess(task_id, status, result)
      }

      res.status(200).json({ message: 'Webhook processed successfully' })
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
