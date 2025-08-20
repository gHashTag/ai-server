import { replicate } from '@/core/replicate'
import { getAspectRatio, getUserByTelegramId, updateUserLevelPlusOne } from '@/core/supabase'
import { IMAGES_MODELS } from '@/helpers/IMAGES_MODELS'
import { processBalanceOperation } from '@/price/helpers'
import { processApiResponse } from '@/helpers/processApiResponse'
import { pulse } from '@/helpers/pulse'
import { logger } from '@/utils/logger'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

const supportedSizes = [
  '1024x1024', '1365x1024', '1024x1365', '1536x1024', '1024x1536',
  '1820x1024', '1024x1820', '1024x2048', '2048x1024', '1434x1024',
  '1024x1434', '1024x1280', '1280x1024', '1024x1707', '1707x1024',
]

// Упрощенная fallback версия для генерации изображений
export const generateImageFallback = async (
  prompt: string,
  model_type: string,
  num_images: number,
  telegram_id: string,
  username: string,
  is_ru: boolean,
  bot: Telegraf<MyContext>
) => {
  try {
    logger.info({
      message: 'Использование fallback для генерации изображения',
      telegram_id,
      model_type,
    })

    // Базовая проверка пользователя
    const userExists = await getUserByTelegramId(telegram_id)
    if (!userExists) {
      throw new Error(`User with ID ${telegram_id} does not exist.`)
    }

    // Простое обновление уровня
    if (userExists.level === 10) {
      await updateUserLevelPlusOne(telegram_id, userExists.level)
    }

    // Проверка модели
    const modelKey = model_type.toLowerCase()
    const modelConfig = IMAGES_MODELS[modelKey]
    if (!modelConfig) {
      throw new Error(`Неподдерживаемый тип модели: ${model_type}`)
    }

    // Простая проверка баланса
    const balanceCheck = await processBalanceOperation({
      telegram_id,
      paymentAmount: modelConfig.costPerImage * num_images,
      is_ru,
      bot,
    })

    if (!balanceCheck.success) {
      throw new Error('Not enough stars')
    }

    // Получение параметров
    const aspect_ratio = await getAspectRatio(telegram_id)
    
    let size: string | undefined
    if (model_type.toLowerCase() === 'recraft v3') {
      const [widthRatio, heightRatio] = aspect_ratio.split(':').map(Number)
      const baseWidth = 1024
      const calculatedHeight = Math.round((baseWidth / widthRatio) * heightRatio)
      const calculatedSize = `${baseWidth}x${calculatedHeight}`
      size = supportedSizes.includes(calculatedSize) ? calculatedSize : '1024x1024'
    }

    const input = {
      prompt,
      ...(size ? { size } : { aspect_ratio }),
    }

    // Прямая генерация без step обработки
    const output = await replicate.run(modelConfig.replicateModel, { input })

    // Простая обработка результата
    const results = await processApiResponse(
      output,
      telegram_id,
      username,
      prompt,
      model_type,
      is_ru,
      bot
    )

    // Pulse уведомление
    await pulse(telegram_id, username, prompt)

    logger.info({
      message: 'Fallback генерация изображения завершена',
      telegram_id,
      resultsCount: results.length,
    })

    return results

  } catch (error) {
    logger.error({
      message: 'Ошибка fallback генерации изображения',
      error: error.message,
      telegram_id,
    })

    // Простое уведомление об ошибке
    const errorMsg = is_ru 
      ? `❌ Произошла ошибка при генерации: ${error.message}`
      : `❌ Error during generation: ${error.message}`
    
    try {
      await bot.telegram.sendMessage(telegram_id, errorMsg)
    } catch (sendError) {
      logger.error('Не удалось отправить уведомление об ошибке', sendError)
    }

    throw error
  }
}