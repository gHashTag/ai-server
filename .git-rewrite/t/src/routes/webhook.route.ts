import { Router } from 'express'
import { WebhookController } from '@/controllers/webhook.controller'
import { Routes } from '@/interfaces/routes.interface'

export class WebhookRoute implements Routes {
  public path = '/webhooks'
  public router: Router
  public webhookController = new WebhookController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/synclabs-video`,
      this.webhookController.handleSyncLabsWebhook
    )
  }
}
