import { inngest } from '../core/inngest/clients'
import { getBotByName } from '@/core/bot'
import {
  getUserByTelegramId,
  updateUserBalance,
  updateUserLevelPlusOne,
  getUserBalance,
  createModelTrainingV2,
} from '@/core/supabase'
import { processBalanceOperation } from '@/price/helpers'
import { modeCosts, ModeEnum } from '@/price/helpers/modelsCost'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import axios from 'axios'
import { logger } from '@/utils/logger'

interface TrainingResponse {
  id: string
  status: string
  urls: { get: string }
  error?: string
  finetune_id?: string
}

// Функция для кодирования файла в base64
async function encodeFileToBase64(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  const buffer = Buffer.from(response.data)
  return buffer.toString('base64')
}

// Создаем Inngest функцию
export const modelTrainingV2 = inngest.createFunction(
  {
    id: 'model-training-v2',
    idempotency: 'event.data.idempotencyKey',
  },
  { event: 'model/training.v2.requested' },
  async ({ event, step }) => {
    logger.info({
      message: '🚀 Model training initiated',
      eventId: event.id,
      data: event.data,
    })

    const {
      zipUrl,
      triggerWord,
      modelName,
      steps,
      telegram_id,
      is_ru,
      bot_name,
    } = event.data

    // Проверяем существование пользователя в базе
    const userExists = await step.run('check-user-exists', async () => {
      logger.info({
        message: '🔍 Checking user existence',
        telegramId: telegram_id,
        step: 'check-user-exists',
      })

      const user = await getUserByTelegramId(telegram_id)
      if (!user) {
        logger.error({
          message: '❌ User not found',
          telegramId: telegram_id,
          step: 'check-user-exists',
        })
        throw new Error(`User with ID ${telegram_id} does not exist.`)
      }

      logger.info({
        message: '✅ User found',
        telegramId: telegram_id,
        userId: user.id,
        step: 'check-user-exists',
      })

      return user
    })

    // Увеличиваем уровень пользователя, если он на уровне 0
    if (userExists.level === 0) {
      await step.run('update-user-level', async () => {
        logger.info({
          message: '⬆️ Upgrading user level from 0 to 1',
          telegramId: telegram_id,
          currentLevel: userExists.level,
          step: 'update-user-level',
        })

        await updateUserLevelPlusOne(telegram_id, userExists.level)

        logger.info({
          message: '✅ User level updated successfully',
          telegramId: telegram_id,
          newLevel: 1,
          step: 'update-user-level',
        })
      })
    }

    // Получаем бот по имени
    const botData = (await step.run('get-bot', async () => {
      logger.info({
        message: '🤖 Getting bot instance',
        botName: bot_name,
        step: 'get-bot',
      })

      return getBotByName(bot_name)
    })) as { bot: any }

    // Извлекаем бота из результата функции getBotByName
    const bot = botData.bot

    // Проверяем баланс и рассчитываем стоимость
    const { currentBalance, paymentAmount } = await step.run(
      'check-balance',
      async () => {
        logger.info({
          message: '💰 Checking user balance',
          telegramId: telegram_id,
          step: 'check-balance',
        })

        const currentBalance = await getUserBalance(telegram_id)

        logger.info({
          message: '💲 Current user balance',
          telegramId: telegram_id,
          balance: currentBalance,
          step: 'check-balance',
        })

        const paymentAmount = (
          modeCosts[ModeEnum.DigitalAvatarBodyV2] as (steps: number) => number
        )(steps)

        logger.info({
          message: '🧮 Calculated payment amount',
          telegramId: telegram_id,
          paymentAmount: paymentAmount,
          trainingSteps: steps,
          step: 'check-balance',
        })

        const balanceCheck = await processBalanceOperation({
          telegram_id,
          paymentAmount,
          is_ru,
          bot,
        })

        if (!balanceCheck.success) {
          logger.error({
            message: '⚠️ Insufficient balance',
            telegramId: telegram_id,
            requiredAmount: paymentAmount,
            currentBalance: currentBalance,
            step: 'check-balance',
          })

          throw new Error('Not enough stars')
        }

        logger.info({
          message: '✅ Balance check successful',
          telegramId: telegram_id,
          currentBalance: currentBalance,
          requiredAmount: paymentAmount,
          step: 'check-balance',
        })

        return { currentBalance, paymentAmount }
      }
    )

    // Обновляем баланс пользователя
    await step.run('update-balance', async () => {
      logger.info({
        message: '💸 Deducting payment from user balance',
        telegramId: telegram_id,
        amount: paymentAmount,
        oldBalance: currentBalance,
        newBalance: currentBalance - paymentAmount,
        step: 'update-balance',
      })

      await updateUserBalance(telegram_id, currentBalance - paymentAmount)

      logger.info({
        message: '✅ Balance updated successfully',
        telegramId: telegram_id,
        newBalance: currentBalance - paymentAmount,
        step: 'update-balance',
      })
    })

    try {
      // Кодируем ZIP файл в base64
      const encodedZip = await step.run('encode-zip', async () => {
        logger.info({
          message: '📦 Encoding ZIP file to base64',
          zipUrl: zipUrl,
          step: 'encode-zip',
        })

        const result = await encodeFileToBase64(zipUrl)

        logger.info({
          message: '✅ ZIP file encoded successfully',
          zipUrl: zipUrl,
          step: 'encode-zip',
        })

        return result
      })

      // Отправляем запрос на API для создания модели
      const training = await step.run('create-training', async () => {
        logger.info({
          message: '🔍 Checking environment variables',
          step: 'create-training',
        })

        if (!process.env.BFL_API_KEY) {
          logger.error({
            message: '🚫 Missing required environment variable',
            variable: 'BFL_API_KEY',
            step: 'create-training',
          })

          throw new Error('BFL_API_KEY is not set')
        }
        if (!process.env.BFL_WEBHOOK_URL) {
          logger.error({
            message: '🚫 Missing required environment variable',
            variable: 'BFL_WEBHOOK_URL',
            step: 'create-training',
          })

          throw new Error('BFL_WEBHOOK_URL is not set')
        }
        if (!process.env.REPLICATE_USERNAME) {
          logger.error({
            message: '🚫 Missing required environment variable',
            variable: 'REPLICATE_USERNAME',
            step: 'create-training',
          })

          throw new Error('REPLICATE_USERNAME is not set')
        }

        logger.info({
          message: '🌐 Sending request to BFL API for model creation',
          telegramId: telegram_id,
          triggerWord: triggerWord,
          modelName: modelName,
          steps: steps,
          step: 'create-training',
        })

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

        logger.info({
          message: '📡 Received response from BFL API',
          statusCode: response.status,
          step: 'create-training',
        })

        if (!response.ok) {
          logger.error({
            message: '❌ Failed to create model training',
            statusCode: response.status,
            step: 'create-training',
          })

          throw new Error(
            `Failed to initiate training with new API. Status: ${response.status}`
          )
        }

        const jsonResponse = (await response.json()) as TrainingResponse

        logger.info({
          message: '🎉 Model training initiated successfully',
          finetune_id: jsonResponse.finetune_id,
          telegramId: telegram_id,
          modelName: modelName,
          step: 'create-training',
        })

        return jsonResponse
      })

      // Сохраняем информацию о тренировке в базу данных
      await step.run('save-training-to-db', async () => {
        logger.info({
          message: '💾 Saving training information to database',
          finetune_id: training.finetune_id,
          telegramId: telegram_id,
          modelName: modelName,
          step: 'save-training-to-db',
        })

        await createModelTrainingV2({
          finetune_id: training.finetune_id,
          telegram_id: telegram_id,
          model_name: modelName,
          trigger_word: triggerWord,
          zip_url: zipUrl,
          steps,
          api: 'bfl',
        })

        logger.info({
          message: '✅ Training information saved successfully',
          finetune_id: training.finetune_id,
          telegramId: telegram_id,
          modelName: modelName,
          step: 'save-training-to-db',
        })
      })

      // Отправляем уведомление пользователю
      await step.run('notify-user', async () => {
        logger.info({
          message: '📩 Sending notification to user',
          telegramId: telegram_id,
          modelName: modelName,
          step: 'notify-user',
        })

        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `✅ Обучение вашей модели "${modelName}" началось! Мы уведомим вас, когда модель будет готова.`
            : `✅ Your model "${modelName}" training has started! We'll notify you when it's ready.`
        )

        logger.info({
          message: '📨 Notification sent successfully',
          telegramId: telegram_id,
          step: 'notify-user',
        })
      })

      logger.info({
        message: '🏁 Model training process completed successfully',
        telegramId: telegram_id,
        modelName: modelName,
        finetune_id: training.finetune_id,
      })

      return {
        success: true,
        message: `Training initiated successfully: ${JSON.stringify(training)}`,
      }
    } catch (error) {
      // В случае ошибки возвращаем списанные средства
      await step.run('refund-balance', async () => {
        logger.info({
          message: '♻️ Refunding payment due to error',
          telegramId: telegram_id,
          amount: paymentAmount,
          currentBalance: currentBalance,
          newBalance: currentBalance + paymentAmount,
          step: 'refund-balance',
        })

        await updateUserBalance(telegram_id, currentBalance + paymentAmount)

        logger.info({
          message: '✅ Payment refunded successfully',
          telegramId: telegram_id,
          newBalance: currentBalance + paymentAmount,
          step: 'refund-balance',
        })
      })

      // Логируем ошибку и отправляем уведомления
      await step.run('handle-error', async () => {
        logger.error({
          message: '🚨 Error during model training',
          error: error.message,
          stack: error.stack,
          telegramId: telegram_id,
          modelName: modelName,
          triggerWord: triggerWord,
          step: 'handle-error',
        })

        // Отправляем уведомление пользователю
        logger.info({
          message: '📱 Sending error notification to user',
          telegramId: telegram_id,
          step: 'handle-error',
        })

        await bot.telegram.sendMessage(
          telegram_id,
          is_ru
            ? `❌ Произошла ошибка при генерации модели. Попробуйте еще раз.\n\nОшибка: ${error.message}`
            : `❌ An error occurred during model generation. Please try again.\n\nError: ${error.message}`
        )

        // Отправляем уведомление администратору
        logger.info({
          message: '👨‍💼 Sending error notification to admin',
          telegramId: telegram_id,
          error: error.message,
          step: 'handle-error',
        })

        errorMessageAdmin(error as Error)
      })

      logger.error({
        message: '🛑 Model training process failed',
        telegramId: telegram_id,
        modelName: modelName,
        error: error.message,
      })

      throw error
    }
  }
)
