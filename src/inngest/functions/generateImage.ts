import { inngest } from '../client'
import { replicate } from '@/core/replicate'
import { getAspectRatio, getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { IMAGES_MODELS } from '@/helpers/IMAGES_MODELS'
import { processBalanceOperation } from '@/price/helpers'
import { processApiResponse } from '@/helpers/processApiResponse'
import { pulse } from '@/helpers/pulse'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'

const supportedSizes = [
  '1024x1024', '1365x1024', '1024x1365', '1536x1024', '1024x1536',
  '1820x1024', '1024x1820', '1024x2048', '2048x1024', '1434x1024',
  '1024x1434', '1024x1280', '1280x1024', '1024x1707', '1707x1024',
]

interface ImageGenerationData {
  prompt: string
  model_type: string
  num_images: number
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

export const generateImageInngest = inngest.createFunction(
  {
    id: 'generate-image',
    concurrency: 5,
    idempotency: 'event.data.telegram_id + "-" + event.data.prompt.slice(0, 20)',
  },
  { event: 'image/generate.start' },
  async ({ event, step }) => {
    const eventData = event.data as ImageGenerationData

    logger.info({
      message: 'Получено событие генерации изображения',
      eventId: event.id,
      telegram_id: eventData.telegram_id,
      model_type: eventData.model_type,
    })

    try {
      // Получение и проверка пользователя
      const user = await step.run('validate-user', async () => {
        const userExists = await getUserByTelegramId(eventData.telegram_id)
        if (!userExists) {
          throw new Error(`User with ID ${eventData.telegram_id} does not exist.`)
        }

        // Обновление уровня если нужно
        if (userExists.level === 10) {
          await updateUserLevelPlusOne(eventData.telegram_id, userExists.level)
        }

        return userExists
      })

      // Проверка модели
      const modelConfig = await step.run('validate-model', async () => {
        const modelKey = eventData.model_type.toLowerCase()
        const config = IMAGES_MODELS[modelKey]
        if (!config) {
          throw new Error(`Неподдерживаемый тип модели: ${eventData.model_type}`)
        }
        return config
      })

      // Получение бота
      const { bot } = getBotByName(eventData.bot_name)
      if (!bot) {
        throw new Error(`Бот ${eventData.bot_name} не найден`)
      }

      // Проверка баланса и списание средств
      const balanceCheck = await step.run('check-balance', async () => {
        const result = await processBalanceOperation({
          telegram_id: eventData.telegram_id,
          paymentAmount: modelConfig.costPerImage * eventData.num_images,
          is_ru: eventData.is_ru,
          bot,
        })

        if (!result.success) {
          throw new Error('Not enough stars')
        }

        return result
      })

      // Подготовка параметров для генерации
      const generationParams = await step.run('prepare-params', async () => {
        const aspect_ratio = await getAspectRatio(eventData.telegram_id)
        
        let size: string | undefined
        if (eventData.model_type.toLowerCase() === 'recraft v3') {
          const [widthRatio, heightRatio] = aspect_ratio.split(':').map(Number)
          const baseWidth = 1024
          const calculatedHeight = Math.round((baseWidth / widthRatio) * heightRatio)
          const calculatedSize = `${baseWidth}x${calculatedHeight}`
          size = supportedSizes.includes(calculatedSize) ? calculatedSize : '1024x1024'
        }

        return {
          prompt: eventData.prompt,
          ...(size ? { size } : { aspect_ratio }),
        }
      })

      // Генерация изображения
      const generationResult = await step.run('generate-image', async () => {
        logger.info({
          message: 'Начало генерации изображения',
          telegram_id: eventData.telegram_id,
          model: modelConfig.replicateModel,
          params: generationParams,
        })

        const output = await replicate.run(modelConfig.replicateModel, {
          input: generationParams,
        })

        return output
      })

      // Обработка результата
      const processedResults = await step.run('process-results', async () => {
        const results = await processApiResponse(
          generationResult,
          eventData.telegram_id,
          eventData.username,
          eventData.prompt,
          eventData.model_type,
          eventData.is_ru,
          bot
        )

        // Отправка pulse уведомления
        await pulse(eventData.telegram_id, eventData.username, eventData.prompt)

        return results
      })

      logger.info({
        message: 'Генерация изображения завершена успешно',
        telegram_id: eventData.telegram_id,
        resultsCount: processedResults.length,
      })

      return {
        success: true,
        results: processedResults,
        message: `Сгенерировано ${processedResults.length} изображений`,
      }

    } catch (error) {
      logger.error({
        message: 'Ошибка генерации изображения',
        error: error.message,
        telegram_id: eventData.telegram_id,
      })

      // Уведомление об ошибке
      const { bot } = getBotByName(eventData.bot_name)
      if (bot) {
        try {
          const errorMsg = eventData.is_ru 
            ? `❌ Произошла ошибка при генерации: ${error.message}`
            : `❌ Error during generation: ${error.message}`
          
          await bot.telegram.sendMessage(eventData.telegram_id, errorMsg)
        } catch (sendError) {
          logger.error('Не удалось отправить уведомление об ошибке', sendError)
        }
      }

      throw error
    }
  }
)