import { inngest } from '../clients'
import { generateNeuroImage } from '@/services/generateNeuroImage'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

export const generateNeuroImageInngest = inngest.createFunction(
  { 
    id: 'generate-neuro-image',
    name: 'Generate Neuro Image via Inngest'
  },
  { event: 'image/neuro-image.start' },
  async ({ event, step }) => {
    const { 
      prompt, 
      model_url, 
      num_images, 
      telegram_id, 
      username, 
      is_ru, 
      bot_name 
    } = event.data

    logger.info({
      message: 'Inngest: Начинаем генерацию нейро-изображения',
      telegram_id,
      prompt: prompt.substring(0, 100),
      model_url,
      num_images,
      bot_name
    })

    return await step.run('generate-neuro-image', async () => {
      try {
        const { bot } = getBotByName(bot_name)
        
        const result = await generateNeuroImage(
          prompt,
          model_url,
          num_images,
          telegram_id,
          username,
          is_ru,
          bot
        )

        logger.info({
          message: 'Inngest: Нейро-изображение успешно сгенерировано',
          telegram_id,
          resultStatus: result ? 'success' : 'null'
        })

        return {
          success: true,
          result,
          telegram_id,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка при генерации нейро-изображения',
          telegram_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    })
  }
)