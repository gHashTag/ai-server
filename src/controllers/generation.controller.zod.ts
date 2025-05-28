import { Request, Response, NextFunction } from 'express'
import { generateTextToImage } from '@/services/generateTextToImage'
import { generateSpeech } from '@/services/generateSpeech'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { generateNeuroImage } from '@/services/generateNeuroImage'
import { generateNeuroImageV2 } from '@/services/generateNeuroImageV2'
import { generateLipSync } from '@/services/generateLipSync'
import { generateModelTraining } from '@/services/generateModelTraining'

import { API_URL } from '@/config'
import { deleteFile } from '@/helpers'
import path from 'path'
import { getBotByName } from '@/core/bot'
import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'

// Импортируем Zod схемы и типы
import {
  TextToImageRequest,
  NeuroPhotoRequest,
  NeuroPhotoV2Request,
  TextToSpeechRequest,
  TextToVideoRequest,
  ImageToVideoRequest,
  ImageToPromptRequest,
  CreateAvatarVoiceRequest,
  CreateModelTrainingRequest,
  CreateLipSyncRequest,
  NeuroPhotoSyncRequest,
} from '@/schemas/api/generation.schemas'

/**
 * Новая версия Generation Controller с полной Zod валидацией
 * Заменяет старый контроллер с ручной валидацией
 */
export class GenerationControllerZod {
  /**
   * Text to Image генерация с Zod валидацией
   * Заменяет ручные проверки if (!prompt) на автоматическую валидацию
   */
  public textToImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // req.body уже валидирован Zod middleware
      const validatedData = req.body as TextToImageRequest

      logger.info('🎨 Text-to-Image запрос валидирован', {
        description: 'Text-to-Image request validated',
        telegram_id: validatedData.telegram_id,
        prompt: validatedData.prompt.substring(0, 50) + '...',
        model: validatedData.model,
        num_images: validatedData.num_images,
      })

      res.status(200).json({ message: 'Processing started' })

      const { bot } = getBotByName(validatedData.bot_name)

