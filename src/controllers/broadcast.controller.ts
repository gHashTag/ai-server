import { Request, Response, NextFunction } from 'express'
import { broadcastService } from '../services'
import { inngest } from '@/core/inngest-client/clients'
import { shouldUseInngest } from '@/config'
import { logger } from '@/utils/logger'

export const broadcastController = {
  sendBroadcast: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { imageUrl, text } = req.body
      if (!imageUrl || !text) {
        return res
          .status(400)
          .json({ message: 'Image URL and text are required' })
      }

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest
        logger.info({
          message: 'План А - Inngest для массовой рассылки',
          imageUrl: imageUrl.substring(0, 100),
          textLength: text.length
        })

        await inngest.send({
          name: 'broadcast/message.start',
          data: {
            imageUrl,
            text,
            batchSize: 50,
            delayBetweenBatches: 1000,
            idempotencyKey: `broadcast:${Date.now()}`,
          },
        })

        res.status(200).json({ message: 'Broadcast processing started via Inngest' })
      } else {
        // План Б - Оригинальный сервис
        logger.info({
          message: 'План Б - Оригинальный сервис для массовой рассылки',
          imageUrl: imageUrl.substring(0, 100),
          textLength: text.length
        })

        await broadcastService.sendToAllUsers(imageUrl, text)
        res.status(200).json({ message: 'Broadcast sent successfully' })
      }
    } catch (error) {
      next(error)
    }
  },
}
