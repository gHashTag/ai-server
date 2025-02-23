import { replicate } from '@/core/replicate'
import {
  getUserByTelegramId,
  updateUserBalance,
  updateLatestModelTraining,
  updateUserLevelPlusOne,
} from '@/core/supabase'
import { errorMessage } from '@/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { processBalanceOperation } from '@/price/helpers'
import { getUserBalance } from '@/core/supabase'
import { createModelTraining } from '@/core/supabase/'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'

export interface ApiError extends Error {
  response?: {
    status: number
  }
}

interface TrainingInput {
  steps: number
  lora_rank: number
  optimizer: string
  batch_size: number
  resolution: string
  autocaption: boolean
}

interface TrainingResponse {
  id: string
  status: string
  urls: { get: string }
  error?: string
}

interface ModelTrainingResult {
  model_id: string
  model_url?: string
}

const activeTrainings = new Map<string, { cancel: () => void }>()

async function getLatestModelUrl(modelName: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/models/ghashtag/${modelName}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch latest version id')
    }

    const data = await response.json()
    console.log('data:', data)
    const model_url = `ghashtag/${modelName}:${data.latest_version.id}`
    console.log('model_url:', model_url)
    return model_url
  } catch (error) {
    console.error('Error fetching latest model url:', error)
    throw error
  }
}

export async function generateModelTraining(
  zipUrl: string,
  triggerWord: string,
  modelName: string,
  steps: number,
  telegram_id: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
): Promise<ModelTrainingResult> {
  const userExists = await getUserByTelegramId(telegram_id)
  if (!userExists) {
    throw new Error(`User with ID ${telegram_id} does not exist.`)
  }
  const level = userExists.level
  if (level === 0) {
    await updateUserLevelPlusOne(telegram_id, level)
  }
  let currentTraining: TrainingResponse | null = null
  console.log(`currentTraining: ${currentTraining}`)
  const currentBalance = await getUserBalance(telegram_id)
  const paymentAmount = (
    modeCosts[ModeEnum.DigitalAvatarBody] as (steps: number) => number
  )(steps)

  const balanceCheck = await processBalanceOperation({
    telegram_id,
    paymentAmount,
    is_ru,
    bot,
  })

  if (!balanceCheck.success) {
    throw new Error('Not enough stars')
  }

  try {
    if (!process.env.REPLICATE_USERNAME) {
      throw new Error('REPLICATE_USERNAME is not set')
    }

    const destination: `${string}/${string}` = `${process.env.REPLICATE_USERNAME}/${modelName}`
    console.log('destination', destination)
    // Проверяем, существует ли модель
    let modelExists = false
    try {
      await replicate.models.get(process.env.REPLICATE_USERNAME, modelName)
      modelExists = true
    } catch (error) {
      if ((error as ApiError).response?.status !== 404) {
        throw error
      }
    }

    // Создаем модель, если она не существует
    if (!modelExists) {
      try {
        await replicate.models.create(
          process.env.REPLICATE_USERNAME,
          modelName,
          {
            description: `LoRA model trained with trigger word: ${triggerWord}`,
            visibility: 'public',
            hardware: 'gpu-t4',
          }
        )
      } catch (error) {
        console.error('Ошибка API при создании модели:', error.message)
        errorMessage(error as Error, telegram_id, is_ru)
        errorMessageAdmin(error as Error)
        throw error
      }
    }

    // Обновляем баланс пользователя после успешной проверки
    await updateUserBalance(telegram_id, currentBalance - paymentAmount)

    // Создаем запись о тренировке
    await createModelTraining({
      telegram_id: telegram_id,
      model_name: modelName,
      trigger_word: triggerWord,
      zip_url: zipUrl,
      steps,
    })

    // Создаем тренировку в Replicate
    currentTraining = await replicate.trainings.create(
      'ostris',
      'flux-dev-lora-trainer',
      'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497',
      {
        destination,
        input: {
          steps,
          lora_rank: 20,
          optimizer: 'adamw8bit',
          batch_size: 1,
          resolution: '512,768,1024',
          autocaption: true,
          input_images: zipUrl,
          trigger_word: triggerWord,
          learning_rate: 0.0004,
          wandb_project: 'flux_train_replicate',
        } as TrainingInput,
      }
    )

    // Добавляем возможность отмены
    const trainingProcess = {
      cancel: () => {
        activeTrainings.delete(telegram_id)
      },
    }
    activeTrainings.set(telegram_id, trainingProcess)

    // Обновляем запись с ID тренировки
    // await updateLatestModelTraining(telegram_id, modelName, {
    //   replicate_training_id: currentTraining.id,
    // })

    // Ждем завершения тренировки
    let status = currentTraining.status

    while (
      status !== 'succeeded' &&
      status !== 'failed' &&
      status !== 'canceled'
    ) {
      await new Promise(resolve => setTimeout(resolve, 10000))
      const updatedTraining = await replicate.trainings.get(currentTraining.id)
      status = updatedTraining.status

      if (updatedTraining.error) {
        console.error('Training error details from Replicate:', {
          error: updatedTraining.error,
          status: updatedTraining.status,
          id: updatedTraining.id,
        })
      }

      // Обновляем статус в базе
      await updateLatestModelTraining(telegram_id, modelName, { status })
    }

    if (status === 'failed') {
      console.log('CASE: failed')
      const failedTraining = await replicate.trainings.get(currentTraining.id)
      console.error('Training failed details:', {
        error: failedTraining.error,
        status: failedTraining.status,
        id: failedTraining.id,
        urls: failedTraining.urls,
      })

      // Возвращаем средства в случае неудачи
      await updateUserBalance(telegram_id, currentBalance + paymentAmount)

      throw new Error(
        `Training failed: ${failedTraining.error || 'Unknown error'}`
      )
    }

    if (status === 'canceled') {
      console.log('CASE: canceled')
      // Возвращаем средства в случае отмены
      await updateUserBalance(telegram_id, currentBalance + paymentAmount)
      bot.telegram.sendMessage(
        telegram_id,
        is_ru ? 'Генерация была отменена.' : 'Generation was canceled.',
        {
          reply_markup: { remove_keyboard: true },
        }
      )
      return {
        model_id: currentTraining.id,
      }
    }

    if (status === 'succeeded') {
      console.log('CASE: succeeded, currentTraining:', currentTraining)
      console.log('currentTraining.urls.get', currentTraining.urls.get)
      // Извлекаем модель и версию
      const model_url = await getLatestModelUrl(modelName)
      console.log('model_url:', model_url)
      await updateLatestModelTraining(telegram_id, modelName, {
        status: 'succeeded',
        model_url,
      })
      bot.telegram.sendMessage(
        telegram_id,
        is_ru
          ? `⏳ Модель ${modelName} успешно создана! Результаты работы можно проверить в разделе Нейрофото в главном меню.`
          : `⏳ Model ${modelName} successfully created! You can check the results of its work in the Neurophoto section in the main menu.`
      )
    }

    return {
      model_id: currentTraining.id,
      model_url: currentTraining.urls.get,
    }
  } catch (error) {
    // Возвращаем средства в случае ошибки
    await updateUserBalance(telegram_id, currentBalance + paymentAmount)
    console.error('Training error details:', {
      error,
      username: process.env.REPLICATE_USERNAME,
      modelName,
      triggerWord,
      trainingId: currentTraining?.id,
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
