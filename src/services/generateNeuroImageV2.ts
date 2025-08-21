import { getAspectRatio, saveNeuroPhotoPrompt } from '../core/supabase/ai'
import {
  getUserByTelegramId,
  updateUserLevelPlusOne,
  getFineTuneIdByTelegramId,
  updateUserBalance,
  supabase, // ← ДОБАВЛЕНО: импорт supabase для запроса тренировок
} from '@/core/supabase'
import { API_URL } from '@/config'
import { GenerationResult } from '@/interfaces'

import { processBalanceOperation } from '@/price/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'

import { ModeEnum } from '@/interfaces/modes'
import { calculateModeCost } from '@/price/helpers/modelsCost'
import { getBotByName } from '@/core/bot'
import { MyContext } from '@/interfaces'
import { Telegraf } from 'telegraf'
import { PaymentType } from '@/interfaces/payments.interface'

export async function generateNeuroImageV2(
  prompt: string,
  num_images: number,
  telegram_id: string,
  is_ru: boolean,
  bot_name: string,
  gender?: string // ← ДОБАВЛЕНО: параметр gender (опциональный)
): Promise<GenerationResult | null> {
  let bot: Telegraf<MyContext>
  try {
    console.log('telegram_id', telegram_id)
    console.log('is_ru', is_ru)
    console.log('bot_name', bot_name)
    console.log('prompt', prompt)
    console.log('num_images', num_images)

    bot = getBotByName(bot_name).bot

    const userExists = await getUserByTelegramId(telegram_id)

    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }
    const level = userExists.level
    if (level === 1) {
      await updateUserLevelPlusOne(telegram_id, level)
    }

    // ← ДОБАВЛЕНО: Получаем gender из параметра или из базы данных
    let userGender = gender
    if (!userGender) {
      // Если gender не передан, пытаемся получить из пользователя
      userGender = userExists.gender

      // Если и в пользователе нет, пытаемся получить из последней тренировки
      if (!userGender) {
        const { data: lastTraining } = await supabase
          .from('model_trainings')
          .select('gender')
          .eq('telegram_id', telegram_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        userGender = lastTraining?.gender
      }
    }

    console.log('🎭 Gender для генерации:', userGender || 'НЕ ОПРЕДЕЛЕН')
    // Расчет стоимости
    let costPerImage: number
    // ГАРАНТИЯ: BASE_COSTS[ModeEnum.NeuroPhotoV2] всегда число, не функция
    costPerImage =
      Number(calculateModeCost({ mode: ModeEnum.NeuroPhotoV2 }).stars) || 0
    if (isNaN(costPerImage) || costPerImage <= 0) {
      console.error(
        '[generateNeuroImageV2] costPerImage is NaN or <= 0:',
        costPerImage
      )
      costPerImage = 0
    }
    const totalCost = costPerImage * num_images

    // Вызываем обновленную функцию проверки баланса
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: totalCost,
      is_ru,
      bot_name,
    })

    // Обрабатываем результат проверки баланса
    if (!balanceCheck.success) {
      if (balanceCheck.error) {
        try {
          await bot.telegram.sendMessage(
            telegram_id.toString(),
            balanceCheck.error
          )
        } catch (notifyError) {
          console.error(
            'Failed to send balance error notification to user (V2)',
            { telegramId: telegram_id, error: notifyError }
          )
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
    const finetune_id = await getFineTuneIdByTelegramId(telegram_id)
    console.log('finetuneId', finetune_id)

    // --- ЛОГИКА ЗАПУСКА ГЕНЕРАЦИИ BFL ---
    // ← ИСПРАВЛЕНО: Формируем промпт с учетом gender
    const genderPrompt =
      userGender === 'male'
        ? 'handsome man, masculine features'
        : userGender === 'female'
        ? 'beautiful woman, feminine features'
        : 'person' // fallback если gender не определен

    const input = {
      finetune_id,
      finetune_strength: 2,
      prompt: `Fashionable ${genderPrompt}: ${prompt}. Cinematic Lighting, realistic, intricate details, extremely detailed, incredible details, full colored, complex details, insanely detailed and intricate, hypermaximalist, extremely detailed with rich colors. Masterpiece, best quality, aerial view, HDR, UHD, unreal engine, Representative, fair skin, beautiful face, Rich in details, high quality, gorgeous, glamorous, 8K, super detail, gorgeous light and shadow, detailed decoration, detailed lines.`,
      aspect_ratio,
      ...(aspect_ratio === '1:1'
        ? { width: 1024, height: 1024 }
        : aspect_ratio === '16:9'
        ? { width: 1368, height: 768 }
        : aspect_ratio === '9:16'
        ? { width: 768, height: 1368 }
        : { width: 1024, height: 1024 }),
      safety_tolerance: 0,
      output_format: 'jpeg',
      prompt_upsampling: true,
      webhook_url: `${API_URL}/webhooks/webhook-bfl-neurophoto`,
      webhook_secret: process.env.BFL_WEBHOOK_SECRET as string,
    }
    let successful_starts = 0
    const task_ids: string[] = []

    // Цикл запуска генераций
    for (let i = 0; i < num_images; i++) {
      try {
        if (num_images > 1) {
          await bot.telegram.sendMessage(
            telegram_id,
            is_ru
              ? `⏳ Запуск генерации V2 ${i + 1} из ${num_images}`
              : `⏳ Starting V2 generation ${i + 1} of ${num_images}`
          )
        } else {
          await bot.telegram.sendMessage(
            telegram_id,
            is_ru
              ? '⏳ Запуск генерации V2...'
              : '⏳ Starting V2 generation...',
            { reply_markup: { remove_keyboard: true } }
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
        console.log('response', response)

        if (!response.ok) {
          const errorData = await response.text()
          console.error('BFL API Error:', response.status, errorData)
          throw new Error(
            `BFL API request failed with status ${response.status}`
          )
        }

        const data = await response.json()
        console.log(`BFL response V2 (${i + 1}):`, data)
        // Логируем, есть ли sample/url в data
        if (data?.sample || data?.url) {
          console.log(
            'BFL API returned image sample/url:',
            data.sample || data.url
          )
        } else {
          console.warn('BFL API did NOT return image sample/url')
        }
        task_ids.push(data.id) // Сохраняем ID задачи

        // Сохраняем промпт с ID задачи BFL
        await saveNeuroPhotoPrompt(
          data.id,
          prompt,
          ModeEnum.NeuroPhotoV2,
          telegram_id,
          data.status // 'PENDING' или другой начальный статус
        )
        // --- ДОБАВИТЬ: логика скачивания/сохранения фото, если реализована ---
        // Например:
        // const localPath = await saveFileLocally(...)
        // console.log('Saved image locally at:', localPath)
        // ---
        successful_starts++
      } catch (startError) {
        console.error(`Error starting generation V2 ${i + 1}:`, startError)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `❌ Ошибка при запуске генерации V2 ${i + 1}.`
            : `❌ Error starting V2 generation ${i + 1}.`
        )
        errorMessageAdmin(startError as Error) // Логируем админу
        // Не прерываем цикл, если не удалось запустить одну из генераций
      }
    }

    // --- СПИСАНИЕ СРЕДСТВ И ФИНАЛЬНОЕ УВЕДОМЛЕНИЕ (ПОСЛЕ ЦИКЛА ЗАПУСКА) ---
    if (successful_starts > 0) {
      let finalCost = costPerImage * successful_starts
      let newBalance = Number(initialBalance) - finalCost
      if (isNaN(finalCost)) {
        console.error(
          '[generateNeuroImageV2] finalCost is NaN:',
          finalCost,
          'costPerImage:',
          costPerImage,
          'successful_starts:',
          successful_starts
        )
        finalCost = 0
      }
      if (isNaN(newBalance)) {
        console.error(
          '[generateNeuroImageV2] newBalance is NaN:',
          newBalance,
          'initialBalance:',
          initialBalance,
          'finalCost:',
          finalCost
        )
        newBalance = 0
      }

      console.log('Deducting balance (NeuroImageV2):', {
        initialBalance,
        finalCost,
        newBalance,
        successful_starts,
      })

      try {
        await updateUserBalance(
          telegram_id,
          finalCost,
          PaymentType.MONEY_OUTCOME,
          `NeuroPhotoV2 generation start (${successful_starts}/${num_images} started)`,
          {
            stars: finalCost,
            payment_method: 'Internal',
            service_type: ModeEnum.NeuroPhotoV2,
            bot_name: bot_name,
            language: is_ru ? 'ru' : 'en',
            cost: finalCost / 1.5, // себестоимость
            // operation_id: task_ids.join(','), // Можно сохранить ID задач
          }
        )
        console.log('Balance updated successfully (NeuroImageV2)')

        // Отправляем финальное сообщение о ЗАПУСКЕ
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `✅ Успешно запущено ${successful_starts} из ${num_images} генераций V2! Ожидайте результат.\nСписано: ${(
                Number(finalCost) || 0
              ).toFixed(2)} ⭐️\nВаш новый баланс: ${(
                Number(newBalance) || 0
              ).toFixed(2)} ⭐️`
            : `✅ Successfully started ${successful_starts} out of ${num_images} V2 generations! Please wait for the result.\nDeducted: ${(
                Number(finalCost) || 0
              ).toFixed(2)} ⭐️\nYour new balance: ${(
                Number(newBalance) || 0
              ).toFixed(2)} ⭐️`
        )
      } catch (updateError) {
        console.error(
          'Failed to update balance or send start notification (NeuroImageV2)',
          updateError
        )
        errorMessageAdmin(updateError as Error)
        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? '❌ Произошла ошибка при обновлении вашего баланса после запуска генерации.'
            : '❌ An error occurred while updating your balance after starting generation.'
        )
      }
    } else {
      await bot.telegram.sendMessage(
        telegram_id,
        is_ru
          ? '❌ Не удалось запустить генерации V2 по вашему запросу.'
          : '❌ Failed to start V2 generations for your request.'
      )
    }

    return null // Возвращаем null, т.к. результат придет через вебхук
  } catch (error) {
    console.error(`Error generating NeuroImageV2:`, error)
    if (bot && !error.message?.includes('Balance check failed')) {
      // Отправляем сообщение об ошибке, если bot инициализирован
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
          ? '❌ Произошла ошибка при генерации V2.'
          : '❌ An error occurred during V2 generation.'
      }
      try {
        await bot.telegram.sendMessage(telegram_id, errorMessageToUser)
      } catch (notifyError) {
        console.error(
          'Failed to send generic error notification (V2)',
          notifyError
        )
      }
    }
    errorMessageAdmin(error as Error)
    // Не бросаем ошибку, возвращаем null
    // throw error;
    return null
  }
}
