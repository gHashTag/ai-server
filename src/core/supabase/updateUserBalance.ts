import { supabase } from './index'
import { logger } from '@/utils/logger'

type PaymentService =
  | 'NeuroPhoto'
  | 'Text to speech'
  | 'Image to video'
  | 'Training'
  | 'Refund'
  | 'System'
  | 'Telegram'
  | 'Robokassa'

type BalanceUpdateMetadata = {
  stars?: number
  payment_method?: PaymentService
  bot_name?: string
  language?: string
  service_type?: PaymentService
  inv_id?: string
  [key: string]: any
}

/**
 * Создает или обновляет запись о транзакции в таблице payments
 * @returns Promise<boolean> - успешно ли выполнено добавление/обновление записи
 */
export const updateUserBalance = async (
  telegram_id: string,
  amount: number,
  type: 'income' | 'outcome',
  description?: string,
  metadata?: BalanceUpdateMetadata
): Promise<boolean> => {
  try {
    // Проверка входных данных
    if (!telegram_id) {
      logger.error('❌ Пустой telegram_id в updateUserBalance:', {
        description: 'Empty telegram_id in updateUserBalance',
        telegram_id,
      })
      return false
    }

    // Проверка корректности суммы операции
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      logger.error('❌ Некорректная сумма операции:', {
        description: 'Invalid operation amount',
        amount,
        telegram_id,
      })
      return false
    }

    // Безопасно преобразуем amount в число
    let safeAmount = Number(amount)

    // Дополнительная защита: если после преобразования получили NaN, устанавливаем 0
    if (isNaN(safeAmount)) {
      logger.warn(
        '⚠️ После преобразования получили NaN, устанавливаем сумму в 0',
        {
          description: 'Got NaN after conversion, setting amount to 0',
          telegram_id,
          original_value: amount,
        }
      )
      safeAmount = 0
    }

    // Проверяем существование пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single()

    if (userError) {
      logger.error('❌ Пользователь не найден при создании транзакции:', {
        description: 'User not found during transaction creation',
        telegram_id,
        error: userError.message,
      })
      return false
    }

    if (!userData) {
      logger.error('❌ Пользователь не найден (нет данных):', {
        description: 'User not found (no data)',
        telegram_id,
      })
      return false
    }

    // Проверяем, есть ли inv_id в метаданных (для обновления существующей записи)
    if (metadata?.inv_id) {
      logger.info('🔄 Обновление существующей записи о транзакции:', {
        description: 'Updating existing transaction record',
        telegram_id,
        inv_id: metadata.inv_id,
        amount: Math.abs(safeAmount),
        type,
      })

      // Обновляем существующую запись
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'COMPLETED',
        })
        .eq('inv_id', metadata.inv_id)

      if (updateError) {
        logger.error('❌ Ошибка при обновлении записи о транзакции:', {
          description: 'Error updating transaction record',
          telegram_id,
          inv_id: metadata.inv_id,
          error: updateError.message,
        })
        return false
      }

      logger.info('✅ Транзакция успешно обновлена:', {
        description: 'Transaction successfully updated',
        telegram_id,
        inv_id: metadata.inv_id,
        amount: safeAmount,
        type,
      })
    } else {
      // Если inv_id не передан, создаем новую запись
      // Более надежный способ генерации ID
      const invId = `${Date.now()}-${Math.floor(
        Math.random() * 1000000
      )}-${telegram_id.substring(0, 5)}`

      logger.info('💼 Создание новой записи о транзакции:', {
        description: 'Creating new transaction record',
        telegram_id,
        inv_id: invId,
        amount: Math.abs(safeAmount),
        type,
      })

      // Создаем запись о транзакции
      const { error: paymentError } = await supabase.from('payments').insert({
        telegram_id,
        inv_id: invId,
        currency: metadata?.currency || 'STARS',
        amount: parseFloat(Math.abs(safeAmount).toFixed(2)),
        status: 'COMPLETED',
        stars:
          parseFloat(Math.abs(metadata?.stars || safeAmount).toFixed(2)) || 0,
        type,
        description: description || `Balance ${type}`,
        payment_method: metadata?.payment_method,
        bot_name: metadata?.bot_name || 'neuro_blogger_bot',
        language: metadata?.language || 'ru',
      })

      if (paymentError) {
        logger.error('❌ Ошибка при создании записи о транзакции:', {
          description: 'Error creating transaction record',
          telegram_id,
          error: paymentError.message,
        })
        return false
      }

      logger.info('✅ Транзакция успешно создана:', {
        description: 'Transaction successfully created',
        telegram_id,
        amount: safeAmount,
        type,
      })
    }

    // Обновляем баланс пользователя
    if (type === 'income') {
      // Получаем текущий баланс
      const { data: userBalance, error: balanceError } = await supabase
        .from('users')
        .select('balance')
        .eq('telegram_id', telegram_id)
        .single()

      if (balanceError || !userBalance) {
        logger.error('❌ Ошибка при получении баланса:', {
          description: 'Error getting balance',
          telegram_id,
          error: balanceError?.message || 'User not found',
        })
        return false
      }

      // Вычисляем новый баланс
      const newBalance = (userBalance.balance || 0) + safeAmount

      // Обновляем баланс
      const { error: updateBalanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('telegram_id', telegram_id)

      if (updateBalanceError) {
        logger.error('❌ Ошибка при обновлении баланса:', {
          description: 'Error updating balance',
          telegram_id,
          error: updateBalanceError.message,
        })
        return false
      }

      logger.info('💰 Баланс успешно обновлен:', {
        description: 'Balance successfully updated',
        telegram_id,
        old_balance: userBalance.balance,
        amount: safeAmount,
        new_balance: newBalance,
      })
    }

    return true
  } catch (error) {
    logger.error('❌ Неожиданная ошибка при создании транзакции:', {
      description: 'Unexpected error creating transaction',
      telegram_id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Возвращаем false вместо выброса исключения
    return false
  }
}
