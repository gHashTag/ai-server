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
    // ВАЖНО: Используем REPLICATE_USERNAME из переменных окружения
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
      throw new Error('Failed to fetch latest version id')
    }

    const data = await response.json()
    console.log('data:', data)
    // Используем REPLICATE_USERNAME
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
    // Проверяем, существует ли модель
    let modelExists = false
    try {
      await replicate.models.get(username, modelName)
      modelExists = true
    } catch (error) {
      if ((error as ApiError).response?.status !== 404) {
        throw error
      }
    }

    // Создаем модель, если она не существует
    if (!modelExists) {
      try {
        await replicate.models.create(username, modelName, {
          description: `LoRA model trained with trigger word: ${triggerWord}`,
          visibility: 'public',
          hardware: 'gpu-t4',
        })
      } catch (error) {
        console.error('Ошибка API при создании модели:', error.message)
        errorMessage(error as Error, telegram_id, is_ru)
        errorMessageAdmin(error as Error)
        throw error
      }
    }

    // Обновляем баланс пользователя после успешной проверки
    await updateUserBalance(
      telegram_id,
      currentBalance - paymentAmount,
      'money_expense',
      `Списание за начало тренировки модели ${modelName}`,
      {
        service: 'modelTraining',
        modelName,
        steps,
        replicateUsername: username,
      }
    )

    // Создаем запись о тренировке
    await createModelTraining({
      telegram_id: telegram_id,
      model_name: modelName,
      trigger_word: triggerWord,
      zip_url: zipUrl,
      steps,
    })

    // Создаем тренировку в Replicate
    // ВАЖНО: Убедитесь, что имя пользователя и модель существуют
    currentTraining = await replicate.trainings.create(
      'ostris', // TODO: Замените на актуальное имя владельца модели, если 'ostris' неверно
      'flux-dev-lora-trainer', // Имя модели-тренера
      'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497', // Версия модели-тренера
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
        } as any, // Используем any временно, чтобы избежать проблем с типом TrainingInput, если он не совпадает
      }
    )

    // Добавляем возможность отмены
    const trainingProcess = {
      cancel: () => {
        activeTrainings.delete(telegram_id)
      },
    }
    activeTrainings.set(telegram_id, trainingProcess)

    // Обновляем запись с ID тренировки (закомментировано в оригинале)
    // await updateLatestModelTraining(telegram_id, modelName, {
    //   replicate_training_id: currentTraining.id,
    // })

    // Ждем завершения тренировки (!!! БЛОКИРУЮЩИЙ КОД !!!)
    let status = currentTraining.status

    while (
      status !== 'succeeded' &&
      status !== 'failed' &&
      status !== 'canceled'
    ) {
      await new Promise(resolve => setTimeout(resolve, 10000)) // Ждем 10 секунд
      const updatedTraining = await replicate.trainings.get(currentTraining.id)
      status = updatedTraining.status

      if (updatedTraining.error) {
        console.error('Training error details from Replicate:', {
          error: updatedTraining.error,
          status: updatedTraining.status,
          id: updatedTraining.id,
        })
      }
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
          error: failedTraining.error || 'Unknown error',
          trainingId: currentTraining?.id,
        }
      )

      throw new Error(
        `Training failed: ${failedTraining.error || 'Unknown error'}`
      )
    }

    if (status === 'canceled') {
      console.log('CASE: canceled')
      // Возвращаем средства в случае отмены
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
      await updateLatestModelTraining(
        telegram_id,
        modelName,
        {
          status: 'SUCCESS',
          model_url,
        },
        'replicate'
      )
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
    // Проверяем, был ли баланс уже списан (это произойдет, если ошибка случилась ПОСЛЕ updateUserBalance)
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
