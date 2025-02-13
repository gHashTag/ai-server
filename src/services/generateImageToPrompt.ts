import { processBalanceOperation, sendBalanceMessage } from '@/price/helpers'
import axios from 'axios'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'

export async function generateImageToPrompt(
  imageUrl: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
): Promise<string> {
  console.log('generateImageToPrompt', imageUrl, telegram_id, username, is_ru)
  try {
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists.data) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.data.level
    if (level === 2) {
      await updateUserLevelPlusOne(telegram_id, level)
    }
    let costPerImage: number
    if (typeof modeCosts[ModeEnum.ImageToPrompt] === 'function') {
      costPerImage = modeCosts[ModeEnum.ImageToPrompt](1)
    } else {
      costPerImage = modeCosts[ModeEnum.ImageToPrompt]
    }
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: costPerImage,
      is_ru,
      bot,
    })
    if (!balanceCheck.success) {
      throw new Error('Not enough stars')
    }

    bot.telegram.sendMessage(
      telegram_id,
      is_ru ? '⏳ Генерация промпта...' : '⏳ Generating prompt...'
    )

    const initResponse = await axios.post(
      'https://fancyfeast-joy-caption-alpha-two.hf.space/call/stream_chat',
      {
        data: [
          { path: imageUrl },
          'Descriptive',
          'long',
          [
            'Describe the image in detail, including colors, style, mood, and composition.',
          ],
          '',
          '',
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    )

    console.log(initResponse.data)

    const eventId = initResponse.data?.event_id || initResponse.data
    if (!eventId) {
      throw new Error('No event ID in response')
    }

    const resultResponse = await axios.get(
      `https://fancyfeast-joy-caption-alpha-two.hf.space/call/stream_chat/${eventId}`,
      {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    )

    console.log(resultResponse.data)

    if (!resultResponse.data) {
      throw new Error('Image to prompt: No data in response')
    }

    const responseText = resultResponse.data as string
    const lines = responseText.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (Array.isArray(data) && data.length > 1) {
            const caption = data[1]
            await bot.telegram.sendMessage(
              telegram_id,
              '```\n' + caption + '\n```',
              {
                parse_mode: 'MarkdownV2',
                reply_markup: {
                  keyboard: [
                    [{ text: is_ru ? '🏠 Главное меню' : '🏠 Main menu' }],
                  ],
                  resize_keyboard: true,
                  one_time_keyboard: false,
                },
              }
            )

            await sendBalanceMessage(
              telegram_id,
              balanceCheck.newBalance,
              costPerImage,
              is_ru,
              bot
            )
            return caption
          }
        } catch (e) {
          console.error('Error parsing JSON from line:', line, e)
        }
      }
    }

    throw new Error('No valid caption found in response')
  } catch (error) {
    console.error('Joy Caption API error:', error)
    errorMessage(error as Error, telegram_id.toString(), is_ru)
    errorMessageAdmin(error as Error)
    throw error
  }
}
