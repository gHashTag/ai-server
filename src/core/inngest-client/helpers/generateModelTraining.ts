import { replicate } from '@/core/replicate'
import {
  getUserByTelegramId,
  updateUserBalance,
  updateUserLevelPlusOne,
  getUserBalance,
  createModelTraining,
} from '@/core/supabase'
import { getBotByName } from '@/core/bot'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import { inngest } from '@/core/inngest-client/clients'
import { API_URL } from '@/config'
import { BalanceHelper } from '@/helpers/inngest'

import type { Prediction } from 'replicate'

export interface ApiError extends Error {
  response?: {
    status: number
  }
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
          await updateUserBalance(event.data.telegram_id, newBalance)
          return newBalance
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

      createTrainingRecord: async (trainingId: string) => {
        await step.run('create-training-record', async () => {
          const training = {
            telegram_id: event.data.telegram_id,
            model_name: event.data.modelName,
            trigger_word: event.data.triggerWord,
            zip_url: event.data.zipUrl,
            steps: event.data.steps,
            replicate_training_id: trainingId,
          }
          console.log('🔵 Создание записи о тренировке', training)
          createModelTraining(training)
          return training
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
            },
            webhook: `${API_URL}/webhooks/replicate`,
            webhook_events_filter: ['completed'],
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

      // 7. Создание/проверка модели Replicate
      const destination = await step.run('create-replicate-model', async () => {
        try {
          const username = process.env.REPLICATE_USERNAME
          if (!username) throw new Error('REPLICATE_USERNAME не задан')

          console.log('🔍 Проверка существования модели', { modelName })
          try {
            const existing = await replicate.models.get(username, modelName)
            console.log('🔵 Существующая модель найдена:', existing.url)
            return `${username}/${modelName}`
          } catch (error) {
            console.log('🏗️ Создание новой модели...')
            const newModel = await replicate.models.create(
              username,
              modelName,
              {
                description: `LoRA: ${event.data.triggerWord}`,
                visibility: 'public',
                hardware: 'gpu-t4',
              }
            )
            console.log('✅ Новая модель создана:', newModel.url)
            return `${username}/${modelName}`
          }
        } catch (error) {
          console.error('❌ Ошибка создания/проверки модели:', error)
          throw error
        }
      })

      console.log('🎯 Модель определена:', destination)

      // 8. Запуск обучения с идемпотентностью
      const trainingResult = await step.run(
        'start-replicate-training',
        async () => {
          try {
            // Создаем идемпотентный ключ
            const idempotencyKey = `train_${event.data.telegram_id}_${
              event.data.modelName
            }_${Date.now()}`

            // Добавляем идемпотентный ключ в опциях запроса
            const requestOptions = {
              destination: destination,
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
              },
              webhook: `${API_URL}/webhooks/replicate`,
              webhook_events_filter: ['completed'],
              idempotency_key: idempotencyKey,
            }

            const training = await replicate.trainings.create(
              'ostris',
              'flux-dev-lora-trainer',
              'e440909d3512c31646ee2e0c7d6f6f4923224863a6a10c494606e79fb5844497',
              requestOptions as any
            )

            console.log('🚀 Тренировка запущена. ID:', training.id)
            return training
          } catch (error) {
            // Проверяем не дубликат ли это
            if (error.response?.status === 409) {
              console.log('⚠️ Обнаружен дублирующий запрос тренировки')

              // Используем официальное API для получения списка тренировок
              const trainingsResponse = await replicate.trainings.list()

              // Правильно обращаемся к results для получения массива
              if (
                trainingsResponse.results &&
                trainingsResponse.results.length > 0
              ) {
                console.log('♻️ Используем последнюю созданную тренировку')
                return trainingsResponse.results[0]
              }
            }

            console.error('💥 Ошибка старта тренировки:', error)
            throw error
          }
        }
      )

      console.log('🚀 Тренировка создана:', trainingResult.id)

      // 9. Создание записи о тренировке
      await step.run('create-training-record', async () => {
        try {
          // Используем существующую функцию из проекта
          const trainingRecord = await createModelTraining({
            telegram_id: event.data.telegram_id,
            model_name: event.data.modelName,
            trigger_word: event.data.triggerWord,
            zip_url: event.data.zipUrl,
            steps: event.data.steps,
            replicate_training_id: trainingResult.id,
          })

          console.log('📝 Запись о тренировке создана', trainingRecord)
          return { success: true }
        } catch (error) {
          console.error('📋 Ошибка создания записи:', error)
          throw error
        }
      })

      // 2. Возвращаем immediate response
      return {
        success: true,
        message: 'Обучение запущено. Ожидайте уведомления.',
        trainingId: trainingResult.id,
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
