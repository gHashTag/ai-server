/**
 * 🚀 Background Morphing Processor
 * Обрабатывает морфинг изображений в фоновом режиме без ограничений Inngest
 * Поддерживает неограниченное количество изображений и время обработки
 */

import { logger } from '@/utils/logger'
import { createKlingMorphingVideo } from '@/core/kling'
import { MorphingType } from '@/interfaces/morphing.interface'
import { getBotByName } from '@/core/bot'
import fs from 'fs'
import path from 'path'

// Интерфейсы для фонового процессора
export interface BackgroundMorphingJob {
  id: string
  telegram_id: string
  bot_name: string
  morphing_type: 'seamless' | 'loop'
  image_files: Array<{
    filename: string
    path: string
    order: number
  }>
  extraction_path: string
  is_ru: boolean
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: Date
  started_at?: Date
  completed_at?: Date
  error_message?: string
  progress: {
    total_pairs: number
    completed_pairs: number
    current_pair?: string
    estimated_remaining_minutes?: number
  }
  result?: {
    final_video_path: string
    processing_time_ms: number
    pairs_processed: number
  }
}

// In-memory хранилище заданий (в продакшене заменить на Redis/PostgreSQL)
const activeJobs = new Map<string, BackgroundMorphingJob>()
const jobQueue: string[] = [] // Очередь заданий
let isProcessing = false

/**
 * Добавляет новое задание морфинга в очередь
 */
export async function addMorphingJob(
  jobData: Omit<
    BackgroundMorphingJob,
    'id' | 'status' | 'created_at' | 'progress'
  >
): Promise<string> {
  const jobId = `morphing_${jobData.telegram_id}_${Date.now()}`

  const job: BackgroundMorphingJob = {
    ...jobData,
    id: jobId,
    status: 'pending',
    created_at: new Date(),
    progress: {
      total_pairs:
        jobData.image_files.length -
        1 +
        (jobData.morphing_type === 'loop' ? 1 : 0),
      completed_pairs: 0,
    },
  }

  activeJobs.set(jobId, job)
  jobQueue.push(jobId)

  logger.info('🚀 Новое задание морфинга добавлено в очередь:', {
    job_id: jobId,
    telegram_id: jobData.telegram_id,
    image_count: jobData.image_files.length,
    total_pairs: job.progress.total_pairs,
    queue_position: jobQueue.length,
  })

  // Запускаем обработчик очереди если он не работает
  if (!isProcessing) {
    processJobQueue()
  }

  return jobId
}

/**
 * Получает статус задания по ID
 */
export function getJobStatus(jobId: string): BackgroundMorphingJob | null {
  return activeJobs.get(jobId) || null
}

/**
 * Получает все активные задания пользователя
 */
export function getUserJobs(telegramId: string): BackgroundMorphingJob[] {
  return Array.from(activeJobs.values()).filter(
    job => job.telegram_id === telegramId
  )
}

/**
 * Основной обработчик очереди заданий
 */
async function processJobQueue(): Promise<void> {
  if (isProcessing) {
    logger.warn('⚠️ Обработчик очереди уже запущен')
    return
  }

  isProcessing = true
  logger.info('🔄 Запуск обработчика очереди морфинга')

  while (jobQueue.length > 0) {
    const jobId = jobQueue.shift()!
    const job = activeJobs.get(jobId)

    if (!job) {
      logger.warn('⚠️ Задание не найдено в активных:', { job_id: jobId })
      continue
    }

    try {
      await processSingleJob(job)
    } catch (error) {
      logger.error('❌ Критическая ошибка при обработке задания:', {
        job_id: jobId,
        error: error instanceof Error ? error.message : String(error),
      })

      // Помечаем задание как неудачное
      job.status = 'failed'
      job.error_message = error instanceof Error ? error.message : String(error)
      job.completed_at = new Date()
    }
  }

  isProcessing = false
  logger.info('✅ Обработчик очереди завершен')
}

/**
 * Обрабатывает одно задание морфинга
 */
