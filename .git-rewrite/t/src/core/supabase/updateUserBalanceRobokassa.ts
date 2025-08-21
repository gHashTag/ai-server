// src/core/supabase/updateUserBalanceRobokassa.ts
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'
import { invalidateBalanceCache } from './getUserBalance'
import { ModeEnum } from '@/interfaces/modes'

type BalanceUpdateMetadata = {
  payment_method?: string
  bot_name?: string
  language?: string
  service_type?: ModeEnum | string
  currency?: string
  payment_id?: string
  [key: string]: any
}

/**
 * Обновляет существующую запись платежа или создает новую в таблице payments_v2
 * Специально для операций через Robokassa с поиском по inv_id
 * @param inv_id - обязательный параметр для поиска существующей записи
 * @returns Promise<boolean> - успешно ли выполнено обновление/создание записи
 */
export const updateUserBalanceRobokassa = async (
  inv_id: string, // ОБЯЗАТЕЛЬНО передается первым параметром!
  telegram_id: string,
  amount: number,
  type: 'MONEY_INCOME' | 'MONEY_OUTCOME',
  description?: string,
  metadata?: BalanceUpdateMetadata
): Promise<boolean> => {
  try {
    logger.info('🔍 Входные данные updateUserBalanceRobokassa:', {
      description: 'Input parameters for updateUserBalanceRobokassa',
      inv_id,
      telegram_id,
      amount,
      type,
      operation_description: description,
      metadata: metadata ? JSON.stringify(metadata) : 'нет метаданных',
    })

    // Проверка обязательных входных данных
    if (!inv_id) {
      logger.error('❌ Пустой inv_id в updateUserBalanceRobokassa:', {
        description: 'Empty inv_id in updateUserBalanceRobokassa',
        inv_id,
      })
      return false
    }

    if (!telegram_id) {
      logger.error('❌ Пустой telegram_id в updateUserBalanceRobokassa:', {
        description: 'Empty telegram_id in updateUserBalanceRobokassa',
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

    const safeAmount = Number(amount)
    const transactionAmount = Math.abs(safeAmount)

    // ГЛАВНАЯ ЛОГИКА: Ищем существующую запись по inv_id
    logger.info('🔍 Поиск существующей записи по inv_id:', {
      description: 'Searching for existing record by inv_id',
      inv_id,
    })

    const { data: existingPayment, error: searchError } = await supabase
      .from('payments_v2')
      .select('*')
      .eq('inv_id', inv_id)
      .maybeSingle()

    if (searchError) {
      logger.error('❌ Ошибка при поиске существующей записи:', {
        description: 'Error searching for existing record',
        inv_id,
        error: searchError.message,
      })
      return false
    }

    // Проверяем существование пользователя
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single()

    if (userError || !userData) {
      logger.error('❌ Пользователь не найден:', {
        description: 'User not found',
        telegram_id,
        error: userError?.message,
      })
      return false
    }

    // Для MONEY_OUTCOME проверяем достаточность средств
    if (type === 'MONEY_OUTCOME') {
      const { data: balanceData, error: balanceError } = await supabase.rpc(
        'get_user_balance',
        { user_telegram_id: telegram_id }
      )

      if (balanceError) {
        logger.error('❌ Ошибка при получении баланса:', {
          description: 'Error getting user balance',
          telegram_id,
          error: balanceError.message,
        })
        return false
      }

      const currentBalance = Number(balanceData) || 0
      if (currentBalance < transactionAmount) {
        logger.error('❌ Недостаточно средств на балансе:', {
          description: 'Insufficient funds',
          telegram_id,
          balance: currentBalance,
          required_amount: transactionAmount,
        })
        return false
      }
    }

    // Определяем service_type корректно
    let serviceType: string | null = null
    if (type === 'MONEY_OUTCOME') {
      // Для расходных операций ТРЕБУЕМ явную передачу service_type
      serviceType = (metadata?.service_type as string) || null

      // КРИТИЧНО: service_type ДОЛЖЕН передаваться явно!
      if (!serviceType) {
        logger.error(
          '❌ КРИТИЧЕСКАЯ ОШИБКА: service_type не передан для MONEY_OUTCOME операции в Robokassa!',
          {
            description:
              'CRITICAL ERROR: service_type not provided for MONEY_OUTCOME operation in Robokassa',
            telegram_id,
            operation_description: description,
            caller_metadata: metadata,
          }
        )

        throw new Error(
          'service_type обязателен для операций списания средств (MONEY_OUTCOME) в Robokassa'
        )
      }
    }
    // Для MONEY_INCOME service_type всегда null

    if (existingPayment) {
      // СЛУЧАЙ 1: Запись найдена - ОБНОВЛЯЕМ существующую
      logger.info('🔄 Обновление существующей записи:', {
        description: 'Updating existing payment record',
        inv_id,
        existing_status: existingPayment.status,
        telegram_id,
      })

      // Проверяем, не обработана ли уже запись
      if (existingPayment.status === 'COMPLETED') {
        logger.warn('⚠️ Запись уже обработана:', {
          description: 'Payment already processed',
          inv_id,
          telegram_id,
        })
        return true // Возвращаем успех, т.к. запись уже обработана
      }

      // Обновляем статус и другие поля
      const { error: updateError } = await supabase
        .from('payments_v2')
        .update({
          status: 'COMPLETED',
          payment_date: new Date(),
          stars: transactionAmount,
          amount: transactionAmount,
          // Обновляем другие поля, если они переданы
          ...(description && { description }),
          ...(metadata?.bot_name && { bot_name: metadata.bot_name }),
          ...(metadata?.language && { language: metadata.language }),
        })
        .eq('inv_id', inv_id)

      if (updateError) {
        logger.error('❌ Ошибка при обновлении записи:', {
          description: 'Error updating existing payment record',
          inv_id,
          error: updateError.message,
        })
        return false
      }

      logger.info('✅ Существующая запись успешно обновлена:', {
        description: 'Existing payment record successfully updated',
        inv_id,
        telegram_id,
        amount: transactionAmount,
        type,
      })
    } else {
      // СЛУЧАЙ 2: Запись НЕ найдена - СОЗДАЕМ новую
      logger.info('💼 Создание новой записи о транзакции Robokassa:', {
        description: 'Creating new Robokassa transaction record',
        inv_id,
        telegram_id,
        transaction_amount: transactionAmount,
        type,
        service_type: serviceType,
      })

      // Создаем новую запись с переданным inv_id
      const { error: paymentError } = await supabase
        .from('payments_v2')
        .insert({
          telegram_id,
          inv_id, // Используем переданный inv_id
          currency: metadata?.currency || 'STARS',
          amount: transactionAmount,
          status: 'COMPLETED',
          stars: transactionAmount,
          type, // 'MONEY_INCOME' или 'MONEY_OUTCOME'
          description: description || `Balance ${type}`,
          payment_method: metadata?.payment_method || 'Robokassa',
          bot_name: metadata?.bot_name || 'neuro_blogger_bot',
          language: metadata?.language || 'ru',
          metadata: metadata || {},
          service_type: serviceType,
          subscription_type: null, // Для обычных операций это null
          payment_date: new Date(), // Дата фактического совершения платежа
          category: 'REAL', // Категория операции
          cost: null, // Себестоимость (для Robokassa не применимо)
          operation_id: metadata?.payment_id || null, // ID операции
          is_system_payment: 'false', // Флаг системного платежа
        })

      if (paymentError) {
        logger.error('❌ Ошибка при создании записи о транзакции Robokassa:', {
          description: 'Error creating Robokassa transaction record',
          inv_id,
          telegram_id,
          error: paymentError.message,
          amount: transactionAmount,
        })
        return false
      }

      logger.info('✅ Новая транзакция Robokassa успешно создана:', {
        description: 'New Robokassa transaction successfully created',
        inv_id,
        telegram_id,
        amount: transactionAmount,
        type,
        service_type: serviceType,
      })
    }

    // Инвалидация кэша баланса
    invalidateBalanceCache(telegram_id)

    return true
  } catch (error) {
    logger.error('❌ Неожиданная ошибка в updateUserBalanceRobokassa:', {
      description: 'Unexpected error in updateUserBalanceRobokassa',
      telegram_id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return false
  }
}
