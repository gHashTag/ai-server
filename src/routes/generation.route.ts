import { Router } from 'express'
import { GenerationController } from '@controllers/generation.controller'
import { Routes } from '@interfaces/routes.interface'
import { fileUpload } from '@/utils/fileUpload'

export class GenerationRoute implements Routes {
  public path = '/generate'
  public router: Router
  public generationController = new GenerationController()

  constructor() {
    this.router = Router()
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.post(
      `${this.path}/text-to-image`,
      this.generationController.textToImage
    )
    this.router.post(
      `${this.path}/text-to-speech`,
      this.generationController.textToSpeech
    )
    this.router.post(
      `${this.path}/text-to-video`,
      this.generationController.textToVideo
    )
    this.router.post(
      `${this.path}/image-to-video`,
      this.generationController.imageToVideo
    )
    this.router.post(
      `${this.path}/image-to-prompt`,
      this.generationController.imageToPrompt
    )
    this.router.post(
      `${this.path}/neuro-photo`,
      this.generationController.neuroPhoto
    )
    this.router.post(
      `${this.path}/neuro-photo-v2`,
      this.generationController.neuroPhotoV2
    )
    this.router.post(
      `${this.path}/create-avatar-voice`,
      this.generationController.createAvatarVoice
    )
    this.router.post(
      `${this.path}/create-model-training`,
      fileUpload.single('zipUrl'),
      this.generationController.createModelTraining
    )
    this.router.post(
      `${this.path}/create-model-training-v2`,
      this.generationController.createModelTrainingV2
    )
    this.router.post(
      `${this.path}/create-lip-sync`,
      this.generationController.createLipSync
    )
  }
}
