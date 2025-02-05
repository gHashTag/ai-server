import { incrementBalance, setPayments } from '@/core/supabase'
import { sendPaymentNotification } from '@/price/helpers'

import { supabase } from '@/core/supabase'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { errorMessage } from '@/helpers'

type User = {
  user_id: string
  telegram_id: string
  username: string
  balance: number
  language: string
}

export class PaymentService {
  public async processPayment(OutSum: string, inv_id: string): Promise<void> {
    try {
      console.log('PaymentService: OutSum', OutSum)
      console.log('PaymentService: Email', inv_id)
      let stars = 0
      if (OutSum === '1999') {
        stars = 1249
      } else if (OutSum === '5000') {
        stars = 3040
      } else if (OutSum === '10000') {
        stars = 6080
      } else if (OutSum === '10') {
        stars = 6
      }

      if (stars > 0) {
        const { user_id, telegram_id, username, language } =
          await this.getTelegramIdFromInvId(inv_id)
        await incrementBalance({
          telegram_id: telegram_id.toString(),
          amount: stars,
        })
        await sendPaymentNotification(
          Number(OutSum),
          stars,
          telegram_id,
          language,
          username
        )
        await setPayments({
          user_id,
          OutSum,
          stars,
          currency: 'RUB',
          payment_method: 'Robokassa',
        })
      }
    } catch (error) {
      const { telegram_id, language } = await this.getTelegramIdFromInvId(
        inv_id
      )
      errorMessage(error as Error, telegram_id, language === 'ru')
      errorMessageAdmin(error as Error)
      throw error
    }
  }

  private async getTelegramIdFromInvId(inv_id: string): Promise<User> {
    try {
      const { data } = await supabase
        .from('users')
        .select('user_id, telegram_id, username, balance, language')
        .eq('inv_id', inv_id)
        .single()
      if (!data) {
        throw new Error('User not found')
      }
      return data
    } catch (error) {
      console.error('Ошибка получения Telegram ID пользователя:', error)
      throw error
    }
  }
}
