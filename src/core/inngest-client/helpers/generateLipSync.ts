import { inngest } from '../clients'
import { generateLipSync } from '@/services/generateLipSync'
import { logger } from '@/utils/logger'

export const generateLipSyncInngest = inngest.createFunction(
  { 
    id: 'generate-lip-sync',
    name: 'Generate Lip Sync via Inngest'
  },
  { event: 'video/lip-sync.start' },
  async ({ event, step }) => {
    const { 
      telegram_id, 
      video, 
      audio, 
      is_ru 
    } = event.data

    logger.info({
      message: 'Inngest: Начинаем генерацию лип-синка',
      telegram_id,
      video: video.substring(0, 100),
      audio: audio.substring(0, 100),
      is_ru
    })

    return await step.run('generate-lip-sync', async () => {
      try {
        const result = await generateLipSync(
          telegram_id,
          video,
          audio,
          is_ru
        )

        logger.info({
          message: 'Inngest: Лип-синк успешно запущен',
          telegram_id,
          resultType: typeof result
        })

        return {
          success: true,
          result,
          telegram_id,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка при генерации лип-синка',
          telegram_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    })
  }
)