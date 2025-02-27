import { Router, Request, Response } from 'express'
import { NexrenderController } from '@controllers/nexrender.controller'

export class NexrenderRoute {
  public path = '/create-job'
  public router: Router = Router()
  public nexrenderController = new NexrenderController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(this.path, (req: Request, res: Response) =>
      this.nexrenderController.createRenderJob(req, res)
    )
  }
}
