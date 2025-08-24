import axios from 'axios'
import { errorMessage, errorMessageAdmin } from '@/helpers'
import { supabase } from '@/core/supabase'
import { logger } from '@/utils/logger'

/**
 * Сервис для работы с Kie.ai API
 * Документация: https://docs.kie.ai
 * Экономия по сравнению с Vertex AI: до 87%
 */

// Конфигурация моделей Kie.ai (ИСПРАВЛЕНО: правильные model IDs)
export const KIE_AI_MODELS = {
  veo3_fast: {
    name: 'Veo 3 Fast',
    description: 'Быстрая генерация',
    pricePerSecond: 0.05, // $0.05/сек (87% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
  },
  veo3: {
    name: 'Veo 3 Quality',
    description: 'Премиум качество',
    pricePerSecond: 0.25, // $0.25/сек (37% экономия против $0.40 Vertex AI)
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
  },
  'runway-aleph': {
    name: 'Runway Aleph',
    description: 'Продвинутое редактирование',
    pricePerSecond: 0.3, // $0.30/сек
    maxDuration: 10,
    supportedFormats: ['16:9', '9:16', '1:1'],
  },
}

interface KieAiGenerationOptions {
  model: 'veo3_fast' | 'veo3' | 'runway-aleph'
  prompt: string
  duration: number // 2-10 секунд
  aspectRatio?: '16:9' | '9:16' | '1:1'
  imageUrl?: string // для image-to-video (deprecated, используйте imageUrls)
  imageUrls?: string[] // массив изображений для image-to-video
  watermark?: string // водяной знак для видео
  callBackUrl?: string // URL для webhook callback
  seeds?: number // seed для генерации (для воспроизводимости)
  enableFallback?: boolean // включить fallback на другие модели
  userId?: string
  projectId?: number
  botName?: string // имя бота для telegram уведомлений
  isRu?: boolean // флаг для русского языка
}

interface KieAiResponse {
  success: boolean
  data?: {
    videoUrl: string
    duration: number
    taskId?: string
    status?: string
  }
  cost: {
    usd: number
    stars: number
  }
  provider: string
  model: string
  processingTime?: number
  error?: string
  metadata?: {
    watermark?: string
    seeds?: number
    enableFallback?: boolean
    imageCount?: number
  }
}

export class KieAiService {
  private apiKey: string
  private baseUrl = 'https://api.kie.ai/api/v1'
  private mockMode: boolean

  constructor() {
    this.apiKey = process.env.KIE_AI_API_KEY || ''
    this.mockMode =
      process.env.MOCK_VIDEO_GENERATION === 'true' ||
      process.env.TEST_MODE === 'true'

    if (!this.apiKey && !this.mockMode) {
      console.warn('⚠️ KIE_AI_API_KEY not found. Kie.ai will not be available.')
    }

    if (this.mockMode) {
      logger.info(
        '🎭 Kie.ai Service running in MOCK MODE - no real API calls will be made',
        {
          mockMode: true,
          testMode: process.env.TEST_MODE === 'true',
          mockVideoGeneration: process.env.MOCK_VIDEO_GENERATION === 'true',
        }
      )
    }
  }

  /**
   * Получить default callback URL для async уведомлений
   */
  private getDefaultCallbackUrl(): string | null {
    const baseUrl = process.env.CALLBACK_BASE_URL || process.env.API_BASE_URL

    if (!baseUrl) {
      logger.warn(
        '⚠️ No callback base URL configured - async callbacks will not work',
        {
          CALLBACK_BASE_URL: process.env.CALLBACK_BASE_URL,
          API_BASE_URL: process.env.API_BASE_URL,
        }
      )
      return null
    }

    // Убираем trailing slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '')
    const callbackUrl = `${cleanBaseUrl}/api/kie-ai/callback`

    logger.info('🔗 Generated default callback URL', {
      baseUrl: cleanBaseUrl,
      callbackUrl,
    })

    return callbackUrl
  }

