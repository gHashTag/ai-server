import { replicate } from '@/core/replicate'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { VIDEO_MODELS_CONFIG } from '@/helpers/VIDEO_MODELS'
import { processBalanceVideoOperation } from '@/price/helpers'
import { downloadFile } from '@/helpers/downloadFile'
import { saveVideoUrlToSupabase } from '@/core/supabase/saveVideoUrlToSupabase'
import { pulse } from '@/helpers/pulse'
import { logger } from '@/utils/logger'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { InputFile } from 'telegraf/typings/core/types/typegram'

// Упрощенная функция генерации видео
const processVideoGenerationFallback = async (
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

  if (imageUrl) {
    input.image = imageUrl
  }

  const output = await replicate.run(
    modelConfig.api.model as `${string}/${string}`,
    { input }
  )

  return output
}

// Fallback Text-to-Video функция
export const generateTextToVideoFallback = async (
  prompt: string,
  videoModel: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
) => {
  try {
    logger.info({
      message: 'Использование fallback для text-to-video',
      telegram_id,
      videoModel,
    })

    // Простая проверка пользователя
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }

    if (userExists.level === 9) {
      await updateUserLevelPlusOne(telegram_id, userExists.level)
    }

    // Проверка баланса
    await processBalanceVideoOperation({
      videoModel,
      telegram_id,
      is_ru,
      bot,
    })

    // Уведомление о начале
    await bot.telegram.sendMessage(
      telegram_id,
      is_ru ? '⏳ Генерация видео...' : '⏳ Generating video...',
      { reply_markup: { remove_keyboard: true } }
    )

    // Генерация видео
    const videoOutput = await processVideoGenerationFallback(videoModel, prompt)
    const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput

    if (!videoUrl) {
      throw new Error('Не удалось получить URL видео')
    }

    // Скачивание и отправка
    const videoLocalPath = await downloadFile(videoUrl, telegram_id, 'video')
    const video = new InputFile(videoLocalPath)
    
    await bot.telegram.sendVideo(telegram_id, video, {
      caption: is_ru
        ? `✅ Ваше видео готово!\n\n📝 Промт: ${prompt}`
        : `✅ Your video is ready!\n\n📝 Prompt: ${prompt}`,
    })

    // Сохранение в базу
    await saveVideoUrlToSupabase(
      telegram_id,
      username,
      videoUrl,
      prompt,
      'text_to_video'
    )

    // Pulse уведомление
    await pulse(telegram_id, username, prompt)

    logger.info({
      message: 'Fallback text-to-video завершен',
      telegram_id,
      videoUrl,
    })

    return { videoUrl, videoLocalPath }

  } catch (error) {
    logger.error({
      message: 'Ошибка fallback text-to-video',
      error: error.message,
      telegram_id,
    })

    const errorMsg = is_ru 
      ? `❌ Произошла ошибка при генерации видео: ${error.message}`
      : `❌ Error during video generation: ${error.message}`
    
    try {
      await bot.telegram.sendMessage(telegram_id, errorMsg)
    } catch (sendError) {
      logger.error('Не удалось отправить уведомление об ошибке', sendError)
    }

    throw error
  }
}

// Fallback Image-to-Video функция
export const generateImageToVideoFallback = async (
  imageUrl: string,
  prompt: string,
  videoModel: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
) => {
  try {
    logger.info({
      message: 'Использование fallback для image-to-video',
      telegram_id,
      videoModel,
    })

    // Простая проверка пользователя
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }

    if (userExists.level === 9) {
      await updateUserLevelPlusOne(telegram_id, userExists.level)
    }

    // Проверка баланса
    await processBalanceVideoOperation({
      videoModel,
      telegram_id,
      is_ru,
      bot,
    })

    // Уведомление
    await bot.telegram.sendMessage(
      telegram_id,
      is_ru ? '⏳ Генерация видео из изображения...' : '⏳ Generating video from image...',
      { reply_markup: { remove_keyboard: true } }
    )

    // Генерация
    const videoOutput = await processVideoGenerationFallback(
      videoModel,
      prompt,
      imageUrl
    )
    
    const videoUrl = Array.isArray(videoOutput) ? videoOutput[0] : videoOutput

    if (!videoUrl) {
      throw new Error('Не удалось получить URL видео')
    }

    // Обработка результата
    const videoLocalPath = await downloadFile(videoUrl, telegram_id, 'video')
    const video = new InputFile(videoLocalPath)
    
    await bot.telegram.sendVideo(telegram_id, video, {
      caption: is_ru
        ? `✅ Ваше видео из изображения готово!\n\n📝 Промт: ${prompt}`
        : `✅ Your video from image is ready!\n\n📝 Prompt: ${prompt}`,
    })

    await saveVideoUrlToSupabase(
      telegram_id,
      username,
      videoUrl,
      prompt,
      'image_to_video'
    )

    await pulse(telegram_id, username, prompt)

    logger.info({
      message: 'Fallback image-to-video завершен',
      telegram_id,
      videoUrl,
    })

    return { videoUrl, videoLocalPath }

  } catch (error) {
    logger.error({
      message: 'Ошибка fallback image-to-video',
      error: error.message,
      telegram_id,
    })

    const errorMsg = is_ru 
      ? `❌ Произошла ошибка при генерации видео: ${error.message}`
      : `❌ Error during video generation: ${error.message}`
    
    try {
      await bot.telegram.sendMessage(telegram_id, errorMsg)
    } catch (sendError) {
      logger.error('Не удалось отправить уведомление об ошибке', sendError)
    }

    throw error
  }
}