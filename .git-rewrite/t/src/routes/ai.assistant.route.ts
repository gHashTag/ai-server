import { AiAssistantController } from '@/controllers/aiAssistant.controller'
import { Router, Request, Response } from 'express'
import { Routes } from '@/interfaces'
import multer from 'multer'

const upload = multer()

export class AiAssistantRoute implements Routes {
  public path = '/ai-assistant'
  public router: Router
  public aiAssistantController = new AiAssistantController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/ai-response`,
      upload.none(), // Используйте multer для обработки файлов, если необходимо
      (req: Request, res: Response) =>
        this.aiAssistantController.getAiResponse(req, res)
    )
  }
}
