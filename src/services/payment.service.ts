import { incrementBalance, setPayments } from '@/core/supabase'
import { sendPaymentNotification } from '@/price/helpers'
import { createBotByName } from '@/config'
import { getTelegramIdFromInvId } from '@/core/supabase'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { errorMessage } from '@/helpers'
import { updateUserSubscription } from '@/core/supabase'

export class PaymentService {
  public async processPayment(
    roundedIncSum: number,
    inv_id: string
  ): Promise<void> {
    try {
      console.log('PaymentService: roundedIncSum', roundedIncSum)
      console.log('PaymentService: Email', inv_id)
      let stars = 0
      let subscription = ''
      if (roundedIncSum === 1110) {
        stars = 693
        subscription = 'neurophoto'
      } else if (roundedIncSum === 1999) {
        stars = 1250
        subscription = 'neurobase'
      } else if (roundedIncSum === 49999) {
        stars = 5000
        subscription = 'neuromeeting'
      } else if (roundedIncSum === 75000) {
        stars = 46875
        subscription = 'neuroblogger'
      } else if (roundedIncSum === 2000) {
        stars = 1250
      } else if (roundedIncSum === 5000) {
        stars = 3125
      } else if (roundedIncSum === 10000) {
        stars = 6250
      } else if (roundedIncSum === 10) {
        stars = 6
      } else if (roundedIncSum === 4800) {
        stars = 3000
      }

      if (stars > 0) {
        const { telegram_id, username, language, bot_name } =
          await getTelegramIdFromInvId(inv_id)

        const { bot, groupId } = createBotByName(bot_name)

        await incrementBalance({
          telegram_id: telegram_id.toString(),
          amount: stars,
        })

        await sendPaymentNotification(
          roundedIncSum,
          stars,
          telegram_id,
          language,
          username,
          groupId,
          bot
        )
        await setPayments({
          inv_id,
          telegram_id,
          roundedIncSum,
          stars,
          currency: 'RUB',
          payment_method: 'Robokassa',
          bot_name,
        })

        if ([1110, 1999, 9999, 49999, 99999].includes(roundedIncSum)) {
          await updateUserSubscription(telegram_id, subscription)
        }
      }
    } catch (error) {
      const { telegram_id, language } = await getTelegramIdFromInvId(inv_id)
      errorMessage(error as Error, telegram_id, language === 'ru')
      errorMessageAdmin(error as Error)
      throw error
    }
  }
}
