import { Request, Response } from 'express'
import { createUserService } from '@/services'
import { inngest } from '@/core/inngest-client/clients'
import { shouldUseInngest } from '@/config'
import { logger } from '@/utils/logger'

export class UserController {
  public createUserHandler = async (req: Request, res: Response) => {
    try {
      const userData = req.body

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest
        logger.info({
          message: 'План А - Inngest для создания пользователя',
          telegramId: userData.telegram_id,
          username: userData.username,
          botName: userData.bot_name
        })

        await inngest.send({
          name: 'user/create.start',
          data: {
            ...userData,
            idempotencyKey: `user:${userData.telegram_id}:${Date.now()}`,
          },
        })

        res.status(200).json({ 
          message: 'User creation started via Inngest',
          telegramId: userData.telegram_id
        })
      } else {
        // План Б - Оригинальный сервис
        logger.info({
          message: 'План Б - Оригинальный сервис для создания пользователя',
          telegramId: userData.telegram_id,
          username: userData.username,
          botName: userData.bot_name
        })

        const result = await createUserService(userData)
        res.status(200).json(result)
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  }
}
