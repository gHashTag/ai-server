import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import {
  normalizeTelegramId,
  TelegramId,
} from '@/interfaces/telegram.interface'

export interface UserSubscriptionDetails {
  isSubscriptionActive: boolean
  subscriptionType: string | null
  subscriptionStartDate: string | null
}

/**
 * Возвращает информацию о подписке пользователя на основе последнего платежа
 * Подписка активна 30 дней с даты payment_date (или created_at)
 * Особый случай: NEUROTESTER всегда активна
 */
export const getUserDetailsSubscription = async (
  telegram_id: TelegramId
): Promise<UserSubscriptionDetails> => {
  try {
    const normalizedId = normalizeTelegramId(telegram_id)

    logger.info('🔍 Получение информации о подписке пользователя', {
      description: 'Fetching user subscription details',
      telegram_id: normalizedId,
    })

    const { data: lastPayment, error } = await supabase
      .from('payments_v2')
      .select('subscription_type, payment_date, created_at')
      .eq('telegram_id', normalizedId)
      .eq('status', 'COMPLETED')
      .in('type', ['MONEY_INCOME', 'BONUS'])
      .not('subscription_type', 'is', null)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      logger.error('❌ Ошибка запроса payments_v2 для подписки', {
        description: 'Error querying payments_v2',
        error: error.message,
        telegram_id: normalizedId,
      })
    }

    if (!lastPayment) {
      return {
        isSubscriptionActive: false,
        subscriptionType: null,
        subscriptionStartDate: null,
      }
    }

    const subscriptionType = lastPayment.subscription_type as string | null
    const startDateStr = lastPayment.payment_date || lastPayment.created_at

    let isSubscriptionActive = false
    if (subscriptionType === 'NEUROTESTER') {
      isSubscriptionActive = true
    } else if (startDateStr) {
      const startDate = new Date(startDateStr)
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      isSubscriptionActive = new Date() <= endDate
    }

    return {
      isSubscriptionActive,
      subscriptionType,
      subscriptionStartDate: startDateStr,
    }
  } catch (error) {
    logger.error('❌ Ошибка в getUserDetailsSubscription', {
      description: 'Error in getUserDetailsSubscription',
      error: error instanceof Error ? error.message : String(error),
      telegram_id,
    })
    return {
      isSubscriptionActive: false,
      subscriptionType: null,
      subscriptionStartDate: null,
    }
  }
}
