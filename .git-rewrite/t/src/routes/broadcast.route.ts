import { Router } from 'express'
import { Routes } from '@interfaces/routes.interface'
import { broadcastController } from '@/controllers/broadcast.controller'

export class BroadcastRoute implements Routes {
  public path = '/broadcast'
  public router: Router = Router()
  public broadcastController = broadcastController

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(this.path, this.broadcastController.createBroadcastTask)
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
