import { replicate } from '@/core/replicate'
import {
  getUserByTelegramId,
  updateUserBalance,
  updateUserLevelPlusOne,
  getUserBalance,
  createModelTraining,
  updateLatestModelTraining,
} from '@/core/supabase'
import { getBotByName } from '@/core/bot'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import { inngest } from '@/core/inngest-client/clients'
import { API_URL } from '@/config'
import { BalanceHelper } from '@/helpers/inngest'
import { getLatestModelUrl } from '@/core/replicate/getLatestModelUrl'
import { Training } from 'replicate'
import type { Prediction, Status } from 'replicate'

export interface ApiError extends Error {
  response?: {
    status: number
  }
}

interface TrainingResponse extends Training {
  id: string
  status: Status
  model: string
  version: string
  created_at: string
  completed_at?: string
  error?: any
}

const activeTrainings = new Map<string, { cancel: () => void }>()

// Локализованные сообщения
const TRAINING_MESSAGES = {
  start: {
    ru: '🔍 Начинаем обучение модели...',
    en: '🔍 Starting model training...',
  },
  success: (modelName: string) => ({
    ru: `🎉 Модель ${modelName} готова!`,
    en: `🎉 Model ${modelName} ready!`,
  }),
  error: (error: string) => ({
    ru: `❌ Ошибка: ${error}`,
    en: `❌ Error: ${error}`,
  }),
}

