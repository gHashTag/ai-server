import { ApiImageResponse, GenerationResult } from '@/interfaces'
import { replicate } from '@/core/replicate'
import { getAspectRatio, savePrompt } from '@/core/supabase'
import { downloadFile } from '@/helpers/downloadFile'
import { processApiResponse } from '@/helpers/processApiResponse'
import { pulse } from '@/helpers/pulse'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { IMAGES_MODELS } from '@/helpers/IMAGES_MODELS'
import { ModeEnum } from '@/interfaces/modes'
import { processBalanceOperation } from '@/price/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { errorMessage } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { saveFileLocally } from '@/helpers/saveFileLocally'
import { API_URL } from '@/config'
import path from 'path'
import fs from 'fs'
import { PaymentType } from '@/interfaces/payments.interface'

const supportedSizes = [
  '1024x1024',
  '1365x1024',
  '1024x1365',
  '1536x1024',
  '1024x1536',
  '1820x1024',
  '1024x1820',
  '1024x2048',
  '2048x1024',
  '1434x1024',
  '1024x1434',
  '1024x1280',
  '1280x1024',
  '1024x1707',
  '1707x1024',
]

export const generateTextToImage = async (
  prompt: string,
  model_type: string,
  num_images: number,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>,
  bot_name: string
): Promise<GenerationResult[]> => {
  try {
    const modelKey = model_type.toLowerCase()
    const modelConfig = IMAGES_MODELS[modelKey]
    console.log(modelConfig)
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 10) {
      await updateUserLevelPlusOne(telegram_id, level)
    }

    if (!modelConfig) {
      throw new Error(`Неподдерживаемый тип модели: ${model_type}`)
    }

    const totalCost = modelConfig.costPerImage * num_images
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: totalCost,
      is_ru,
      bot_name,
    })
    console.log(balanceCheck, 'balanceCheck')

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

    const aspect_ratio = await getAspectRatio(telegram_id)

    let size: string
    if (model_type.toLowerCase() === 'recraft v3') {
      const [widthRatio, heightRatio] = aspect_ratio.split(':').map(Number)
      const baseWidth = 1024
      const calculatedHeight = Math.round(
        (baseWidth / widthRatio) * heightRatio
      )

      const calculatedSize = `${baseWidth}x${calculatedHeight}`

      size = supportedSizes.includes(calculatedSize)
        ? calculatedSize
        : '1024x1024'
    } else {
      size = undefined
    }

    const input = {
      prompt,
      ...(size ? { size } : { aspect_ratio }),
    }
    console.log(input, 'input')

    const results: GenerationResult[] = []
    let successful_generations = 0

    for (let i = 0; i < num_images; i++) {
      try {
        const modelKey = Object.keys(IMAGES_MODELS).find(
          key => key === model_type.toLowerCase()
        ) as `${string}/${string}` | `${string}/${string}:${string}`
        console.log(modelKey, 'modelKey')
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

        const output: ApiImageResponse = (await replicate.run(modelKey, {
          input,
        })) as ApiImageResponse
        const imageUrl = await processApiResponse(output)

        const imageLocalPath = await saveFileLocally(
          telegram_id,
          imageUrl,
          'text-to-image',
          '.jpeg'
        )

        const imageLocalUrl = `${API_URL}/uploads/${telegram_id}/text-to-image/${path.basename(
          imageLocalPath
        )}`

        const prompt_id = await savePrompt(
          prompt,
          modelKey,
          ModeEnum.TextToImage,
          imageLocalUrl,
          telegram_id,
          'SUCCESS'
        )

        const image = await downloadFile(imageUrl)

        await bot.telegram.sendPhoto(telegram_id, {
          source: fs.createReadStream(imageLocalPath),
        })

        results.push({ image, prompt_id })
        successful_generations++

        await pulse(
          imageLocalPath,
          prompt,
          'text-to-image',
          telegram_id,
          username,
          is_ru,
          bot_name
        )
      } catch (error) {
        console.error(`Failed to generate image ${i + 1}:`, error)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `❌ Ошибка при генерации изображения ${i + 1}. Продолжаем...`
            : `❌ Error generating image ${i + 1}. Continuing...`
        )
      }
    }

    if (successful_generations > 0) {
      const finalCost = modelConfig.costPerImage * successful_generations
      const newBalance = initialBalance - finalCost

      console.log('Deducting balance:', {
        initialBalance,
        finalCost,
        newBalance,
        successful_generations,
      })

      try {
        await updateUserBalance(
          telegram_id,
          finalCost, // ← ИСПРАВЛЕНО: передаем сумму операции, а не новый баланс
          PaymentType.MONEY_OUTCOME,
          `Text-to-Image generation (${successful_generations}/${num_images} successful)`,
          {
            stars: finalCost,
            payment_method: 'Internal',
            bot_name: bot_name,
            language: is_ru ? 'ru' : 'en',
            service_type: ModeEnum.TextToImage, // ← ДОБАВЛЕНО: указываем тип сервиса
            category: 'REAL',
            cost: finalCost / 1.5, // ← ДОБАВЛЕНО: себестоимость (цена ÷ наценка 50%)
          }
        )
        console.log('Balance updated successfully')

        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `✅ Готово! Успешно сгенерировано ${successful_generations} из ${num_images} изображений.\nСписано: ${finalCost.toFixed(
                2
              )} ⭐️\nВаш новый баланс: ${newBalance.toFixed(2)} ⭐️`
            : `✅ Done! Successfully generated ${successful_generations} out of ${num_images} images.\nDeducted: ${finalCost.toFixed(
                2
              )} ⭐️\nYour new balance: ${newBalance.toFixed(2)} ⭐️`,
          {
            reply_markup: {
              keyboard: [
                [
                  { text: '1️⃣' },
                  { text: '2️⃣' },
                  { text: '3️⃣' },
                  { text: '4️⃣' },
                ],
                [
                  { text: is_ru ? '⬆️ Улучшить промпт' : '⬆️ Improve prompt' },
                  { text: is_ru ? '📐 Изменить размер' : '📐 Change size' },
                ],
                [{ text: is_ru ? '🏠 Главное меню' : '🏠 Main menu' }],
              ],
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }
        )
      } catch (updateError) {
        console.error(
          'Failed to update balance or send final notification',
          updateError
        )
        errorMessageAdmin(updateError as Error)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? '❌ Произошла ошибка при обновлении вашего баланса после генерации.'
            : '❌ An error occurred while updating your balance after generation.'
        )
      }
    } else {
      await bot.telegram.sendMessage(
        telegram_id,
        is_ru
          ? '❌ Не удалось сгенерировать изображения по вашему запросу.'
          : '❌ Failed to generate images for your request.'
      )
    }

    return results
  } catch (error) {
    console.error('Error generating images:', error)
    if (!error.message?.includes('Balance check failed')) {
      errorMessage(error as Error, telegram_id.toString(), is_ru)
    }
    errorMessageAdmin(error as Error)
    throw error
  }
}
