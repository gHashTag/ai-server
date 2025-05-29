import { supabase } from './index'
import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'

/**
 * Обертка для Supabase API с Circuit Breaker и Retry механизмом
 */
export class SupabaseWithReliability {
  /**
   * Выполнение SELECT запроса с защитой от сбоев
   */
  async select<T>(
    table: string,
    columns = '*',
    operationName = 'supabase-select'
  ) {
    return circuitBreakers.supabase.execute(async () => {
      return retryExternalAPI(async () => {
        logger.debug('🔍 Supabase SELECT', {
          table,
          columns,
          operation: operationName,
        })

        const { data, error } = await supabase.from(table).select(columns)

        if (error) {
          logger.error('❌ Supabase SELECT error', {
            table,
            columns,
            operation: operationName,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Supabase SELECT error: ${error.message}`)
        }

        logger.debug('✅ Supabase SELECT success', {
          table,
          columns,
          operation: operationName,
          count: data?.length || 0,
        })

        return { data, error: null }
      }, operationName)
    })
  }

  /**
   * Выполнение INSERT запроса с защитой от сбоев
   */
  async insert<T>(
    table: string,
    values: any,
    operationName = 'supabase-insert'
  ) {
    return circuitBreakers.supabase.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('📝 Supabase INSERT', {
          table,
          operation: operationName,
          hasValues: !!values,
        })

        const { data, error } = await supabase
          .from(table)
          .insert(values)
          .select()

        if (error) {
          logger.error('❌ Supabase INSERT error', {
            table,
            operation: operationName,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Supabase INSERT error: ${error.message}`)
        }

        logger.info('✅ Supabase INSERT success', {
          table,
          operation: operationName,
          count: data?.length || 0,
        })

        return { data, error: null }
      }, operationName)
    })
  }

  /**
   * Выполнение UPDATE запроса с защитой от сбоев
   */
  async update<T>(
    table: string,
    values: any,
    whereClause: { column: string; value: any },
    operationName = 'supabase-update'
  ) {
    return circuitBreakers.supabase.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('✏️ Supabase UPDATE', {
          table,
          operation: operationName,
          whereColumn: whereClause.column,
          hasValues: !!values,
        })

        const { data, error } = await supabase
          .from(table)
          .update(values)
          .eq(whereClause.column, whereClause.value)
          .select()

        if (error) {
          logger.error('❌ Supabase UPDATE error', {
            table,
            operation: operationName,
            whereColumn: whereClause.column,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Supabase UPDATE error: ${error.message}`)
        }

        logger.info('✅ Supabase UPDATE success', {
          table,
          operation: operationName,
          whereColumn: whereClause.column,
          count: data?.length || 0,
        })

        return { data, error: null }
      }, operationName)
    })
  }

  /**
   * Выполнение DELETE запроса с защитой от сбоев
   */
  async delete<T>(
    table: string,
    whereClause: { column: string; value: any },
    operationName = 'supabase-delete'
  ) {
    return circuitBreakers.supabase.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🗑️ Supabase DELETE', {
          table,
          operation: operationName,
          whereColumn: whereClause.column,
        })

        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq(whereClause.column, whereClause.value)
          .select()

        if (error) {
          logger.error('❌ Supabase DELETE error', {
            table,
            operation: operationName,
            whereColumn: whereClause.column,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Supabase DELETE error: ${error.message}`)
        }

        logger.info('✅ Supabase DELETE success', {
          table,
          operation: operationName,
          whereColumn: whereClause.column,
          count: data?.length || 0,
        })

        return { data, error: null }
      }, operationName)
    })
  }

  /**
   * Выполнение RPC функции с защитой от сбоев
   */
  async rpc<T>(
    functionName: string,
    params: any = {},
    operationName = 'supabase-rpc'
  ) {
    return circuitBreakers.supabase.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('⚙️ Supabase RPC', {
          functionName,
          operation: operationName,
          hasParams: Object.keys(params).length > 0,
        })

        const { data, error } = await supabase.rpc(functionName, params)

        if (error) {
          logger.error('❌ Supabase RPC error', {
            functionName,
            operation: operationName,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Supabase RPC error: ${error.message}`)
        }

        logger.info('✅ Supabase RPC success', {
          functionName,
          operation: operationName,
          hasResult: data !== null && data !== undefined,
        })

        return { data, error: null }
      }, operationName)
    })
  }

  /**
   * Проверка подключения к Supabase
   */
  async healthCheck(operationName = 'supabase-health-check'): Promise<boolean> {
    try {
      return await circuitBreakers.supabase.execute(async () => {
        return retryExternalAPI(async () => {
          logger.debug('🏥 Supabase health check', {
            operation: operationName,
          })

          const { error } = await supabase
            .from('users')
            .select('count', { count: 'exact', head: true })
            .limit(1)

          if (error) {
            logger.error('❌ Supabase health check failed', {
              operation: operationName,
              error: error.message,
              code: error.code,
            })
            throw new Error(`Supabase health check failed: ${error.message}`)
          }

          logger.debug('✅ Supabase health check success', {
            operation: operationName,
          })

          return true
        }, operationName)
      })
    } catch (error) {
      logger.error('❌ Supabase health check circuit breaker failed', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }

  /**
   * Получение пользователя по telegram_id с защитой от сбоев
   */
  async getUserByTelegramId(
    telegram_id: string,
    operationName = 'supabase-get-user-by-telegram-id'
  ) {
    return circuitBreakers.supabase.execute(async () => {
      return retryExternalAPI(async () => {
        logger.debug('👤 Supabase get user by telegram_id', {
          telegram_id,
          operation: operationName,
        })

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('telegram_id', telegram_id.toString())
          .maybeSingle()

        if (error) {
          logger.error('❌ Supabase get user error', {
            telegram_id,
            operation: operationName,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Supabase get user error: ${error.message}`)
        }

        logger.debug('✅ Supabase get user success', {
          telegram_id,
          operation: operationName,
          userFound: !!data,
        })

        return { data, error: null }
      }, operationName)
    })
  }

  /**
   * Получение баланса пользователя через RPC с защитой от сбоев
   */
  async getUserBalance(
    telegram_id: string,
    bot_name?: string,
    operationName = 'supabase-get-user-balance'
  ) {
    return this.rpc(
      'get_user_balance',
      {
        user_telegram_id: telegram_id.toString(),
        p_bot_name: bot_name || null,
      },
      operationName
    )
  }
}

// Экспортируем singleton instance
export const supabaseReliable = new SupabaseWithReliability()