// Если стоимость фиксированная:
export const generateModelTraining = inngest.createFunction(
  {
    id: 'model-training',
    retries: 3,
    concurrency: { limit: 2, key: 'event.data.telegram_id' },
  },
  { event: 'model/training.start' },

  async ({ event, step }) => {
    // 🔄 Вспомогательные функции
    const { bot } = getBotByName(event.data.bot_name)
    if (!bot) {
      throw new Error(`❌ Бот ${event.data.bot_name} не найден`)
    }
    const helpers = {
      sendMessage: async (message: string) => {
        await step.run('send-message', async () => {
          try {
            await bot.telegram.sendMessage(event.data.telegram_id, message)
            return true
          } catch (error) {
            console.error('📩 Send failed:', error)
            return false
          }
        })
      },

      updateBalance: async (newBalance: number) => {
        return step.run('update-balance', async () => {
          const current = await getUserBalance(event.data.telegram_id)
          if (current === null) throw new Error('User not found')
          return updateUserBalance(event.data.telegram_id, newBalance)
        })
      },
    }

    // 🧩 Основные шаги процесса
    const trainingSteps = {
      validateInput: async () => {
        const { modelName, steps: rawSteps, is_ru } = event.data
        const steps = Number(rawSteps)

        if (isNaN(steps) || steps <= 0) {
          throw new Error(
            is_ru ? 'Некорректное количество шагов' : 'Invalid steps count'
          )
        }

        return { modelName, steps }
      },

      checkUserAndBalance: async () => {
        const { telegram_id } = event.data
        return Promise.all([
          step.run('get-user', async () => {
            const user = await getUserByTelegramId(telegram_id)
            return user || Promise.reject('User not found')
          }),
          step.run('get-balance', () => getUserBalance(telegram_id)),
        ])
      },

      createTrainingRecord: async () => {
        await step.run('create-training-record', async () => {
          return createModelTraining({
            telegram_id: event.data.telegram_id,
            model_name: event.data.modelName,
            trigger_word: event.data.triggerWord,
            zip_url: event.data.zipUrl,
            steps: event.data.steps,
          })
        })
      },

      createReplicateModel: async (modelName: string) => {
        const username = process.env.REPLICATE_USERNAME
        if (!username) throw new Error('REPLICATE_USERNAME not set')

        try {
          const existing = await replicate.models.get(username, modelName)
          console.log('🔵 Существующая модель:', existing.url)
          return `${username}/${modelName}`
        } catch (error) {
          console.log('🆕 Создание новой модели...')
          try {
            const newModel = await replicate.models.create(
              username,
              modelName,
              {
                description: `LoRA: ${event.data.triggerWord}`,
                visibility: 'public',
                hardware: 'gpu-t4',
              }
            )
            console.log('✅ Модель создана:', newModel.latest_version.id)
            await new Promise(resolve => setTimeout(resolve, 5000))
            return `${username}/${modelName}`
          } catch (createError) {
            console.error('❌ Ошибка создания модели:', createError)
            throw new Error('Failed to create model')
          }
        }
      },

      registerCancelHandler: (telegram_id: string, trainingId: string) => {
        const cancelProcess = {
          cancel: async () => {
            try {
              await replicate.trainings.cancel(trainingId)
              console.log(`❌ Training ${trainingId} canceled`)
            } catch (error) {
              console.error('Cancel error:', error)
            }
            activeTrainings.delete(telegram_id)
          },
        }
        activeTrainings.set(telegram_id, cancelProcess)
        console.log('🛑 Cancel handler registered for:', telegram_id)
      },

      startTraining: async (destination: string) => {
        if (!event.data.zipUrl || !event.data.triggerWord) {
          throw new Error(
            '❌ Отсутствуют обязательные параметры: zipUrl или triggerWord'
          )
        }
        const training: Prediction = await replicate.trainings.create(
          'ostris',
          'flux-dev-lora-trainer',
          'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497',
          {
            destination: destination as `${string}/${string}`,
            input: {
              input_images: event.data.zipUrl,
              trigger_word: event.data.triggerWord,
              steps: event.data.steps,
              lora_rank: 128,
              optimizer: 'adamw8bit',
              batch_size: 1,
              resolution: '512,768,1024',
              learning_rate: 0.0001,
              wandb_project: 'flux_train_replicate',
              webhook_url: `${API_URL}/webhooks/replicate`,
              webhook_events_filter: ['completed'],
            },
          }
        )
        console.log('🚀 Training ID:', training.id)
        trainingSteps.registerCancelHandler(event.data.telegram_id, training.id)
        return training
      },
    }
    let balanceCheck: { success?: boolean; currentBalance?: number } | null =
      null

    // 🚀 Основной процесс
    try {
      const { is_ru } = event.data
      await helpers.sendMessage(TRAINING_MESSAGES.start[is_ru ? 'ru' : 'en'])

      // 1. Валидация входных данных
      const { modelName, steps } = await trainingSteps.validateInput()

      // 2. Проверка пользователя и баланса
      const [user, initialBalance] = await trainingSteps.checkUserAndBalance()
      console.log(`👤 User ${user.id} | 💰 Balance: ${initialBalance}`)

      // 3. Обновление уровня при необходимости
      if (user.level === 0) {
        await step.run('update-level', () =>
          updateUserLevelPlusOne(event.data.telegram_id, 0)
        )
      }

      // 4. Расчет стоимости
      const paymentAmount = (
        modeCosts[ModeEnum.DigitalAvatarBody] as (steps: number) => number
      )(steps)

      // 5. Проверка баланса
      balanceCheck = await step.run('balance-check', async () => {
        const result = await BalanceHelper.checkBalance(
          event.data.telegram_id,
          paymentAmount,
          {
            notifyUser: true,
            botInstance: bot,
            isRu: event.data.is_ru,
          }
        )
        console.log('💰 Balance check result:', result)

        return {
          success: result.success,
          currentBalance: result.currentBalance,
        }
      })

      if (!balanceCheck.success) {
        console.log('🚫 Недостаточно средств:', balanceCheck.currentBalance)
        throw new Error('Insufficient balance')
      }

      // 6. Списание средств
      await helpers.updateBalance(balanceCheck.currentBalance - paymentAmount)

      // 7. Создание/проверка модели
      const destination = await trainingSteps.createReplicateModel(modelName)
      console.log('🎯 Destination:', destination)
      // 8. Создание записи о тренировке
      await trainingSteps.createTrainingRecord()
      console.log('📝 Запись о тренировке создана')
      // 9. Запуск обучения
      const training = await trainingSteps.startTraining(destination)
      console.log('🚀 Training ID:', training.id)

      // 1. Добавляем обработку промежуточных статусов
      const STATUS_HANDLERS = {
        processing: async () => {
          console.log('🔄 Training in progress...')
        },
        starting: async () => {
          console.log('🚀 Training starting...')
        },
        queued: async (trainingId: string) => {
          console.log('⏳ Training queued:', trainingId)
        },
      }

      // 2. Обновляем блок обработки статусов
      let status: Training['status'] = 'starting'
      let attempts = 0
      const MAX_ATTEMPTS = 100 // ~15 минут при 10s интервале

      // 1. Объявляем переменную вне цикла
      let updatedTraining: TrainingResponse | null = null

      while (
        status !== 'succeeded' &&
        status !== 'failed' &&
        status !== 'canceled' &&
        attempts < MAX_ATTEMPTS
      ) {
        await new Promise(resolve => setTimeout(resolve, 10000))

        // 2. Присваиваем значение объявленной переменной
        updatedTraining = await replicate.trainings.get(training.id)
        status = updatedTraining.status

        if (updatedTraining.error) {
          console.error('Training error details from Replicate:', {
            error: updatedTraining.error,
            status: updatedTraining.status,
            id: updatedTraining.id,
          })
        }

        // Обрабатываем известные промежуточные статусы
        if (STATUS_HANDLERS[status]) {
          await STATUS_HANDLERS[status](training.id)
        } else {
          console.warn(`⚠️ Unknown status: ${status}`)
        }

        // Обновляем статус в БД при каждом изменении
        await updateLatestModelTraining(
          event.data.telegram_id,
          modelName,
          {
            status: status.toUpperCase(),
            replicate_training_id: training.id,
          },
          'replicate'
        )

        attempts++
      }

      // 3. Добавляем обработку таймаута
      if (attempts >= MAX_ATTEMPTS) {
        console.error('⏰ Training timeout')
        await updateLatestModelTraining(
          event.data.telegram_id,
          modelName,
          {
            status: 'TIMEOUT',
            error: 'Training exceeded maximum duration',
          },
          'replicate'
        )
        throw new Error('Training timeout')
      }

      // 4. Унифицированная обработка финальных статусов
      const STATUS_ACTIONS = {
        succeeded: async () => {
          console.log('✅ Training succeeded')
          const model_url = await getLatestModelUrl(modelName)
          await updateLatestModelTraining(
            event.data.telegram_id,
            modelName,
            {
              status: 'SUCCESS',
              model_url,
            },
            'replicate'
          )
        },
        failed: async () => {
          console.error('❌ Training failed')
          await updateLatestModelTraining(
            event.data.telegram_id,
            modelName,
            {
              status: 'FAILED',
              error: updatedTraining?.error,
            },
            'replicate'
          )
        },
        canceled: async () => {
          console.log('🛑 Training canceled')
          await updateLatestModelTraining(
            event.data.telegram_id,
            modelName,
            {
              status: 'CANCELED',
            },
            'replicate'
          )
        },
      }

      if (STATUS_ACTIONS[status]) {
        await STATUS_ACTIONS[status]()
      } else {
        console.error('🚨 Unhandled final status:', status)
        await updateLatestModelTraining(
          event.data.telegram_id,
          modelName,
          {
            status: 'UNKNOWN',
            error: `Unexpected status: ${status}`,
          },
          'replicate'
        )
      }

      // 10. Возвращаем промежуточный результат
      return {
        success: true,
        message: 'Обучение начато. Вы получите уведомление по завершении.',
        trainingId: training.id,
      }
    } catch (error) {
      console.error('🔥 Critical Error:', error)

      // 4. Добавляем проверку через optional chaining
      if (balanceCheck?.success) {
        await helpers.updateBalance(balanceCheck.currentBalance)
      }

      await helpers.sendMessage(
        TRAINING_MESSAGES.error(error.message)[event.data.is_ru ? 'ru' : 'en']
      )

      if (activeTrainings.has(event.data.telegram_id)) {
        activeTrainings.get(event.data.telegram_id)?.cancel()
        console.log('🔄 Automatic cancel triggered')
      }

      throw error
    }
  }
)
