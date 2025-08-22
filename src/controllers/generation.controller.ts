import { Request, Response, NextFunction } from 'express'

// План А - Inngest функции (асинхронные обертки)
import { inngest } from '@/core/inngest-client/clients'

// План Б - Оригинальные сервисы (синхронные)
import { generateTextToImage } from '@/services/generateTextToImage'
import { generateSpeech } from '@/services/generateSpeech'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'

// Остальные сервисы с паттерном План А/Б
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { generateNeuroImage } from '@/services/generateNeuroImage'
import { generateNeuroImageV2 } from '@/services/generateNeuroImageV2'
import { generateLipSync } from '@/services/generateLipSync'
import { generateModelTrainingV2 } from '@/services/generateModelTrainingV2'

import { validateUserParams } from '@/middlewares/validateUserParams'
import { shouldUseInngest, API_URL } from '@/config'
import { deleteFile } from '@/helpers'
import path from 'path'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'
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

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest (асинхронная обработка через очереди)
        logger.info({
          message: 'План А - Inngest для text-to-image',
          telegram_id,
          model,
        })

        await inngest.send({
          name: 'image/text-to-image.start',
          data: {
            prompt,
            model,
            num_images,
            telegram_id,
            username,
            is_ru,
            bot_name,
          },
        })
      } else {
        // План Б - Оригинальный сервис (прямой вызов)
        logger.info({
          message: 'План Б - Оригинальный сервис для text-to-image',
          telegram_id,
          model,
        })

        generateTextToImage(
          prompt,
          model,
          num_images,
          telegram_id,
          username,
          is_ru,
          bot
        ).catch(error => {
          logger.error('Ошибка при генерации изображения:', error)
        })
      }
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

      const { bot } = getBotByName(bot_name)

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest (асинхронная обработка через очереди)
        logger.info({
          message: 'План А - Inngest для neuro-image',
          telegram_id,
          model_url,
        })

        await inngest.send({
          name: 'image/neuro-image.start',
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
      } else {
        // План Б - Оригинальный сервис (прямой вызов)
        logger.info({
          message: 'План Б - Оригинальный сервис для neuro-image',
          telegram_id,
          model_url,
        })

        generateNeuroImage(
          prompt,
          model_url,
          num_images,
          telegram_id,
          username,
          is_ru,
          bot
        ).catch(error => {
          logger.error('Ошибка при генерации нейро-изображения:', error)
        })
      }
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

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest
        logger.info({
          message: 'План А - Inngest для создания голосового аватара',
          telegram_id,
          fileUrl,
        })

        await inngest.send({
          name: 'speech/voice-avatar.start',
          data: {
            fileUrl,
            telegram_id,
            username,
            is_ru,
            bot_name,
          },
        })
      } else {
        // План Б - Оригинальный сервис
        logger.info({
          message: 'План Б - Оригинальный сервис для создания голосового аватара',
          telegram_id,
          fileUrl,
        })

        createVoiceAvatar(fileUrl, telegram_id, username, is_ru, bot).catch(error => {
          logger.error('Ошибка при создании голосового аватара:', error)
        })
      }
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

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest
        logger.info({
          message: 'План А - Inngest для text-to-speech',
          telegram_id,
          voice_id,
        })

        await inngest.send({
          name: 'speech/text-to-speech.start',
          data: {
            text,
            voice_id,
            telegram_id,
            is_ru,
            bot_name,
          },
        })
      } else {
        // План Б - Оригинальный сервис
        logger.info({
          message: 'План Б - Оригинальный сервис для text-to-speech',
          telegram_id,
          voice_id,
        })

        generateSpeech({ text, voice_id, telegram_id, is_ru, bot }).catch(error => {
          logger.error('Ошибка при генерации речи:', error)
        })
      }
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

      const { bot } = getBotByName(bot_name)

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest
        logger.info({
          message: 'План А - Inngest для text-to-video',
          telegram_id,
          videoModel,
        })

        await inngest.send({
          name: 'video/text-to-video.start',
          data: {
            prompt,
            videoModel,
            telegram_id,
            username,
            is_ru,
            bot_name,
          },
        })
      } else {
        // План Б - Оригинальный сервис
        logger.info({
          message: 'План Б - Оригинальный сервис для text-to-video',
          telegram_id,
          videoModel,
        })

        generateTextToVideo(
          prompt,
          videoModel,
          telegram_id,
          username,
          is_ru,
          bot,
          bot_name
        ).catch(error => {
          logger.error('Ошибка при генерации видео:', error)
        })
      }
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

      const { bot } = getBotByName(bot_name)

      // Выбор между планом А (Inngest) и планом Б (Оригинальный сервис)
      if (shouldUseInngest()) {
        // План А - Inngest
        logger.info({
          message: 'План А - Inngest для image-to-video',
          telegram_id,
          videoModel,
        })

        await inngest.send({
          name: 'video/image-to-video.start',
          data: {
            imageUrl,
            prompt,
            videoModel,
            telegram_id,
            username,
            is_ru,
            bot_name,
          },
        })
      } else {
        // План Б - Оригинальный сервис
        logger.info({
          message: 'План Б - Оригинальный сервис для image-to-video',
          telegram_id,
          videoModel,
        })

        generateImageToVideo(
          imageUrl,
          prompt,
          videoModel,
          telegram_id,
          username,
          is_ru,
          bot
        ).catch(error => {
          logger.error('Ошибка при генерации image-to-video:', error)
        })
      }
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

      generateImageToPrompt(image, telegram_id, username, is_ru, bot)
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
      const {
        type,
        telegram_id,
        triggerWord,
        modelName,
        steps,
        is_ru,
        bot_name,
      } = req.body
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
      if (!bot_name) {
        res.status(400).json({ message: 'bot_name is required' })
        return
      }
      const zipFile = req.files?.find(file => file.fieldname === 'zipUrl')
      if (!zipFile) {
        res.status(400).json({ message: 'zipFile is required' })
        return
      }
      // Создаем URL для доступа к файлу
      const zipUrl = `https://${req.headers.host}/uploads/${telegram_id}/${type}/${zipFile.filename}`

      await inngest.send({
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

      res.status(200).json({ message: 'Model training started' })
    } catch (error) {
      console.error('Ошибка при обработке запроса:', error)
      next(error)
    }
  }

  public createModelTrainingV2 = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const {
        type,
        telegram_id,
        triggerWord,
        modelName,
        steps,
        is_ru,
        bot_name,
      } = req.body
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
      const { bot } = getBotByName(bot_name)
      await generateModelTrainingV2(
        zipUrl,
        triggerWord,
        modelName,
        steps,
        telegram_id,
        is_ru,
        bot
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
