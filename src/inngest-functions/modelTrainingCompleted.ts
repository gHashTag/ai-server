import { inngest } from '@/core/inngest/clients'
import { updateLatestModelTraining } from '@/core/supabase'
import { NotificationService } from '@/services'
import { getTrainingWithUser } from '@/core/supabase/getTrainingWithUser'
import { logger } from '@/utils/logger'
import type { TrainingCompletedEvent } from '@/interfaces/events'

const notificationService = new NotificationService()

export const modelTrainingCompleted = inngest.createFunction(
  {
    id: 'model-training-completed',
    name: 'Model Training Completed Handler',
    retries: 3,
  },
  {
    event: 'model/training.completed',
  },
  async ({ event, step }) => {
    const eventData = event.data as TrainingCompletedEvent['data']

    logger.info({
      message: '🎯 Processing model training completion',
      training_id: eventData.training_id,
      telegram_id: eventData.telegram_id,
      status: eventData.status,
      is_terminal: eventData.is_terminal,
    })

    // Получаем полную информацию о тренировке
    const training = await step.run('get-training-details', async () => {
      try {
        const trainingData = await getTrainingWithUser(eventData.training_id)

        if (!trainingData || !trainingData.users) {
          logger.error({
            message: '❌ Training not found in database',
            training_id: eventData.training_id,
          })
          throw new Error(`Training ${eventData.training_id} not found`)
        }

        logger.info({
          message: '✅ Training details retrieved',
          training_id: eventData.training_id,
          telegram_id: trainingData.users.telegram_id,
          model_name: trainingData.model_name,
        })

        return trainingData
      } catch (error) {
        logger.error({
          message: '❌ Error retrieving training details',
          error: error.message,
          training_id: eventData.training_id,
        })
        throw error
      }
    })

    // Обновляем статус в базе данных
    if (eventData.is_terminal) {
      await step.run('update-training-status', async () => {
        try {
          const updateData = {
            status: eventData.status === 'succeeded' ? 'SUCCESS' : 'FAILED',
            model_url: eventData.output?.version || eventData.output?.weights,
            error: eventData.error,
            replicate_training_id: eventData.training_id,
          }

          await updateLatestModelTraining(
            training.users.telegram_id.toString(),
            training.model_name,
            updateData,
            'replicate'
          )

          logger.info({
            message: '📝 Training status updated in database',
            training_id: eventData.training_id,
            status: updateData.status,
          })
        } catch (error) {
          logger.error({
            message: '❌ Error updating training status',
            error: error.message,
            training_id: eventData.training_id,
          })
          throw error
        }
      })
    }

    // Отправляем уведомления пользователю
    await step.run('send-notifications', async () => {
      try {
        const bot_name =
          eventData.bot_name || training.bot_name || training.users.bot_name
        const is_ru = training.users.language_code === 'ru'

        if (eventData.status === 'succeeded') {
          await notificationService.sendSuccessNotification(
            training.users.telegram_id.toString(),
            bot_name,
            is_ru
          )

          logger.info({
            message: '🎉 Success notification sent',
            training_id: eventData.training_id,
            telegram_id: training.users.telegram_id,
          })
        } else if (['failed', 'canceled'].includes(eventData.status)) {
          await notificationService.sendTrainingError(
            training.users.telegram_id.toString(),
            bot_name,
            eventData.error || 'Unknown error'
          )

          logger.info({
            message: '🚨 Error notification sent',
            training_id: eventData.training_id,
            telegram_id: training.users.telegram_id,
            error: eventData.error,
          })
        }
      } catch (error) {
        logger.error({
          message: '❌ Error sending notifications',
          error: error.message,
          training_id: eventData.training_id,
          telegram_id: training.users.telegram_id,
        })
        // Не бросаем ошибку, чтобы не блокировать обработку
      }
    })

    logger.info({
      message: '✅ Model training completion processed successfully',
      training_id: eventData.training_id,
      telegram_id: eventData.telegram_id,
      status: eventData.status,
    })

    return {
      success: true,
      training_id: eventData.training_id,
      status: eventData.status,
    }
  }
)
