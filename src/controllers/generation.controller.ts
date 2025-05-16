import { Request, Response, NextFunction } from 'express'
import { generateTextToImage } from '@/services/generateTextToImage'
import { generateSpeech } from '@/services/generateSpeech'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { createVoiceAvatar } from '@/services/createVoiceAvatar'
import { generateNeuroImage } from '@/services/generateNeuroImage'
import { validateUserParams } from '@/middlewares/validateUserParams'
import { generateNeuroImageV2 } from '@/services/generateNeuroImageV2'
import { generateLipSync } from '@/services/generateLipSync'

import { API_URL } from '@/config'
import { deleteFile } from '@/helpers'
import path from 'path'
import { getBotByName } from '@/core/bot'
import { inngest } from '@/core/inngest/clients'
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
      // Отправляем предварительный ответ клиенту, что обработка началась
      res.status(200).json({ message: 'Processing started' })

      try {
        // ПЛАН А: Попытка отправить задачу в Inngest
        console.log(
          `Attempting Plan A: Sending task to Inngest for telegram_id: ${telegram_id}`
        )
        await inngest.send({
          name: 'neuro/photo.generate', // Это имя Inngest-функции
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
        console.log(
          `Plan A successful: Task sent to Inngest for telegram_id: ${telegram_id}`
        )
        // Если Inngest принял задачу, то работа этого контроллера завершена.
      } catch (inngestError) {
        // ПЛАН Б: Ошибка при отправке в Inngest, переходим к прямому вызову
        console.error(
          `Plan A (Inngest send) failed for telegram_id: ${telegram_id}. Error: ${inngestError.message}. Proceeding to Plan B.`
        )
        // Опционально: уведомить администратора об ошибке с Inngest

        console.log(
          `Executing Plan B: Calling generateNeuroImage directly for telegram_id: ${telegram_id}`
        )
        // Выполняем generateNeuroImage напрямую.
        // Эта функция сама обрабатывает ошибки и отправляет сообщения пользователю.
        await generateNeuroImage(
          prompt,
          model_url,
          num_images,
          telegram_id,
          username,
          is_ru,
          bot_name
        )
        console.log(
          `Plan B (generateNeuroImage) completed for telegram_id: ${telegram_id}`
        )
      }
    } catch (error) {
      // Если ошибка произошла на этапе валидации, или если Plan B (generateNeuroImage)
      // выбросил необработанную ошибку, то она попадет сюда.
      console.error(
        `Error in neuroPhoto controller for telegram_id: ${req.body?.telegram_id}. Error: ${error.message}`
      )
      next(error) // Передаем ошибку стандартному обработчику ошибок Express
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

  // Код обработчика маршрута public imageToVideo в api-server

  public imageToVideo = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. Извлекаем ВСЕ возможные параметры из тела запроса
      const {
        imageUrl,
        imageAUrl, // <--- Добавлено
        imageBUrl, // <--- Добавлено
        prompt,
        videoModel,
        telegram_id,
        username,
        is_ru, // Важно: убедись, что бот передает это поле (is_ru, а не isRu)
        bot_name,
        is_morphing, // <--- Добавлено
      } = req.body

      // Логируем полученное тело запроса для отладки
      console.log('API Server: Received /generate/image-to-video request', {
        body: req.body,
      })

      // 2. Условная Валидация
      // Общие параметры
      if (
        !videoModel ||
        !telegram_id ||
        !username ||
        !bot_name /* || is_ru === undefined */
      ) {
        // Возможно, стоит добавить is_ru в обязательную проверку
        console.log('API Server: Missing required common parameters', {
          body: req.body,
        })
        res.status(400).json({
          message:
            'Missing required common parameters (model, user info, bot name)',
        })
        return
      }

      // Параметры в зависимости от режима
      if (is_morphing) {
        // --- Валидация для Морфинга ---
        if (!imageAUrl || !imageBUrl) {
          console.log(
            'API Server: Missing imageAUrl or imageBUrl for morphing request',
            { telegram_id }
          )
          res.status(400).json({
            message: 'imageAUrl and imageBUrl are required for morphing',
          })
          return
        }
        // Для морфинга imageUrl и prompt не нужны
        console.log('API Server: Morphing request validated', { telegram_id })
      } else {
        // --- Валидация для Стандартной Генерации ---
        if (!imageUrl) {
          // <--- Теперь эта проверка только для НЕ морфинга
          console.log('API Server: Missing imageUrl for standard request', {
            telegram_id,
          })
          res
            .status(400)
            .json({ message: 'Image URL is required for standard generation' })
          return
        }
        if (!prompt) {
          // <--- Теперь эта проверка только для НЕ морфинга
          console.log('API Server: Missing prompt for standard request', {
            telegram_id,
          })
          res
            .status(400)
            .json({ message: 'Prompt is required for standard generation' })
          return
        }
        console.log('API Server: Standard request validated', { telegram_id })
      }

      // --- Нужно ли здесь validateUserParams(req)? Возможно, нет, т.к. бот уже проверил баланс ---
      // validateUserParams(req);

      // 3. Отправляем ответ 202 Accepted СРАЗУ
      console.log('API Server: Sending 202 Accepted response', { telegram_id })
      res.status(202).json({ message: 'Request accepted, processing started.' })

      // 4. Вызываем СЕРВЕРНУЮ функцию generateImageToVideo АСИНХРОННО (в фоне)
      //    Передаем ей все необходимые параметры, включая новые.
      //    Используем .catch для логирования ошибок фоновой задачи.
      console.log('API Server: Starting background task generateImageToVideo', {
        telegram_id,
        is_morphing,
      })
      generateImageToVideo(
        // Передаем аргументы по порядку, как в сигнатуре функции
        imageUrl, // string | null
        prompt, // string | null
        videoModel, // string
        telegram_id, // string
        username, // string
        is_ru, // boolean
        bot_name, // string
        is_morphing, // boolean (new)
        imageAUrl, // string | null (new)
        imageBUrl // string | null (new)
      ).catch(backgroundError => {
        // Эта ошибка случилась уже ПОСЛЕ отправки ответа 202
        console.log(
          'API Server: Error in background generateImageToVideo task',
          { telegram_id, error: backgroundError }
        )
        // Здесь нельзя отправить ответ клиенту. Нужно логировать или уведомлять админа.
        // errorMessageAdmin(backgroundError); // Например
      })
    } catch (error) {
      // Эта ошибка случилась ДО отправки ответа 202
      console.log(
        'API Server: Error in imageToVideo handler before sending 202',
        { error }
      )
      // Передаем ошибку в express/fastify middleware, если ответ еще не был отправлен
      if (!res.headersSent) {
        next(error)
      }
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
    logger.info('Received /create-model-training request')
    logger.debug({ message: 'Request Headers:', headers: req.headers })
    logger.debug({ message: 'Request Body (raw):', body: req.body })
    // Log files if multer has processed them
    logger.debug({ message: 'Request File (single):', file: req.file })
    logger.debug({ message: 'Request Files (array):', files: req.files })

    const {
      type,
      triggerWord,
      modelName,
      steps,
      telegram_id,
      is_ru,
      bot_name,
      gender,
    } = req.body
    // console.log(req.body, 'req.body') // Original console.log, can be removed or kept

    try {
      logger.info('Attempting to process model training request data:')
      logger.info({
        type,
        triggerWord,
        modelName,
        steps,
        telegram_id,
        bot_name,
        gender,
      })

      if (!type) throw new Error('type is required')
      if (!triggerWord) throw new Error('triggerWord is required')
      if (!modelName) throw new Error('modelName is required')
      if (!steps) throw new Error('steps is required')
      if (!telegram_id) throw new Error('telegram_id is required')
      if (!bot_name) throw new Error('bot_name is required')
      // if (!gender) throw new Error('gender is required') // Gender is optional

      // Multer puts single file in req.file, multiple in req.files
      const anies = req.files as any[] // Type assertion to handle mixed array
      const zipFile =
        req.file ||
        (anies?.length > 0
          ? anies.find(f => f.fieldname === 'zipUrl')
          : undefined)

      logger.info({
        message: 'Attempting to find zipFile. req.file:',
        singleFile: req.file,
        allFiles: req.files,
      })

      if (!zipFile) {
        logger.error(
          'zipFile is required but not found. req.file:',
          req.file,
          'req.files:',
          req.files
        )
        throw new Error('zipFile is required')
      }
      logger.info({ message: 'zipFile found:', zipFile })

      const zipUrl = `https://${req.headers.host}/uploads/${telegram_id}/${type}/${zipFile.filename}`
      logger.info(`Constructed zipUrl: ${zipUrl}`)

      try {
        logger.info(
          '🚀 План А: Попытка отправить событие Inngest model/training.start',
          {
            zipUrl,
            triggerWord,
            modelName,
            steps,
            telegram_id,
            is_ru,
            bot_name,
            gender,
          }
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
            gender,
            // idempotencyKey: `train:${telegram_id}:${modelName}-${Date.now()}`,
          },
        })
        logger.info(
          '✅ План А: Событие Inngest model/training.start успешно отправлено'
        )
        res
          .status(200)
          .json({ message: 'Model training started via Inngest (Plan A)' })
      } catch (inngestError) {
        logger.error(
          '❌ Ошибка при отправке события в Inngest (План А):',
          inngestError
        )
        // Decide if we should call next(inngestError) or handle differently
        // For now, let's send a 500 response directly
        res.status(500).json({
          message: 'Failed to send training task to Inngest',
          error: inngestError.message,
        })
      }
    } catch (error) {
      logger.error('❌ Ошибка в createModelTraining контроллере:', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        file: req.file,
        files: req.files,
      })
      // Pass error to the next error-handling middleware if not already sent response
      if (!res.headersSent) {
        next(error)
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
