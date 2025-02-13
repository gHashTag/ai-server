import { replicate } from '@/core/replicate'
import { downloadFile } from '@/helpers/downloadFile'
import { errorMessage, errorMessageAdmin, pulse } from '@/helpers'
import { processBalanceVideoOperation } from '@/price/helpers'
import { mkdir, writeFile } from 'fs/promises'
import { InputFile } from 'telegraf/typings/core/types/typegram'
import { saveVideoUrlToSupabase } from '@/core/supabase/saveVideoUrlToSupabase'
import path from 'path'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'

export const generateTextToVideo = async (
  prompt: string,
  videoModel: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
): Promise<{ videoLocalPath: string }> => {
  try {
    if (!prompt) throw new Error('Prompt is required')
    if (!videoModel) throw new Error('Video model is required')
    if (!telegram_id) throw new Error('Telegram ID is required')
    if (!username) throw new Error('Username is required')
    if (!is_ru) throw new Error('is_ru is required')

    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists.data) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.data.level
    if (level === 9) {
      await updateUserLevelPlusOne(telegram_id, level)
    }

    // Проверка баланса для всех изображений
    const { newBalance, paymentAmount } = await processBalanceVideoOperation({
      videoModel,
      telegram_id,
      is_ru,
      bot,
    })

    let output: any

    bot.telegram.sendMessage(
      telegram_id,
      is_ru ? '⏳ Генерация видео...' : '⏳ Generating video...',
      {
        reply_markup: {
          remove_keyboard: true,
        },
      }
    )

    if (videoModel === 'haiper') {
      const input = {
        prompt,
        duration: 6,
        aspect_ratio: '16:9',
        use_prompt_enhancer: true,
      }

      output = await replicate.run('haiper-ai/haiper-video-2', { input })
    } else {
      const input = {
        prompt,
        prompt_optimizer: true,
      }

      output = await replicate.run('minimax/video-01', { input })
    }

    if (!output) {
      throw new Error('No video generated')
    }
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

    await bot.telegram.sendMessage(
      telegram_id,
      is_ru
        ? `Ваше видео сгенерировано!\n\nСгенерировать еще?\n\nСтоимость: ${paymentAmount.toFixed(
            2
          )} ⭐️\nВаш новый баланс: ${newBalance.toFixed(2)} ⭐️`
        : `Your video has been generated!\n\nGenerate more?\n\nCost: ${paymentAmount.toFixed(
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
      is_ru
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
