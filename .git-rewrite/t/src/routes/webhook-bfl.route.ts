import { Router } from 'express'
import { WebhookBFLController } from '@/controllers/webhook-bfl.controllers'
import { Routes } from '@/interfaces/routes.interface'

export class WebhookBFLRoute implements Routes {
  public path = '/webhooks'
  public router: Router
  public webhookController = new WebhookBFLController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/webhook-bfl`,
      this.webhookController.handleWebhookBFL
    )
  }
}
