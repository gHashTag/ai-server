import { Router } from 'express'
import { handleRoomRequest } from '@controllers/roomController'

export class RoomRoute {
  public path = '/room'
  public router: Router = Router()
  public roomController = handleRoomRequest

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(this.path, this.roomController)
  }
}
