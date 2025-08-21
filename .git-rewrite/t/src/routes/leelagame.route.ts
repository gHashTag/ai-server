import { GameController } from '@/controllers'
import { Router } from 'express'
import { Routes } from '@/interfaces'

export class GameRoute implements Routes {
  public path = '/game'
  public router: Router
  public gameController = new GameController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/game-step`,
      this.gameController.handleGameStep
    )
  }
}
