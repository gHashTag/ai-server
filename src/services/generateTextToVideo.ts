import { replicate } from '@/core/replicate'
import { downloadFile } from '@/helpers/downloadFile'
import { errorMessage, errorMessageAdmin, pulse } from '@/helpers'
import { processBalanceVideoOperation } from '@/price/helpers'
import { mkdir, writeFile } from 'fs/promises'
import { InputFile } from 'telegraf/typings/core/types/typegram'
import { saveVideoUrlToSupabase } from '@/core/supabase/saveVideoUrlToSupabase'
import path from 'path'
import { getBotByName } from '@/core/bot'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { VIDEO_MODELS_CONFIG } from '@/config/models.config'
import { PaymentType } from '@/interfaces/payments.interface'
import { ModeEnum } from '@/interfaces/modes'

export const processVideoGeneration = async (
  videoModel: string,
  aspect_ratio: string,
  prompt: string
) => {
  const modelConfig = VIDEO_MODELS_CONFIG[videoModel]

  if (!modelConfig) {
    throw new Error('Invalid video model')
  }

  const output = await replicate.run(
    modelConfig.api.model as `${string}/${string}`,
    {
      input: {
        prompt,
        ...modelConfig.api.input,
        aspect_ratio,
      },
    }
  )

  return output
}

export const generateTextToVideo = async (
  prompt: string,
  videoModel: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot_name: string
): Promise<{ videoLocalPath: string }> => {
  try {
    console.log('videoModel', videoModel)
    if (!prompt) throw new Error('Prompt is required')
    if (!videoModel) throw new Error('Video model is required')
    if (!telegram_id) throw new Error('Telegram ID is required')
    if (!username) throw new Error('Username is required')
    if (!bot_name) throw new Error('Bot name is required')

    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 9) {
      await updateUserLevelPlusOne(telegram_id, level)
    }
    const { bot } = getBotByName(bot_name)
    // Проверка баланса для всех изображений
    const balanceResult = await processBalanceVideoOperation({
      videoModel,
      telegram_id,
      is_ru,
      bot_name,
    })

    // Проверяем результат проверки баланса
    if (!balanceResult.success) {
      // Отправляем сообщение об ошибке пользователю
      if (balanceResult.error) {
        await bot.telegram.sendMessage(
          telegram_id.toString(),
          balanceResult.error
        )
      }
      // Прерываем выполнение, так как баланс некорректен или недостаточен
      throw new Error(
        balanceResult.error ||
          (is_ru ? 'Ошибка проверки баланса' : 'Balance check failed')
      )
    }

    // Используем данные из успешного результата
    const { newBalance, paymentAmount } = balanceResult

    await bot.telegram.sendMessage(
      telegram_id,
      is_ru ? '⏳ Генерация видео...' : '⏳ Generating video...',
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    )

    const output = await processVideoGeneration(
      videoModel,
      userExists.aspect_ratio,
      prompt
    )
    //const videoUrl = 'https://yuukfqcsdhkyxegfwlcb.supabase.co/storage/v1/object/public/dev/2025-01-15T06%2011%2018.236Z.mp4';
    let videoUrl: string
    if (Array.isArray(output)) {
      if (!output[0]) {
        throw new Error('Empty array or first element is undefined')
      }
      videoUrl = output[0]
    } else if (typeof output === 'string') {
      videoUrl = output
    } else {
      console.error(
        'Unexpected output format:',
        JSON.stringify(output, null, 2)
      )
      throw new Error(`Unexpected output format from API: ${typeof output}`)
    }
    const videoLocalPath = path.join(
      __dirname,
      '../uploads',
      telegram_id.toString(),
      'text-to-video',
      `${new Date().toISOString()}.mp4`
    )
    console.log(videoLocalPath, 'videoLocalPath')
    await mkdir(path.dirname(videoLocalPath), { recursive: true })

    const videoBuffer = await downloadFile(videoUrl as string)
    await writeFile(videoLocalPath, videoBuffer)
    // Сохраняем в таблицу assets

    await saveVideoUrlToSupabase(
      telegram_id,
      videoUrl as string,
      videoLocalPath,
      videoModel
    )

    const video = { source: videoLocalPath }
    await bot.telegram.sendVideo(telegram_id.toString(), video as InputFile)

    // Списываем средства после успешной генерации
    try {
      await updateUserBalance(
        telegram_id,
        paymentAmount,
        PaymentType.MONEY_OUTCOME,
        `Text-to-Video generation (${videoModel})`,
        {
          stars: paymentAmount,
          payment_method: 'System',
          service_type: ModeEnum.TextToVideo,
          bot_name: bot_name,
          language: is_ru ? 'ru' : 'en',
          cost: paymentAmount / 1.5, // себестоимость
        }
      )
      console.log('Balance updated successfully for Text-to-Video')
    } catch (balanceError) {
      console.error('Error updating balance for text-to-video:', balanceError)
      errorMessageAdmin(balanceError as Error)
    }

    await bot.telegram.sendMessage(
      telegram_id,
      is_ru
        ? `✅ Ваше видео сгенерировано!\n\nСписано: ${paymentAmount.toFixed(
            2
          )} ⭐️\nВаш новый баланс: ${newBalance.toFixed(2)} ⭐️`
        : `✅ Your video has been generated!\n\nDeducted: ${paymentAmount.toFixed(
            2
          )} ⭐️\nYour new balance: ${newBalance.toFixed(2)} ⭐️`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: is_ru
                  ? '🎥 Сгенерировать новое видео?'
                  : '🎥 Generate new video?',
              },
            ],
          ],
          resize_keyboard: false,
        },
      }
    )

    await pulse(
      videoLocalPath,
      prompt,
      'text-to-video',
      telegram_id,
      username,
      is_ru,
      bot_name
    )

    return { videoLocalPath }
  } catch (error) {
    errorMessage(error as Error, telegram_id.toString(), is_ru)
    errorMessageAdmin(error as Error)
    console.error('Error generating video:', error)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    throw error
  }
}
