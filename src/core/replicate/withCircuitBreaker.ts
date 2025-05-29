import { replicate } from './index'
import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'

/**
 * Обертка для Replicate API с Circuit Breaker и Retry механизмом
 */
export class ReplicateWithReliability {
  /**
   * Выполнение модели с защитой от сбоев
   */
  async run<T>(
    model: `${string}/${string}` | `${string}/${string}:${string}`,
    options: any,
    operationName = 'replicate-run'
  ): Promise<T> {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🤖 Replicate API call', {
          model,
          operation: operationName,
          hasInput: !!options?.input,
        })

        const result = await replicate.run(model, options)

        logger.info('✅ Replicate API success', {
          model,
          operation: operationName,
          hasResult: !!result,
        })

        return result as T
      }, operationName)
    })
  }

  /**
   * Получение модели с защитой от сбоев
   */
  async getModel(
    username: string,
    modelName: string,
    operationName = 'replicate-get-model'
  ) {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🔍 Replicate get model', {
          username,
          modelName,
          operation: operationName,
        })

        const model = await replicate.models.get(username, modelName)

        logger.info('✅ Replicate get model success', {
          username,
          modelName,
          operation: operationName,
          url: model.url,
        })

        return model
      }, operationName)
    })
  }

  /**
   * Создание модели с защитой от сбоев
   */
  async createModel(
    username: string,
    modelName: string,
    options: any,
    operationName = 'replicate-create-model'
  ) {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🏗️ Replicate create model', {
          username,
          modelName,
          operation: operationName,
          options,
        })

        const model = await replicate.models.create(
          username,
          modelName,
          options
        )

        logger.info('✅ Replicate create model success', {
          username,
          modelName,
          operation: operationName,
          url: model.url,
        })

        return model
      }, operationName)
    })
  }

  /**
   * Список моделей с защитой от сбоев
   */
  async listModels(operationName = 'replicate-list-models') {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('📋 Replicate list models', {
          operation: operationName,
        })

        const models = await replicate.models.list()

        logger.info('✅ Replicate list models success', {
          operation: operationName,
          count: models.results?.length || 0,
        })

        return models
      }, operationName)
    })
  }

  /**
   * Создание тренировки с защитой от сбоев
   */
  async createTraining(
    owner: string,
    model: string,
    version: string,
    options: any,
    operationName = 'replicate-create-training'
  ) {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🎯 Replicate create training', {
          owner,
          model,
          version,
          operation: operationName,
          destination: options.destination,
        })

        const training = await replicate.trainings.create(
          owner,
          model,
          version,
          options
        )

        logger.info('✅ Replicate create training success', {
          owner,
          model,
          operation: operationName,
          trainingId: training.id,
          status: training.status,
        })

        return training
      }, operationName)
    })
  }

  /**
   * Получение статуса тренировки с защитой от сбоев
   */
  async getTraining(
    trainingId: string,
    operationName = 'replicate-get-training'
  ) {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.debug('🔍 Replicate get training', {
          trainingId,
          operation: operationName,
        })

        const training = await replicate.trainings.get(trainingId)

        logger.debug('✅ Replicate get training success', {
          trainingId,
          operation: operationName,
          status: training.status,
        })

        return training
      }, operationName)
    })
  }

  /**
   * Отмена тренировки с защитой от сбоев
   */
  async cancelTraining(
    trainingId: string,
    operationName = 'replicate-cancel-training'
  ) {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🛑 Replicate cancel training', {
          trainingId,
          operation: operationName,
        })

        const result = await replicate.trainings.cancel(trainingId)

        logger.info('✅ Replicate cancel training success', {
          trainingId,
          operation: operationName,
        })

        return result
      }, operationName)
    })
  }

  /**
   * Получение последней версии модели через fetch с защитой от сбоев
   */
  async getLatestModelUrl(
    modelName: string,
    username?: string,
    operationName = 'replicate-get-latest-model-url'
  ): Promise<string> {
    return circuitBreakers.replicate.execute(async () => {
      return retryExternalAPI(async () => {
        const actualUsername = username || process.env.REPLICATE_USERNAME
        if (!actualUsername) {
          throw new Error(
            'REPLICATE_USERNAME is not set in environment variables'
          )
        }

        logger.info('🔍 Replicate get latest model URL', {
          username: actualUsername,
          modelName,
          operation: operationName,
        })

        const response = await fetch(
          `https://api.replicate.com/v1/models/${actualUsername}/${modelName}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!response.ok) {
          if (response.status === 404) {
            const error = new Error(
              `Model ${actualUsername}/${modelName} not found or has no version yet.`
            )
            logger.warn('⚠️ Replicate model not found', {
              username: actualUsername,
              modelName,
              operation: operationName,
              status: response.status,
            })
            throw error
          }
          throw new Error(
            `Failed to fetch latest version id, status: ${response.status}`
          )
        }

        const data = await response.json()
        if (!data.latest_version?.id) {
          throw new Error(
            `Latest version ID not found for model ${actualUsername}/${modelName}`
          )
        }

        const model_url = `${actualUsername}/${modelName}:${data.latest_version.id}`

        logger.info('✅ Replicate get latest model URL success', {
          username: actualUsername,
          modelName,
          operation: operationName,
          model_url,
        })

        return model_url
      }, operationName)
    })
  }

  /**
   * Проверка здоровья Replicate API
   */
  async healthCheck(
    operationName = 'replicate-health-check'
  ): Promise<boolean> {
    try {
      return await circuitBreakers.replicate.execute(async () => {
        return retryExternalAPI(async () => {
          logger.debug('🏥 Replicate health check', {
            operation: operationName,
          })

          // Проверяем доступность через простой запрос к API
          const models = await replicate.models.list()

          if (models && models.results) {
            logger.debug('✅ Replicate health check success', {
              operation: operationName,
              modelsCount: models.results.length,
            })
            return true
          } else {
            logger.error('❌ Replicate health check failed', {
              operation: operationName,
              reason: 'No models returned',
            })
            throw new Error('Replicate health check failed: No models returned')
          }
        }, operationName)
      })
    } catch (error) {
      logger.error('❌ Replicate health check circuit breaker failed', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}

// Экспортируем singleton instance
export const replicateReliable = new ReplicateWithReliability()
