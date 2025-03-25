import { Router } from 'express'
import { broadcastController } from '@/controllers'

export class BroadcastRoute {
  public path = '/broadcast'
  public router: Router = Router()
  public broadcastController = broadcastController

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(this.path, this.broadcastController.sendBroadcast)
    this.router.get(
      `${this.path}/check-bots`,
      this.broadcastController.checkBots
    )
    this.router.get(
      `${this.path}/check-owner`,
      this.broadcastController.checkOwnerStatus
    )
    this.router.post(
      `${this.path}/add-owner`,
      this.broadcastController.addBotOwner
    )
  }
}
