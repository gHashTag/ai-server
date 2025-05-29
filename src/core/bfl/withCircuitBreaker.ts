import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'

/**
 * Обертка для BFL API с Circuit Breaker и Retry механизмом
 */
export class BFLWithReliability {
  /**
   * Создание fine-tune модели с защитой от сбоев
   */
  async createFinetune(
    options: {
      file_data: string
      finetune_comment: string
      trigger_word: string
      mode?: string
      iterations?: number
      learning_rate?: number
      captioning?: boolean
      priority?: string
      finetune_type?: string
      lora_rank?: number
      webhook_url?: string
      webhook_secret?: string
    },
    operationName = 'bfl-create-finetune'
  ) {
    return circuitBreakers.bfl.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🎯 BFL create finetune', {
          trigger_word: options.trigger_word,
          mode: options.mode || 'character',
          iterations: options.iterations || 1000,
          operation: operationName,
        })

        const body = {
          file_data: options.file_data,
          finetune_comment: options.finetune_comment,
          trigger_word: options.trigger_word,
          mode: options.mode || 'character',
          iterations: options.iterations || 1000,
          learning_rate: options.learning_rate || 0.00001,
          captioning: options.captioning !== false,
          priority: options.priority || 'high_res_only',
          finetune_type: options.finetune_type || 'full',
          lora_rank: options.lora_rank || 32,
          webhook_url: options.webhook_url,
          webhook_secret: options.webhook_secret,
        }

        const response = await fetch('https://api.us1.bfl.ai/v1/finetune', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Key': process.env.BFL_API_KEY as string,
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          logger.error('❌ BFL create finetune failed', {
            operation: operationName,
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error(
            `BFL create finetune failed: ${response.status} ${response.statusText}`
          )
        }

        const result = await response.json()

        logger.info('✅ BFL create finetune success', {
          operation: operationName,
          finetune_id: result.finetune_id,
          trigger_word: options.trigger_word,
        })

        return result
      }, operationName)
    })
  }

  /**
   * Получение деталей fine-tune с защитой от сбоев
   */
  async getFinetuneDetails(
    finetuneId: string,
    operationName = 'bfl-get-finetune-details'
  ) {
    return circuitBreakers.bfl.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🔍 BFL get finetune details', {
          finetune_id: finetuneId,
          operation: operationName,
        })

        const response = await fetch(
          `https://api.us1.bfl.ai/v1/finetune_details?finetune_id=${finetuneId}`,
          {
            method: 'GET',
            headers: {
              'X-Key': process.env.BFL_API_KEY as string,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          logger.error('❌ BFL get finetune details failed', {
            operation: operationName,
            finetune_id: finetuneId,
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error(
            `BFL get finetune details failed: ${response.status} ${response.statusText}`
          )
        }

        const result = await response.json()

        logger.info('✅ BFL get finetune details success', {
          operation: operationName,
          finetune_id: finetuneId,
          status: result.finetune_details?.status,
        })

        return result
      }, operationName)
    })
  }

  /**
   * Получение Telegram ID из finetune комментария
   */
  async getTelegramIdFromFinetune(
    finetuneId: string,
    operationName = 'bfl-get-telegram-id'
  ): Promise<string | null> {
    try {
      const data = await this.getFinetuneDetails(finetuneId, operationName)
      const telegramId = data.finetune_details?.finetune_comment

      logger.info('✅ BFL get telegram ID success', {
        operation: operationName,
        finetune_id: finetuneId,
        telegram_id: telegramId,
      })

      return telegramId || null
    } catch (error) {
      logger.error('❌ BFL get telegram ID failed', {
        operation: operationName,
        finetune_id: finetuneId,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  /**
   * Проверка здоровья BFL API
   */
  async healthCheck(operationName = 'bfl-health-check'): Promise<boolean> {
    try {
      return await circuitBreakers.bfl.execute(async () => {
        return retryExternalAPI(async () => {
          logger.debug('🏥 BFL health check', {
            operation: operationName,
          })

          // BFL не имеет специального health endpoint,
          // поэтому проверяем через простой запрос к API
          const response = await fetch(
            'https://api.us1.bfl.ai/v1/finetune_details?finetune_id=test',
            {
              method: 'GET',
              headers: {
                'X-Key': process.env.BFL_API_KEY as string,
                'Content-Type': 'application/json',
              },
            }
          )

          // Ожидаем 400 или 404 для несуществующего ID, что означает что API работает
          if (
            response.status === 400 ||
            response.status === 404 ||
            response.status === 200
          ) {
            logger.debug('✅ BFL health check success', {
              operation: operationName,
              status: response.status,
            })
            return true
          } else if (response.status >= 500) {
            logger.error('❌ BFL health check failed', {
              operation: operationName,
              status: response.status,
            })
            throw new Error(`BFL health check failed: ${response.status}`)
          } else {
            // Другие статусы тоже считаем успешными (API отвечает)
            logger.debug('✅ BFL health check success (non-standard status)', {
              operation: operationName,
              status: response.status,
            })
            return true
          }
        }, operationName)
      })
    } catch (error) {
      logger.error('❌ BFL health check circuit breaker failed', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}

// Экспортируем singleton instance
export const bflReliable = new BFLWithReliability()
