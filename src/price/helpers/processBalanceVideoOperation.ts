import { getUserBalance, updateUserBalance } from '@/core/supabase'

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
}

export const processBalanceVideoOperation = async ({
  videoModel,
  telegram_id,
  is_ru,
  bot,
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
      }
    }

    // Рассчитываем новый баланс
    const newBalance = currentBalance - paymentAmount

    // Обновляем баланс в БД
    await updateUserBalance(telegram_id, newBalance)

    return { newBalance, paymentAmount, success: true }
  } catch (error) {
    console.error('Error in processBalanceOperation:', error)
    throw error
  }
}
