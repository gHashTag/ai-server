import { Request, Response, NextFunction } from 'express'
import { generateTextToImage } from '@/services/generateTextToImage'
import { generateSpeech } from '@/services/generateSpeech'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { generateModelTraining } from '@/services/generateModelTraining'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'

import { validateUserParams } from '@/middlewares/validateUserParams'
import { generateNeuroImageV2 } from '@/services/generateNeuroImageV2'
import { generateLipSync } from '@/services/generateLipSync'

import { API_URL } from '@/config'
import { deleteFile } from '@/helpers'
import path from 'path'
import { getBotByName } from '@/core/bot'
import { inngest } from '@/core/inngest/clients'

export class GenerationController {
  public textToImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        prompt,
        model,
        num_images,
        telegram_id,
        username,
        is_ru,
        bot_name,
      } = req.body

      if (!prompt) {
        res.status(400).json({ message: 'prompt is required' })
        return
      }

      if (!model) {
        res.status(400).json({ message: 'model is required' })
        return
      }
      if (!num_images) {
        res.status(400).json({ message: 'num_images is required' })
        return
      }

      validateUserParams(req)
      res.status(200).json({ message: 'Processing started' })

      const { bot } = getBotByName(bot_name)

      await generateTextToImage(
        prompt,
        model,
        num_images,
        telegram_id,
        username,
        is_ru,
        bot,
        bot_name
      )
    } catch (error) {
      next(error)
    }
  }

  public neuroPhoto = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        prompt,
        model_url,
        num_images,
        telegram_id,
        username,
        is_ru,
        bot_name,
      } = req.body
      if (!prompt) {
        res.status(400).json({ message: 'prompt is required' })
        return
      }
      if (!model_url) {
        res.status(400).json({ message: 'model_url is required' })
        return
      }
      if (!num_images) {
        res.status(400).json({ message: 'num_images is required' })
        return
      }
      validateUserParams(req)
      res.status(200).json({ message: 'Processing started' })

      await inngest.send({
        name: 'neuro/photo.generate',
        data: {
          prompt,
          model_url,
          num_images,
          telegram_id,
          username,
          is_ru,
          bot_name,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  public neuroPhotoV2 = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { prompt, num_images, telegram_id, is_ru, bot_name } = req.body
      if (!prompt) {
        res.status(400).json({ message: 'prompt is required' })
        return
      }

      if (!num_images) {
        res.status(400).json({ message: 'num_images is required' })
        return
      }

      res.status(200).json({ message: 'Processing started' })

      generateNeuroImageV2(
        prompt,
        num_images,
        telegram_id,
        is_ru,
        bot_name
      ).catch(error => {
        console.error('Ошибка при генерации изображения:', error)
      })
    } catch (error) {
      next(error)
    }
  }

  public createAvatarVoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { fileUrl, telegram_id, username, is_ru, bot_name } = req.body

      if (!fileUrl) {
        res.status(400).json({ message: 'fileUrl is required' })
        return
      }

      validateUserParams(req)

      res.status(200).json({ message: 'Voice creation started' })

      const { bot } = getBotByName(bot_name)
      createVoiceAvatar(fileUrl, telegram_id, username, is_ru, bot)
    } catch (error) {
      next(error)
    }
  }

  public textToSpeech = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { text, voice_id, telegram_id, is_ru, bot_name } = req.body

      if (!text) {
        res.status(400).json({ message: 'Text is required' })
        return
      }
      if (!voice_id) {
        res.status(400).json({ message: 'Voice_id is required' })
        return
      }
      if (!telegram_id) {
        res.status(400).json({ message: 'Telegram_id is required' })
        return
      }
      if (!is_ru) {
        res.status(400).json({ message: 'Is_ru is required' })
        return
      }
      res.status(200).json({ message: 'Processing started' })

      const { bot } = getBotByName(bot_name)
      await generateSpeech({
        text,
        voice_id,
        telegram_id,
        is_ru,
        bot,
        bot_name,
      })
    } catch (error) {
      next(error)
    }
  }

  public textToVideo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { prompt, videoModel, telegram_id, username, is_ru, bot_name } =
        req.body

      console.log('videoModel', videoModel)
      if (!prompt) {
        res.status(400).json({ message: 'Prompt is required' })
        return
      }
      if (!videoModel) {
        res.status(400).json({ message: 'Video model is required' })
        return
      }

      validateUserParams(req)
      res.status(200).json({ message: 'Processing started' })

      await generateTextToVideo(
        prompt,
        videoModel,
        telegram_id,
        username,
        is_ru,
        bot_name
      )
    } catch (error) {
      next(error)
    }
  }

  public imageToVideo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        imageUrl,
        prompt,
        videoModel,
        telegram_id,
        username,
        is_ru,
        bot_name,
      } = req.body
      if (!imageUrl) {
        res.status(400).json({ message: 'Image is required' })
        return
      }
      if (!prompt) {
        res.status(400).json({ message: 'Prompt is required' })
        return
      }
      if (!videoModel) {
        res.status(400).json({ message: 'Model is required' })
        return
      }

      validateUserParams(req)
      res.status(200).json({ message: 'Processing started' })

      await generateImageToVideo(
        imageUrl,
        prompt,
        videoModel,
        telegram_id,
        username,
        is_ru,
        bot_name
      )
    } catch (error) {
      next(error)
    }
  }

  public imageToPrompt = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { image, telegram_id, username, is_ru, bot_name } = req.body

      if (!image) {
        res.status(400).json({ message: 'Image is required' })
        return
      }
      validateUserParams(req)
      res.status(200).json({ message: 'Processing started' })
      const { bot } = getBotByName(bot_name)

      generateImageToPrompt(image, telegram_id, username, is_ru, bot, bot_name)
    } catch (error) {
      next(error)
    }
  }

  public createModelTraining = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const {
      type,
      telegram_id,
      triggerWord,
      modelName,
      steps,
      is_ru,
      bot_name,
    } = req.body

    try {
      if (!type) throw new Error('type is required')
      if (!triggerWord) throw new Error('triggerWord is required')
      if (!modelName) throw new Error('modelName is required')
      if (!steps) throw new Error('steps is required')
      if (!telegram_id) throw new Error('telegram_id is required')
      if (!bot_name) throw new Error('bot_name is required')

      const zipFile = req.files?.find(file => file.fieldname === 'zipUrl')
      if (!zipFile) throw new Error('zipFile is required')

      const zipUrl = `https://${req.headers.host}/uploads/${telegram_id}/${type}/${zipFile.filename}`

      try {
        console.log(
          '🚀 План А: Попытка отправить событие Inngest model/training.start'
        )
        await inngest.send({
          id: `train:${telegram_id}:${modelName}-${Date.now()}`,
          name: `model/training.start`,
          data: {
            zipUrl,
            triggerWord,
            modelName,
            steps,
            telegram_id,
            is_ru,
            bot_name,
            idempotencyKey: `train:${telegram_id}:${modelName}-${Date.now()}`,
          },
        })
        console.log(
          '✅ План А: Событие Inngest model/training.start успешно отправлено'
        )
        res
          .status(200)
          .json({ message: 'Model training started via Inngest (Plan A)' })
      } catch (inngestError) {
        console.error('❌ План А (Inngest) не сработал:', inngestError)
        errorMessageAdmin(
          `🚨 Ошибка Inngest (model/training.start) для ${telegram_id}, модель ${modelName}. Активирован План Б (прямой вызов). Проверьте Inngest функцию! Ошибка: ${inngestError.message}` as unknown as Error
        )

        console.log('🧘 План Б: Запуск прямого вызова generateModelTraining')
        const { bot } = getBotByName(bot_name)
        if (!bot) {
          throw new Error(`Bot ${bot_name} not found for Plan B`)
        }

        await generateModelTraining(
          zipUrl,
          triggerWord,
          modelName,
          steps,
          telegram_id,
          is_ru,
          bot
        )
        console.log(
          '✅ План Б: Прямой вызов generateModelTraining завершен (ответ клиенту уже ушел бы от Replicate, здесь просто завершаем)'
        )
        if (!res.headersSent) {
          res
            .status(202)
            .json({ message: 'Model training started via fallback (Plan B)' })
        }
      }
    } catch (error) {
      console.error('Ошибка при подготовке к запуску тренировки:', error)
      if (!res.headersSent) {
        res
          .status(400)
          .json({ message: error.message || 'Validation or setup error' })
      } else {
        errorMessageAdmin(
          `🚨 Критическая ошибка после отправки заголовков в createModelTraining для ${telegram_id}: ${error.message}` as unknown as Error
        )
      }
    }
  }

  public createModelTrainingV2 = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Временно перенаправляем на основную версию
      console.log('⚠️ V2 версия временно отключена, используем основную версию')
      return this.createModelTraining(req, res, next)
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error)
      next(error)
    }
  }

  public createLipSync = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    console.log('CASE: createLipSync')
    try {
      const { type, telegram_id, is_ru } = req.body
      console.log(req.body, 'req.body')
      console.log(type, telegram_id, is_ru, 'type, telegram_id, is_ru')
      console.log(req.files, 'req.files')

      // Поскольку req.files является массивом, используем find для поиска нужных файлов
      const videoFile = req.files?.find(file => file.fieldname === 'video')
      console.log(videoFile, 'videoFile')
      const audioFile = req.files?.find(file => file.fieldname === 'audio')
      console.log(audioFile, 'audioFile')

      if (!videoFile) {
        res.status(400).json({ message: 'videoFile is required' })
        return
      }

      if (!audioFile) {
        res.status(400).json({ message: 'audioFile is required' })
        return
      }

      const video = `${API_URL}/uploads/${req.body.telegram_id}/lip-sync/${videoFile.filename}`
      console.log(video, 'video')
      const audio = `${API_URL}/uploads/${req.body.telegram_id}/lip-sync/${audioFile.filename}`
      console.log(audio, 'audio')

      const lipSyncResponse = await generateLipSync(
        req.body.telegram_id,
        video,
        audio,
        is_ru
      )

      const videoLocalPath = path.join(
        __dirname,
        '../uploads',
        req.body.telegram_id,
        'lip-sync',
        videoFile.filename
      )
      const audioLocalPath = path.join(
        __dirname,
        '../uploads',
        req.body.telegram_id,
        'lip-sync',
        audioFile.filename
      )

      await deleteFile(videoLocalPath)
      await deleteFile(audioLocalPath)

      res.status(200).json(lipSyncResponse)
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error)
      next(error)
    }
  }
}