  /**
   * Генерация видео в mock режиме для тестирования
   */
  private async generateMockVideo(options: KieAiGenerationOptions): Promise<{
    videoUrl: string
    cost: number
    duration: number
    processingTime: number
    taskId?: string
    status?: string
    metadata?: any
  }> {
    const { model, prompt, duration, aspectRatio = '16:9', userId } = options

    // Mock данные для разных моделей
    const mockVideos = {
      veo3_fast: 'https://example.com/mock-veo3-fast-video.mp4',
      veo3: 'https://example.com/mock-veo3-quality-video.mp4',
      'runway-aleph': 'https://example.com/mock-runway-aleph-video.mp4',
    }

    const modelConfig = KIE_AI_MODELS[model]
    const clampedDuration =
      model === 'veo3_fast'
        ? 8
        : Math.max(2, Math.min(modelConfig.maxDuration, duration))
    const costUSD = clampedDuration * modelConfig.pricePerSecond
    const taskId = `mock_task_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`

    logger.info('🎭 Mock video generation started', {
      model,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      duration: clampedDuration,
      aspectRatio,
      estimatedCostUSD: costUSD,
      taskId,
      userId,
      mockMode: true,
    })

    const startTime = Date.now()

    // Симулируем создание задачи
    logger.info('📋 Mock task created', {
      taskId,
      status: 'processing',
      estimatedTime: 60,
      mockMode: true,
    })

    // Симулируем polling с разными статусами
    const mockStatusChecks = [
      { status: 'processing', progress: 25, delay: 2000 },
      { status: 'processing', progress: 75, delay: 3000 },
      { status: 'completed', progress: 100, delay: 2000 },
    ]

    for (let i = 0; i < mockStatusChecks.length; i++) {
      const check = mockStatusChecks[i]

      logger.info('🔍 Mock status check', {
        taskId,
        attempt: i + 1,
        status: check.status,
        progress: check.progress,
        mockMode: true,
      })

      if (check.delay) {
        await new Promise(resolve => setTimeout(resolve, check.delay))
      }
    }

    const processingTime = Date.now() - startTime
    const videoUrl = mockVideos[model] || mockVideos.veo3_fast

    logger.info('✅ Mock video generation completed', {
      taskId,
      videoUrl,
      costUSD,
      processingTimeMs: processingTime,
      mockMode: true,
    })

    return {
      videoUrl,
      cost: costUSD,
      duration: clampedDuration,
      processingTime,
      taskId,
      status: 'completed',
      metadata: {
        mockMode: true,
        originalModel: model,
        originalDuration: duration,
      },
    }
  }

  /**
   * Проверить доступность API и баланс
   */
  async checkHealth(): Promise<boolean> {
    if (this.mockMode) {
      logger.info('🎭 Mock health check - always returns true', {
        mockMode: true,
      })
      return true
    }

    if (!this.apiKey) {
      logger.warn('⚠️ Kie.ai API key not available', {
        hasApiKey: false,
      })
      return false
    }

    try {
      logger.info('🔍 Checking Kie.ai API health', {
        url: `${this.baseUrl}/chat/credit`,
        timeout: 10000,
      })

      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      logger.info('✅ Kie.ai API available', {
        credits: response.data.credits,
        statusCode: response.status,
        responseData: response.data,
      })
      return true
    } catch (error: any) {
      logger.error('❌ Kie.ai API unavailable', {
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        timeout: error.code === 'ECONNABORTED',
      })
      return false
    }
  }

  /**
   * Получить баланс аккаунта
   */
  async getAccountBalance(): Promise<{ credits: number }> {
    if (this.mockMode) {
      const mockCredits = 1000 // Mock баланс для тестирования
      logger.info('🎭 Mock account balance', {
        credits: mockCredits,
        mockMode: true,
      })
      return { credits: mockCredits }
    }

    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required')
    }

    try {
      logger.info('💰 Getting Kie.ai account balance', {
        url: `${this.baseUrl}/chat/credit`,
      })

      const response = await axios.get(`${this.baseUrl}/chat/credit`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      const credits = response.data.credits || 0
      logger.info('💰 Account balance retrieved', {
        credits,
        statusCode: response.status,
      })

      return { credits }
    } catch (error: any) {
      logger.error('❌ Failed to get Kie.ai balance', {
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
      })
      throw new Error(`Failed to get balance: ${error.message}`)
    }
  }