      await generateTextToImage(
        validatedData.prompt,
        validatedData.model,
        validatedData.num_images,
        validatedData.telegram_id,
        validatedData.username,
        validatedData.is_ru,
        bot,
        validatedData.bot_name
      )
    } catch (error) {
      logger.error('❌ Ошибка в textToImage контроллере', {
        description: 'Error in textToImage controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Neuro Photo генерация с Zod валидацией
   */
  public neuroPhoto = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as NeuroPhotoRequest

      logger.info('🖼️ Neuro Photo запрос валидирован', {
        description: 'Neuro Photo request validated',
        telegram_id: validatedData.telegram_id,
        model_url: validatedData.model_url,
        gender: validatedData.gender,
        num_images: validatedData.num_images,
      })

      res.status(200).json({ message: 'Processing started' })

      const { bot } = getBotByName(validatedData.bot_name)

      await generateNeuroImage(
        validatedData.prompt,
        validatedData.model_url as
          | `${string}/${string}`
          | `${string}/${string}:${string}`,
        validatedData.num_images,
        validatedData.telegram_id,
        validatedData.username,
        validatedData.is_ru,
        validatedData.bot_name,
        validatedData.gender
      )
    } catch (error) {
      logger.error('❌ Ошибка в neuroPhoto контроллере', {
        description: 'Error in neuroPhoto controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Neuro Photo V2 генерация с Zod валидацией
   */
  public neuroPhotoV2 = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as NeuroPhotoV2Request

      logger.info('🖼️ Neuro Photo V2 запрос валидирован', {
        description: 'Neuro Photo V2 request validated',
        telegram_id: validatedData.telegram_id,
        gender: validatedData.gender,
        num_images: validatedData.num_images,
      })

      res.status(200).json({ message: 'Processing started' })

      generateNeuroImageV2(
        validatedData.prompt,
        validatedData.num_images,
        validatedData.telegram_id,
        validatedData.is_ru,
        validatedData.bot_name,
        validatedData.gender
      ).catch(error => {
        logger.error('❌ Ошибка при генерации изображения V2', {
          description: 'Error in image generation V2',
          error: error instanceof Error ? error.message : String(error),
          telegram_id: validatedData.telegram_id,
        })
      })
    } catch (error) {
      logger.error('❌ Ошибка в neuroPhotoV2 контроллере', {
        description: 'Error in neuroPhotoV2 controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Text to Speech с Zod валидацией
   */
  public textToSpeech = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as TextToSpeechRequest

      logger.info('🎤 Text-to-Speech запрос валидирован', {
        description: 'Text-to-Speech request validated',
        telegram_id: validatedData.telegram_id,
        voice_id: validatedData.voice_id,
        text_length: validatedData.text.length,
      })

      res.status(200).json({ message: 'Processing started' })

      const { bot } = getBotByName(validatedData.bot_name)

      await generateSpeech({
        text: validatedData.text,
        voice_id: validatedData.voice_id,
        telegram_id: validatedData.telegram_id,
        is_ru: validatedData.is_ru,
        bot,
        bot_name: validatedData.bot_name,
      })
    } catch (error) {
      logger.error('❌ Ошибка в textToSpeech контроллере', {
        description: 'Error in textToSpeech controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Text to Video с Zod валидацией
   */
  public textToVideo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as TextToVideoRequest

      logger.info('🎬 Text-to-Video запрос валидирован', {
        description: 'Text-to-Video request validated',
        telegram_id: validatedData.telegram_id,
        videoModel: validatedData.videoModel,
        prompt: validatedData.prompt.substring(0, 50) + '...',
      })

      res.status(200).json({ message: 'Processing started' })

      await generateTextToVideo(
        validatedData.prompt,
        validatedData.videoModel,
        validatedData.telegram_id,
        validatedData.username,
        validatedData.is_ru,
        validatedData.bot_name
      )
    } catch (error) {
      logger.error('❌ Ошибка в textToVideo контроллере', {
        description: 'Error in textToVideo controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Image to Video с Zod валидацией (поддерживает морфинг)
   */
  public imageToVideo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as ImageToVideoRequest

      logger.info('🎬 Image-to-Video запрос валидирован', {
        description: 'Image-to-Video request validated',
        telegram_id: validatedData.telegram_id,
        videoModel: validatedData.videoModel,
        is_morphing: validatedData.is_morphing || false,
        imageUrl: validatedData.imageUrl,
        imageAUrl: validatedData.imageAUrl,
        imageBUrl: validatedData.imageBUrl,
      })

      res.status(202).json({ message: 'Request accepted, processing started.' })

      await generateImageToVideo(
        validatedData.imageUrl,
        validatedData.prompt,
        validatedData.videoModel,
        validatedData.telegram_id,
        validatedData.username,
        validatedData.is_ru,
        validatedData.bot_name,
        validatedData.is_morphing || false,
        validatedData.imageAUrl,
        validatedData.imageBUrl
      )
    } catch (error) {
      logger.error('❌ Ошибка в imageToVideo контроллере', {
        description: 'Error in imageToVideo controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Image to Prompt с Zod валидацией
   */
  public imageToPrompt = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as ImageToPromptRequest

      logger.info('🔍 Image-to-Prompt запрос валидирован', {
        description: 'Image-to-Prompt request validated',
        telegram_id: validatedData.telegram_id,
        image: validatedData.image,
      })

      res.status(200).json({ message: 'Processing started' })

      const { bot } = getBotByName(validatedData.bot_name)

      generateImageToPrompt(
        validatedData.image,
        validatedData.telegram_id,
        validatedData.username,
        validatedData.is_ru,
        bot,
        validatedData.bot_name
      )
    } catch (error) {
      logger.error('❌ Ошибка в imageToPrompt контроллере', {
        description: 'Error in imageToPrompt controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Create Avatar Voice с Zod валидацией
   */
  public createAvatarVoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as CreateAvatarVoiceRequest

      logger.info('🎙️ Create Avatar Voice запрос валидирован', {
        description: 'Create Avatar Voice request validated',
        telegram_id: validatedData.telegram_id,
        fileUrl: validatedData.fileUrl,
      })

      res.status(200).json({ message: 'Voice creation started' })

      const { bot } = getBotByName(validatedData.bot_name)

      createVoiceAvatar(
        validatedData.fileUrl,
        validatedData.telegram_id,
        validatedData.username,
        validatedData.is_ru,
        bot
      )
    } catch (error) {
      logger.error('❌ Ошибка в createAvatarVoice контроллере', {
        description: 'Error in createAvatarVoice controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Create Model Training с Zod валидацией
   * Файл обрабатывается через multer middleware
   */
  public createModelTraining = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as CreateModelTrainingRequest

      logger.info('🤖 Create Model Training запрос валидирован', {
        description: 'Create Model Training request validated',
        telegram_id: validatedData.telegram_id,
        modelName: validatedData.modelName,
        triggerWord: validatedData.triggerWord,
        steps: validatedData.steps,
        gender: validatedData.gender,
      })

      // Проверяем наличие файла (обработанного multer)
      const zipFile = req.file
      if (!zipFile || zipFile.fieldname !== 'zipUrl') {
        logger.error('❌ Файл zipUrl отсутствует', {
          description: 'zipUrl file missing',
          receivedFile: req.file,
          telegram_id: validatedData.telegram_id,
        })
        res
          .status(400)
          .json({ message: "zipFile with fieldname 'zipUrl' is required" })
        return
      }

      const zipUrl = `https://${req.headers.host}/uploads/${validatedData.telegram_id}/${validatedData.type}/${zipFile.filename}`

      logger.info('📁 Файл для тренировки обработан', {
        description: 'Training file processed',
        zipUrl,
        filename: zipFile.filename,
        telegram_id: validatedData.telegram_id,
      })

      res.status(200).json({ message: 'Model training started' })

      const { bot } = getBotByName(validatedData.bot_name)

      await generateModelTraining(
        zipUrl,
        validatedData.triggerWord,
        validatedData.modelName,
        validatedData.steps,
        validatedData.telegram_id,
        validatedData.is_ru,
        bot,
        validatedData.bot_name,
        validatedData.gender
      )
    } catch (error) {
      logger.error('❌ Ошибка в createModelTraining контроллере', {
        description: 'Error in createModelTraining controller',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        body: req.body,
        file: req.file,
        telegram_id: req.body?.telegram_id,
      })

      if (!res.headersSent) {
        next(error)
      }
    }
  }

  /**
   * Create Lip Sync с Zod валидацией
   * Файлы обрабатываются через multer middleware
   */
  public createLipSync = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as CreateLipSyncRequest

      logger.info('💋 Create Lip Sync запрос валидирован', {
        description: 'Create Lip Sync request validated',
        telegram_id: validatedData.telegram_id,
        type: validatedData.type,
      })

      // Проверяем наличие файлов (обработанных multer)
      const videoFile = Array.isArray(req.files)
        ? req.files.find(file => file.fieldname === 'video')
        : req.files?.['video']

      const audioFile = Array.isArray(req.files)
        ? req.files.find(file => file.fieldname === 'audio')
        : req.files?.['audio']

      if (!videoFile) {
        res.status(400).json({ message: 'videoFile is required' })
        return
      }

      if (!audioFile) {
        res.status(400).json({ message: 'audioFile is required' })
        return
      }

      const video = `${API_URL}/uploads/${validatedData.telegram_id}/lip-sync/${videoFile.filename}`
      const audio = `${API_URL}/uploads/${validatedData.telegram_id}/lip-sync/${audioFile.filename}`

      logger.info('📁 Файлы для Lip Sync обработаны', {
        description: 'Lip Sync files processed',
        video,
        audio,
        telegram_id: validatedData.telegram_id,
      })

      const lipSyncResponse = await generateLipSync(
        validatedData.telegram_id,
        video,
        audio,
        validatedData.is_ru
      )

      // Удаляем временные файлы
      const videoLocalPath = path.join(
        __dirname,
        '../uploads',
        validatedData.telegram_id,
        'lip-sync',
        videoFile.filename
      )
      const audioLocalPath = path.join(
        __dirname,
        '../uploads',
        validatedData.telegram_id,
        'lip-sync',
        audioFile.filename
      )

      await deleteFile(videoLocalPath)
      await deleteFile(audioLocalPath)

      res.status(200).json(lipSyncResponse)
    } catch (error) {
      logger.error('❌ Ошибка в createLipSync контроллере', {
        description: 'Error in createLipSync controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }

  /**
   * Neuro Photo Sync (для MCP) с Zod валидацией
   */
  public neuroPhotoSync = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validatedData = req.body as NeuroPhotoSyncRequest

      logger.info('🔄 MCP Neuro Photo Sync запрос валидирован', {
        description: 'MCP Neuro Photo Sync request validated',
        telegram_id: validatedData.telegram_id,
        model_url: validatedData.model_url,
      })

      // Синхронная генерация - ждем результат
      const result = await generateNeuroImage(
        validatedData.prompt,
        validatedData.model_url as
          | `${string}/${string}`
          | `${string}/${string}:${string}`,
        validatedData.num_images,
        validatedData.telegram_id,
        validatedData.username || `mcp_user_${validatedData.telegram_id}`,
        validatedData.is_ru,
        validatedData.bot_name
      )

      if (result && result.length > 0) {
        res.status(200).json({
          success: true,
          message: 'Нейрофото успешно сгенерировано',
          images: result.map(img => ({
            url: img.image,
            prompt_id: img.prompt_id,
          })),
          count: result.length,
        })
      } else {
        res.status(500).json({
          success: false,
          message: 'Не удалось сгенерировать изображения',
        })
      }
    } catch (error) {
      logger.error('❌ Ошибка в neuroPhotoSync контроллере', {
        description: 'Error in neuroPhotoSync controller',
        error: error instanceof Error ? error.message : String(error),
        telegram_id: req.body?.telegram_id,
      })
      next(error)
    }
  }
}