async function processSingleJob(job: BackgroundMorphingJob): Promise<void> {
  logger.info('🎬 Начинаем обработку задания:', {
    job_id: job.id,
    telegram_id: job.telegram_id,
    image_count: job.image_files.length,
    total_pairs: job.progress.total_pairs,
  })

  try {
    // 1. Обновляем статус
    job.status = 'processing'
    job.started_at = new Date()

    // 2. Уведомляем пользователя о начале
    await notifyUserStart(job)

    // 3. Обрабатываем все пары
    const pairVideoUrls = await processAllPairs(job)

    // 4. Склеиваем видео
    const finalVideoPath = await concatenateAllVideos(job, pairVideoUrls)

    // 5. Доставляем результат
    await deliverResult(job, finalVideoPath)

    // 6. Завершаем успешно
    job.status = 'completed'
    job.completed_at = new Date()
    job.result = {
      final_video_path: finalVideoPath,
      processing_time_ms:
        job.completed_at.getTime() - job.started_at!.getTime(),
      pairs_processed: job.progress.completed_pairs,
    }

    logger.info('🎉 Задание морфинга завершено успешно:', {
      job_id: job.id,
      telegram_id: job.telegram_id,
      processing_time_minutes: Math.round(
        job.result.processing_time_ms / 60000
      ),
      pairs_processed: job.result.pairs_processed,
    })

    // 7. Очистка через час
    setTimeout(() => {
      cleanupJob(job.id)
    }, 60 * 60 * 1000) // 1 час
  } catch (error) {
    logger.error('❌ Ошибка при обработке задания:', {
      job_id: job.id,
      telegram_id: job.telegram_id,
      error: error instanceof Error ? error.message : String(error),
    })

    job.status = 'failed'
    job.error_message = error instanceof Error ? error.message : String(error)
    job.completed_at = new Date()

    // Уведомляем пользователя об ошибке
    await notifyUserError(
      job,
      error instanceof Error ? error.message : String(error)
    )
  }
}

/**
 * Обрабатывает все пары изображений
 */
async function processAllPairs(job: BackgroundMorphingJob): Promise<string[]> {
  const pairVideoUrls: string[] = []
  const morphingType =
    job.morphing_type === 'seamless' ? MorphingType.SEAMLESS : MorphingType.LOOP

  // Обрабатываем основные пары (i -> i+1)
  for (let i = 0; i < job.image_files.length - 1; i++) {
    const pairIndex = i + 1
    const image1 = job.image_files[i]
    const image2 = job.image_files[i + 1]

    // Обновляем прогресс
    job.progress.current_pair = `${image1.filename} → ${image2.filename}`
    const remainingPairs =
      job.progress.total_pairs - job.progress.completed_pairs
    job.progress.estimated_remaining_minutes = remainingPairs * 5 // ~5 минут на пару

    logger.info(
      `🎬 Обрабатываем пару ${pairIndex}/${job.image_files.length - 1}:`,
      {
        job_id: job.id,
        telegram_id: job.telegram_id,
        pair_index: pairIndex,
        from: image1.filename,
        to: image2.filename,
        remaining_pairs: remainingPairs,
        estimated_remaining_minutes: job.progress.estimated_remaining_minutes,
      }
    )

    // Проверяем существование файлов
    if (!fs.existsSync(image1.path) || !fs.existsSync(image2.path)) {
      throw new Error(`Image files not found: ${image1.path} or ${image2.path}`)
    }

    // Создаем морфинг видео
    const result = await createKlingMorphingVideo(
      [
        { ...image1, originalName: image1.filename },
        { ...image2, originalName: image2.filename },
      ],
      morphingType,
      job.telegram_id
    )

    if (!result.success || !result.video_url) {
      throw new Error(`Pair ${pairIndex} morphing failed: ${result.error}`)
    }

    pairVideoUrls.push(result.video_url)
    job.progress.completed_pairs++

    logger.info(`✅ Пара ${pairIndex} завершена:`, {
      job_id: job.id,
      telegram_id: job.telegram_id,
      completed_pairs: job.progress.completed_pairs,
      total_pairs: job.progress.total_pairs,
      progress_percent: Math.round(
        (job.progress.completed_pairs / job.progress.total_pairs) * 100
      ),
    })
  }

  // Обрабатываем LOOP пару если нужно
  if (morphingType === MorphingType.LOOP && job.image_files.length > 2) {
    const lastImage = job.image_files[job.image_files.length - 1]
    const firstImage = job.image_files[0]

    job.progress.current_pair = `${lastImage.filename} → ${firstImage.filename} (LOOP)`

    logger.info(`🔄 Обрабатываем LOOP пару:`, {
      job_id: job.id,
      telegram_id: job.telegram_id,
      from: lastImage.filename,
      to: firstImage.filename,
    })

    const result = await createKlingMorphingVideo(
      [
        { ...lastImage, originalName: lastImage.filename },
        { ...firstImage, originalName: firstImage.filename },
      ],
      morphingType,
      job.telegram_id
    )

    if (!result.success || !result.video_url) {
      throw new Error(`Loop pair morphing failed: ${result.error}`)
    }

    pairVideoUrls.push(result.video_url)
    job.progress.completed_pairs++

    logger.info(`✅ LOOP пара завершена:`, {
      job_id: job.id,
      telegram_id: job.telegram_id,
    })
  }

  return pairVideoUrls
}

