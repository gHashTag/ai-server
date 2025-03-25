import { incrementBalance, setPayments } from '@/core/supabase'
import { sendPaymentNotification } from '@/price/helpers'
import { createBotByName } from '@/config'
import { getTelegramIdFromInvId } from '@/core/supabase'
import { errorMessageAdmin } from '@/helpers/errorMessageAdmin'
import { errorMessage } from '@/helpers'
import { updateUserSubscription } from '@/core/supabase'
import { Telegraf, Context } from 'telegraf'
import { logger } from '@/utils/logger'

// Константы для вариантов оплаты
const PAYMENT_OPTIONS = [
  { amount: 500, stars: 217 },
  { amount: 1000, stars: 434 },
  { amount: 2000, stars: 869 },
  { amount: 5000, stars: 2173 },
  { amount: 10000, stars: 4347 },
  { amount: 10, stars: 6 },
]

// Константы для тарифов
const SUBSCRIPTION_PLANS = [
  {
    row: 0,
    text: '🎨 NeuroPhoto',
    en_price: 10,
    ru_price: 1110,
    description: 'Creating photos using neural networks.',
    stars_price: 476,
    callback_data: 'neurophoto',
  },
  {
    row: 1,
    text: '📚 NeuroBase',
    en_price: 33,
    ru_price: 2999,
    description: 'Self-study using neural networks with an AI avatar.',
    stars_price: 1303,
    callback_data: 'neurobase',
  },
  {
    row: 2,
    text: '🤖 NeuroBlogger',
    en_price: 833,
    ru_price: 75000,
    description: 'Training on neural networks with a mentor.',
    stars_price: 32608,
    callback_data: 'neuroblogger',
  },
]

// Группируем суммы подписок для более удобного использования
const SUBSCRIPTION_AMOUNTS = SUBSCRIPTION_PLANS.reduce((acc, plan) => {
  acc[plan.ru_price] = plan.callback_data
  return acc
}, {})

interface PaymentParams {
  amount: string
  stars: number
  telegramId: string
  language_code: string
  username: string
  groupId: string
  bot: Telegraf<Context>
}

export class PaymentService {
  public async processPayment(
    roundedIncSum: number,
    inv_id: string
  ): Promise<void> {
    try {
      console.log('🚀 PaymentService: roundedIncSum', roundedIncSum)
      console.log('📝 PaymentService: inv_id', inv_id)

      let stars = 0
      let subscription = ''

      // 1. Проверяем, соответствует ли сумма одному из тарифов
      if (SUBSCRIPTION_AMOUNTS[roundedIncSum]) {
        // Находим соответствующий тариф
        const plan = SUBSCRIPTION_PLANS.find(p => p.ru_price === roundedIncSum)
        if (plan) {
          stars = plan.stars_price
          subscription = plan.callback_data
        }
      }
      // 2. Если не соответствует тарифу, проверяем стандартные варианты оплаты
      else {
        const option = PAYMENT_OPTIONS.find(opt => opt.amount === roundedIncSum)
        if (option) {
          stars = option.stars
        }
      }

      if (stars > 0) {
        const { telegram_id, username, language_code, bot_name } =
          await getTelegramIdFromInvId(inv_id)

        const { bot, groupId } = createBotByName(bot_name)

        await incrementBalance({
          telegram_id: telegram_id.toString(),
          amount: stars,
        })

        await sendPaymentNotification({
          amount: roundedIncSum.toString(),
          stars,
          telegramId: telegram_id.toString(),
          language_code,
          username,
          groupId,
          bot,
        })

        await setPayments({
          inv_id,
          telegram_id,
          roundedIncSum,
          stars,
          currency: 'RUB',
          payment_method: 'Robokassa',
          bot_name,
        })

        // Обновляем подписку только если платеж соответствует тарифу
        if (subscription) {
          await updateUserSubscription(telegram_id, subscription)
        }

        logger.info('💰 Платеж успешно обработан', {
          description: 'Payment processed successfully',
          telegram_id,
          language_code,
        })
      }
    } catch (error) {
      const { telegram_id, language_code } = await getTelegramIdFromInvId(
        inv_id
      )
      errorMessage(error as Error, telegram_id, language_code === 'ru')
      errorMessageAdmin(error as Error)
      throw error
    }
  }
}
