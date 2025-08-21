import { Router } from 'express'
import { VideoController } from '@/controllers/video.controller'

export class VideoRoute {
  public path = '/video'
  public router: Router = Router()
  private videoController = new VideoController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(`${this.path}/upload`, this.videoController.uploadVideo)
  }
}
