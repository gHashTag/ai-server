/**
 * 🧬 Replicate Kling API Client для Морфинг Видео
 * Интеграция с kwaivgi/kling-v1.6-pro через Replicate
 */

import { replicate } from '@/core/replicate'
import {
  MorphingType,
  ExtractedImage,
  KlingProcessingResult,
} from '@/interfaces/morphing.interface'
import { logger } from '@/utils/logger'
import fs from 'fs'
import { VIDEO_MODELS_CONFIG } from '@/config/models.config'

/**
 * Конвертирует изображение в Base64 из файла для Replicate
 */
function imageFileToBase64(filePath: string): string {
  try {
    const fs = require('fs')

    logger.info('🖼️ Читаем изображение для Base64:', {
      description: 'Reading image file for base64 conversion',
      filePath,
      fileExists: fs.existsSync(filePath),
    })

    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`)
    }

    const buffer = fs.readFileSync(filePath)
    const base64Data = buffer.toString('base64')
    const dataUri = `data:image/jpeg;base64,${base64Data}`

    logger.info('✅ Base64 конвертация завершена:', {
      description: 'Base64 conversion completed',
      filePath,
      bufferSize: buffer.length,
      base64Length: base64Data.length,
      dataUriLength: dataUri.length,
      dataUriPrefix: dataUri.substring(0, 50) + '...',
    })

    return dataUri
  } catch (error) {
    logger.error('❌ Ошибка конвертации изображения в Base64:', {
      description: 'Error converting image to base64',
      filePath,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Отправляет задачу морфинга в Replicate с моделью kwaivgi/kling-v1.6-pro
 */
export async function submitKlingMorphingJob(
  images: ExtractedImage[],
  morphingType: MorphingType,
  telegramId: string
): Promise<KlingProcessingResult> {
  // 🔒 ВАЛИДАЦИЯ: Kling API принимает ТОЛЬКО 2 изображения!
  if (images.length !== 2) {
    const errorMsg = `Kling API accepts exactly 2 images, got ${images.length}. Use processSequentialMorphing for multiple images.`
    logger.error('🧬 Неправильное количество изображений для Kling API:', {
      telegram_id: telegramId,
      provided_count: images.length,
      required_count: 2,
      error: errorMsg,
    })
    return {
      success: false,
      job_id: '',
      error: errorMsg,
    }
  }

  try {
    const modelConfig = VIDEO_MODELS_CONFIG['kling-v1.6-pro']

    logger.info('🧬 Начинаем морфинг job с Replicate:', {
      description: 'Starting Replicate morphing job',
      telegram_id: telegramId,
      morphing_type: morphingType,
      model: modelConfig.api.model,
      images_count: images.length,
      image_paths: images.map(img => img.path),
    })

    // Получаем base64 изображения
    logger.info('🔄 Конвертируем изображения в Base64...', {
      telegram_id: telegramId,
      image1_path: images[0].path,
      image2_path: images[1].path,
    })

    const image1Base64 = imageFileToBase64(images[0].path)
    const image2Base64 = imageFileToBase64(images[1].path)

    // Подготавливаем input для Replicate
    const input = {
      ...modelConfig.api.input,
      prompt: 'Smooth morphing transition between two images', // ОБЯЗАТЕЛЬНОЕ ПОЛЕ!
      start_image: image1Base64, // Начальное изображение для морфинга
      end_image: image2Base64, // Конечное изображение для морфинга
      duration: 5, // 5 секунд
      aspect_ratio: '16:9', // Соотношение сторон
      negative_prompt: 'blur, distort, and low quality', // Негативный промпт
    }

    logger.info('🚀 Отправляем запрос в Replicate:', {
      description: 'Sending request to Replicate',
      telegram_id: telegramId,
      model: modelConfig.api.model,
      input_keys: Object.keys(input),
      start_image_length: input.start_image?.length || 0,
      end_image_length: input.end_image?.length || 0,
      prompt: input.prompt,
    })

    // Отправляем запрос в Replicate
    const result = await replicate.run(modelConfig.api.model as any, { input })

    logger.info('✅ Получен результат от Replicate:', {
      description: 'Received result from Replicate',
      telegram_id: telegramId,
      result_type: typeof result,
      result_is_array: Array.isArray(result),
      result_length: Array.isArray(result) ? result.length : 1,
    })

    // Результат может быть массивом или строкой
    const videoUrl = Array.isArray(result) ? result[0] : result

    logger.info('🎬 Морфинг видео готово:', {
      description: 'Morphing video completed',
      telegram_id: telegramId,
      video_url: videoUrl,
      video_url_type: typeof videoUrl,
    })

    return {
      success: true,
      job_id: `replicate_${Date.now()}`,
      video_url: videoUrl,
    }
  } catch (error) {
    logger.error('❌ Ошибка при создании морфинг видео:', {
      description: 'Error creating morphing video',
      telegram_id: telegramId,
      error: error instanceof Error ? error.message : String(error),
      error_details: error,
    })

    return {
      success: false,
      job_id: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Проверяет статус задачи (для совместимости с существующим кодом)
 * Replicate выполняется синхронно, поэтому эта функция не нужна
 */
export async function pollKlingJobStatus(
  jobId: string,
  telegramId: string
): Promise<KlingProcessingResult> {
  logger.warn('🧬 pollKlingJobStatus вызвана для Replicate (не нужна):', {
    telegram_id: telegramId,
    job_id: jobId,
  })

  return {
    success: false,
    job_id: jobId,
    error: 'Replicate runs synchronously, polling not needed',
  }
}

/**
 * Основная функция для создания морфинг видео через Replicate
 */
export async function createKlingMorphingVideo(
  images: ExtractedImage[],
  morphingType: MorphingType,
  telegramId: string
): Promise<KlingProcessingResult> {
  logger.info('🧬 Создание морфинг видео через Replicate:', {
    telegram_id: telegramId,
    images_count: images.length,
    morphing_type: morphingType,
  })

  if (images.length !== 2) {
    return {
      success: false,
      job_id: '',
      error: `Expected exactly 2 images for Kling morphing, got ${images.length}`,
    }
  }

  return await submitKlingMorphingJob(images, morphingType, telegramId)
}
