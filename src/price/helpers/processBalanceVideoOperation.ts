import { getUserBalance, updateUserBalance } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { BalanceOperationResult } from '@/interfaces/payments.interface'
import { VIDEO_MODELS_CONFIG } from '@/helpers/VIDEO_MODELS'
import { calculateFinalPrice } from './calculateFinalPrice'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'

type BalanceOperationProps = {
  videoModel: string
  telegram_id: string
  is_ru: boolean
  bot: Telegraf<MyContext>
  bot_name: string
  description: string
}

export const processBalanceVideoOperation = async ({
  videoModel,
  telegram_id,
  is_ru,
  bot,
  bot_name,
  description,
}: BalanceOperationProps): Promise<BalanceOperationResult> => {
  try {
    // Получаем текущий баланс
    const currentBalance = await getUserBalance(telegram_id)

    const modelConfig = VIDEO_MODELS_CONFIG[videoModel]

    if (!modelConfig) {
      await bot.telegram.sendMessage(
        telegram_id,
        is_ru ? 'Неверная модель' : 'Invalid model'
      )
      return {
        newBalance: currentBalance,
        paymentAmount: 0,
        success: false,
        error: 'Invalid model',
        modePrice: 0,
      }
    }

    const paymentAmount = calculateFinalPrice(modelConfig.id)

    // Проверка достаточности средств
    if (currentBalance < paymentAmount) {
      const message = is_ru
        ? 'Недостаточно средств на балансе. Пополните баланс вызвав команду /buy.'
        : 'Insufficient funds. Top up your balance by calling the /buy command.'
      await bot.telegram.sendMessage(telegram_id, message)
      return {
        newBalance: currentBalance,
        paymentAmount,
        success: false,
        error: message,
        modePrice: 0,
      }
    }

    // Рассчитываем новый баланс
    const newBalance = currentBalance - paymentAmount

    // Обновляем баланс в БД и создаем запись о списании
    const updateSuccess = await updateUserBalance(
      telegram_id,
      paymentAmount,
      'money_outcome',
      description,
      {
        stars: paymentAmount,
        payment_method: 'Image to video',
        bot_name,
        language: is_ru ? 'ru' : 'en',
        service_type: 'IMAGE_TO_VIDEO',
      }
    )

    // Добавим проверку успеха операции обновления баланса
    if (!updateSuccess) {
      logger.warn(
        '⚠️ Не удалось обновить баланс или записать транзакцию списания',
        {
          telegram_id,
          amount: paymentAmount,
          bot_name,
        }
      )
      return {
        newBalance: currentBalance,
        paymentAmount,
        success: false,
        error: is_ru ? 'Ошибка списания средств' : 'Error deducting funds',
        modePrice: paymentAmount,
      }
    }

    return {
      newBalance,
      paymentAmount,
      success: true,
      modePrice: paymentAmount,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error processing balance'
    logger.error('❌ Ошибка при обработке баланса для видео:', {
      description: 'Error processing balance for video operation',
      telegram_id,
      videoModel,
      error: errorMessage,
      error_details: error,
      bot_name,
    })
    return {
      newBalance: 0,
      paymentAmount: 0,
      success: false,
      error: is_ru ? 'Ошибка проверки баланса' : 'Error checking balance',
      modePrice: 0,
    }
  }
}
