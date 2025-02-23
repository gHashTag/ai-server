import { Router } from 'express'
import { GenerationController } from '@controllers/generation.controller'
import { GenerationControllerV2 } from '@controllers/generation.controllerV2'
import { Routes } from '@interfaces/routes.interface'

export class GenerationRoute implements Routes {
  public path = '/generate'
  public router: Router
  public generationController = new GenerationController()
  public generationControllerV2 = new GenerationControllerV2()

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
      `${this.path}/create-avatar-voice`,
      this.generationController.createAvatarVoice
    )
    this.router.post(
      `${this.path}/create-model-training`,
      this.generationController.createModelTraining
    )
    this.router.post(
      `${this.path}/create-model-training-v2`,
      this.generationControllerV2.createModelTrainingV2
    )
    this.router.post(
      `${this.path}/create-lip-sync`,
      this.generationController.createLipSync
    )
  }
}
