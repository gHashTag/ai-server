// src/routes/bot.route.ts
import { Router } from 'express'
import { BotController } from '@/controllers'
import { BotService } from '@/services/bot.service'

export class BotRoute {
  public path = '/webhook'
  public router: Router = Router()
  private botController: BotController

  constructor(botService: BotService) {
    this.botController = new BotController(botService)
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(this.path, this.botController.handleWebhook)
  }
}
