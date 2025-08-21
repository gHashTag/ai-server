import { processBalanceOperation } from '@/price/helpers'
import axios from 'axios'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { ModeEnum } from '@/interfaces/modes'
import { calculateModeCost } from '@/price/helpers/modelsCost'
import { levels } from '@/helpers/levels'
import { PaymentType } from '@/interfaces/payments.interface'

export async function generateImageToPrompt(
  imageUrl: string,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>,
  bot_name: string
): Promise<string> {
  console.log('generateImageToPrompt', imageUrl, telegram_id, username, is_ru)
  try {
    const userExists = await getUserByTelegramId(telegram_id)
    console.log('userExists', userExists)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 2) {
      await updateUserLevelPlusOne(telegram_id, level)
    }
    let costPerImage: number
    if (typeof calculateModeCost[ModeEnum.ImageToPrompt] === 'function') {
      costPerImage = calculateModeCost[ModeEnum.ImageToPrompt](1)
    } else {
      costPerImage = calculateModeCost[ModeEnum.ImageToPrompt]
    }
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: costPerImage,
      is_ru,
      bot_name,
    })
    if (!balanceCheck.success) {
      if (balanceCheck.error) {
        try {
          await bot.telegram.sendMessage(
            telegram_id.toString(),
            balanceCheck.error
          )
        } catch (notifyError) {
          console.error('Failed to send balance error notification to user', {
            telegramId: telegram_id,
            error: notifyError,
          })
          errorMessageAdmin(notifyError as Error)
        }
      }
      throw new Error(
        balanceCheck.error ||
          (is_ru ? 'Ошибка проверки баланса' : 'Balance check failed')
      )
    }
    const initialBalance = balanceCheck.currentBalance

    await bot.telegram.sendMessage(
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

    console.log('Init response data:', initResponse.data)

    const eventId = initResponse.data?.event_id || initResponse.data
    console.log('eventId', eventId)
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

    console.log('Result response data:', resultResponse.data)

    if (!resultResponse.data) {
      throw new Error('Image to prompt: No data in response')
    }

    const responseText = resultResponse.data as string
    const lines = responseText.split('\n')
    let captionFound: string | null = null

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          console.log('Parsed data:', data)
          if (Array.isArray(data) && data.length > 1) {
            captionFound = data[1]
            break
          }
        } catch (e) {
          console.error('Error parsing JSON from line:', line, e)
        }
      }
    }

    if (captionFound) {
      const newBalance = initialBalance - costPerImage

      try {
        await updateUserBalance(
          telegram_id,
          costPerImage, // ← ИСПРАВЛЕНО: передаем сумму операции, а не новый баланс
          PaymentType.MONEY_OUTCOME,
          'Image-to-Prompt generation',
          {
            stars: costPerImage,
            payment_method: 'Internal',
            bot_name: bot_name,
            language: is_ru ? 'ru' : 'en',
            service_type: ModeEnum.ImageToPrompt, // ← ДОБАВЛЕНО: указываем тип сервиса
            category: 'REAL',
            cost: costPerImage / 1.5, // ← ДОБАВЛЕНО: себестоимость (цена ÷ наценка 50%)
          }
        )
        console.log('Balance updated successfully for Image-to-Prompt')

        await bot.telegram.sendMessage(
          telegram_id,
          '```\n' + captionFound + '\n```',
          {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              keyboard: [
                [
                  {
                    text: is_ru ? levels[104].title_ru : levels[104].title_en,
                  },
                ],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }
        )

        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `✅ Промпт успешно сгенерирован!\nСписано: ${costPerImage.toFixed(
                2
              )} ⭐️\nВаш новый баланс: ${newBalance.toFixed(2)} ⭐️`
            : `✅ Prompt generated successfully!\nDeducted: ${costPerImage.toFixed(
                2
              )} ⭐️\nYour new balance: ${newBalance.toFixed(2)} ⭐️`
        )

        return captionFound
      } catch (updateError) {
        console.error(
          'Failed to update balance or send result notification',
          updateError
        )
        errorMessageAdmin(updateError as Error)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? '❌ Произошла ошибка при обновлении вашего баланса после генерации промпта.'
            : '❌ An error occurred while updating your balance after prompt generation.'
        )
        return captionFound
      }
    } else {
      throw new Error('No valid caption found in response')
    }
  } catch (error) {
    console.error('Image-to-Prompt Error:', error)
    if (!error.message?.includes('Balance check failed')) {
      errorMessage(error as Error, telegram_id.toString(), is_ru)
    }
    errorMessageAdmin(error as Error)
    throw error
  }
}
