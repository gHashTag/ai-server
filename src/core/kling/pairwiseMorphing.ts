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
  logger.info('🧬 Создаем пару морфинг видео:', {
    telegram_id: telegramId,
    image1: image1.filename,
    image2: image2.filename,
    morphing_type: morphingType,
  })

  // Используем обновленную функцию для Replicate
  const result = await createKlingMorphingVideo(
    [image1, image2],
    morphingType,
    telegramId
  )

  if (!result.success || !result.video_url) {
    throw new Error(`Pair morphing failed: ${result.error}`)
  }

  logger.info('✅ Пара морфинг видео создана:', {
    telegram_id: telegramId,
    video_url: result.video_url,
    job_id: result.job_id,
  })

  return result.video_url
}

/**
 * Загружает видео по URL и сохраняет локально
 */
async function downloadVideoToLocal(
  videoUrl: string,
  localPath: string
): Promise<void> {
  logger.info('🧬 Загрузка видео локально:', {
    video_url: videoUrl,
    local_path: localPath,
  })

  try {
    const axios = require('axios')
    const response = await axios.get(videoUrl, { responseType: 'stream' })

    const writer = fs.createWriteStream(localPath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (error) {
    logger.error('🧬 Ошибка загрузки видео:', {
      video_url: videoUrl,
      error: error instanceof Error ? error.message : String(error),
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
  logger.info('🧬 Склейка видео с помощью FFmpeg:', {
    input_count: videoPaths.length,
    output_path: outputPath,
  })

  try {
    // Создаем список файлов для FFmpeg
    const listFilePath = outputPath.replace('.mp4', '_list.txt')
    const listContent = videoPaths.map(path => `file '${path}'`).join('\n')

    await fs.promises.writeFile(listFilePath, listContent)

    // Выполняем склейку с помощью FFmpeg
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${listFilePath}" -c copy "${outputPath}"`

    logger.info('🧬 Выполняем FFmpeg команду:', { command: ffmpegCommand })

    const { stdout, stderr } = await execAsync(ffmpegCommand)

    logger.info('🧬 FFmpeg склейка завершена:', {
      output_path: outputPath,
      stdout: stdout,
      stderr: stderr,
    })

    // Очищаем временный список файлов
    await fs.promises.unlink(listFilePath)
  } catch (error) {
    logger.error('🧬 Ошибка склейки видео с FFmpeg:', {
      input_count: videoPaths.length,
      output_path: outputPath,
      error: error instanceof Error ? error.message : String(error),
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
  logger.info('🧬 Начинаем последовательный попарный морфинг:', {
    telegram_id: telegramId,
    image_count: images.length,
    morphing_type: morphingType,
    pairs_to_create:
      morphingType === MorphingType.LOOP && images.length > 2
        ? images.length // Для LOOP: каждое изображение + последнее с первым
        : images.length - 1, // Для SEAMLESS: только соседние пары
    is_loop: morphingType === MorphingType.LOOP,
  })

  if (images.length < 2) {
    throw new Error('Need at least 2 images for morphing')
  }

  const startTime = Date.now()
  const tempDir = path.join(
    __dirname,
    '../../../tmp/morphing',
    telegramId,
    `concatenation_${Date.now()}`
  )

  try {
    // Создаем временную директорию для промежуточных видео
    await fs.promises.mkdir(tempDir, { recursive: true })

    const pairVideoUrls: string[] = []
    const localVideoPaths: string[] = []

    // ШАГ 1: Создаем морфинг видео для каждой пары соседних изображений
    for (let i = 0; i < images.length - 1; i++) {
      const image1 = images[i]
      const image2 = images[i + 1]

      logger.info(`🧬 Обрабатываем пару ${i + 1}/${images.length - 1}:`, {
        from: image1.filename,
        to: image2.filename,
      })

      // Создаем морфинг видео для этой пары
      const pairVideoUrl = await createPairMorphingVideo(
        image1,
        image2,
        morphingType,
        telegramId
      )

      pairVideoUrls.push(pairVideoUrl)

      // Загружаем видео локально для склейки
      const localVideoPath = path.join(tempDir, `pair_${i + 1}.mp4`)
      await downloadVideoToLocal(pairVideoUrl, localVideoPath)
      localVideoPaths.push(localVideoPath)
    }

    // 🔄 ШАГ 1.5: Если LOOP морфинг - добавляем связь последнего изображения с первым
    if (morphingType === MorphingType.LOOP && images.length > 2) {
      const lastImage = images[images.length - 1]
      const firstImage = images[0]

      logger.info(`🔄 LOOP: Соединяем последнее изображение с первым:`, {
        from: lastImage.filename,
        to: firstImage.filename,
        loop_pair: `${images.length}/${images.length}`,
      })

      // Создаем финальную пару для замыкания петли
      const loopVideoUrl = await createPairMorphingVideo(
        lastImage,
        firstImage,
        morphingType,
        telegramId
      )

      pairVideoUrls.push(loopVideoUrl)

      // Загружаем loop видео локально для склейки
      const loopVideoPath = path.join(tempDir, `pair_loop.mp4`)
      await downloadVideoToLocal(loopVideoUrl, loopVideoPath)
      localVideoPaths.push(loopVideoPath)

      logger.info('✅ LOOP пара создана успешно:', {
        loop_video_url: loopVideoUrl,
        total_pairs: pairVideoUrls.length,
      })
    }

    // ШАГ 2: Склеиваем все пары в одно финальное видео
    logger.info('🎬 Начинаем склейку видео:', {
      telegram_id: telegramId,
      videos_to_concatenate: localVideoPaths.length,
      morphing_type: morphingType,
      includes_loop: morphingType === MorphingType.LOOP && images.length > 2,
    })

    const finalVideoPath = path.join(
      tempDir,
      `final_morphing_${Date.now()}.mp4`
    )
    await concatenateVideos(localVideoPaths, finalVideoPath)

    // ШАГ 3: Загружаем финальное видео обратно (например, в облачное хранилище)
    // Пока просто возвращаем путь к локальному файлу
    const processingTime = Date.now() - startTime

    logger.info('🧬 Последовательный попарный морфинг завершен:', {
      telegram_id: telegramId,
      total_pairs: pairVideoUrls.length, // Правильное количество созданных пар
      processing_time_ms: processingTime,
      final_video_path: finalVideoPath,
      morphing_type: morphingType,
      was_loop: morphingType === MorphingType.LOOP,
    })

    return {
      success: true,
      job_id: `sequential_morph_${telegramId}_${Date.now()}`,
      video_url: finalVideoPath, // Локальный путь пока
      processing_time: processingTime,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('🧬 Ошибка в последовательном попарном морфинге:', {
      telegram_id: telegramId,
      error: errorMessage,
    })

    // Очистка временных файлов при ошибке
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true })
      }
    } catch (cleanupError) {
      logger.error('🧬 Ошибка очистки временных файлов:', cleanupError)
    }

    return {
      success: false,
      job_id: '',
      error: errorMessage,
    }
  }
}
