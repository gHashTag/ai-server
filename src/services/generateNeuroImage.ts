import { replicate } from '../core/replicate'
import { getAspectRatio } from '../core/supabase/ai'
import { savePrompt } from '../core/supabase/savePrompt'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  updateUserBalance,
} from '@/core/supabase'
import { processApiResponse } from '@/helpers/processApiResponse'
import { GenerationResult } from '@/interfaces'
import { saveFileLocally } from '@/helpers'
import { pulse } from '@/helpers/pulse'
import { processBalanceOperation } from '@/price/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { getBotByName } from '@/core/bot'
import { ModeEnum } from '@/interfaces/modes'
import { calculateModeCost, BASE_COSTS } from '@/price/helpers/modelsCost'
import path from 'path'
import { API_URL } from '@/config'
import fs from 'fs'
import { PaymentType } from '@/interfaces/payments.interface'

export async function generateNeuroImage(
  prompt: string,
  model_url: `${string}/${string}` | `${string}/${string}:${string}`,
  num_images: number,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot_name: string
): Promise<GenerationResult[] | null> {
  console.log('>>> generateNeuroImage called with args:', {
    prompt,
    model_url,
    num_images,
    telegram_id,
    username,
    is_ru,
    bot_name,
  })
  try {
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 1) {
      await updateUserLevelPlusOne(telegram_id, level)
    }

    // Расчет стоимости
    // 1. Получаем базовую стоимость за одно изображение NeuroPhoto
    const baseCostEntry = BASE_COSTS[ModeEnum.NeuroPhoto]
    if (typeof baseCostEntry !== 'number') {
      // Это не должно произойти для NeuroPhoto, но на всякий случай
      console.error(
        `Error: Cost for ModeEnum.NeuroPhoto is not a number. Found: ${baseCostEntry}`
      )
      throw new Error('Failed to determine cost for NeuroPhoto.')
    }
    const costPerSingleImage = baseCostEntry

    // 2. Рассчитываем общую стоимость для проверки баланса
    const totalCostForBalanceCheck = costPerSingleImage * num_images

    // Вызываем обновленную функцию проверки баланса
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: totalCostForBalanceCheck, // Используем новую общую стоимость
      is_ru,
      bot_name,
    })

    const botCandidate = getBotByName(bot_name)

    // Извлекаем сам экземпляр бота и проверяем его
    const botInstance = botCandidate.bot

    if (
      !botInstance ||
      !('telegram' in botInstance) ||
      typeof botInstance.telegram.sendMessage !== 'function'
    ) {
      console.error(
        `Error: Bot instance not found, invalid, or missing critical methods for bot_name: ${bot_name}. Error from getBotByName: ${botCandidate.error}`
      )
      // errorMessageAdmin(new Error(`Bot instance not found or invalid for ${bot_name} in generateNeuroImage. Details: ${botCandidate.error}`)); // опционально
      throw new Error(
        `Bot instance not found, invalid, or missing critical methods for bot_name: ${bot_name}. Details: ${
          botCandidate.error || 'Unknown error'
        }`
      )
    }

    // Обрабатываем результат проверки баланса
    if (!balanceCheck.success) {
      if (balanceCheck.error) {
        try {
          await botInstance.telegram.sendMessage(
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
    // Сохраняем текущий баланс
    const initialBalance = balanceCheck.currentBalance

    const aspect_ratio = await getAspectRatio(telegram_id)
    const results: GenerationResult[] = []
    const input = {
      prompt: `Fashionable: ${prompt}. Cinematic Lighting, realistic, intricate details, extremely detailed, incredible details, full colored, complex details, insanely detailed and intricate, hypermaximalist, extremely detailed with rich colors. Masterpiece, best quality, aerial view, HDR, UHD, unreal engine, Representative, fair skin, beautiful face, Rich in details, high quality, gorgeous, glamorous, 8K, super detail, gorgeous light and shadow, detailed decoration, detailed lines.`,
      negative_prompt: 'nsfw, erotic, violence, bad anatomy...',
      num_inference_steps: 40,
      guidance_scale: 3,
      lora_scale: 1,
      megapixels: '1',
      output_quality: 80,
      prompt_strength: 0.8,
      extra_lora_scale: 1,
      go_fast: false,
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
    let successful_generations = 0

    // --- ЦИКЛ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЙ ---
    for (let i = 0; i < num_images; i++) {
      try {
        // ... (уведомление о начале генерации i-го изображения) ...
        if (num_images > 1) {
          botInstance.telegram.sendMessage(
            telegram_id,
            is_ru
              ? `⏳ Генерация изображения ${i + 1} из ${num_images}`
              : `⏳ Generating image ${i + 1} of ${num_images}`
          )
        } else {
          botInstance.telegram.sendMessage(
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
          await botInstance.telegram.sendMessage(
            telegram_id,
            is_ru
              ? `❌ Не удалось сгенерировать изображение ${i + 1}.`
              : `❌ Failed to generate image ${i + 1}.`
          )
          continue // Пропускаем итерацию, если не удалось получить URL
        }

        // ... (логика сохранения файла локально, в supabase, отправки pulse) ...
        const imageLocalPath = await saveFileLocally(
          telegram_id,
          imageUrl,
          'neuro-photo',
          '.jpeg'
        )
        const imageLocalUrl = `${API_URL}/uploads/${telegram_id}/neuro-photo/${path.basename(
          imageLocalPath
        )}`
        const prompt_id = await savePrompt(
          prompt,
          model_url,
          ModeEnum.NeuroPhoto,
          imageLocalUrl,
          telegram_id,
          'SUCCESS'
        )
        await pulse(
          imageLocalPath,
          prompt,
          `/${model_url}`,
          telegram_id,
          username,
          is_ru,
          bot_name
        )

        if (prompt_id === null) {
          console.error(`Failed to save prompt for image ${i + 1}`)
          await botInstance.telegram.sendMessage(
            telegram_id,
            is_ru
              ? `❌ Ошибка сохранения данных для изображения ${i + 1}.`
              : `❌ Error saving data for image ${i + 1}.`
          )
          continue // Пропускаем, если не удалось сохранить промпт
        }

        // Отправляем изображение пользователю СРАЗУ
        await botInstance.telegram.sendPhoto(telegram_id, {
          source: fs.createReadStream(imageLocalPath),
        })

        // Сохраняем результат
        results.push({ image: imageLocalUrl, prompt_id }) // Сохраняем URL
        successful_generations++
      } catch (error) {
        console.error(`Error during generation of image ${i + 1}:`, error)
        // Обработка ошибок, включая NSFW
        let errorMessageToUser = '❌ Произошла ошибка.'
        if (error.message && error.message.includes('NSFW content detected')) {
          errorMessageToUser = is_ru
            ? '❌ Обнаружен NSFW контент. Пожалуйста, попробуйте другой запрос.'
            : '❌ NSFW content detected. Please try another prompt.'
        } else if (error.message) {
          const match = error.message.match(/{"detail":"(.*?)"/)
          if (match && match[1]) {
            errorMessageToUser = is_ru
              ? `❌ Ошибка генерации: ${match[1]}`
              : `❌ Generation error: ${match[1]}`
          }
        } else {
          errorMessageToUser = is_ru
            ? `❌ Ошибка при генерации изображения ${i + 1}.`
            : `❌ An error occurred generating image ${i + 1}.`
        }
        await botInstance.telegram.sendMessage(telegram_id, errorMessageToUser)
        errorMessageAdmin(error as Error) // Логируем админу
        // Не прерываем цикл
      }
    }

    // --- СПИСАНИЕ СРЕДСТВ И ФИНАЛЬНОЕ УВЕДОМЛЕНИЕ (ПОСЛЕ ЦИКЛА) ---
    if (successful_generations > 0) {
      // Используем costPerSingleImage, полученный ранее
      const finalCost = costPerSingleImage * successful_generations
      const newBalance = initialBalance - finalCost

      console.log('Deducting balance (NeuroImage):', {
        initialBalance,
        finalCost,
        newBalance,
        successful_generations,
      })

      try {
        await updateUserBalance(
          telegram_id,
          newBalance,
          PaymentType.MONEY_OUTCOME,
          `NeuroPhoto generation (${successful_generations}/${num_images} successful)`,
          {
            stars: finalCost,
            payment_method: 'Internal',
            bot_name: bot_name,
            language: is_ru ? 'ru' : 'en',
            // operation_id: ???
          }
        )
        console.log('Balance updated successfully (NeuroImage)')

        // Отправляем финальное сообщение
        await botInstance.telegram.sendMessage(
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
          'Failed to update balance or send final notification (NeuroImage)',
          updateError
        )
        errorMessageAdmin(updateError as Error)
        await botInstance.telegram.sendMessage(
          telegram_id,
          is_ru
            ? '❌ Произошла ошибка при обновлении вашего баланса после генерации.'
            : '❌ An error occurred while updating your balance after generation.'
        )
      }
    } else {
      await botInstance.telegram.sendMessage(
        telegram_id,
        is_ru
          ? '❌ Не удалось сгенерировать изображения по вашему запросу.'
          : '❌ Failed to generate images for your request.'
      )
    }

    // Возвращаем результаты или null
    return results.length > 0 ? results : null // Или вернуть весь массив? Уточни логику.
  } catch (error) {
    // ... (общая обработка ошибок) ...
    console.error(`Error generating NeuroImage:`, error)
    if (!error.message?.includes('Balance check failed')) {
      // errorMessage(error as Error, telegram_id.toString(), is_ru); // Возможно, уже отправлено в цикле
    }
    errorMessageAdmin(error as Error) // Всегда логируем админу
    // Не бросаем ошибку, чтобы бот не падал (?) или бросаем?
    // throw error;
    return null // Возвращаем null при любой ошибке верхнего уровня
  }
}
