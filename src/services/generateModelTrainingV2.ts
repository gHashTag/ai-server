import {
  getUserByTelegramId,
  updateUserBalance,
  updateUserLevelPlusOne,
} from '@/core/supabase'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { processBalanceOperation } from '@/price/helpers'
import { getUserBalance } from '@/core/supabase'
import { createModelTrainingV2 } from '@/core/supabase/createModelTrainingV2'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import axios from 'axios'
import ApiError from '@/utils/ApiError'

if (!process.env.BFL_API_KEY) {
  throw new Error('BFL_API_KEY is not set')
}
if (!process.env.BFL_WEBHOOK_URL) {
  throw new Error('BFL_WEBHOOK_URL is not set')
}

interface TrainingResponse {
  id: string
  status: string
  urls: { get: string }
  error?: string
}

const activeTrainings = new Map<string, { cancel: () => void }>()

async function encodeFileToBase64(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data)
  return buffer.toString('base64')
}

export async function generateModelTrainingV2(
  zipUrl: string,
  triggerWord: string,
  modelName: string,
  steps: number,
  telegram_id: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>,
  bot_name: string
): Promise<{ success: boolean; message: string }> {
  const userExists = await getUserByTelegramId(telegram_id)
  if (!userExists) {
    throw new Error(`User with ID ${telegram_id} does not exist.`)
  }
  const level = userExists.level
  if (level === 0) {
    await updateUserLevelPlusOne(telegram_id, level)
  }
  const currentTraining: TrainingResponse | null = null
  console.log(`currentTraining: ${currentTraining}`)
  const currentBalance = await getUserBalance(telegram_id)
  const paymentAmount = (
    modeCosts[ModeEnum.DigitalAvatarBodyV2] as (steps: number) => number
  )(steps)
  console.log(`paymentAmount: ${paymentAmount}`)
  const balanceCheck = await processBalanceOperation({
    telegram_id,
    paymentAmount,
    is_ru,
    bot,
    bot_name,
    description: `Payment for model training ${modelName} (steps: ${steps})`,
  })

  if (!balanceCheck.success) {
    throw new Error('Not enough stars')
  }

  try {
    if (!process.env.REPLICATE_USERNAME) {
      throw new Error('REPLICATE_USERNAME is not set')
    }

    const encodedZip = await encodeFileToBase64(zipUrl)

    // Создаем тренировку с использованием нового API
    const response = await fetch('https://api.us1.bfl.ai/v1/finetune', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Key': process.env.BFL_API_KEY,
      },
      body: JSON.stringify({
        file_data: encodedZip,
        finetune_comment: telegram_id,
        trigger_word: triggerWord,
        mode: 'character',
        iterations: steps,
        learning_rate: 0.000001,
        captioning: true,
        priority: 'high_res_only',
        finetune_type: 'full',
        lora_rank: 32,
        webhook_url: process.env.BFL_WEBHOOK_URL,
        webhook_secret: process.env.BFL_WEBHOOK_SECRET,
      }),
    })
    console.log('🎉 response:', response)

    if (!response.ok) {
      throw new Error('Failed to initiate training with new API')
    }

    const currentTraining = await response.json()

    // Создаем запись о тренировке
    await createModelTrainingV2({
      finetune_id: currentTraining.finetune_id,
      telegram_id: telegram_id,
      model_name: modelName,
      trigger_word: triggerWord,
      zip_url: zipUrl,
      steps,
      api: 'bfl',
    })
    console.log('🎉 Training initiated successfully:', currentTraining)

    return {
      success: true,
      message: `Training initiated successfully: ${JSON.stringify(
        currentTraining
      )}`,
    }
  } catch (error) {
    // Возвращаем средства в случае ошибки
    await updateUserBalance(
      telegram_id,
      currentBalance + paymentAmount,
      paymentAmount,
      'income',
      `Refund for model training ${modelName} (steps: ${steps})`,
      {
        stars: paymentAmount,
        payment_method: 'Training',
        bot_name,
        language: is_ru ? 'ru' : 'en',
      }
    )
    console.error('Training error details:', {
      error,
      modelName,
      triggerWord,
    })
    bot.telegram.sendMessage(
      telegram_id,
      is_ru
        ? `Произошла ошибка при генерации модели. Попробуйте еще раз.\n\nОшибка: ${error.message}`
        : `An error occurred during model generation. Please try again.\n\nError: ${error.message}`
    )
    errorMessageAdmin(error as Error)
    if ((error as ApiError).response?.status === 404) {
      throw new Error(
        `Ошибка при создании или доступе к модели. Проверьте REPLICATE_USERNAME (${process.env.REPLICATE_USERNAME}) и права доступа.`
      )
    }
    throw error
  } finally {
    // Удаляем процесс из активных после завершения
    activeTrainings.delete(telegram_id)
  }
}
