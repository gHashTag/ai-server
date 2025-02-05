import bot from '@/core/bot'
import { replicate } from '@/core/replicate'
import {
  updateModelTraining,
  supabase,
  updateUserBalance,
} from '@/core/supabase'
import { errorMessage } from '@/helpers'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { processBalanceOperation } from '@/price/helpers'
import { calculateTrainingCostInStars } from '@/price/helpers'
import { getUserBalance } from '@/core/supabase'
import { createModelTraining } from '@/core/supabase/'

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
  modelFile: Buffer // Или другой тип, который вы используете для файла модели
}

const activeTrainings = new Map<string, { cancel: () => void }>()

export async function generateModelTraining(
  zipUrl: string,
  triggerWord: string,
  modelName: string,
  steps: number,
  telegram_id: string,
  is_ru: boolean
): Promise<ModelTrainingResult> {
  const userExists = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegram_id)
    .single()
  if (!userExists.data) {
    throw new Error(`User with ID ${telegram_id} does not exist.`)
  }

  let currentTraining: TrainingResponse | null = null
  const currentBalance = await getUserBalance(Number(telegram_id))
  const trainingCostInStars = calculateTrainingCostInStars(steps)
  const balanceCheck = await processBalanceOperation({
    telegram_id: Number(telegram_id),
    paymentAmount: trainingCostInStars,
    is_ru,
  })

  if (!balanceCheck.success) {
    throw new Error('Not enough stars')
  }

  try {
    if (!process.env.REPLICATE_USERNAME) {
      throw new Error('REPLICATE_USERNAME is not set')
    }

    const destination: `${string}/${string}` = `${process.env.REPLICATE_USERNAME}/${modelName}`

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
    await updateUserBalance(
      Number(telegram_id),
      currentBalance - trainingCostInStars
    )

    // Создаем запись о тренировке
    await createModelTraining({
      user_id: telegram_id,
      model_name: modelName,
      trigger_word: triggerWord,
      zip_url: zipUrl,
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
    await updateModelTraining(telegram_id, modelName, {
      replicate_training_id: currentTraining.id,
    })

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
      await updateModelTraining(telegram_id, modelName, { status })
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
        Number(telegram_id),
        currentBalance + trainingCostInStars
      )

      throw new Error(
        `Training failed: ${failedTraining.error || 'Unknown error'}`
      )
    }

    if (status === 'canceled') {
      console.log('CASE: canceled')
      // Возвращаем средства в случае отмены
      await updateUserBalance(
        Number(telegram_id),
        currentBalance + trainingCostInStars
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
        modelFile: Buffer.from(''),
      }
    }

    if (status === 'succeeded') {
      console.log('CASE: succeeded')
      console.log('currentTraining.urls.get', currentTraining.urls.get)
      await updateModelTraining(telegram_id, modelName, {
        status: 'succeeded',
        model_url: currentTraining.urls.get,
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
      modelFile: Buffer.from(''),
    }
  } catch (error) {
    // Возвращаем средства в случае ошибки
    await updateUserBalance(
      Number(telegram_id),
      currentBalance + trainingCostInStars
    )
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
