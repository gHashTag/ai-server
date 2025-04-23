import { replicate } from '@/core/replicate'
import {
  getUserByTelegramId,
  updateUserBalance,
  updateLatestModelTraining,
  updateUserLevelPlusOne,
  supabase,
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
    const username = process.env.REPLICATE_USERNAME
    if (!username) {
      throw new Error('REPLICATE_USERNAME is not set in environment variables')
    }
    const response = await fetch(
      `https://api.replicate.com/v1/models/${username}/${modelName}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(
          `Model ${username}/${modelName} not found or has no version yet.`
        )
        throw new Error(
          `Model ${username}/${modelName} not found or has no version yet.`
        )
      }
      throw new Error(
        `Failed to fetch latest version id, status: ${response.status}`
      )
    }

    const data = await response.json()
    console.log('data:', data)
    if (!data.latest_version?.id) {
      throw new Error(
        `Latest version ID not found for model ${username}/${modelName}`
      )
    }
    const model_url = `${username}/${modelName}:${data.latest_version.id}`
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
    type: 'Training',
    description: `Проверка баланса перед тренировкой ${modelName}`,
  })

  if (!balanceCheck.success) {
    throw new Error('Not enough stars')
  }

  try {
    const username = process.env.REPLICATE_USERNAME
    if (!username) {
      throw new Error('REPLICATE_USERNAME is not set')
    }

    const destination: `${string}/${string}` = `${username}/${modelName}`
    console.log('destination', destination)
    let modelExists = false
    try {
      console.log(`Checking if model exists: ${username}/${modelName}`)
      await replicate.models.get(username, modelName)
      console.log(`Model ${username}/${modelName} exists.`)
      modelExists = true
    } catch (error) {
      if ((error as ApiError).response?.status === 404) {
        console.log(
          `Model ${username}/${modelName} does not exist. Creating...`
        )
        modelExists = false
      } else {
        console.error('Error checking model existence:', error)
        throw error
      }
    }

    if (!modelExists) {
      try {
        console.log(`Creating model ${username}/${modelName}...`)
        await replicate.models.create(username, modelName, {
          description: `LoRA model trained with trigger word: ${triggerWord}`,
          visibility: 'public',
          hardware: 'gpu-t4',
        })
        console.log(`Model ${username}/${modelName} created.`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      } catch (error) {
        console.error('Ошибка API при создании модели:', error.message)
        errorMessage(error as Error, telegram_id, is_ru)
        errorMessageAdmin(error as Error)
        throw error
      }
    }

    await updateUserBalance(
      telegram_id,
      currentBalance - paymentAmount,
      'money_expense',
      `Списание за начало тренировки модели ${modelName}`,
      {
        service: 'modelTraining',
        modelName,
        steps,
        paymentAmount,
        replicateUsername: username,
      }
    )

    const dbTrainingRecord = await createModelTraining({
      telegram_id: telegram_id,
      model_name: modelName,
      trigger_word: triggerWord,
      zip_url: zipUrl,
      steps,
      status: 'starting',
    })
    console.log(`Created DB training record ID: ${dbTrainingRecord.id}`)

    console.log(`Starting Replicate training for model ${destination}...`)
    currentTraining = await replicate.trainings.create(
      'ostris',
      'flux-dev-lora-trainer',
      'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497',
      {
        destination,
        input: {
          steps,
          lora_rank: 128,
          optimizer: 'adamw8bit',
          batch_size: 1,
          resolution: '512,768,1024',
          autocaption: true,
          input_images: zipUrl,
          trigger_word: triggerWord,
          learning_rate: 0.0001,
          wandb_project: 'flux_train_replicate',
        },
      }
    )
    console.log(`Replicate training started. ID: ${currentTraining.id}`)

    await supabase
      .from('model_trainings')
      .update({
        replicate_training_id: currentTraining.id,
        status: 'processing',
      })
      .eq('id', dbTrainingRecord.id)

    const trainingProcess = {
      cancel: () => {
        activeTrainings.delete(telegram_id)
      },
    }
    activeTrainings.set(telegram_id, trainingProcess)

    let status = currentTraining.status
    console.log(`Initial training status: ${status}, ID: ${currentTraining.id}`)

    while (
      status !== 'succeeded' &&
      status !== 'failed' &&
      status !== 'canceled'
    ) {
      console.log(
        `Waiting for training ${currentTraining.id} to complete... Current status: ${status}`
      )
      await new Promise(resolve => setTimeout(resolve, 15000))
      const updatedTraining = await replicate.trainings.get(currentTraining.id)
      status = updatedTraining.status

      if (updatedTraining.error) {
        console.error(
          `Training ${currentTraining.id} error details from Replicate:`,
          {
            error: updatedTraining.error,
            status: updatedTraining.status,
          }
        )
      }
    }
    console.log(
      `Training ${currentTraining.id} finished with status: ${status}`
    )

    if (status === 'failed') {
      console.error('Training failed details:', {
        error: (await replicate.trainings.get(currentTraining.id)).error,
        status: status,
        id: currentTraining.id,
      })

      await updateUserBalance(
        telegram_id,
        currentBalance,
        'money_income',
        `Возврат средств за неудачную тренировку ${modelName}`,
        {
          service: 'modelTraining',
          modelName,
          steps,
          reason: 'failed',
          error:
            (await replicate.trainings.get(currentTraining.id)).error ||
            'Unknown error',
          trainingId: currentTraining?.id,
        }
      )
      await supabase
        .from('model_trainings')
        .update({
          status: 'failed',
          error:
            (await replicate.trainings.get(currentTraining.id)).error ||
            'Unknown error',
        })
        .eq('replicate_training_id', currentTraining.id)

      throw new Error(
        `Training failed: ${
          (await replicate.trainings.get(currentTraining.id)).error ||
          'Unknown error'
        }`
      )
    }

    if (status === 'canceled') {
      console.log('Training canceled')
      await updateUserBalance(
        telegram_id,
        currentBalance,
        'money_income',
        `Возврат средств за отмененную тренировку ${modelName}`,
        {
          service: 'modelTraining',
          modelName,
          steps,
          reason: 'canceled',
          trainingId: currentTraining?.id,
        }
      )
      await supabase
        .from('model_trainings')
        .update({ status: 'canceled' })
        .eq('replicate_training_id', currentTraining.id)

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
      console.log('Training succeeded!')
      const model_url = await getLatestModelUrl(modelName)
      console.log('Latest model URL:', model_url)
      await updateLatestModelTraining(
        telegram_id,
        modelName,
        {
          status: 'SUCCESS',
          model_url,
          replicate_training_id: currentTraining.id,
        },
        'replicate'
      )
      await supabase
        .from('model_trainings')
        .update({ status: 'SUCCESS', model_url: model_url })
        .eq('replicate_training_id', currentTraining.id)

      bot.telegram.sendMessage(
        telegram_id,
        is_ru
          ? `⏳ Модель ${modelName} успешно создана! Результаты работы можно проверить в разделе Нейрофото в главном меню.`
          : `⏳ Model ${modelName} successfully created! You can check the results of its work in the Neurophoto section in the main menu.`
      )
      return {
        model_id: currentTraining.id,
        model_url: model_url,
      }
    }
  } catch (error) {
    const balanceAfterPotentialCharge = await getUserBalance(telegram_id)
    if (balanceAfterPotentialCharge < currentBalance) {
      await updateUserBalance(
        telegram_id,
        currentBalance,
        'money_income',
        `Возврат средств за ошибку тренировки ${modelName}`,
        {
          service: 'modelTraining',
          modelName,
          steps,
          reason: 'error',
          errorMessage: error.message,
          trainingId: currentTraining?.id,
        }
      )
    }
    console.error('Training error details:', {
      error,
      username: process.env.REPLICATE_USERNAME,
      modelName,
      triggerWord,
      trainingId: currentTraining?.id,
    })

    if (currentTraining?.id) {
      await supabase
        .from('model_trainings')
        .update({ status: 'failed', error: error.message })
        .eq('replicate_training_id', currentTraining.id)
    } else {
      const { data: latestTraining } = await supabase
        .from('model_trainings')
        .select('id')
        .eq('telegram_id', telegram_id)
        .eq('model_name', modelName)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (latestTraining) {
        await supabase
          .from('model_trainings')
          .update({ status: 'failed', error: error.message })
          .eq('id', latestTraining.id)
      }
    }

    bot.telegram.sendMessage(
      telegram_id,
      is_ru
        ? `Произошла ошибка при генерации модели. Попробуйте еще раз.\n\nОшибка: ${error.message}`
        : `An error occurred during model generation. Please try again.\n\nError: ${error.message}`
    )
    errorMessageAdmin(error as Error)
    if ((error as ApiError).response?.status === 404) {
      throw new Error(
        `Ошибка при создании или доступе к модели Replicate. Проверьте REPLICATE_USERNAME (${process.env.REPLICATE_USERNAME}) и права доступа.`
      )
    }
    throw error
  } finally {
    activeTrainings.delete(telegram_id)
  }
}
