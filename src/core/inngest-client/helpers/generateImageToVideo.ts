import { inngest } from '@/core/inngest-client/clients'
import { generateImageToVideo } from '@/services/generateImageToVideo'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

interface ImageToVideoData {
  imageUrl: string
  prompt: string
  videoModel: string
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// План А - Inngest обертка для существующего сервиса generateImageToVideo
export const generateImageToVideoInngest = inngest.createFunction(
  {
    id: 'generate-image-to-video',
    concurrency: 3,
    idempotency: 'event.data.telegram_id + "-img2vid-" + event.data.imageUrl.slice(-10)',
  },
  { event: 'video/image-to-video.start' },
  async ({ event, step }) => {
    const eventData = event.data as ImageToVideoData

    logger.info({
      message: 'План А - Inngest генерация изображение-в-видео',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      videoModel: eventData.videoModel,
    })

    return await step.run('generate-video-from-image', async () => {
      const { bot } = getBotByName(eventData.bot_name)
      
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Используем существующий сервис
      const result = await generateImageToVideo(
        eventData.imageUrl,
        eventData.prompt,
        eventData.videoModel,
        eventData.telegram_id,
        eventData.username,
        eventData.is_ru,
        bot
      )

      // Handle different return types from generateImageToVideo
      const videoPath = typeof result === 'string' ? result : (result as any).videoUrl || 'unknown'

      logger.info({
        message: 'План А - генерация видео из изображения завершена успешно',
        telegram_id: eventData.telegram_id,
        videoPath,
      })

      return {
        success: true,
        videoPath,
        message: 'Image-to-video generation completed via Inngest',
      }
    })
  }
)