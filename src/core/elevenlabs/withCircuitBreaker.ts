import elevenLabsClient from './index'
import { circuitBreakers } from '@/utils/circuitBreaker'
import { retryExternalAPI } from '@/utils/retryMechanism'
import { logger } from '@/utils/logger'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'

/**
 * Обертка для ElevenLabs API с Circuit Breaker и Retry механизмом
 */
export class ElevenLabsWithReliability {
  /**
   * Генерация речи с защитой от сбоев
   */
  async generate(
    options: {
      voice: string
      model_id?: string
      text: string
    },
    operationName = 'elevenlabs-generate'
  ) {
    return circuitBreakers.elevenlabs.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🎙️ ElevenLabs generate speech', {
          voice: options.voice,
          model_id: options.model_id || 'eleven_turbo_v2_5',
          textLength: options.text.length,
          operation: operationName,
        })

        const audioStream = await elevenLabsClient.generate({
          voice: options.voice,
          model_id: options.model_id || 'eleven_turbo_v2_5',
          text: options.text,
        })

        logger.info('✅ ElevenLabs generate speech success', {
          voice: options.voice,
          operation: operationName,
          hasStream: !!audioStream,
        })

        return audioStream
      }, operationName)
    })
  }

  /**
   * Создание голоса с защитой от сбоев
   */
  async createVoice(
    options: {
      name: string
      description: string
      filePath: string
    },
    operationName = 'elevenlabs-create-voice'
  ): Promise<string | null> {
    return circuitBreakers.elevenlabs.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🎤 ElevenLabs create voice', {
          name: options.name,
          description: options.description,
          filePath: options.filePath,
          operation: operationName,
        })

        const url = 'https://api.elevenlabs.io/v1/voices/add'
        const form = new FormData()
        form.append('name', options.name)
        form.append('description', options.description)
        form.append('files', fs.createReadStream(options.filePath))
        form.append('labels', JSON.stringify({ accent: 'neutral' }))

        const response = await axios.post(url, form, {
          headers: {
            ...form.getHeaders(),
            'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
          },
        })

        if (response.status === 200) {
          const result = response.data as { voice_id: string }

          logger.info('✅ ElevenLabs create voice success', {
            name: options.name,
            operation: operationName,
            voice_id: result.voice_id,
          })

          return result.voice_id
        } else {
          logger.error('❌ ElevenLabs create voice failed', {
            name: options.name,
            operation: operationName,
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error(
            `ElevenLabs create voice failed: ${response.status} ${response.statusText}`
          )
        }
      }, operationName)
    })
  }

  /**
   * Получение списка голосов с защитой от сбоев
   */
  async getVoices(operationName = 'elevenlabs-get-voices') {
    return circuitBreakers.elevenlabs.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('📋 ElevenLabs get voices', {
          operation: operationName,
        })

        const response = await axios.get(
          'https://api.elevenlabs.io/v1/voices',
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
            },
          }
        )

        if (response.status === 200) {
          logger.info('✅ ElevenLabs get voices success', {
            operation: operationName,
            count: response.data.voices?.length || 0,
          })

          return response.data
        } else {
          logger.error('❌ ElevenLabs get voices failed', {
            operation: operationName,
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error(
            `ElevenLabs get voices failed: ${response.status} ${response.statusText}`
          )
        }
      }, operationName)
    })
  }

  /**
   * Удаление голоса с защитой от сбоев
   */
  async deleteVoice(
    voiceId: string,
    operationName = 'elevenlabs-delete-voice'
  ) {
    return circuitBreakers.elevenlabs.execute(async () => {
      return retryExternalAPI(async () => {
        logger.info('🗑️ ElevenLabs delete voice', {
          voiceId,
          operation: operationName,
        })

        const response = await axios.delete(
          `https://api.elevenlabs.io/v1/voices/${voiceId}`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
            },
          }
        )

        if (response.status === 200) {
          logger.info('✅ ElevenLabs delete voice success', {
            voiceId,
            operation: operationName,
          })

          return response.data
        } else {
          logger.error('❌ ElevenLabs delete voice failed', {
            voiceId,
            operation: operationName,
            status: response.status,
            statusText: response.statusText,
          })
          throw new Error(
            `ElevenLabs delete voice failed: ${response.status} ${response.statusText}`
          )
        }
      }, operationName)
    })
  }

  /**
   * Проверка здоровья ElevenLabs API
   */
  async healthCheck(
    operationName = 'elevenlabs-health-check'
  ): Promise<boolean> {
    try {
      return await circuitBreakers.elevenlabs.execute(async () => {
        return retryExternalAPI(async () => {
          logger.debug('🏥 ElevenLabs health check', {
            operation: operationName,
          })

          const response = await axios.get(
            'https://api.elevenlabs.io/v1/user',
            {
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY as string,
              },
            }
          )

          if (response.status === 200) {
            logger.debug('✅ ElevenLabs health check success', {
              operation: operationName,
            })
            return true
          } else {
            logger.error('❌ ElevenLabs health check failed', {
              operation: operationName,
              status: response.status,
            })
            throw new Error(
              `ElevenLabs health check failed: ${response.status}`
            )
          }
        }, operationName)
      })
    } catch (error) {
      logger.error('❌ ElevenLabs health check circuit breaker failed', {
        operation: operationName,
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}

// Экспортируем singleton instance
export const elevenLabsReliable = new ElevenLabsWithReliability()
