import { replicate } from '../core/replicate'
import { getAspectRatio, savePrompt } from '../core/supabase/ai'

import { processApiResponse } from '@/helpers/processApiResponse'
import { GenerationResult } from '@/interfaces'
import { downloadFile } from '@/helpers/downloadFile'

import { pulse } from '@/helpers/pulse'
import {
  imageNeuroGenerationCost,
  processBalanceOperation,
} from '@/price/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

export async function generateNeuroImage(
  prompt: string,
  model_url: `${string}/${string}` | `${string}/${string}:${string}`,
  num_images: number,
  telegram_id: number,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
): Promise<GenerationResult | null> {
  try {
    console.log('CASE: generateNeuroImage', bot)
    // Проверка баланса для всех изображений
    const totalCost = imageNeuroGenerationCost * num_images
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: totalCost,
      is_ru,
    })
    if (!balanceCheck.success) {
      throw new Error(balanceCheck.error)
    }

    const aspect_ratio = await getAspectRatio(telegram_id)
    const results: GenerationResult[] = []
    const input = {
      prompt: `Fashionable: ${prompt}`,
      negative_prompt: 'nsfw, erotic, violence, bad anatomy...',
      num_inference_steps: 28,
      guidance_scale: 2,
      ...(aspect_ratio === '1:1'
        ? { width: 1024, height: 1024 }
        : aspect_ratio === '16:9'
        ? { width: 1368, height: 768 }
        : aspect_ratio === '9:16'
        ? { width: 768, height: 1368 }
        : { width: 1024, height: 1024 }),
      sampler: 'flowmatch',
      num_outputs: 1,
      aspect_ratio,
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

      const output = await replicate.run(model_url, { input })
      const imageUrl = await processApiResponse(output)

      if (!imageUrl || imageUrl.endsWith('empty.zip')) {
        console.error(`Failed to generate image ${i + 1}`)
        continue
      }

      const image = await downloadFile(imageUrl)
      const prompt_id = await savePrompt(
        prompt,
        model_url,
        imageUrl,
        telegram_id
      )

      if (prompt_id === null) {
        console.error(`Failed to save prompt for image ${i + 1}`)
        continue
      }

      // Отправляем каждое изображение
      const imageBuffer = Buffer.isBuffer(image) ? image : Buffer.from(image)
      await bot.telegram.sendPhoto(telegram_id, { source: imageBuffer })

      // Сохраняем результат
      results.push({ image, prompt_id })

      // Отправляем в pulse
      const pulseImage = Buffer.isBuffer(image)
        ? `data:image/jpeg;base64,${image.toString('base64')}`
        : image
      await pulse(
        pulseImage,
        prompt,
        `/${model_url}`,
        telegram_id,
        username,
        is_ru
      )
    }

    await bot.telegram.sendMessage(
      telegram_id,
      is_ru
        ? `Ваши изображения сгенерированы!\n\nЕсли хотите сгенерировать еще, то выберите количество изображений в меню 1️⃣, 2️⃣, 3️⃣, 4️⃣.\n\nСтоимость: ${(
            imageNeuroGenerationCost * num_images
          ).toFixed(
            2
          )} ⭐️\nВаш новый баланс: ${balanceCheck.newBalance.toFixed(2)} ⭐️`
        : `Your images have been generated!\n\nGenerate more?\n\nCost: ${(
            imageNeuroGenerationCost * num_images
          ).toFixed(
            2
          )} ⭐️\nYour new balance: ${balanceCheck.newBalance.toFixed(2)} ⭐️`,
      {
        reply_markup: {
          keyboard: [
            [{ text: '1️⃣' }, { text: '2️⃣' }, { text: '3️⃣' }, { text: '4️⃣' }],
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

    return results[0] || null
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
