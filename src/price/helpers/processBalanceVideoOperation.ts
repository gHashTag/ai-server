import { TelegramId } from '@/interfaces/telegram.interface'
import { getUserBalance } from '@/core/supabase'
// import { MyContext } from '@/interfaces' // <-- Убираем импорт MyContext
import { BalanceOperationResult } from '@/interfaces/payments.interface'

import { calculateFinalPrice } from '@/price/helpers'
import { VIDEO_MODELS_CONFIG } from '@/config/models.config'

type VideoModelConfigKey = keyof typeof VIDEO_MODELS_CONFIG

type BalanceOperationProps = {
  videoModel: VideoModelConfigKey
  telegram_id: TelegramId
  is_ru: boolean
  bot_name: string
}

export const processBalanceVideoOperation = async ({
  videoModel,
  telegram_id,
  is_ru,
  bot_name,
}: BalanceOperationProps): Promise<BalanceOperationResult> => {
  try {
    // Получаем текущий баланс
    const currentBalance = await getUserBalance(telegram_id, bot_name)
    if (currentBalance === null) {
      // Возвращаем ошибку вместо throw, чтобы вызывающий код мог ее обработать
      return {
        success: false,
        error: is_ru
          ? 'Не удалось получить баланс пользователя.'
          : 'Failed to retrieve user balance.',
        newBalance: 0, // Или другое значение по умолчанию
        paymentAmount: 0,
        modePrice: 0,
      }
    }

    const availableModelKeys = Object.keys(
      VIDEO_MODELS_CONFIG
    ) as VideoModelConfigKey[]

    // Проверка корректности модели
    if (!videoModel || !availableModelKeys.includes(videoModel)) {
      return {
        newBalance: currentBalance,
        success: false,
        paymentAmount: 0,
        modePrice: 0,
        error: is_ru
          ? 'Пожалуйста, выберите корректную модель.'
          : 'Please choose a valid model.', // Возвращаем текст ошибки
      }
    }

    const modePrice = calculateFinalPrice(videoModel)

    // Проверка достаточности средств
    if (currentBalance < modePrice) {
      const message = is_ru
        ? 'Недостаточно средств на балансе. Пополните баланс вызвав команду /buy.'
        : 'Insufficient funds. Top up your balance by calling the /buy command.'
      // Убираем отправку сообщения
      // await ctx.telegram.sendMessage(ctx.from?.id?.toString() || '', message)
      return {
        newBalance: currentBalance,
        success: false,
        paymentAmount: 0,
        modePrice: modePrice,
        error: message, // Возвращаем текст ошибки
      }
    }

    // Рассчитываем новый баланс
    const newBalance = currentBalance - modePrice

    return {
      newBalance,
      paymentAmount: modePrice,
      success: true,
      modePrice: modePrice,
      error: undefined, // Явно указываем отсутствие ошибки при успехе
    }
  } catch (error) {
    console.error('Error in processBalanceVideoOperation:', error)
    // Возвращаем общую ошибку, если что-то пошло не так внутри try
    return {
      success: false,
      error: is_ru
        ? 'Произошла внутренняя ошибка при проверке баланса.'
        : 'An internal error occurred during balance check.',
      newBalance: 0,
      paymentAmount: 0,
      modePrice: 0,
    }
    // throw error // Не бросаем ошибку, а возвращаем ее в результате
  }
}
