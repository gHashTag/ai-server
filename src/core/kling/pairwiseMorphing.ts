/**
 * 🧬 Последовательный Морфинг через Replicate
 * Обработка множественных изображений попарно (1→2, 2→3, и т.д.)
 * Склейка результатов в единое видео
 */

import { logger } from '@/utils/logger'
import {
  ExtractedImage,
  MorphingType,
  KlingProcessingResult,
} from '@/interfaces/morphing.interface'
import { createKlingMorphingVideo } from './index'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import axios from 'axios'

const execAsync = promisify(exec)

/**
 * Создает морфинг видео для пары изображений через Replicate
 */
async function createPairMorphingVideo(
  image1: ExtractedImage,
  image2: ExtractedImage,
  morphingType: MorphingType,
  telegramId: string
): Promise<string> {
  const pairStartTime = Date.now()

  logger.info('🧬 🎬 НАЧИНАЕМ создание пары морфинг видео:', {
    telegram_id: telegramId,
    image1: image1.filename,
    image2: image2.filename,
    morphing_type: morphingType,
    image1_path: image1.path,
    image2_path: image2.path,
  })

  try {
    // Используем обновленную функцию для Replicate
    const result = await createKlingMorphingVideo(
      [image1, image2],
      morphingType,
      telegramId
    )

    const pairProcessingTime = Date.now() - pairStartTime

    if (!result.success || !result.video_url) {
      logger.error('🧬 ❌ ОШИБКА создания пары морфинг видео:', {
        telegram_id: telegramId,
        image1: image1.filename,
        image2: image2.filename,
        error: result.error,
        processing_time_ms: pairProcessingTime,
        processing_time_sec: Math.round(pairProcessingTime / 1000),
      })
      throw new Error(`Pair morphing failed: ${result.error}`)
    }

    logger.info('✅ 🎬 Пара морфинг видео создана УСПЕШНО:', {
      telegram_id: telegramId,
      image1: image1.filename,
      image2: image2.filename,
      video_url: result.video_url,
      job_id: result.job_id,
      processing_time_ms: pairProcessingTime,
      processing_time_sec: Math.round(pairProcessingTime / 1000),
      processing_time_min: Math.round(pairProcessingTime / 60000),
    })

    return result.video_url
  } catch (error) {
    const pairProcessingTime = Date.now() - pairStartTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('💥 🎬 КРИТИЧЕСКАЯ ОШИБКА создания пары:', {
      telegram_id: telegramId,
      image1: image1.filename,
      image2: image2.filename,
      error: errorMessage,
      error_details: error,
      processing_time_ms: pairProcessingTime,
      processing_time_sec: Math.round(pairProcessingTime / 1000),
      is_timeout: errorMessage.includes('timed out'),
      is_replicate_error: errorMessage.includes('Replicate API error'),
    })

    throw error // Пробрасываем ошибку дальше
  }
}

/**
 * Загружает видео по URL и сохраняет локально
 */
async function downloadVideoToLocal(
  videoUrl: string,
  localPath: string
): Promise<void> {
  const downloadStartTime = Date.now()

  logger.info('📥 🌐 НАЧИНАЕМ загрузку видео локально:', {
    video_url: videoUrl,
    local_path: localPath,
    url_host: new URL(videoUrl).host,
  })

  try {
    const axios = require('axios')

    logger.info('📥 Отправляем HTTP запрос для загрузки...', {
      video_url: videoUrl,
      local_path: localPath,
    })

    const response = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 5 * 60 * 1000, // 5 минут таймаут
    })

    logger.info('📥 HTTP ответ получен, начинаем запись в файл:', {
      video_url: videoUrl,
      local_path: localPath,
      status: response.status,
      content_length: response.headers['content-length'],
      content_type: response.headers['content-type'],
    })

    const writer = fs.createWriteStream(localPath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        const downloadTime = Date.now() - downloadStartTime

        // Проверяем размер скачанного файла
        const fs = require('fs')
        const stats = fs.statSync(localPath)

        logger.info('✅ 📥 Видео загружено УСПЕШНО:', {
          video_url: videoUrl,
          local_path: localPath,
          download_time_ms: downloadTime,
          download_time_sec: Math.round(downloadTime / 1000),
          file_size_bytes: stats.size,
          file_size_mb: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
        })

        resolve()
      })

      writer.on('error', error => {
        const downloadTime = Date.now() - downloadStartTime

        logger.error('💥 📥 ОШИБКА записи файла:', {
          video_url: videoUrl,
          local_path: localPath,
          download_time_ms: downloadTime,
          error: error instanceof Error ? error.message : String(error),
          error_details: error,
        })

        reject(error)
      })
    })
  } catch (error) {
    const downloadTime = Date.now() - downloadStartTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('💥 📥 КРИТИЧЕСКАЯ ОШИБКА загрузки видео:', {
      video_url: videoUrl,
      local_path: localPath,
      error: errorMessage,
      error_details: error,
      download_time_ms: downloadTime,
      download_time_sec: Math.round(downloadTime / 1000),
      is_timeout:
        errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT'),
      is_network_error:
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ENOTFOUND'),
      is_http_error: errorMessage.includes('Request failed'),
    })

    throw error
  }
}

