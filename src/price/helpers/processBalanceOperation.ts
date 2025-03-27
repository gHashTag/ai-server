import { getUserBalance, updateUserBalance } from '@/core/supabase'
import { BalanceOperationResult } from '@/interfaces/payments.interface'
import { Telegraf } from 'telegraf'
import { MyContext } from '@/interfaces'
import { PaymentService } from '@/interfaces/payments.interface'

type BalanceOperationProps = {
  telegram_id: string
  paymentAmount: number
  is_ru: boolean
  bot: Telegraf<MyContext>
  bot_name?: string
  description?: string
  type: PaymentService
}

export const processBalanceOperation = async ({
  telegram_id,
  paymentAmount,
  is_ru,
  bot,
  bot_name = 'neuro_blogger_bot',
  description,
  type,
}: BalanceOperationProps): Promise<BalanceOperationResult> => {
  try {
    // Получаем текущий баланс
    const currentBalance = await getUserBalance(telegram_id)
    // Проверяем достаточно ли средств
    if (currentBalance < paymentAmount) {
      const message = is_ru
        ? 'Недостаточно средств на балансе. Пополните баланс вызвав команду /buy.'
        : 'Insufficient funds. Top up your balance by calling the /buy command.'
      await bot.telegram.sendMessage(telegram_id, message)
      return {
        newBalance: currentBalance,
        success: false,
        error: message,
        paymentAmount,
      }
    }

    // Рассчитываем новый баланс
    const newBalance = Number(currentBalance) - Number(paymentAmount)

    // Обновляем баланс в БД и создаем запись о транзакции
    await updateUserBalance(telegram_id, newBalance, 'outcome', description, {
      stars: paymentAmount,
      payment_method: type as PaymentService,
      bot_name,
      language: is_ru ? 'ru' : 'en',
    })

    return {
      newBalance,
      success: true,
      paymentAmount,
    }
  } catch (error) {
    console.error('Error in processBalanceOperation:', error)
    throw error
  }
}
