import { inngest } from '@/core/inngest-client/clients'
import { updateLatestModelTraining } from '@/core/supabase'
import { getUserByTelegramId } from '@/core/supabase'
import { getBotByName } from '@/core/bot'

// Обработчик для события model.training.completed
export const handleTrainingCompletion = inngest.createFunction(
  {
    id: 'model-training-completion-handler',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'model.training.completed' },
  async ({ event, step }) => {
    // 1. Логируем получение события
    await step.run('log-event', () => {
      console.log(
        '🎯 Training Completion Event:',
        JSON.stringify(event, null, 2)
      )
      return event.data.status
    })

    // 2. Обновляем статус в базе данных
    if (event.data.status === 'succeeded') {
      await step.run('update-db', async () => {
        return updateLatestModelTraining(
          event.data.metadata.telegram_id,
          event.data.metadata.model_name,
          {
            status: 'SUCCESS',
            model_url: event.data.output?.model_url,
          },
          'replicate'
        )
      })
    }

    // 3. Отправляем уведомление пользователю
    await step.run('send-notification', async () => {
      const telegram_id = event.data.metadata.telegram_id

      const user = await getUserByTelegramId(telegram_id)
      if (!user) {
        throw new Error(`❌ Пользователь ${telegram_id} не найден`)
      }
      const { bot } = getBotByName(user.bot_name)
      if (!bot) {
        throw new Error(`❌ Бот ${user.bot_name} не найден`)
      }
      const isRu = user.language === 'ru'
      return bot.telegram.sendMessage(
        telegram_id,
        isRu
          ? `Модель ${event.data.metadata.model_name} готова! 🎉`
          : `Model ${event.data.metadata.model_name} is ready! 🎉`
      )
    })
  }
)
