import { Router } from 'express'

import { UploadController } from '@/controllers/upload.controller'
import { fileUpload } from '@/utils/fileUpload'
export class UploadRoute {
  public path = '/upload'
  public router: Router = Router()
  private uploadController = new UploadController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      this.path,
      fileUpload.single('file'),
      this.uploadController.uploadFile
    )
  }
}
