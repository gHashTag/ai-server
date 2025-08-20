import { inngest } from '../client'
import { replicate } from '@/core/replicate'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { VIDEO_MODELS_CONFIG } from '@/helpers/VIDEO_MODELS'
import { processBalanceVideoOperation } from '@/price/helpers'
import { downloadFile } from '@/helpers/downloadFile'
import { saveVideoUrlToSupabase } from '@/core/supabase/saveVideoUrlToSupabase'
import { pulse } from '@/helpers/pulse'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { InputFile } from 'telegraf/typings/core/types/typegram'

interface TextToVideoData {
  prompt: string
  videoModel: string
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

interface ImageToVideoData {
  imageUrl: string
  prompt: string
  videoModel: string
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// Функция обработки генерации видео
const processVideoGeneration = async (
  videoModel: string,
  prompt: string,
  imageUrl?: string
) => {
  const modelConfig = VIDEO_MODELS_CONFIG[videoModel]

  if (!modelConfig) {
    throw new Error('Invalid video model')
  }

  const input: any = {
    prompt,
    ...modelConfig.api.input,
  }

  // Если это image-to-video, добавляем изображение
  if (imageUrl) {
    input.image = imageUrl
  }

  const output = await replicate.run(
    modelConfig.api.model as `${string}/${string}`,
    { input }
  )

  return output
}

// Text-to-Video Inngest функция
export const generateTextToVideoInngest = inngest.createFunction(
  {
    id: 'generate-text-to-video',
    concurrency: 3,
    idempotency: 'event.data.telegram_id + "-video-" + event.data.prompt.slice(0, 15)',
  },
  { event: 'video/text-to-video.start' },
  async ({ event, step }) => {
    const eventData = event.data as TextToVideoData

    logger.info({
      message: 'Получено событие генерации text-to-video',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      videoModel: eventData.videoModel,
    })

    try {
      // Получение и проверка пользователя
      const user = await step.run('validate-user', async () => {
        const userExists = await getUserByTelegramId(eventData.telegram_id)
        if (!userExists) {
          throw new Error(`User with ID ${eventData.telegram_id} does not exist.`)
        }

        // Обновление уровня если нужно
        if (userExists.level === 9) {
          await updateUserLevelPlusOne(eventData.telegram_id, userExists.level)
        }

        return userExists
      })

      // Получение бота
      const { bot } = getBotByName(eventData.bot_name)
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Проверка баланса и списание средств
      await step.run('check-balance', async () => {
        const result = await processBalanceVideoOperation({
          videoModel: eventData.videoModel,
          telegram_id: eventData.telegram_id,
          is_ru: eventData.is_ru,
          bot,
        })

        return result
      })

      // Уведомление о начале генерации
      await step.run('send-start-message', async () => {
        await bot.telegram.sendMessage(
          eventData.telegram_id,
          eventData.is_ru ? '⏳ Генерация видео...' : '⏳ Generating video...',
          {
            reply_markup: {
              remove_keyboard: true,
            },
          }
        )
      })

      // Генерация видео
      const videoOutput = await step.run('generate-video', async () => {
        logger.info({
          message: 'Начало генерации text-to-video',
          telegram_id: eventData.telegram_id,
          model: eventData.videoModel,
        })

        const output = await processVideoGeneration(
          eventData.videoModel,
          eventData.prompt
        )

        return output
      })

      // Обработка и сохранение результата
      const videoResult = await step.run('process-video-result', async () => {
        const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput

        if (!videoUrl) {
          throw new Error('Не удалось получить URL видео из результата генерации')
        }

        // Скачивание видео
        const videoLocalPath = await downloadFile(
          videoUrl,
          eventData.telegram_id,
          'video'
        )

        // Отправка видео пользователю
        const video = new InputFile(videoLocalPath)
        await bot.telegram.sendVideo(eventData.telegram_id, video, {
          caption: eventData.is_ru
            ? `✅ Ваше видео готово!\n\n📝 Промт: ${eventData.prompt}`
            : `✅ Your video is ready!\n\n📝 Prompt: ${eventData.prompt}`,
        })

        // Сохранение в Supabase
        await saveVideoUrlToSupabase(
          eventData.telegram_id,
          eventData.username,
          videoUrl,
          eventData.prompt,
          'text_to_video'
        )

        // Отправка pulse уведомления
        await pulse(eventData.telegram_id, eventData.username, eventData.prompt)

        return { videoUrl, videoLocalPath }
      })

      logger.info({
        message: 'Text-to-video генерация завершена успешно',
        telegram_id: eventData.telegram_id,
        videoUrl: videoResult.videoUrl,
      })

      return {
        success: true,
        videoUrl: videoResult.videoUrl,
        message: 'Видео успешно сгенерировано',
      }

    } catch (error) {
      logger.error({
        message: 'Ошибка text-to-video генерации',
        error: error.message,
        telegram_id: eventData.telegram_id,
      })

      // Уведомление об ошибке
      const { bot } = getBotByName(eventData.bot_name)
      if (bot) {
        try {
          const errorMsg = eventData.is_ru 
            ? `❌ Произошла ошибка при генерации видео: ${error.message}`
            : `❌ Error during video generation: ${error.message}`
          
          await bot.telegram.sendMessage(eventData.telegram_id, errorMsg)
        } catch (sendError) {
          logger.error('Не удалось отправить уведомление об ошибке', sendError)
        }
      }

      throw error
    }
  }
)

// Image-to-Video Inngest функция
export const generateImageToVideoInngest = inngest.createFunction(
  {
    id: 'generate-image-to-video',
    concurrency: 3,
    idempotency: 'event.data.telegram_id + "-img2vid-" + event.data.imageUrl.slice(-10)',
  },
  { event: 'video/image-to-video.start' },
  async ({ event, step }) => {
    const eventData = event.data as ImageToVideoData

    logger.info({
      message: 'Получено событие генерации image-to-video',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      videoModel: eventData.videoModel,
    })

    try {
      // Получение и проверка пользователя
      const user = await step.run('validate-user', async () => {
        const userExists = await getUserByTelegramId(eventData.telegram_id)
        if (!userExists) {
          throw new Error(`User with ID ${eventData.telegram_id} does not exist.`)
        }

        if (userExists.level === 9) {
          await updateUserLevelPlusOne(eventData.telegram_id, userExists.level)
        }

        return userExists
      })

      // Получение бота
      const { bot } = getBotByName(eventData.bot_name)
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Проверка баланса
      await step.run('check-balance', async () => {
        const result = await processBalanceVideoOperation({
          videoModel: eventData.videoModel,
          telegram_id: eventData.telegram_id,
          is_ru: eventData.is_ru,
          bot,
        })

        return result
      })

      // Уведомление о начале генерации
      await step.run('send-start-message', async () => {
        await bot.telegram.sendMessage(
          eventData.telegram_id,
          eventData.is_ru ? '⏳ Генерация видео из изображения...' : '⏳ Generating video from image...',
          {
            reply_markup: {
              remove_keyboard: true,
            },
          }
        )
      })

      // Генерация видео из изображения
      const videoOutput = await step.run('generate-video', async () => {
        logger.info({
          message: 'Начало генерации image-to-video',
          telegram_id: eventData.telegram_id,
          model: eventData.videoModel,
        })

        const output = await processVideoGeneration(
          eventData.videoModel,
          eventData.prompt,
          eventData.imageUrl
        )

        return output
      })

      // Обработка результата
      const videoResult = await step.run('process-video-result', async () => {
        const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput

        if (!videoUrl) {
          throw new Error('Не удалось получить URL видео из результата генерации')
        }

        // Скачивание и отправка видео
        const videoLocalPath = await downloadFile(
          videoUrl,
          eventData.telegram_id,
          'video'
        )

        const video = new InputFile(videoLocalPath)
        await bot.telegram.sendVideo(eventData.telegram_id, video, {
          caption: eventData.is_ru
            ? `✅ Ваше видео из изображения готово!\n\n📝 Промт: ${eventData.prompt}`
            : `✅ Your video from image is ready!\n\n📝 Prompt: ${eventData.prompt}`,
        })

        // Сохранение в Supabase
        await saveVideoUrlToSupabase(
          eventData.telegram_id,
          eventData.username,
          videoUrl,
          eventData.prompt,
          'image_to_video'
        )

        // Pulse уведомление
        await pulse(eventData.telegram_id, eventData.username, eventData.prompt)

        return { videoUrl, videoLocalPath }
      })

      logger.info({
        message: 'Image-to-video генерация завершена успешно',
        telegram_id: eventData.telegram_id,
        videoUrl: videoResult.videoUrl,
      })

      return {
        success: true,
        videoUrl: videoResult.videoUrl,
        message: 'Видео из изображения успешно сгенерировано',
      }

    } catch (error) {
      logger.error({
        message: 'Ошибка image-to-video генерации',
        error: error.message,
        telegram_id: eventData.telegram_id,
      })

      // Уведомление об ошибке
      const { bot } = getBotByName(eventData.bot_name)
      if (bot) {
        try {
          const errorMsg = eventData.is_ru 
            ? `❌ Произошла ошибка при генерации видео: ${error.message}`
            : `❌ Error during video generation: ${error.message}`
          
          await bot.telegram.sendMessage(eventData.telegram_id, errorMsg)
        } catch (sendError) {
          logger.error('Не удалось отправить уведомление об ошибке', sendError)
        }
      }

      throw error
    }
  }
)