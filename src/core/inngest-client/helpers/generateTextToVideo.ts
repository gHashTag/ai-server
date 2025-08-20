import { inngest } from '@/core/inngest-client/clients'
import { generateTextToVideo } from '@/services/generateTextToVideo'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

interface TextToVideoData {
  prompt: string
  videoModel: string
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// План А - Inngest обертка для существующего сервиса generateTextToVideo
export const generateTextToVideoInngest = inngest.createFunction(
  {
    id: 'generate-text-to-video',
    concurrency: 3,
    idempotency: 'event.data.telegram_id + "-video-" + event.data.prompt.slice(0, 15)',
  },
  { event: 'video/text-to-video.start' },
  async ({ event, step }) => {
    const eventData = event.data as TextToVideoData

    logger.info({
      message: 'План А - Inngest генерация текст-в-видео',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      videoModel: eventData.videoModel,
    })

    return await step.run('generate-video', async () => {
      const { bot } = getBotByName(eventData.bot_name)
      
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Используем существующий сервис
      const result = await generateTextToVideo(
        eventData.prompt,
        eventData.videoModel,
        eventData.telegram_id,
        eventData.username,
        eventData.is_ru,
        bot,
        eventData.bot_name
      )

      logger.info({
        message: 'План А - генерация видео завершена успешно',
        telegram_id: eventData.telegram_id,
        videoPath: result.videoLocalPath,
      })

      return {
        success: true,
        videoPath: result.videoLocalPath,
        message: 'Video generation completed via Inngest',
      }
    })
  }
)