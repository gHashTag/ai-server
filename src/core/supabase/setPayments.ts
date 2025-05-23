import { supabase } from '.'

type Payment = {
  inv_id: string
  telegram_id: string
  amount: number
  currency: 'RUB' | 'USD' | 'EUR' | 'STARS'
  stars: number
  email?: string
  payment_method: 'Robokassa' | 'YooMoney' | 'Telegram' | 'Stripe' | 'Other'
  bot_name: string
}

export const setPayments = async ({
  inv_id,
  telegram_id,
  amount,
  currency,
  stars,
  payment_method,
  bot_name,
}: Payment) => {
  try {
    // Обновляем существующую запись по inv_id
    const { error } = await supabase
      .from('payments')
      .update({
        telegram_id,
        amount,
        currency,
        status: 'COMPLETED',
        payment_method,
        description: `Purchase and sale:: ${stars}`,
        stars,
        bot_name,
      })
      .eq('inv_id', inv_id.toString())

    if (error) {
      console.error('Ошибка обновления платежа:', error)
      throw error
    }
  } catch (error) {
    console.error('Ошибка обновления платежа:', error)
    throw error
  }
}
