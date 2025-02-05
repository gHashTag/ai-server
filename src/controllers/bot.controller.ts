// src/controllers/bot.controller.ts
import { Request, Response } from 'express'
import { BotService } from '@/services/bot.service'

export class BotController {
  private botService: BotService

  constructor(botService: BotService) {
    this.botService = botService
  }

  public handleWebhook = (req: Request, res: Response): void => {
    try {
      const update = req.body
      this.botService.handleUpdate(update)
      res.sendStatus(200)
    } catch (error) {
      console.error('Ошибка при обработке вебхука:', error)
      res.status(500).send('Internal Server Error')
    }
  }
}
