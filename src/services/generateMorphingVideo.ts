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
import { processKlingMorphing, downloadKlingVideo } from '@/core/kling'
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

    // 3. Обработка морфинга через Kling API
    logger.info('🧬 Этап 3: Обработка морфинга через Kling API')

    const klingResult = await processKlingMorphing(
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

    const videoBuffer = await downloadKlingVideo(klingResult.video_url)

    // 5. Сохранение видео в хранилище
    logger.info('🧬 Этап 5: Сохранение видео в хранилище')

    const storageResult = await uploadVideoToStorage(
      videoBuffer,
      request.telegram_id,
      jobId
    )

    result.video_storage = storageResult

    if (!storageResult.success) {
      throw new Error(`Video storage failed: ${storageResult.error}`)
    }

    logger.info('🧬 Видео сохранено в хранилище:', {
      public_url: storageResult.public_url,
      file_size: storageResult.file_size,
    })

    // 6. Отправка видео пользователю в Telegram
    logger.info('🧬 Этап 6: Отправка видео в Telegram')

    const deliveryResult = await sendVideoToTelegram(
      storageResult.public_url,
      request.telegram_id,
      request.is_ru,
      request.bot_name,
      request.morphing_type
    )

    result.telegram_delivery = deliveryResult

    if (!deliveryResult.success) {
      throw new Error(`Telegram delivery failed: ${deliveryResult.error}`)
    }

    logger.info('🧬 Видео отправлено пользователю:', {
      message_id: deliveryResult.message_id,
      delivery_time: deliveryResult.delivery_time,
    })

    // 7. Успешное завершение
    const processingTime = Date.now() - startTime

    result.status = MorphingStatus.COMPLETED
    result.completed_at = new Date()
    result.processing_time = processingTime
    result.final_video_url = storageResult.public_url

    logger.info('🧬 Морфинг видео успешно сгенерировано:', {
      job_id: jobId,
      telegram_id: request.telegram_id,
      processing_time: processingTime,
      final_video_url: storageResult.public_url,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const processingTime = Date.now() - startTime

    result.status = MorphingStatus.FAILED
    result.completed_at = new Date()
    result.processing_time = processingTime
    result.error = errorMessage

    logger.error('🧬 Ошибка генерации морфинг видео:', {
      job_id: jobId,
      telegram_id: request.telegram_id,
      processing_time: processingTime,
      error: errorMessage,
    })

    // Отправляем сообщение об ошибке пользователю
    try {
      const { bot } = getBotByName(request.bot_name)
      const errorMsg = request.is_ru
        ? `❌ Произошла ошибка при создании морфинг видео. Попробуйте еще раз позже.`
        : `❌ An error occurred while creating the morphing video. Please try again later.`

      await bot.telegram.sendMessage(request.telegram_id, errorMsg)

      logger.info('🧬 Сообщение об ошибке отправлено пользователю')
    } catch (notificationError) {
      logger.error('🧬 Не удалось отправить сообщение об ошибке:', {
        notification_error:
          notificationError instanceof Error
            ? notificationError.message
            : String(notificationError),
      })
    }
  } finally {
    // 8. Очистка временных файлов
    if (result.zip_extraction.extractionPath) {
      logger.info('🧬 Этап 8: Очистка временных файлов')

      setTimeout(async () => {
        try {
          await cleanupExtractionFiles(result.zip_extraction.extractionPath)
          logger.info('🧬 Временные файлы очищены через 1 час')
        } catch (cleanupError) {
          logger.error('🧬 Ошибка отложенной очистки:', {
            cleanup_error:
              cleanupError instanceof Error
                ? cleanupError.message
                : String(cleanupError),
          })
        }
      }, 3600000) // Очищаем через 1 час
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
