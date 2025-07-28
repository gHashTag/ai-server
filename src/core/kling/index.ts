/**
 * 🧬 Kling API Client для Морфинг Видео
 * Интеграция с Kling-v1.6 для создания морфинг видео
 */

import axios, { AxiosResponse } from 'axios'
import {
  KlingMorphingRequest,
  KlingMorphingResponse,
  KlingProcessingResult,
  MorphingType,
  ExtractedImage,
  DEFAULT_MORPHING_CONFIG,
} from '@/interfaces/morphing.interface'
import { logger } from '@/utils/logger'

/**
 * Конвертирует изображение в Base64
 */
function imageBufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64')
}

/**
 * Проверяет переменные окружения для Kling API
 */
function validateKlingEnv(): void {
  if (!process.env.KLING_API_KEY) {
    throw new Error('KLING_API_KEY environment variable is required')
  }

  if (!process.env.KLING_API_URL) {
    logger.warn(
      '🧬 KLING_API_URL not set, using default:',
      DEFAULT_MORPHING_CONFIG.kling_api_url
    )
  }
}

/**
 * Создает запрос к Kling API для морфинга
 */
export async function createKlingMorphingRequest(
  images: ExtractedImage[],
  morphingType: MorphingType,
  webhookUrl?: string
): Promise<KlingMorphingRequest> {
  logger.info('🧬 Подготовка запроса к Kling API:', {
    image_count: images.length,
    morphing_type: morphingType,
    has_webhook: !!webhookUrl,
  })

  // Конвертируем изображения в Base64
  const base64Images: string[] = []

  for (const image of images) {
    try {
      const base64 = imageBufferToBase64(image.buffer)
      base64Images.push(base64)

      logger.info('🧬 Изображение конвертировано в Base64:', {
        filename: image.filename,
        original_size: image.buffer.length,
        base64_size: base64.length,
      })
    } catch (error) {
      logger.error('🧬 Ошибка конвертации изображения в Base64:', {
        filename: image.filename,
        error: error instanceof Error ? error.message : String(error),
      })
      throw new Error(
        `Failed to convert image ${image.filename} to Base64: ${error}`
      )
    }
  }

  const request: KlingMorphingRequest = {
    model: DEFAULT_MORPHING_CONFIG.kling_model,
    task_type: 'image_morphing',
    images: base64Images,
    transition_type: morphingType,
    output_format: 'mp4',
    quality: 'high',
    webhook_url: webhookUrl,
  }

  logger.info('🧬 Kling запрос подготовлен:', {
    model: request.model,
    task_type: request.task_type,
    image_count: request.images.length,
    transition_type: request.transition_type,
    output_format: request.output_format,
    quality: request.quality,
    has_webhook: !!request.webhook_url,
  })

  return request
}

/**
 * Отправляет задачу морфинга в Kling API
 */
