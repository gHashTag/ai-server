import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

import { GenerationControllerZod } from '@/controllers/generation.controller.zod'
import {
  zodBodyValidation,
  zodFileValidation,
} from '@/middlewares/zod.middleware'

// Импортируем Zod схемы для валидации
import {
  textToImageRequestSchema,
  neuroPhotoRequestSchema,
  neuroPhotoV2RequestSchema,
  textToSpeechRequestSchema,
  textToVideoRequestSchema,
  imageToVideoRequestSchema,
  imageToPromptRequestSchema,
  createAvatarVoiceRequestSchema,
  createModelTrainingRequestSchema,
  createLipSyncRequestSchema,
  neuroPhotoSyncRequestSchema,
} from '@/schemas/api/generation.schemas'

/**
 * Новые маршруты с полной Zod валидацией
 * Заменяют старые маршруты с ручной валидацией
 */
class GenerationZodRoutes {
  public path = '/generate'
  public router = Router()
  public generationController = new GenerationControllerZod()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    // === TEXT TO IMAGE ===
    this.router.post(
      `${this.path}/text-to-image`,
      zodBodyValidation(textToImageRequestSchema), // Zod валидация
      this.generationController.textToImage
    )

    // === NEURO PHOTO ===
    this.router.post(
      `${this.path}/neuro-photo`,
      zodBodyValidation(neuroPhotoRequestSchema), // Zod валидация
      this.generationController.neuroPhoto
    )

    // === NEURO PHOTO V2 ===
    this.router.post(
      `${this.path}/neuro-photo-v2`,
      zodBodyValidation(neuroPhotoV2RequestSchema), // Zod валидация
      this.generationController.neuroPhotoV2
    )

    // === TEXT TO SPEECH ===
    this.router.post(
      `${this.path}/text-to-speech`,
      zodBodyValidation(textToSpeechRequestSchema), // Zod валидация
      this.generationController.textToSpeech
    )

    // === TEXT TO VIDEO ===
    this.router.post(
      `${this.path}/text-to-video`,
      zodBodyValidation(textToVideoRequestSchema), // Zod валидация
      this.generationController.textToVideo
    )

    // === IMAGE TO VIDEO ===
    this.router.post(
      `${this.path}/image-to-video`,
      zodBodyValidation(imageToVideoRequestSchema), // Zod валидация с поддержкой морфинга
      this.generationController.imageToVideo
    )

    // === IMAGE TO PROMPT ===
    this.router.post(
      `${this.path}/image-to-prompt`,
      zodBodyValidation(imageToPromptRequestSchema), // Zod валидация
      this.generationController.imageToPrompt
    )

    // === CREATE AVATAR VOICE ===
    this.router.post(
      `${this.path}/create-avatar-voice`,
      zodBodyValidation(createAvatarVoiceRequestSchema), // Zod валидация
      this.generationController.createAvatarVoice
    )

    // === CREATE MODEL TRAINING ===
    this.router.post(
      `${this.path}/create-model-training`,
      this.createMulterMiddleware('model-training'), // Multer для файлов
      zodBodyValidation(createModelTrainingRequestSchema), // Zod валидация body
      zodFileValidation(
        ['zipUrl'],
        ['application/zip', 'application/x-zip-compressed']
      ), // Zod валидация файлов
      this.generationController.createModelTraining
    )

    // === CREATE LIP SYNC ===
    this.router.post(
      `${this.path}/create-lip-sync`,
      this.createMulterMiddleware('lip-sync'), // Multer для файлов
      zodBodyValidation(createLipSyncRequestSchema), // Zod валидация body
      zodFileValidation(
        ['video', 'audio'],
        ['video/mp4', 'video/avi', 'audio/mp3', 'audio/wav']
      ), // Zod валидация файлов
      this.generationController.createLipSync
    )

    // === NEURO PHOTO SYNC (для MCP) ===
    this.router.post(
      `${this.path}/neuro-photo-sync`,
      zodBodyValidation(neuroPhotoSyncRequestSchema), // Zod валидация
      this.generationController.neuroPhotoSync
    )
  }

  /**
   * Создает Multer middleware для загрузки файлов
   * Автоматически создает папки для каждого пользователя
   */
  private createMulterMiddleware(uploadType: string) {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const telegramId = req.body.telegram_id
        if (!telegramId) {
          return cb(new Error('telegram_id is required for file upload'), '')
        }

        const uploadPath = path.join(
          __dirname,
          '../uploads',
          telegramId,
          uploadType
        )

        // Создаем папку если её нет
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true })
        }

        cb(null, uploadPath)
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
        const extension = path.extname(file.originalname)
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`)
      },
    })

    const fileFilter = (req: any, file: any, cb: any) => {
      // Базовая проверка типов файлов
      const allowedMimeTypes = {
        'model-training': ['application/zip', 'application/x-zip-compressed'],
        'lip-sync': [
          'video/mp4',
          'video/avi',
          'audio/mp3',
          'audio/wav',
          'audio/mpeg',
        ],
      }

      const allowed =
        allowedMimeTypes[uploadType as keyof typeof allowedMimeTypes] || []

      if (allowed.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`), false)
      }
    }

    const upload = multer({
      storage,
      fileFilter,
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
        files: uploadType === 'lip-sync' ? 2 : 1, // lip-sync принимает 2 файла
      },
    })

    // Возвращаем соответствующий middleware в зависимости от типа
    if (uploadType === 'model-training') {
      return upload.single('zipUrl') // Один файл с именем zipUrl
    } else if (uploadType === 'lip-sync') {
      return upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'audio', maxCount: 1 },
      ]) // Два файла: video и audio
    } else {
      return upload.any() // Любые файлы
    }
  }
}

export default GenerationZodRoutes
