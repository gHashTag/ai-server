import { supabase } from '.'

type Payment = {
  user_id: string
  OutSum: string
  currency: 'RUB' | 'USD' | 'EUR' | 'STARS'
  stars: number
  email?: string
  payment_method: 'Robokassa' | 'YooMoney' | 'Telegram' | 'Stripe' | 'Other'
  bot_name: string
}

export const setPayments = async ({
  user_id,
  OutSum,
  currency,
  stars,
  email,
  payment_method,
  bot_name,
}: Payment) => {
  try {
    const { error } = await supabase.from('payments').insert({
      user_id,
      amount: parseFloat(OutSum),
      currency,
      status: 'COMPLETED',
      payment_method,
      description: `Purchase and sale:: ${stars}`,
      stars,
      email,
      bot_name,
    })
    if (error) {
      console.error('Ошибка создания платежа:', error)
      throw error
    }
  } catch (error) {
    console.error('Ошибка создания платежа:', error)
    throw error
  }
}