export async function submitKlingMorphingJob(
  images: ExtractedImage[],
  morphingType: MorphingType,
  telegramId: string,
  webhookUrl?: string
): Promise<KlingProcessingResult> {
  logger.info('🧬 Отправка задачи морфинга в Kling API:', {
    telegram_id: telegramId,
    image_count: images.length,
    morphing_type: morphingType,
  })

  try {
    // Валидация окружения
    validateKlingEnv()

    // Подготовка запроса
    const morphingRequest = await createKlingMorphingRequest(
      images,
      morphingType,
      webhookUrl
    )

    // URL API (используем переменную окружения или дефолтное значение)
    const apiUrl =
      process.env.KLING_API_URL || DEFAULT_MORPHING_CONFIG.kling_api_url
    const endpoint = `${apiUrl}/morphing/create`

    // Заголовки запроса
    const headers = {
      Authorization: `Bearer ${process.env.KLING_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'AI-Server-Morphing/1.0',
    }

    logger.info('🧬 Отправляем запрос к Kling API:', {
      endpoint,
      headers: { ...headers, Authorization: 'Bearer [HIDDEN]' },
      payload_size: JSON.stringify(morphingRequest).length,
    })

    const startTime = Date.now()

    // Отправляем запрос
    const response: AxiosResponse<KlingMorphingResponse> = await axios.post(
      endpoint,
      morphingRequest,
      {
        headers,
        timeout: 30000, // 30 секунд таймаут
        validateStatus: status => status < 500, // Не бросаем ошибку для 4xx статусов
      }
    )

    const processingTime = Date.now() - startTime

    logger.info('🧬 Ответ от Kling API получен:', {
      status: response.status,
      processing_time_ms: processingTime,
      response_data: response.data,
    })

    // Обработка ответа
    if (response.status !== 200 && response.status !== 201) {
      throw new Error(
        `Kling API returned status ${response.status}: ${JSON.stringify(
          response.data
        )}`
      )
    }

    const klingResponse = response.data

    // Валидация ответа
    if (!klingResponse.id) {
      throw new Error('Kling API response is missing job ID')
    }

    const result: KlingProcessingResult = {
      success: true,
      job_id: klingResponse.id,
      video_url: klingResponse.output_url,
      processing_time: processingTime,
    }

    // Если видео уже готово (синхронная обработка)
    if (klingResponse.status === 'completed' && klingResponse.output_url) {
      logger.info('🧬 Морфинг видео готово синхронно:', {
        job_id: klingResponse.id,
        video_url: klingResponse.output_url,
        duration: klingResponse.output_duration,
      })

      result.video_url = klingResponse.output_url
    } else {
      logger.info('🧬 Морфинг задача отправлена в очередь:', {
        job_id: klingResponse.id,
        status: klingResponse.status,
        estimated_time: klingResponse.estimated_time,
      })
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('🧬 Ошибка при отправке задачи в Kling API:', {
      telegram_id: telegramId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })

    if (axios.isAxiosError(error)) {
      logger.error('🧬 Детали Axios ошибки:', {
        status: error.response?.status,
        status_text: error.response?.statusText,
        response_data: error.response?.data,
        request_url: error.config?.url,
        request_method: error.config?.method,
      })
    }

    return {
      success: false,
      job_id: '',
      error: errorMessage,
    }
  }
}

/**
 * Проверяет статус задачи морфинга в Kling API
 */
export async function checkKlingJobStatus(
  jobId: string
): Promise<KlingMorphingResponse> {
  logger.info('🧬 Проверка статуса задачи Kling:', { job_id: jobId })

  try {
    validateKlingEnv()

    const apiUrl =
      process.env.KLING_API_URL || DEFAULT_MORPHING_CONFIG.kling_api_url
    const endpoint = `${apiUrl}/morphing/status/${jobId}`

    const headers = {
      Authorization: `Bearer ${process.env.KLING_API_KEY}`,
      'Content-Type': 'application/json',
    }

    const response: AxiosResponse<KlingMorphingResponse> = await axios.get(
      endpoint,
      {
        headers,
        timeout: 10000, // 10 секунд таймаут для проверки статуса
      }
    )

    logger.info('🧬 Статус задачи получен:', {
      job_id: jobId,
      status: response.data.status,
      output_url: response.data.output_url,
      error: response.data.error,
    })

    return response.data
  } catch (error) {
    logger.error('🧬 Ошибка проверки статуса задачи Kling:', {
      job_id: jobId,
      error: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}

/**
 * Загружает готовое видео из Kling
 */
export async function downloadKlingVideo(videoUrl: string): Promise<Buffer> {
  logger.info('🧬 Начинаем загрузку видео из Kling:', { video_url: videoUrl })

  try {
    const response = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 минут на загрузку видео
      validateStatus: status => status === 200,
    })

    const videoBuffer = Buffer.from(response.data)

    logger.info('🧬 Видео успешно загружено:', {
      video_url: videoUrl,
      size_bytes: videoBuffer.length,
      size_mb: (videoBuffer.length / (1024 * 1024)).toFixed(2),
    })

    return videoBuffer
  } catch (error) {
    logger.error('🧬 Ошибка загрузки видео из Kling:', {
      video_url: videoUrl,
      error: error instanceof Error ? error.message : String(error),
    })

    throw new Error(`Failed to download video from Kling: ${error}`)
  }
}

/**
 * Полный цикл обработки морфинга через Kling API
 * (отправка задачи + ожидание + загрузка результата)
 */
export async function processKlingMorphing(
  images: ExtractedImage[],
  morphingType: MorphingType,
  telegramId: string,
  maxWaitTimeMs = 600000 // 10 минут по умолчанию
): Promise<KlingProcessingResult> {
  logger.info('🧬 Начинаем полный цикл обработки морфинга:', {
    telegram_id: telegramId,
    image_count: images.length,
    morphing_type: morphingType,
    max_wait_time_ms: maxWaitTimeMs,
  })

  try {
    // 1. Отправляем задачу
    const submitResult = await submitKlingMorphingJob(
      images,
      morphingType,
      telegramId
    )

    if (!submitResult.success) {
      throw new Error(submitResult.error || 'Failed to submit morphing job')
    }

    const jobId = submitResult.job_id

    // Если видео уже готово синхронно, возвращаем результат
    if (submitResult.video_url) {
      return submitResult
    }

    // 2. Ожидаем завершения обработки
    const startTime = Date.now()
    const pollInterval = 10000 // Проверяем каждые 10 секунд

    while (Date.now() - startTime < maxWaitTimeMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      try {
        const status = await checkKlingJobStatus(jobId)

        if (status.status === 'completed' && status.output_url) {
          logger.info('🧬 Морфинг задача завершена успешно:', {
            job_id: jobId,
            total_time_ms: Date.now() - startTime,
            video_url: status.output_url,
          })

          return {
            success: true,
            job_id: jobId,
            video_url: status.output_url,
            processing_time: Date.now() - startTime,
          }
        }

        if (status.status === 'failed') {
          throw new Error(
            `Kling job failed: ${status.error || 'Unknown error'}`
          )
        }

        logger.info('🧬 Задача еще обрабатывается:', {
          job_id: jobId,
          status: status.status,
          elapsed_time_ms: Date.now() - startTime,
        })
      } catch (statusError) {
        logger.warn('🧬 Ошибка проверки статуса, продолжаем ожидание:', {
          job_id: jobId,
          error:
            statusError instanceof Error
              ? statusError.message
              : String(statusError),
        })
      }
    }

    // Таймаут ожидания
    throw new Error(`Morphing job timed out after ${maxWaitTimeMs}ms`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('🧬 Ошибка в полном цикле обработки морфинга:', {
      telegram_id: telegramId,
      error: errorMessage,
    })

    return {
      success: false,
      job_id: '',
      error: errorMessage,
    }
  }
}
