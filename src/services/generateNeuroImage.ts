import { getAspectRatio, saveNeuroPhotoPrompt } from '../core/supabase/ai'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  getFineTuneIdByTelegramId,
} from '@/core/supabase'

import { GenerationResult } from '@/interfaces'

import { processBalanceOperation } from '@/price/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'

export async function generateNeuroImage(
  prompt: string,
  model_url: `${string}/${string}` | `${string}/${string}:${string}`,
  num_images: number,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
): Promise<GenerationResult | null> {
  try {
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 1) {
      await updateUserLevelPlusOne(telegram_id, level)
    }
    // Проверка баланса для всех изображений
    let costPerImage: number
    if (typeof modeCosts[ModeEnum.NeuroPhoto] === 'function') {
      costPerImage = modeCosts[ModeEnum.NeuroPhoto](num_images)
    } else {
      costPerImage = modeCosts[ModeEnum.NeuroPhoto]
    }

    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: costPerImage * num_images,
      is_ru,
      bot,
    })
    if (!balanceCheck.success) {
      throw new Error(balanceCheck.error)
    }

    const aspect_ratio = await getAspectRatio(telegram_id)

    const finetuneId = await getFineTuneIdByTelegramId(telegram_id)
    console.log('finetuneId', finetuneId)
    //
    const input = {
      finetune_id: finetuneId,
      finetune_strength: 0.5,
      prompt: `${prompt}. Cinematic Lighting, realistic, intricate details, extremely detailed, incredible details, full colored, complex details, insanely detailed and intricate, hypermaximalist, extremely detailed with rich colors. Masterpiece, best quality, aerial view, HDR, UHD, unreal engine, Representative, fair skin, beautiful face, Rich in details, high quality, gorgeous, glamorous, 8K, super detail, gorgeous light and shadow, detailed decoration, detailed lines.`,
      aspect_ratio,
      safety_tolerance: 2,
      output_format: 'jpeg',
      prompt_upsampling: true,
      webhook_url:
        'https://ai-server-new-u14194.vm.elestio.app/webhooks/webhook-bfl-neurophoto',
      webhook_secret: process.env.BFL_WEBHOOK_SECRET as string,
    }

    // Цикл генерации изображений
    for (let i = 0; i < num_images; i++) {
      if (num_images > 1) {
        bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `⏳ Генерация изображения ${i + 1} из ${num_images}`
            : `⏳ Generating image ${i + 1} of ${num_images}`
        )
      } else {
        bot.telegram.sendMessage(
          telegram_id,
          is_ru ? '⏳ Генерация...' : '⏳ Generating...',
          {
            reply_markup: { remove_keyboard: true },
          }
        )
      }

      const response = await fetch(
        'https://api.us1.bfl.ai/v1/flux-pro-1.1-ultra-finetuned',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Key': process.env.BFL_API_KEY as string,
          },
          body: JSON.stringify(input),
        }
      )

      const { id, status } = await response.json()
      console.log('id:', id, 'status:', status)

      await saveNeuroPhotoPrompt(id, prompt, telegram_id, status)
    }
    return
  } catch (error) {
    console.error(`Error:`, error)

    let errorMessageToUser = '❌ Произошла ошибка.'

    if (error.message && error.message.includes('NSFW content detected')) {
      errorMessageToUser = is_ru
        ? '❌ Обнаружен NSFW контент. Пожалуйста, попробуйте другой запрос.'
        : '❌ NSFW content detected. Please try another prompt.'
    } else if (error.message) {
      const match = error.message.match(/{"detail":"(.*?)"/)
      if (match && match[1]) {
        errorMessageToUser = is_ru
          ? `❌ Ошибка: ${match[1]}`
          : `❌ Error: ${match[1]}`
      }
    } else {
      errorMessageToUser = is_ru
        ? '❌ Произошла ошибка. Попробуйте еще раз.'
        : '❌ An error occurred. Please try again.'
    }
    await bot.telegram.sendMessage(telegram_id, errorMessageToUser)
    errorMessageAdmin(error as Error)
    throw error
  }
}