/**
 * Склеивает все видео в одно
 */
async function concatenateAllVideos(
  job: BackgroundMorphingJob,
  videoUrls: string[]
): Promise<string> {
  logger.info('🎬 Начинаем склейку всех видео:', {
    job_id: job.id,
    telegram_id: job.telegram_id,
    video_count: videoUrls.length,
  })

  // Создаем временную директорию для видео
  const tempDir = path.join(
    process.cwd(),
    'tmp',
    'concatenation',
    job.telegram_id,
    Date.now().toString()
  )
  await fs.promises.mkdir(tempDir, { recursive: true })

  try {
    // Загружаем все видео локально
    const localVideoPaths: string[] = []

    for (let i = 0; i < videoUrls.length; i++) {
      const videoUrl = videoUrls[i]
      const localPath = path.join(tempDir, `video_${i + 1}.mp4`)

      logger.info(`⬇️ Загружаем видео ${i + 1}/${videoUrls.length}:`, {
        job_id: job.id,
        video_url: videoUrl,
        local_path: localPath,
      })

      // Загружаем видео
      const axios = require('axios')
      const response = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 5 * 60 * 1000, // 5 минут
      })

      const writer = fs.createWriteStream(localPath)
      response.data.pipe(writer)

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', () => resolve())
        writer.on('error', reject)
      })

      localVideoPaths.push(localPath)
    }

    // Склеиваем видео с помощью FFmpeg
    const outputPath = path.join(tempDir, `final_morphing_${Date.now()}.mp4`)
    const listFilePath = outputPath.replace('.mp4', '_list.txt')
    const listContent = localVideoPaths
      .map(videoPath => `file '${videoPath}'`)
      .join('\n')

    await fs.promises.writeFile(listFilePath, listContent)

    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`

    logger.info('🔧 Выполняем FFmpeg команду:', {
      job_id: job.id,
      command: ffmpegCommand,
      input_videos: localVideoPaths.length,
    })

    await execAsync(ffmpegCommand)

    // Проверяем результат
    if (!fs.existsSync(outputPath)) {
      throw new Error('Final video was not created by FFmpeg')
    }

    logger.info('✅ Склейка видео завершена:', {
      job_id: job.id,
      telegram_id: job.telegram_id,
      final_video_path: outputPath,
      input_videos: videoUrls.length,
    })

    // Очищаем временные файлы (кроме финального видео)
    await fs.promises.unlink(listFilePath)
    for (const videoPath of localVideoPaths) {
      if (fs.existsSync(videoPath)) {
        await fs.promises.unlink(videoPath)
      }
    }

    return outputPath
  } catch (error) {
    // Очистка при ошибке
    if (fs.existsSync(tempDir)) {
      await fs.promises.rm(tempDir, { recursive: true, force: true })
    }

    logger.error('❌ Ошибка склейки видео:', {
      job_id: job.id,
      telegram_id: job.telegram_id,
      error: error instanceof Error ? error.message : String(error),
    })

    throw error
  }
}

/**
 * Доставляет результат пользователю
 */
async function deliverResult(
  job: BackgroundMorphingJob,
  videoPath: string
): Promise<void> {
  const botResult = getBotByName(job.bot_name)
  if (!botResult.bot) {
    throw new Error(`Bot ${job.bot_name} not found: ${botResult.error}`)
  }
  const bot = botResult.bot

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Final video not found: ${videoPath}`)
  }

  const advertisementText = job.is_ru
    ? `✨ Создано с помощью @${job.bot_name} ✨`
    : `✨ Created with @${job.bot_name} ✨`

  try {
    // Отправляем как видео с превью
    await bot.telegram.sendVideo(
      job.telegram_id,
      { source: videoPath },
      {
        caption: job.is_ru
          ? `🎉 Ваше морфинг видео готово! Обработано ${job.progress.completed_pairs} пар изображений. ${advertisementText}`
          : `🎉 Your morphing video is ready! Processed ${job.progress.completed_pairs} image pairs. ${advertisementText}`,
        width: 1920,
        height: 1080,
        duration: 5,
        supports_streaming: true,
      }
    )

    // Отправляем как файл для скачивания
    await bot.telegram.sendDocument(
      job.telegram_id,
      { source: videoPath },
      {
        caption: job.is_ru
          ? `⬇️ Скачать видеофайл: ${advertisementText}`
          : `⬇️ Download video file: ${advertisementText}`,
      }
    )

    logger.info('✅ Результат доставлен пользователю:', {
      job_id: job.id,
      telegram_id: job.telegram_id,
      video_path: videoPath,
    })
  } catch (error) {
    logger.error('❌ Ошибка доставки результата:', {
      job_id: job.id,
      telegram_id: job.telegram_id,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

/**
 * Уведомляет пользователя о начале обработки
 */
async function notifyUserStart(job: BackgroundMorphingJob): Promise<void> {
  const botResult = getBotByName(job.bot_name)
  if (!botResult.bot) return
  const bot = botResult.bot

  const estimatedMinutes = job.progress.total_pairs * 5

  await bot.telegram.sendMessage(
    job.telegram_id,
    job.is_ru
      ? `🚀 Начинаем обработку морфинг видео!\n\n📊 Изображений: ${job.image_files.length}\n🎬 Пар для обработки: ${job.progress.total_pairs}\n⏱️ Ориентировочное время: ~${estimatedMinutes} минут\n\n💡 Мы уведомим вас когда видео будет готово. Вы можете закрыть чат и заниматься своими делами.`
      : `🚀 Starting morphing video processing!\n\n📊 Images: ${job.image_files.length}\n🎬 Pairs to process: ${job.progress.total_pairs}\n⏱️ Estimated time: ~${estimatedMinutes} minutes\n\n💡 We'll notify you when the video is ready. You can close the chat and go about your business.`
  )
}

/**
 * Уведомляет пользователя об ошибке
 */
async function notifyUserError(
  job: BackgroundMorphingJob,
  errorMessage: string
): Promise<void> {
  const botResult = getBotByName(job.bot_name)
  if (!botResult.bot) return
  const bot = botResult.bot

  await bot.telegram.sendMessage(
    job.telegram_id,
    job.is_ru
      ? `❌ Произошла ошибка при создании морфинг видео:\n\n${errorMessage}\n\nПожалуйста, попробуйте еще раз или свяжитесь с поддержкой.`
      : `❌ An error occurred while creating the morphing video:\n\n${errorMessage}\n\nPlease try again or contact support.`
  )
}

/**
 * Очищает завершенное задание
 */
function cleanupJob(jobId: string): void {
  const job = activeJobs.get(jobId)
  if (!job) return

  // Удаляем временные файлы
  if (job.extraction_path && fs.existsSync(job.extraction_path)) {
    fs.rmSync(job.extraction_path, { recursive: true, force: true })
  }

  // Удаляем финальное видео
  if (
    job.result?.final_video_path &&
    fs.existsSync(job.result.final_video_path)
  ) {
    fs.unlinkSync(job.result.final_video_path)
  }

  // Удаляем из памяти
  activeJobs.delete(jobId)

  logger.info('🧹 Задание очищено:', {
    job_id: jobId,
    telegram_id: job.telegram_id,
  })
}

/**
 * API для получения статистики очереди
 */
export function getQueueStats() {
  return {
    active_jobs: activeJobs.size,
    pending_jobs: jobQueue.length,
    is_processing: isProcessing,
    jobs_by_status: {
      pending: Array.from(activeJobs.values()).filter(
        j => j.status === 'pending'
      ).length,
      processing: Array.from(activeJobs.values()).filter(
        j => j.status === 'processing'
      ).length,
      completed: Array.from(activeJobs.values()).filter(
        j => j.status === 'completed'
      ).length,
      failed: Array.from(activeJobs.values()).filter(j => j.status === 'failed')
        .length,
    },
  }
}
