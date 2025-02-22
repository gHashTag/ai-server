import { Request, Response } from 'express'
import { updateLatestModelTraining } from '@/core/supabase'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { BOT_TOKENS } from '@/config'

const bots = BOT_TOKENS.map(token => new Telegraf<MyContext>(token))

export class WebhookBFLController {
  public async handleWebhookBFL(req: Request, res: Response): Promise<void> {
    try {
      //   const { id, status, error } = req.body
      console.log('Webhook received:', req.body)

      //   const bot = bots.find(bot => bot.token === token)
      //   if (!bot) {
      //     res.status(403).json({ message: 'Unauthorized' })
      //     return
      //   }

      //   // Обновляем статус тренировки в базе данных
      //   await updateLatestModelTraining(id, { status, error })

      //   if (status === 'succeeded') {
      //     bot.telegram.sendMessage(id, '🎉 Training completed successfully!')
      //   } else if (status === 'failed') {
      //     bot.telegram.sendMessage(id, `❌ Training failed: ${error}`)
      //   }

      res.status(200).json({ message: 'Webhook processed successfully' })
    } catch (error) {
      console.error('Error processing webhook:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
