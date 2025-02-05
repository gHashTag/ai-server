import { Request, Response, NextFunction } from 'express'
import { generateTextToImage } from '@/services/generateTextToImage'
import { generateSpeech } from '@/services/generateSpeech'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { generateNeuroImage } from '@/services/generateNeuroImage'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { generateModelTraining } from '@/services/generateModelTraining'
import { validateUserParams } from '@/middlewares/validateUserParams'
import { generateLipSync } from '@/services/generateLipSync'
import { API_URL } from '@/config'
import { deleteFile } from '@/helpers'
import path from 'path'

export class GenerationController {
  public textToImage = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { prompt, model, num_images, telegram_id, username, is_ru } =
        req.body

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

      generateTextToImage(
        prompt,
        model,
        num_images,
        telegram_id,
        username,
        is_ru
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
      const { prompt, model_url, num_images, telegram_id, username, is_ru } =
        req.body
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

      generateNeuroImage(
        prompt,
        model_url,
        num_images,
        telegram_id,
        username,
        is_ru
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
      const { fileUrl, telegram_id, username, is_ru } = req.body

      if (!fileUrl) {
        res.status(400).json({ message: 'fileUrl is required' })
        return
      }

      validateUserParams(req)

      res.status(200).json({ message: 'Voice creation started' })

      createVoiceAvatar(fileUrl, telegram_id, username, is_ru)
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
      const { text, voice_id, telegram_id, is_ru } = req.body

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

      generateSpeech({ text, voice_id, telegram_id, is_ru })
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
      const { prompt, videoModel, telegram_id, username, is_ru } = req.body
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

      generateTextToVideo(prompt, videoModel, telegram_id, username, is_ru)
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
      const { imageUrl, prompt, videoModel, telegram_id, username, is_ru } =
        req.body
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

      generateImageToVideo(
        imageUrl,
        prompt,
        videoModel,
        telegram_id,
        username,
        is_ru
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
      const { image, telegram_id, username, is_ru } = req.body

      if (!image) {
        res.status(400).json({ message: 'Image is required' })
        return
      }
      validateUserParams(req)
      res.status(200).json({ message: 'Processing started' })

      generateImageToPrompt(image, telegram_id, username, is_ru)
    } catch (error) {
      next(error)
    }
  }

  public createModelTraining = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { type, telegram_id, triggerWord, modelName, steps, is_ru } =
        req.body
      if (!type) {
        res.status(400).json({ message: 'type is required' })
        return
      }
      if (!triggerWord) {
        res.status(400).json({ message: 'triggerWord is required' })
        return
      }
      if (!modelName) {
        res.status(400).json({ message: 'modelName is required' })
        return
      }
      if (!steps) {
        res.status(400).json({ message: 'steps is required' })
        return
      }
      if (!telegram_id) {
        res.status(400).json({ message: 'telegram_id is required' })
        return
      }
      if (!is_ru) {
        res.status(400).json({ message: 'is_ru is required' })
        return
      }
      const zipFile = req.files?.find(file => file.fieldname === 'zipUrl')
      if (!zipFile) {
        res.status(400).json({ message: 'zipFile is required' })
        return
      }
      // Создаем URL для доступа к файлу
      const zipUrl = `https://${req.headers.host}/uploads/${telegram_id}/${type}/${zipFile.filename}`

      await generateModelTraining(
        zipUrl,
        triggerWord,
        modelName,
        steps,
        telegram_id,
        is_ru
      )

      res.status(200).json({ message: 'Model training started' })
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