/**
 * Склеивает множество видео в одно финальное видео с помощью FFmpeg
 */
async function concatenateVideos(
  videoPaths: string[],
  outputPath: string
): Promise<void> {
  const concatenationStartTime = Date.now()

  logger.info('🎬 🔧 НАЧИНАЕМ склейку видео с помощью FFmpeg:', {
    input_count: videoPaths.length,
    output_path: outputPath,
    input_paths: videoPaths,
  })

  try {
    // Проверяем, что все входные файлы существуют
    logger.info('🎬 Проверяем входные файлы...', {
      input_count: videoPaths.length,
    })

    for (let i = 0; i < videoPaths.length; i++) {
      const videoPath = videoPaths[i]
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Input video file does not exist: ${videoPath}`)
      }

      const stats = fs.statSync(videoPath)
      logger.info(`✅ Файл ${i + 1}/${videoPaths.length} проверен:`, {
        path: videoPath,
        size_bytes: stats.size,
        size_mb: Math.round((stats.size / (1024 * 1024)) * 100) / 100,
        exists: true,
      })
    }

    // Создаем список файлов для FFmpeg
    const listFilePath = outputPath.replace('.mp4', '_list.txt')
    const listContent = videoPaths.map(path => `file '${path}'`).join('\n')

    logger.info('🎬 Создаем список файлов для FFmpeg:', {
      list_file_path: listFilePath,
      list_content: listContent,
    })

    await fs.promises.writeFile(listFilePath, listContent)

    // Выполняем склейку с помощью FFmpeg
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`

    logger.info('🎬 🚀 Выполняем FFmpeg команду:', {
      command: ffmpegCommand,
      estimated_time: '1-5 минут',
    })

    const ffmpegStartTime = Date.now()
    const { stdout, stderr } = await execAsync(ffmpegCommand)
    const ffmpegTime = Date.now() - ffmpegStartTime

    logger.info('✅ 🎬 FFmpeg склейка завершена УСПЕШНО:', {
      output_path: outputPath,
      ffmpeg_time_ms: ffmpegTime,
      ffmpeg_time_sec: Math.round(ffmpegTime / 1000),
      stdout_length: stdout.length,
      stderr_length: stderr.length,
      stdout: stdout.substring(0, 500) + (stdout.length > 500 ? '...' : ''),
      stderr: stderr.substring(0, 500) + (stderr.length > 500 ? '...' : ''),
    })

    // Проверяем результирующий файл
    if (fs.existsSync(outputPath)) {
      const outputStats = fs.statSync(outputPath)
      logger.info('✅ 🎬 Результирующий файл создан:', {
        output_path: outputPath,
        output_size_bytes: outputStats.size,
        output_size_mb:
          Math.round((outputStats.size / (1024 * 1024)) * 100) / 100,
      })
    } else {
      throw new Error(`Output file was not created: ${outputPath}`)
    }

    // Очищаем временный список файлов
    logger.info('🧹 Очищаем временный список файлов...', {
      list_file_path: listFilePath,
    })

    await fs.promises.unlink(listFilePath)

    const totalConcatenationTime = Date.now() - concatenationStartTime
    logger.info('🎉 🎬 Склейка видео ПОЛНОСТЬЮ завершена:', {
      input_count: videoPaths.length,
      output_path: outputPath,
      total_concatenation_time_ms: totalConcatenationTime,
      total_concatenation_time_sec: Math.round(totalConcatenationTime / 1000),
    })
  } catch (error) {
    const totalConcatenationTime = Date.now() - concatenationStartTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('💥 🎬 КРИТИЧЕСКАЯ ОШИБКА склейки видео с FFmpeg:', {
      input_count: videoPaths.length,
      output_path: outputPath,
      input_paths: videoPaths,
      error: errorMessage,
      error_details: error,
      concatenation_time_ms: totalConcatenationTime,
      concatenation_time_sec: Math.round(totalConcatenationTime / 1000),
      is_ffmpeg_error:
        errorMessage.includes('ffmpeg') ||
        errorMessage.includes('Command failed'),
      is_file_error:
        errorMessage.includes('does not exist') ||
        errorMessage.includes('ENOENT'),
      is_permission_error:
        errorMessage.includes('EACCES') || errorMessage.includes('permission'),
    })

    throw error
  }
}

/**
 * ОСНОВНАЯ ФУНКЦИЯ: Правильный попарный морфинг с склейкой
 */
export async function processSequentialMorphing(
  images: ExtractedImage[],
  morphingType: MorphingType,
  telegramId: string
): Promise<KlingProcessingResult> {
  const overallStartTime = Date.now()

  logger.info('🧬 🚀 НАЧИНАЕМ последовательный попарный морфинг:', {
    telegram_id: telegramId,
    image_count: images.length,
    morphing_type: morphingType,
    pairs_to_create:
      morphingType === MorphingType.LOOP && images.length > 2
        ? images.length // Для LOOP: каждое изображение + последнее с первым
        : images.length - 1, // Для SEAMLESS: только соседние пары
    is_loop: morphingType === MorphingType.LOOP,
    expected_processing_time_estimate: `${(images.length - 1) * 5}-${
      (images.length - 1) * 15
    } минут`,
  })

  if (images.length < 2) {
    throw new Error('Need at least 2 images for morphing')
  }

  const tempDir = path.join(
    __dirname,
    '../../../tmp/morphing',
    telegramId,
    `concatenation_${Date.now()}`
  )

  try {
    // 📁 ШАГ 0: Создание временной директории
    const dirStartTime = Date.now()
    logger.info('📁 Создаем временную директорию...', {
      telegram_id: telegramId,
      temp_dir: tempDir,
    })

    await fs.promises.mkdir(tempDir, { recursive: true })

    logger.info('✅ Временная директория создана:', {
      telegram_id: telegramId,
      temp_dir: tempDir,
      creation_time_ms: Date.now() - dirStartTime,
    })

    const pairVideoUrls: string[] = []
    const localVideoPaths: string[] = []

    // ШАГ 1: Создаем морфинг видео для каждой пары соседних изображений
    logger.info('🧬 ЭТАП 1: Создание морфинг видео для пар:', {
      telegram_id: telegramId,
      pairs_count: images.length - 1,
      estimated_time: `${(images.length - 1) * 5}-${
        (images.length - 1) * 15
      } минут`,
    })

    for (let i = 0; i < images.length - 1; i++) {
      const pairStartTime = Date.now()
      const image1 = images[i]
      const image2 = images[i + 1]

      logger.info(`🧬 ⏳ Обрабатываем пару ${i + 1}/${images.length - 1}:`, {
        telegram_id: telegramId,
        pair_index: i + 1,
        total_pairs: images.length - 1,
        from: image1.filename,
        to: image2.filename,
        estimated_time: '5-15 минут',
      })

      // Создаем морфинг видео для этой пары
      const pairVideoUrl = await createPairMorphingVideo(
        image1,
        image2,
        morphingType,
        telegramId
      )

      const pairProcessingTime = Date.now() - pairStartTime

      logger.info(`✅ Пара ${i + 1}/${images.length - 1} завершена:`, {
        telegram_id: telegramId,
        pair_index: i + 1,
        processing_time_ms: pairProcessingTime,
        processing_time_sec: Math.round(pairProcessingTime / 1000),
        processing_time_min: Math.round(pairProcessingTime / 60000),
        video_url: pairVideoUrl,
      })

      pairVideoUrls.push(pairVideoUrl)

      // 📥 ШАГ 1.1: Загружаем видео локально для склейки
      const downloadStartTime = Date.now()
      logger.info(`📥 Загружаем видео ${i + 1} локально...`, {
        telegram_id: telegramId,
        pair_index: i + 1,
        video_url: pairVideoUrl,
      })

      const localVideoPath = path.join(tempDir, `pair_${i + 1}.mp4`)
      await downloadVideoToLocal(pairVideoUrl, localVideoPath)
      localVideoPaths.push(localVideoPath)

      const downloadTime = Date.now() - downloadStartTime
      logger.info(`✅ Видео ${i + 1} загружено:`, {
        telegram_id: telegramId,
        pair_index: i + 1,
        local_path: localVideoPath,
        download_time_ms: downloadTime,
        download_time_sec: Math.round(downloadTime / 1000),
      })
    }

    // 🔄 ШАГ 1.5: Если LOOP морфинг - добавляем связь последнего изображения с первым
    if (morphingType === MorphingType.LOOP && images.length > 2) {
      const loopStartTime = Date.now()
      const lastImage = images[images.length - 1]
      const firstImage = images[0]

      logger.info(`🔄 LOOP: Создаем замыкающую пару:`, {
        telegram_id: telegramId,
        from: lastImage.filename,
        to: firstImage.filename,
        loop_pair: `${images.length}/${images.length}`,
        estimated_time: '5-15 минут',
      })

      // Создаем финальную пару для замыкания петли
      const loopVideoUrl = await createPairMorphingVideo(
        lastImage,
        firstImage,
        morphingType,
        telegramId
      )

      pairVideoUrls.push(loopVideoUrl)

      const loopProcessingTime = Date.now() - loopStartTime
      logger.info('✅ LOOP пара создана:', {
        telegram_id: telegramId,
        loop_video_url: loopVideoUrl,
        total_pairs: pairVideoUrls.length,
        loop_processing_time_ms: loopProcessingTime,
        loop_processing_time_sec: Math.round(loopProcessingTime / 1000),
      })

      // 📥 Загружаем loop видео локально для склейки
      const loopDownloadStartTime = Date.now()
      logger.info('📥 Загружаем LOOP видео локально...', {
        telegram_id: telegramId,
        loop_video_url: loopVideoUrl,
      })

      const loopVideoPath = path.join(tempDir, `pair_loop.mp4`)
      await downloadVideoToLocal(loopVideoUrl, loopVideoPath)
      localVideoPaths.push(loopVideoPath)

      const loopDownloadTime = Date.now() - loopDownloadStartTime
      logger.info('✅ LOOP видео загружено:', {
        telegram_id: telegramId,
        local_path: loopVideoPath,
        download_time_ms: loopDownloadTime,
        download_time_sec: Math.round(loopDownloadTime / 1000),
      })
    }

    // ШАГ 2: Склеиваем все пары в одно финальное видео
    const concatenationStartTime = Date.now()
    logger.info('🎬 ЭТАП 2: Начинаем склейку видео:', {
      telegram_id: telegramId,
      videos_to_concatenate: localVideoPaths.length,
      morphing_type: morphingType,
      includes_loop: morphingType === MorphingType.LOOP && images.length > 2,
      estimated_time: '1-5 минут',
      local_video_paths: localVideoPaths,
    })

    const finalVideoPath = path.join(
      tempDir,
      `final_morphing_${Date.now()}.mp4`
    )
    await concatenateVideos(localVideoPaths, finalVideoPath)

    const concatenationTime = Date.now() - concatenationStartTime
    logger.info('✅ Склейка видео завершена:', {
      telegram_id: telegramId,
      final_video_path: finalVideoPath,
      concatenation_time_ms: concatenationTime,
      concatenation_time_sec: Math.round(concatenationTime / 1000),
    })

    // ШАГ 3: Финальные результаты
    const totalProcessingTime = Date.now() - overallStartTime

    logger.info('🎉 🧬 Последовательный попарный морфинг ЗАВЕРШЕН:', {
      telegram_id: telegramId,
      total_pairs: pairVideoUrls.length,
      total_processing_time_ms: totalProcessingTime,
      total_processing_time_sec: Math.round(totalProcessingTime / 1000),
      total_processing_time_min: Math.round(totalProcessingTime / 60000),
      final_video_path: finalVideoPath,
      morphing_type: morphingType,
      was_loop: morphingType === MorphingType.LOOP,
      success: true,
    })

    return {
      success: true,
      job_id: `sequential_morph_${telegramId}_${Date.now()}`,
      video_url: finalVideoPath, // Локальный путь пока
      processing_time: totalProcessingTime,
    }
  } catch (error) {
    const totalProcessingTime = Date.now() - overallStartTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('💥 🧬 ОШИБКА в последовательном попарном морфинге:', {
      telegram_id: telegramId,
      error: errorMessage,
      error_details: error,
      total_processing_time_ms: totalProcessingTime,
      total_processing_time_sec: Math.round(totalProcessingTime / 1000),
      total_processing_time_min: Math.round(totalProcessingTime / 60000),
      is_timeout: errorMessage.includes('timed out'),
      is_replicate_error: errorMessage.includes('Replicate API error'),
      is_ffmpeg_error: errorMessage.includes('ffmpeg'),
      is_download_error:
        errorMessage.includes('download') || errorMessage.includes('axios'),
    })

    // Очистка временных файлов при ошибке
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
        logger.info('🧹 Временные файлы очищены после ошибки:', {
          telegram_id: telegramId,
          temp_dir: tempDir,
        })
      }
    } catch (cleanupError) {
      logger.error('🧬 Ошибка очистки временных файлов:', {
        telegram_id: telegramId,
        cleanup_error: cleanupError,
      })
    }

    return {
      success: false,
      job_id: '',
      error: errorMessage,
    }
  }
}
