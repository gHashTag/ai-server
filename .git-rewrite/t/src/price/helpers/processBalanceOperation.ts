import { getUserBalance } from '@/core/supabase'
import { BalanceOperationResult } from '@/interfaces/payments.interface'

type BalanceOperationProps = {
  telegram_id: string
  paymentAmount: number
  is_ru: boolean
  bot_name: string
}

export const processBalanceOperation = async ({
  telegram_id,
  paymentAmount,
  is_ru,
  bot_name,
}: BalanceOperationProps): Promise<
  Omit<BalanceOperationResult, 'newBalance'> & { currentBalance: number | null }
> => {
  try {
    const currentBalance = await getUserBalance(telegram_id, bot_name)

    if (currentBalance === null) {
      return {
        success: false,
        error: is_ru
          ? 'Не удалось получить баланс пользователя.'
          : 'Failed to retrieve user balance.',
        paymentAmount,
        currentBalance: null,
        modePrice: paymentAmount,
      }
    }

    if (currentBalance < paymentAmount) {
      const message = is_ru
        ? 'Недостаточно средств на балансе. Пополните баланс вызвав команду /buy.'
        : 'Insufficient funds. Top up your balance by calling the /buy command.'
      return {
        success: false,
        error: message,
        paymentAmount,
        currentBalance,
        modePrice: paymentAmount,
      }
    }

    return {
      success: true,
      error: undefined,
      paymentAmount,
      currentBalance,
      modePrice: paymentAmount,
    }
  } catch (error) {
    console.error('Error in processBalanceOperation (check only):', error)
    return {
      success: false,
      error: is_ru
        ? 'Произошла ошибка при проверке баланса.'
        : 'An error occurred during balance check.',
      paymentAmount,
      currentBalance: null,
      modePrice: paymentAmount,
    }
  }
}
