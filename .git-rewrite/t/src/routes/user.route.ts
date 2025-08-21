import { Router } from 'express'
import { UserController } from '@controllers/user.controller'
import { Routes } from '@/interfaces/routes.interface'

export class UserRoute implements Routes {
  public path = '/user'
  public router: Router
  public userController = new UserController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/create`,
      this.userController.createUserHandler
    )
  }
}