  /**
   * Генерация видео через Kie.ai
   */
  async generateVideo(options: KieAiGenerationOptions): Promise<{
    videoUrl: string
    cost: number
    duration: number
    processingTime: number
    taskId?: string
    status?: string
    metadata?: any
  }> {
    // В mock режиме используем mock генерацию
    if (this.mockMode) {
      return await this.generateMockVideo(options)
    }

    if (!this.apiKey) {
      throw new Error('KIE_AI_API_KEY is required for video generation')
    }

    const {
      model,
      prompt,
      duration,
      aspectRatio = '16:9',
      imageUrl,
      imageUrls,
      watermark,
      callBackUrl,
      seeds,
      enableFallback,
      userId,
      projectId,
      botName,
      isRu,
    } = options

    // Валидация модели
    const modelConfig = KIE_AI_MODELS[model]
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${model}`)
    }

    // Валидация длительности
    let clampedDuration: number

    // ВАЖНО: Veo 3 Fast поддерживает ТОЛЬКО 8 секунд!
    if (model === 'veo3_fast') {
      clampedDuration = 8
      if (duration !== 8) {
        logger.info('🚨 CRITICAL: Veo 3 Fast supports ONLY 8 seconds!', {
          requestedDuration: duration,
          forcedDuration: 8,
          model,
        })
      }
    } else {
      clampedDuration = Math.max(2, Math.min(modelConfig.maxDuration, duration))
      if (clampedDuration !== duration) {
        logger.info('⚠️ Duration adjusted for model constraints', {
          requestedDuration: duration,
          adjustedDuration: clampedDuration,
          model,
          maxAllowed: modelConfig.maxDuration,
        })
      }
    }

    // Расчет стоимости
    const costUSD = clampedDuration * modelConfig.pricePerSecond

    const startTime = Date.now()

    // Подробное логирование запроса
    logger.info('🎬 Starting Kie.ai video generation', {
      model,
      prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
      promptLength: prompt.length,
      duration: clampedDuration,
      aspectRatio,
      estimatedCostUSD: costUSD,
      userId,
      botName,
      isRu,
      projectId,
      hasImages: !!(imageUrls?.length || imageUrl),
      imageCount: imageUrls?.length || (imageUrl ? 1 : 0),
    })

    try {
      // Формируем запрос к Kie.ai API
      const requestBody: any = {
        model: model,
        prompt: prompt,
        aspectRatio: aspectRatio,
      }

      // Добавляем опциональные поля
      // Приоритет imageUrls над imageUrl для обратной совместимости
      if (imageUrls && imageUrls.length > 0) {
        requestBody.imageUrls = imageUrls
        logger.info('📷 Adding images to request', {
          imageCount: imageUrls.length,
          images: imageUrls.map((url, i) => ({
            index: i,
            url: url.substring(0, 100) + (url.length > 100 ? '...' : ''),
          })),
        })
      } else if (imageUrl) {
        // Поддержка старого API для обратной совместимости
        requestBody.imageUrls = [imageUrl]
        logger.info('📷 Adding single image (legacy)', {
          imageUrl:
            imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
        })
      }

      if (watermark) {
        requestBody.watermark = watermark
        logger.info('🏷️ Adding watermark', { watermark })
      }

      // Автоматически добавляем callback URL если не указан
      const finalCallBackUrl = callBackUrl || this.getDefaultCallbackUrl()
      if (finalCallBackUrl) {
        requestBody.callBackUrl = finalCallBackUrl
        logger.info('🔗 Adding callback URL', {
          callBackUrl: finalCallBackUrl,
          isCustom: !!callBackUrl,
          isDefault: !callBackUrl,
        })
      }

      if (seeds !== undefined) {
        requestBody.seeds = seeds
        logger.info('🌱 Adding seed', { seeds })
      }
      if (enableFallback !== undefined) {
        requestBody.enableFallback = enableFallback
        logger.info('🔄 Fallback enabled', { enableFallback })
      }

      // Валидация callback URL если указан
      if (finalCallBackUrl) {
        try {
          new URL(finalCallBackUrl)
        } catch (error) {
          throw new Error(`Invalid callback URL: ${finalCallBackUrl}`)
        }
      }

      // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ЗАПРОСА
      logger.info('📤 Sending request to Kie.ai API', {
        url: `${this.baseUrl}/veo/generate`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey.substring(0, 8)}...`,
          'Content-Type': 'application/json',
        },
        requestBody: {
          ...requestBody,
          prompt:
            requestBody.prompt.substring(0, 200) +
            (requestBody.prompt.length > 200 ? '...' : ''),
        },
        fullRequestSize: JSON.stringify(requestBody).length,
      })

      const response = await axios.post(
        `${this.baseUrl}/veo/generate`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 300000, // 5 минут на генерацию
        }
      )

      // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ОТВЕТА
      logger.info('📥 Received response from Kie.ai API', {
        statusCode: response.status,
        statusText: response.statusText,
        responseSize: JSON.stringify(response.data).length,
        responseHeaders: response.headers,
        responseData: response.data,
      })

      // Kie.ai возвращает {code: 200, msg: "success", data: {...}}
      if (response.data.code !== 200) {
        logger.error('❌ Kie.ai API returned error', {
          code: response.data.code,
          message: response.data.msg,
          data: response.data.data,
        })
        throw new Error(response.data.msg || 'Video generation failed')
      }

      if (!response.data.data || !response.data.data.taskId) {
        logger.error('❌ Invalid response from Kie.ai: missing taskId', {
          hasData: !!response.data.data,
          dataKeys: response.data.data ? Object.keys(response.data.data) : [],
          responseData: response.data,
        })
        throw new Error('Invalid response from Kie.ai: missing taskId')
      }

      const taskId = response.data.data.taskId
      logger.info('📋 Task created successfully', {
        taskId,
        model,
        estimatedCostUSD: costUSD,
        userId,
      })

      // Сохраняем задачу в базу данных
      if (options.userId || options.projectId) {
        try {
          const taskRecord = {
            task_id: taskId,
            provider: 'kie-ai',
            telegram_id: options.userId,
            bot_name: botName,
            is_ru: isRu,
            model: model,
            prompt: prompt,
            status: 'processing',
            metadata: {
              duration: clampedDuration,
              aspectRatio: aspectRatio,
              cost: costUSD,
              projectId: options.projectId,
              watermark: watermark,
              seeds: seeds,
              enableFallback: enableFallback,
              imageCount: imageUrls?.length || (imageUrl ? 1 : 0),
              callBackUrl: callBackUrl,
            },
          }

          const { error: insertError } = await supabase
            .from('video_tasks')
            .insert(taskRecord)

          if (insertError) {
            // Если таблица не существует, создадим её
            if (insertError.code === '42P01') {
              await this.createVideoTasksTable()
              // Повторная попытка вставки
              await supabase.from('video_tasks').insert(taskRecord)
            } else {
              logger.warn('Failed to save task to database:', insertError)
            }
          }

          logger.info(`✅ Task ${taskId} saved to database`)
        } catch (dbError) {
          logger.error('Error saving task to database:', dbError)
          // Не прерываем выполнение, так как задача уже создана
        }
      }

      // Решаем: polling vs callback mode
      const useAsyncMode = !!finalCallBackUrl

      if (useAsyncMode) {
        // Async mode - возвращаем задачу сразу, результат придет через callback
        logger.info('🔗 Using async mode with callback URL', {
          taskId,
          callbackUrl: finalCallBackUrl,
          model,
          userId,
        })

        const processingTime = Date.now() - startTime

        logger.info('⏱️ Video task created (async mode)', {
          taskId,
          model,
          estimatedCostUSD: costUSD,
          processingTimeMs: processingTime,
          callbackUrl: finalCallBackUrl,
          userId,
        })

        // В async режиме возвращаем задачу со статусом processing
        // Результат будет доставлен через callback
        return {
          videoUrl: '', // будет заполнен через callback
          cost: costUSD,
          duration: clampedDuration,
          processingTime,
          taskId: taskId,
          status: 'processing',
          metadata: {
            asyncMode: true,
            callbackUrl: finalCallBackUrl,
          },
        }
      } else {
        // Sync mode - ждем завершения через polling (старый способ)
        logger.info('⏳ Using sync mode with polling', {
          taskId,
          model,
          maxWaitTimeSeconds: 300,
          pollIntervalSeconds: 15,
        })

        // Ждем завершения генерации (максимум 5 минут)
        const maxWaitTime = 300000 // 5 минут
        const pollInterval = 15000 // проверяем каждые 15 секунд
        const maxAttempts = Math.floor(maxWaitTime / pollInterval)

        let videoUrl: string | null = null
        let attempts = 0

        while (attempts < maxAttempts && !videoUrl) {
          attempts++
          const elapsedTime = Date.now() - startTime

          logger.info('🔍 Checking task status', {
            taskId,
            attempt: attempts,
            maxAttempts,
            elapsedTimeMs: elapsedTime,
            elapsedTimeSeconds: Math.round(elapsedTime / 1000),
          })

          try {
            // Проверяем статус задачи в Kie.ai
            const statusUrl = `${this.baseUrl}/veo/task/${taskId}`

            logger.info('📤 Sending status check request', {
              url: statusUrl,
              method: 'GET',
              taskId,
              attempt: attempts,
            })

            const statusResponse = await axios.get(statusUrl, {
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            })

            logger.info('📥 Status check response received', {
              taskId,
              statusCode: statusResponse.status,
              responseData: statusResponse.data,
              attempt: attempts,
            })

            if (statusResponse.data.code === 200 && statusResponse.data.data) {
              const taskData = statusResponse.data.data

              logger.info('📊 Task status update', {
                taskId,
                status: taskData.status,
                hasVideoUrl: !!taskData.videoUrl,
                videoUrl: taskData.videoUrl
                  ? taskData.videoUrl.substring(0, 100) + '...'
                  : null,
                error: taskData.error,
                progress: taskData.progress,
                attempt: attempts,
              })

              if (taskData.status === 'completed' && taskData.videoUrl) {
                videoUrl = taskData.videoUrl
                logger.info('✅ Video generation completed!', {
                  taskId,
                  videoUrl,
                  attempt: attempts,
                  elapsedTimeMs: Date.now() - startTime,
                })
                break
              } else if (taskData.status === 'failed') {
                logger.error('❌ Video generation failed', {
                  taskId,
                  error: taskData.error || 'Unknown error',
                  attempt: attempts,
                })
                throw new Error(
                  `Video generation failed: ${
                    taskData.error || 'Unknown error'
                  }`
                )
              } else if (taskData.status === 'processing') {
                logger.info('⏳ Video still processing', {
                  taskId,
                  status: taskData.status,
                  progress: taskData.progress,
                  attempt: attempts,
                })
              }
              // Если статус processing, продолжаем ждать
            } else {
              logger.warn('⚠️ Unexpected status response format', {
                taskId,
                responseCode: statusResponse.data.code,
                hasData: !!statusResponse.data.data,
                attempt: attempts,
              })
            }
          } catch (statusError: any) {
            logger.warn('⚠️ Status check failed', {
              taskId,
              error: statusError.message,
              statusCode: statusError.response?.status,
              attempt: attempts,
              willRetry: attempts < maxAttempts,
            })
            // Продолжаем ждать, возможно API временно недоступен
          }

          if (!videoUrl && attempts < maxAttempts) {
            logger.info('⏳ Waiting before next status check', {
              taskId,
              waitTimeSeconds: pollInterval / 1000,
              nextAttempt: attempts + 1,
              remainingAttempts: maxAttempts - attempts,
            })
            await new Promise(resolve => setTimeout(resolve, pollInterval))
          }
        }

        if (!videoUrl) {
          const timeoutError = `Video generation timeout after ${
            maxWaitTime / 1000
          } seconds. Task ID: ${taskId}`
          logger.error('⚠️ Video generation timeout', {
            taskId,
            maxWaitTimeSeconds: maxWaitTime / 1000,
            totalAttempts: attempts,
            elapsedTimeMs: Date.now() - startTime,
            userId,
            model,
          })
          throw new Error(timeoutError)
        }

        const processingTime = Date.now() - startTime

        logger.info('⏱️ Video generation completed successfully', {
          taskId,
          videoUrl,
          costUSD: costUSD,
          processingTimeMs: processingTime,
          processingTimeSeconds: Math.round(processingTime / 1000),
          totalAttempts: attempts,
          maxAttempts,
          model,
          userId,
        })

        return {
          videoUrl: videoUrl,
          cost: costUSD,
          duration: clampedDuration,
          processingTime,
          taskId: taskId,
          status: 'completed',
        }
      }
    } catch (error: any) {
      const processingTime = Date.now() - startTime

      logger.error('❌ Kie.ai video generation failed', {
        model,
        userId,
        taskId: error.taskId,
        error: error.message,
        statusCode: error.response?.status,
        responseData: error.response?.data,
        processingTimeMs: processingTime,
        requestBody: {
          model,
          prompt: prompt.substring(0, 200) + (prompt.length > 200 ? '...' : ''),
          aspectRatio,
          duration: clampedDuration,
        },
      })

      // Проверяем специфичные ошибки Kie.ai
      if (error.response?.status === 401) {
        logger.error('🔐 Authentication error with Kie.ai API', {
          statusCode: 401,
          apiKeyLength: this.apiKey.length,
        })
        throw new Error(
          'Invalid Kie.ai API key. Please check KIE_AI_API_KEY environment variable.'
        )
      } else if (error.response?.status === 402) {
        logger.error('💰 Insufficient credits in Kie.ai account', {
          statusCode: 402,
          model,
          estimatedCostUSD: costUSD,
        })
        throw new Error(
          'Insufficient credits in Kie.ai account. Please top up your balance.'
        )
      } else if (error.response?.status === 429) {
        logger.error('⏱️ Rate limit exceeded for Kie.ai API', {
          statusCode: 429,
          model,
          userId,
        })
        throw new Error(
          'Rate limit exceeded. Please wait before making another request.'
        )
      }

      throw new Error(`Kie.ai video generation failed: ${error.message}`)
    }
  }

  /**
   * Расчет стоимости генерации
   */
  calculateCost(model: string, durationSeconds: number): number {
    const modelConfig = KIE_AI_MODELS[model as keyof typeof KIE_AI_MODELS]
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`)
    }

    return durationSeconds * modelConfig.pricePerSecond
  }

  /**
   * Расчет стоимости в звездах с наценкой
   */
  calculateCostInStars(model: string, durationSeconds: number): number {
    // Константы из системы
    const STAR_COST_USD = 0.016 // $0.016 за звезду
    const MARKUP_RATE = 1.5 // наценка 50%

    const baseCostUSD = this.calculateCost(model, durationSeconds)
    const baseCostStars = baseCostUSD / STAR_COST_USD
    const finalCostStars = baseCostStars * MARKUP_RATE

    return Math.floor(finalCostStars)
  }

  /**
   * Проверить поддержку модели
   */
  isModelSupported(model: string): boolean {
    return model in KIE_AI_MODELS
  }

  /**
   * Получить информацию о модели
   */
  getModelInfo(model: string) {
    return KIE_AI_MODELS[model as keyof typeof KIE_AI_MODELS] || null
  }

  /**
   * Получить все доступные модели
   */
  getAllModels() {
    return KIE_AI_MODELS
  }

  /**
   * Проверить статус задачи генерации видео
   * ВАЖНО: В текущей версии Kie.ai API не предоставляет endpoint для проверки статуса
   * Это временный метод-заглушка для совместимости
   */
  async checkVideoStatus(taskId: string): Promise<{
    status: 'processing' | 'completed' | 'failed'
    videoUrl?: string
    error?: string
  }> {
    console.log(`📋 Checking status for task: ${taskId}`)

    // Проверяем статус в базе данных
    try {
      const { data, error } = await supabase
        .from('video_tasks')
        .select('status, video_url, error_message')
        .eq('task_id', taskId)
        .single()

      if (error || !data) {
        return {
          status: 'processing',
          error: 'Task not found in database',
        }
      }

      return {
        status: data.status as 'processing' | 'completed' | 'failed',
        videoUrl: data.video_url,
        error: data.error_message,
      }
    } catch (err) {
      logger.error('Error checking video status:', err)
      return {
        status: 'processing',
        error: 'Failed to check status',
      }
    }
  }

  /**
   * Создает таблицу для хранения задач видео генерации
   */
  private async createVideoTasksTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS video_tasks (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) UNIQUE NOT NULL,
        provider VARCHAR(50) NOT NULL,
        telegram_id VARCHAR(255),
        bot_name VARCHAR(100),
        model VARCHAR(100),
        prompt TEXT,
        status VARCHAR(50) DEFAULT 'processing',
        video_url TEXT,
        error_message TEXT,
        is_ru BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_video_tasks_telegram_id ON video_tasks(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_video_tasks_status ON video_tasks(status);
    `

    try {
      await supabase.rpc('exec_sql', { sql: createTableQuery })
      logger.info('✅ video_tasks table created successfully')
    } catch (error) {
      logger.error('Failed to create video_tasks table:', error)
    }
  }
}
