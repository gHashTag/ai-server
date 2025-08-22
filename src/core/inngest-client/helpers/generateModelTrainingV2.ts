import { inngest } from '../clients'
import { generateModelTrainingV2 } from '@/services/generateModelTrainingV2'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

export const generateModelTrainingV2Inngest = inngest.createFunction(
  { 
    id: 'generate-model-training-v2',
    name: 'Generate Model Training V2 via Inngest'
  },
  { event: 'training/model-training-v2.start' },
  async ({ event, step }) => {
    const { 
      zipUrl, 
      triggerWord, 
      modelName, 
      steps, 
      telegram_id, 
      is_ru, 
      bot_name 
    } = event.data

    logger.info({
      message: 'Inngest: Начинаем обучение модели V2',
      telegram_id,
      modelName,
      triggerWord,
      steps,
      bot_name
    })

    return await step.run('generate-model-training-v2', async () => {
      try {
        const { bot } = getBotByName(bot_name)
        
        const result = await generateModelTrainingV2(
          zipUrl,
          triggerWord,
          modelName,
          steps,
          telegram_id,
          is_ru,
          bot
        )

        logger.info({
          message: 'Inngest: Обучение модели V2 успешно запущено',
          telegram_id,
          success: result.success,
          result_message: result.message
        })

        return {
          success: true,
          result,
          telegram_id,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка при обучении модели V2',
          telegram_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    })
  }
)