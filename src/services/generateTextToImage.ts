import { ApiImageResponse, GenerationResult } from '@/interfaces'
import { replicate } from '@/core/replicate'
import { getAspectRatio, savePrompt } from '@/core/supabase'
import { downloadFile } from '@/helpers/downloadFile'
import { processApiResponse } from '@/helpers/processApiResponse'
import { pulse } from '@/helpers/pulse'
import { getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { IMAGES_MODELS } from '@/helpers/IMAGES_MODELS'
import { ModeEnum } from '@/price/helpers/modelsCost'
import { processBalanceOperation } from '@/price/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { errorMessage } from '@/helpers'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { saveFileLocally } from '@/helpers/saveFileLocally'
import { API_URL } from '@/config'
import path from 'path'
import fs from 'fs'

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

    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: modelConfig.costPerImage * num_images,
      is_ru,
      bot,
      bot_name,
      description: `Payment for generating ${num_images} image${
        num_images === 1 ? '' : 's'
      } with prompt: ${prompt.substring(0, 30)}...`,
    })
    console.log(balanceCheck, 'balanceCheck')

    if (!balanceCheck.success) {
      throw new Error('Not enough stars')
    }

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

        // Сохраняем изображение на сервере
        const imageLocalPath = await saveFileLocally(
          telegram_id,
          imageUrl,
          'text-to-image',
          '.jpeg'
        )

        // Генерируем URL для доступа к изображению
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
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `Ваши изображения сгенерированы!\n\nЕсли хотите сгенерировать еще, то выберите количество изображений в меню 1️⃣, 2️⃣, 3️⃣, 4️⃣.\n\nВаш новый баланс: ${balanceCheck.newBalance.toFixed(
                2
              )} ⭐️`
            : `Your images have been generated!\n\nGenerate more?\n\nYour new balance: ${balanceCheck.newBalance.toFixed(
                2
              )} ⭐️`,
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

        await pulse(
          imageLocalPath,
          prompt,
          `/${model_type}`,
          telegram_id,
          username,
          is_ru
        )

        results.push({ image, prompt_id })
      } catch (error) {
        console.error(`Попытка не удалась для изображения ${i + 1}:`, error)

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
        throw error
      }
    }

    return results
  } catch (error) {
    console.error('Error generating images:', error)
    errorMessage(error as Error, telegram_id.toString(), is_ru)
    errorMessageAdmin(error as Error)
    throw error
  }
}
