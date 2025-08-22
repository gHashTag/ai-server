import { inngest } from '../clients'
import { generateImageToPrompt } from '@/services/generateImageToPrompt'
import { getBotByName } from '@/core/bot'
import { logger } from '@/utils/logger'

export const generateImageToPromptInngest = inngest.createFunction(
  { 
    id: 'generate-image-to-prompt',
    name: 'Generate Image to Prompt via Inngest'
  },
  { event: 'image/image-to-prompt.start' },
  async ({ event, step }) => {
    const { imageUrl, telegram_id, username, is_ru, bot_name } = event.data

    logger.info({
      message: 'Inngest: Начинаем генерацию промпта из изображения',
      telegram_id,
      imageUrl,
      bot_name
    })

    return await step.run('generate-image-to-prompt', async () => {
      try {
        const { bot } = getBotByName(bot_name)
        
        const result = await generateImageToPrompt(
          imageUrl,
          telegram_id,
          username,
          is_ru,
          bot
        )

        logger.info({
          message: 'Inngest: Промпт успешно сгенерирован',
          telegram_id,
          resultLength: result.length
        })

        return {
          success: true,
          result,
          telegram_id,
          timestamp: new Date().toISOString()
        }
      } catch (error) {
        logger.error({
          message: 'Inngest: Ошибка при генерации промпта',
          telegram_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    })
  }
)