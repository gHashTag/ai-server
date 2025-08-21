import { CreateTasksController } from '@/controllers'
import { Router } from 'express'
import { Routes } from '@/interfaces'

export class CreateTasksRoute implements Routes {
  public path = '/create-tasks'
  public router: Router
  public createTasksController = new CreateTasksController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/create-tasks`,
      this.createTasksController.createTasks
    )
  }
}
