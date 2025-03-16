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

// Определяем типы для наших событий
interface TrainingEventData {
  bot_name: string
  is_ru: string | boolean
  modelName: string
  steps: string | number
  telegram_id: string
  triggerWord: string
  zipUrl: string
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

// Определяем функцию с правильной идемпотентностью
export const generateModelTraining = inngest.createFunction(
  {
    id: 'model-training',
    concurrency: 2,
  },
  { event: 'model/training.start' },
  async ({ event, step }) => {
    // Добавляем информативный лог о входящем событии
    console.log(
      `🛎️ Получено событие ID: ${event.id}, timestamp: ${new Date(
        event.ts
      ).toISOString()}`
    )
    console.log(
      `🎯 Ключ идемпотентности: train:${event.data.telegram_id}:${
        event.data.modelName
      }:${new Date().toISOString().split('T')[0]}`
    )

    // Приведение типов для event.data
    const eventData = event.data as TrainingEventData

    // 🔄 Вспомогательные функции
    console.log('🔵 event.data', eventData)
    const { bot } = getBotByName(eventData.bot_name)

    if (!bot) {
      throw new Error(`❌ Бот ${eventData.bot_name} не найден`)
    }
    const helpers = {
      sendMessage: async (message: string) => {
        await step.run('send-message', async () => {
          try {
            await bot.telegram.sendMessage(eventData.telegram_id, message)
            return true
          } catch (error) {
            console.error('📩 Send failed:', error)
            return false
          }
        })
      },

      updateBalance: async (newBalance: number) => {
        return step.run('update-balance', async () => {
          const current = await getUserBalance(eventData.telegram_id)
          if (current === null) throw new Error('User not found')
          await updateUserBalance(eventData.telegram_id, newBalance)
          return newBalance
        })
      },
    }

    // 🧩 Основные шаги процесса
    const trainingSteps = {
      validateInput: async () => {
        const { modelName, steps: rawSteps, is_ru } = eventData
        const steps = Number(rawSteps)

        if (isNaN(steps) || steps <= 0) {
          throw new Error(
            is_ru ? 'Некорректное количество шагов' : 'Invalid steps count'
          )
        }

        return { modelName, steps }
      },

      checkUserAndBalance: async () => {
        const { telegram_id } = eventData
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
          // Преобразуем steps в число
          const steps = Number(eventData.steps)

          const training = {
            telegram_id: eventData.telegram_id,
            model_name: eventData.modelName,
            trigger_word: eventData.triggerWord,
            zip_url: eventData.zipUrl,
            steps: steps, // Теперь гарантированно число
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
                description: `LoRA: ${eventData.triggerWord}`,
                visibility: 'public',
                hardware: 'gpu-t4',
              }
            )
            console.log('✅ Модель создана:', newModel.latest_version?.id)
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
        if (!eventData.zipUrl || !eventData.triggerWord) {
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
              input_images: eventData.zipUrl,
              trigger_word: eventData.triggerWord,
              steps: Number(eventData.steps), // Преобразуем в число
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
        trainingSteps.registerCancelHandler(eventData.telegram_id, training.id)
        return training
      },
    }
    let balanceCheck: { success?: boolean; currentBalance?: number } | null =
      null

    // 🚀 Основной процесс
    try {
      // Преобразуем is_ru к булевому типу если это строка
      const isRussian = eventData.is_ru === true || eventData.is_ru === 'true'
      await helpers.sendMessage(
        TRAINING_MESSAGES.start[isRussian ? 'ru' : 'en']
      )

      // 1. Валидация входных данных
      const { modelName, steps } = await trainingSteps.validateInput()

      // 2. Проверка пользователя и баланса
      const [user, initialBalance] = await trainingSteps.checkUserAndBalance()
      console.log(`👤 User ${user.id} | 💰 Balance: ${initialBalance}`)

      // 3. Обновление уровня при необходимости
      if (user.level === 0) {
        await step.run('update-level', () =>
          updateUserLevelPlusOne(eventData.telegram_id, 0)
        )
      }

      // 4. Расчет стоимости
      const paymentAmount = (
        modeCosts[ModeEnum.DigitalAvatarBody] as (steps: number) => number
      )(steps)

      // 5. Проверка баланса
      balanceCheck = await step.run('balance-check', async () => {
        const result = await BalanceHelper.checkBalance(
          eventData.telegram_id,
          paymentAmount,
          {
            notifyUser: true,
            botInstance: bot,
            isRu: isRussian,
          }
        )
        console.log('💰 Balance check result:', result)

        return {
          success: result.success,
          currentBalance: result.currentBalance,
        }
      })

      if (!balanceCheck?.success) {
        console.log('🚫 Недостаточно средств:', balanceCheck?.currentBalance)
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
                description: `LoRA: ${eventData.triggerWord}`,
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

      // 8. Запуск обучения с Replicate и отправка кнопки отмены
      const trainingResult = await step.run(
        'start-replicate-training',
        async () => {
          try {
            const training = await replicate.trainings.create(
              'ostris',
              'flux-dev-lora-trainer',
              'b6af14222e6bd9be257cbc1ea4afda3cd0503e1133083b9d1de0364d8568e6ef',
              {
                destination: destination as `${string}/${string}`,
                input: {
                  input_images: eventData.zipUrl,
                  trigger_word: eventData.triggerWord,
                  steps: Number(eventData.steps), // Преобразуем в число
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

            console.log('🚀 Тренировка запущена. ID:', training.id)
            console.log('📡 URL отмены:', training.urls?.cancel)

            // Отправляем сообщение с кнопкой отмены
            if (bot && training.urls?.cancel) {
              // Формируем payload для callback_data (с ограничением длины)
              const cancelPayload = `cancel_train:${training.id}`

              await bot.telegram.sendMessage(
                eventData.telegram_id,
                isRussian
                  ? `🔄 *Обучение модели началось*\n\nМодель: ${eventData.modelName}\nТриггер: \`${eventData.triggerWord}\`\n\nЭто займет 30-40 минут.\nВы можете отменить процесс кнопкой ниже.`
                  : `🔄 *Model training started*\n\nModel: ${eventData.modelName}\nTrigger: \`${eventData.triggerWord}\`\n\nIt will take 30-40 minutes.\nYou can cancel the process by the button below.`,
                {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: '❌ Отменить тренировку',
                          callback_data: cancelPayload,
                        },
                      ],
                    ],
                  },
                }
              )
            }

            return training
          } catch (error) {
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
          // Преобразуем steps в число
          const steps = Number(eventData.steps)

          const trainingRecord = await createModelTraining({
            telegram_id: eventData.telegram_id,
            model_name: eventData.modelName,
            trigger_word: eventData.triggerWord,
            zip_url: eventData.zipUrl,
            steps: steps, // Теперь гарантированно число
            replicate_training_id: trainingResult.id,
            cancel_url: trainingResult.urls?.cancel,
          })
          console.log('📝 Запись о тренировке создана', trainingRecord)
          return trainingRecord
        } catch (error) {
          console.error('📋 Ошибка создания записи:', error)
          throw error
        }
      })

      // Возвращаем результат
      return {
        success: true,
        message: 'Обучение запущено. Ожидайте уведомления.',
        trainingId: trainingResult.id,
      }
    } catch (error) {
      console.error('🔥 Critical Error:', error)

      // Добавляем проверку через optional chaining
      if (balanceCheck?.success) {
        await helpers.updateBalance(balanceCheck.currentBalance)
      }

      // Преобразуем is_ru к булевому типу если это строка
      const isRussian = eventData.is_ru === true || eventData.is_ru === 'true'

      await helpers.sendMessage(
        TRAINING_MESSAGES.error(error.message)[isRussian ? 'ru' : 'en']
      )

      if (activeTrainings.has(eventData.telegram_id)) {
        activeTrainings.get(eventData.telegram_id)?.cancel()
        console.log('🔄 Automatic cancel triggered')
      }

      throw error
    }
  }
)
