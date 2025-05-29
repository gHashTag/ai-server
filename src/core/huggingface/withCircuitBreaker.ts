import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'
import axios from 'axios'

/**
 * Обертка для HuggingFace API с Circuit Breaker и Retry механизмом
 */
export class HuggingFaceWithReliability {
  /**
   * Генерация описания изображения с защитой от сбоев
   */
  async generateImageCaption(
    options: {
      imageUrl: string
      captionType?:
        | 'Descriptive'
        | 'Training Prompt'
        | 'MidJourney'
        | 'Booru tag list'
      captionLength?: 'any' | 'short' | 'long'
      extraOptions?: string[]
    },
    operationName = 'huggingface-image-caption'
  ): Promise<string> {
    return circuitBreakers.huggingface.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🖼️ HuggingFace generate image caption', {
          hasImageUrl: !!options.imageUrl,
          captionType: options.captionType || 'Descriptive',
          captionLength: options.captionLength || 'long',
          operation: operationName,
        })

        // Шаг 1: Инициализация запроса
        const initResponse = await axios.post(
          'https://fancyfeast-joy-caption-alpha-two.hf.space/call/stream_chat',
          {
            data: [
              { path: options.imageUrl },
              options.captionType || 'Descriptive',
              options.captionLength || 'long',
              options.extraOptions || [
                'Describe the image in detail, including colors, style, mood, and composition.',
              ],
              '',
              '',
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000,
          }
        )

        const eventId = initResponse.data?.event_id || initResponse.data
        if (!eventId) {
          logger.error('❌ HuggingFace image caption init failed', {
            operation: operationName,
            response: initResponse.data,
          })
          throw new Error('No event ID in HuggingFace response')
        }

        logger.debug('🔄 HuggingFace image caption polling', {
          operation: operationName,
          eventId,
        })

        // Шаг 2: Получение результата
        const resultResponse = await axios.get(
          `https://fancyfeast-joy-caption-alpha-two.hf.space/call/stream_chat/${eventId}`,
          {
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
          }
        )

        if (!resultResponse.data) {
          logger.error('❌ HuggingFace image caption result failed', {
            operation: operationName,
            eventId,
          })
          throw new Error('Image to prompt: No data in response')
        }

        // Парсинг результата
        const responseText = resultResponse.data as string
        const lines = responseText.split('\n')
        let captionFound: string | null = null

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (Array.isArray(data) && data.length > 1) {
                captionFound = data[1]
                break
              }
            } catch (e) {
              logger.warn('⚠️ HuggingFace parse line failed', {
                operation: operationName,
                line,
                error: e instanceof Error ? e.message : String(e),
              })
            }
          }
        }

        if (!captionFound) {
          logger.error('❌ HuggingFace image caption not found', {
            operation: operationName,
            eventId,
            responseLength: responseText.length,
          })
          throw new Error('No caption found in HuggingFace response')
        }

        logger.info('✅ HuggingFace generate image caption success', {
          operation: operationName,
          captionLength: captionFound.length,
        })

        return captionFound
      }, operationName)
    })
  }

  /**
   * Проверка здоровья HuggingFace API
   */
  async healthCheck(
    operationName = 'huggingface-health-check'
  ): Promise<boolean> {
    try {
      return await circuitBreakers.huggingface.execute(async () => {
        return retryExternalAPI(async () => {
          logger.debug('🏥 HuggingFace health check', {
            operation: operationName,
          })

          // Проверяем доступность через простой запрос к главной странице
          const response = await axios.get(
            'https://fancyfeast-joy-caption-alpha-two.hf.space/',
            {
              timeout: 10000,
              validateStatus: status => status < 500, // Принимаем любой статус кроме 5xx
            }
          )

          if (response.status < 500) {
            logger.debug('✅ HuggingFace health check success', {
              operation: operationName,
              status: response.status,
            })
            return true
          } else {
            logger.error('❌ HuggingFace health check failed', {
              operation: operationName,
              status: response.status,
            })
            throw new Error(
              `HuggingFace health check failed: ${response.status}`
            )
          }
        }, operationName)
      })
    } catch (error) {
      logger.error('❌ HuggingFace health check circuit breaker failed', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}

// Экспортируем singleton instance
export const huggingFaceReliable = new HuggingFaceWithReliability()
