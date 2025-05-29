import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'
import axios from 'axios'

/**
 * Обертка для SyncLabs API с Circuit Breaker и Retry механизмом
 */
export class SyncLabsWithReliability {
  /**
   * Создание LipSync видео с защитой от сбоев
   */
  async generateLipSync(
    options: {
      video: string
      audio: string
      webhookUrl?: string
    },
    operationName = 'synclabs-generate-lipsync'
  ) {
    return circuitBreakers.synclabs.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🎬 SyncLabs generate LipSync', {
          hasVideo: !!options.video,
          hasAudio: !!options.audio,
          operation: operationName,
        })

        const body = {
          model: 'lipsync-1.9.0-beta',
          input: [
            {
              type: 'video',
              url: options.video,
            },
            {
              type: 'audio',
              url: options.audio,
            },
          ],
          options: {
            output_format: 'mp4',
          },
          webhookUrl: options.webhookUrl,
        }

        const response = await axios.post(
          'https://api.sync.so/v2/generate',
          body,
          {
            headers: {
              'x-api-key': process.env.SYNC_LABS_API_KEY as string,
              'Content-Type': 'application/json',
            },
          }
        )

        if (response.status === 200 && response.data?.id) {
          logger.info('✅ SyncLabs generate LipSync success', {
            operation: operationName,
            videoId: response.data.id,
          })

          return response.data
        } else {
          logger.error('❌ SyncLabs generate LipSync failed', {
            operation: operationName,
            status: response.status,
            statusText: response.statusText,
            hasId: !!response.data?.id,
          })
          throw new Error(
            `SyncLabs generate LipSync failed: ${response.status} ${response.statusText}`
          )
        }
      }, operationName)
    })
  }

  /**
   * Создание голоса с защитой от сбоев
   */
  async createVoice(
    options: {
      fileUrl: string
      username: string
      webhookUrl?: string
    },
    operationName = 'synclabs-create-voice'
  ) {
    return circuitBreakers.synclabs.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🎙️ SyncLabs create voice', {
          username: options.username,
          hasFileUrl: !!options.fileUrl,
          operation: operationName,
        })

        const body = {
          name: options.username,
          description: `Voice created from Telegram voice message`,
          inputSamples: [options.fileUrl],
          webhookUrl:
            options.webhookUrl || `${process.env.SUPABASE_URL}/synclabs-video`,
        }

        const response = await axios.post(
          'https://api.synclabs.so/voices/create',
          body,
          {
            headers: {
              'x-api-key': process.env.SYNC_LABS_API_KEY as string,
              'Content-Type': 'application/json',
            },
          }
        )

        if (
          response.status >= 200 &&
          response.status < 300 &&
          response.data?.id
        ) {
          logger.info('✅ SyncLabs create voice success', {
            operation: operationName,
            voiceId: response.data.id,
            username: options.username,
          })

          return response.data.id
        } else {
          logger.error('❌ SyncLabs create voice failed', {
            operation: operationName,
            status: response.status,
            statusText: response.statusText,
            hasId: !!response.data?.id,
          })
          throw new Error(
            `SyncLabs create voice failed: ${response.status} ${response.statusText}`
          )
        }
      }, operationName)
    })
  }

  /**
   * Проверка здоровья SyncLabs API
   */
  async healthCheck(operationName = 'synclabs-health-check'): Promise<boolean> {
    try {
      return await circuitBreakers.synclabs.execute(async () => {
        return retryExternalAPI(async () => {
          logger.debug('🏥 SyncLabs health check', {
            operation: operationName,
          })

          // SyncLabs не имеет специального health endpoint,
          // поэтому проверяем доступность через простой запрос
          const response = await axios.get('https://api.sync.so/v2/status', {
            headers: {
              'x-api-key': process.env.SYNC_LABS_API_KEY as string,
            },
            timeout: 5000,
          })

          if (response.status === 200) {
            logger.debug('✅ SyncLabs health check success', {
              operation: operationName,
            })
            return true
          } else {
            logger.error('❌ SyncLabs health check failed', {
              operation: operationName,
              status: response.status,
            })
            throw new Error(`SyncLabs health check failed: ${response.status}`)
          }
        }, operationName)
      })
    } catch (error) {
      logger.error('❌ SyncLabs health check circuit breaker failed', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}

// Экспортируем singleton instance
export const syncLabsReliable = new SyncLabsWithReliability()
