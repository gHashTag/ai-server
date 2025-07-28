/**
 * 🧬 Сервис Генерации Морфинг Видео
 * Основной сервис для создания морфинг видео из изображений
 */

import {
  ProcessedMorphRequest,
  MorphingJobResult,
  MorphingStatus,
  MorphingType,
  VideoStorageResult,
  TelegramDeliveryResult,
} from '@/interfaces/morphing.interface'
import {
  extractImagesFromZip,
  cleanupExtractionFiles,
  validateImageSequence,
} from '@/helpers/morphing/zipProcessor'
import { processSequentialMorphing } from '@/core/kling/pairwiseMorphing'
import { logger } from '@/utils/logger'
import { getBotByName } from '@/core/bot'
import { API_URL } from '@/config'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Загружает видео в облачное хранилище
 */
async function uploadVideoToStorage(
  videoBuffer: Buffer,
  telegramId: string,
  jobId: string
): Promise<VideoStorageResult> {
  logger.info('🧬 Загрузка видео в хранилище:', {
    telegram_id: telegramId,
    job_id: jobId,
    video_size: videoBuffer.length,
  })

  try {
    // Создаем директорию для сохранения
    const uploadDir = path.join(__dirname, '../uploads', telegramId, 'morphing')

    await fs.promises.mkdir(uploadDir, { recursive: true })

    // Генерируем имя файла
    const filename = `morphing_${jobId}_${Date.now()}.mp4`
    const filePath = path.join(uploadDir, filename)

    // Сохраняем файл
    await fs.promises.writeFile(filePath, videoBuffer)

    // Генерируем публичный URL
    const publicUrl = `${API_URL}/uploads/${telegramId}/morphing/${filename}`

    const result: VideoStorageResult = {
      success: true,
      public_url: publicUrl,
      file_size: videoBuffer.length,
      file_path: filePath,
    }

    logger.info('🧬 Видео успешно сохранено в хранилище:', {
      telegram_id: telegramId,
      public_url: publicUrl,
      file_size: videoBuffer.length,
      file_path: filePath,
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('🧬 Ошибка загрузки видео в хранилище:', {
      telegram_id: telegramId,
      job_id: jobId,
      error: errorMessage,
    })

    return {
      success: false,
      public_url: '',
      file_size: 0,
      file_path: '',
      error: errorMessage,
    }
  }
}

/**
 * Отправляет готовое видео пользователю в Telegram
 */
async function sendVideoToTelegram(
  videoUrl: string,
  telegramId: string,
  isRu: boolean,
  botName: string,
  morphingType: MorphingType
): Promise<TelegramDeliveryResult> {
  logger.info('🧬 Отправка видео в Telegram:', {
    telegram_id: telegramId,
    video_url: videoUrl,
    bot_name: botName,
    morphing_type: morphingType,
  })

  try {
    const { bot } = getBotByName(botName)

    // Подготавливаем сообщение
    const message = isRu
      ? `🧬 Ваш морфинг видео готов! ✨\n\nТип: ${
          morphingType === 'seamless' ? 'Плавные переходы' : 'Зацикленное видео'
        }`
      : `🧬 Your morphing video is ready! ✨\n\nType: ${
          morphingType === 'seamless' ? 'Seamless transitions' : 'Loop video'
        }`

    const startTime = Date.now()

    // Отправляем видео
    const sentMessage = await bot.telegram.sendVideo(telegramId, videoUrl, {
      caption: message,
      parse_mode: 'HTML',
    })

    const deliveryTime = Date.now() - startTime

    const result: TelegramDeliveryResult = {
      success: true,
      message_id: sentMessage.message_id,
      delivery_time: deliveryTime,
    }

    logger.info('🧬 Видео успешно отправлено в Telegram:', {
      telegram_id: telegramId,
      message_id: sentMessage.message_id,
      delivery_time: deliveryTime,
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('🧬 Ошибка отправки видео в Telegram:', {
      telegram_id: telegramId,
      video_url: videoUrl,
      bot_name: botName,
      error: errorMessage,
    })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Основная функция генерации морфинг видео
 */
export async function generateMorphingVideo(
  request: ProcessedMorphRequest
): Promise<MorphingJobResult> {
  const startTime = Date.now()
  const jobId = `morph_${request.telegram_id}_${Date.now()}`

  logger.info('🧬 Начинаем генерацию морфинг видео:', {
    job_id: jobId,
    telegram_id: request.telegram_id,
    morphing_type: request.morphing_type,
    image_count: request.image_count,
    model: request.model,
  })

  // Создаем базовый результат
  const result: MorphingJobResult = {
    job_id: jobId,
    telegram_id: request.telegram_id,
    status: MorphingStatus.PROCESSING,
    original_request: request,
    zip_extraction: {
      success: false,
      images: [],
      totalCount: 0,
      extractionPath: '',
    },
    kling_processing: { success: false, job_id: '' },
    video_storage: {
      success: false,
      public_url: '',
      file_size: 0,
      file_path: '',
    },
    telegram_delivery: { success: false },
    created_at: new Date(),
  }

  try {
    // 1. Извлечение изображений из ZIP
    logger.info('🧬 Этап 1: Извлечение изображений из ZIP')

    const zipExtractionResult = await extractImagesFromZip(
      request.zip_file_path,
      request.telegram_id,
      request.image_count
    )

    result.zip_extraction = zipExtractionResult

    if (!zipExtractionResult.success) {
      throw new Error(`ZIP extraction failed: ${zipExtractionResult.error}`)
    }

    logger.info('🧬 ZIP извлечение завершено:', {
      extracted_count: zipExtractionResult.totalCount,
      extraction_path: zipExtractionResult.extractionPath,
    })

    // 2. Валидация последовательности изображений
    logger.info('🧬 Этап 2: Валидация последовательности изображений')

    const validation = validateImageSequence(zipExtractionResult.images)

    if (!validation.isValid) {
      throw new Error(
        `Image sequence validation failed: ${validation.errors.join(', ')}`
      )
    }

    logger.info('🧬 Валидация изображений прошла успешно')

    // 3. Обработка морфинга через Kling API (НОВАЯ ПОПАРНАЯ ЛОГИКА)
    logger.info('🧬 Этап 3: Обработка попарного морфинга через Kling API')

    const klingResult = await processSequentialMorphing(
      zipExtractionResult.images,
      request.morphing_type,
      request.telegram_id
    )

    result.kling_processing = klingResult

    if (!klingResult.success) {
      throw new Error(`Kling processing failed: ${klingResult.error}`)
    }

    if (!klingResult.video_url) {
      throw new Error('Kling processing completed but no video URL provided')
    }

    logger.info('🧬 Kling обработка завершена:', {
      job_id: klingResult.job_id,
      video_url: klingResult.video_url,
    })

    // 4. Загрузка готового видео
    logger.info('🧬 Этап 4: Загрузка готового видео')

    // OLD CODE: const videoBuffer = await downloadKlingVideo(klingResult.video_url)
    // Этот сервис больше не используется в новой архитектуре с processSequentialMorphing
    throw new Error(
      'generateMorphingVideo service is deprecated - use processSequentialMorphing directly'
    )
  } catch (error: any) {
    result.status = MorphingStatus.ERROR
    result.error = error.message
    result.processing_time = Date.now() - startTime

    logger.error('🧬 Ошибка генерации морфинг видео:', {
      telegram_id: request.telegram_id,
      error: error.message,
      stack: error.stack,
      processing_time: result.processing_time,
    })

    // Очистка временных файлов при ошибке
    if (request.zip_file_path && fs.existsSync(request.zip_file_path)) {
      try {
        fs.unlinkSync(request.zip_file_path)
        logger.info('🧹 Временный ZIP файл удален после ошибки:', {
          path: request.zip_file_path,
        })
      } catch (cleanupError: any) {
        logger.warn('⚠️ Не удалось удалить временный ZIP файл:', {
          path: request.zip_file_path,
          error: cleanupError.message,
        })
      }
    }
  }

  return result
}

/**
 * Асинхронный запуск генерации морфинг видео (fire-and-forget)
 */
export function startMorphingVideoGeneration(
  request: ProcessedMorphRequest
): void {
  logger.info('🧬 Запуск асинхронной генерации морфинг видео:', {
    telegram_id: request.telegram_id,
    morphing_type: request.morphing_type,
    zip_file: request.zip_file_path,
  })

  // Запускаем процесс асинхронно
  generateMorphingVideo(request)
    .then(result => {
      logger.info('🧬 Асинхронная генерация завершена:', {
        job_id: result.job_id,
        status: result.status,
        processing_time: result.processing_time,
      })
    })
    .catch(error => {
      logger.error('🧬 Ошибка в асинхронной генерации:', {
        telegram_id: request.telegram_id,
        error: error instanceof Error ? error.message : String(error),
      })
    })
}
