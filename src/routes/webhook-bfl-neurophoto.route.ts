import { Router } from 'express'
import { WebhookBFLNeurophotoController } from '@/controllers'
import { Routes } from '@/interfaces/routes.interface'

export class WebhookBFLNeurophotoRoute implements Routes {
  public path = '/webhooks'
  public router: Router
  public webhookController = new WebhookBFLNeurophotoController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/webhook-bfl-neurophoto`,
      this.webhookController.handleWebhookNeurophoto
    )
  }
}
