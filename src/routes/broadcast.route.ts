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
  }
}
