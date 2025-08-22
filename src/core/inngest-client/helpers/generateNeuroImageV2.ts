import { inngest } from '../clients'
import { generateNeuroImageV2 } from '@/services/generateNeuroImageV2'
import { logger } from '@/utils/logger'

export const generateNeuroImageV2Inngest = inngest.createFunction(
  { 
    id: 'generate-neuro-image-v2',
    name: 'Generate Neuro Image V2 via Inngest'
  },
  { event: 'image/neuro-image-v2.start' },
  async ({ event, step }) => {
    const { 
      prompt, 
      num_images, 
      telegram_id, 
      is_ru, 
      bot_name 
    } = event.data

    logger.info({
      message: 'Inngest: Начинаем генерацию нейро-изображения V2',
      telegram_id,
      prompt: prompt.substring(0, 100),
      num_images,
      bot_name
    })

    return await step.run('generate-neuro-image-v2', async () => {
      try {
        const result = await generateNeuroImageV2(
          prompt,
          num_images,
          telegram_id,
          is_ru,
          bot_name
        )

        logger.info({
          message: 'Inngest: Нейро-изображение V2 успешно сгенерировано',
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
          message: 'Inngest: Ошибка при генерации нейро-изображения V2',
          telegram_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    })
  }
)