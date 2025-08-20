import { inngest } from '@/core/inngest-client/clients'
import { generateTextToImage } from '@/services/generateTextToImage'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

interface ImageGenerationData {
  prompt: string
  model: string
  num_images: number
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// План А - Inngest обертка для существующего сервиса generateTextToImage
export const generateTextToImageInngest = inngest.createFunction(
  {
    id: 'generate-text-to-image',
    concurrency: 5,
    idempotency: 'event.data.telegram_id + "-img-" + event.data.prompt.slice(0, 20)',
  },
  { event: 'image/text-to-image.start' },
  async ({ event, step }) => {
    const eventData = event.data as ImageGenerationData

    logger.info({
      message: 'План А - Inngest генерация текст-в-изображение',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      model: eventData.model,
    })

    return await step.run('generate-image', async () => {
      const { bot } = getBotByName(eventData.bot_name)
      
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Используем существующий сервис
      const results = await generateTextToImage(
        eventData.prompt,
        eventData.model,
        eventData.num_images,
        eventData.telegram_id,
        eventData.username,
        eventData.is_ru,
        bot
      )

      logger.info({
        message: 'План А - генерация завершена успешно',
        telegram_id: eventData.telegram_id,
        resultsCount: results.length,
      })

      return {
        success: true,
        results,
        message: 'Image generation completed via Inngest',
      }
    })
  }
)