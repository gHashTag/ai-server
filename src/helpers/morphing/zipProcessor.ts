/**
 * 🧬 ZIP Processor для Морфинг API
 * Распаковка и валидация изображений из ZIP архивов
 */

import * as fs from 'fs'
import * as path from 'path'
import AdmZip from 'adm-zip'
import {
  ExtractedImage,
  ZipExtractionResult,
  DEFAULT_MORPHING_CONFIG,
} from '@/interfaces/morphing.interface'
import { logger } from '@/utils/logger'

/**
 * Проверяет, является ли файл поддерживаемым изображением
 */
function isValidImageFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return DEFAULT_MORPHING_CONFIG.allowed_image_formats.includes(ext)
}

/**
 * Извлекает номер порядка из имени файла
 * Поддерживаемые форматы:
 * - morphing_frame_1.jpg
 * - image_001.png
 * - 01.jpeg
 * - frame1.webp
 */
function extractOrderFromFilename(filename: string): number {
  // Удаляем расширение
  const nameWithoutExt = path.basename(filename, path.extname(filename))

  // Ищем числа в имени файла
  const numberMatch = nameWithoutExt.match(/(\d+)/)

  if (numberMatch) {
    return parseInt(numberMatch[1], 10)
  }

  // Если не найдено число, возвращаем 0 (будет отсортировано последним)
  return 0
}

/**
 * Создает директорию для извлечения файлов
 */
async function ensureExtractionDirectory(telegramId: string): Promise<string> {
  const extractionPath = path.join(
    DEFAULT_MORPHING_CONFIG.temp_dir,
    telegramId,
    `extraction_${Date.now()}`
  )

  try {
    await fs.promises.mkdir(extractionPath, { recursive: true })
    return extractionPath
  } catch (error) {
    logger.error('🧬 Ошибка создания директории извлечения:', {
      path: extractionPath,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error(`Failed to create extraction directory: ${error}`)
  }
}

/**
 * Извлекает изображения из ZIP архива
 */
export async function extractImagesFromZip(
  zipFilePath: string,
  telegramId: string,
  expectedCount?: number
): Promise<ZipExtractionResult> {
  logger.info('🧬 Начинаем извлечение изображений из ZIP:', {
    zipFilePath,
    telegramId,
    expectedCount,
  })

  try {
    // Проверяем существование ZIP файла
    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file not found: ${zipFilePath}`)
    }

    // Проверяем размер файла
    const stats = await fs.promises.stat(zipFilePath)
    const fileSizeMB = stats.size / (1024 * 1024)

    if (fileSizeMB > DEFAULT_MORPHING_CONFIG.max_file_size_mb) {
      throw new Error(
        `ZIP file too large: ${fileSizeMB.toFixed(2)}MB > ${
          DEFAULT_MORPHING_CONFIG.max_file_size_mb
        }MB`
      )
    }

    logger.info('🧬 ZIP файл проверен:', {
      size_mb: fileSizeMB.toFixed(2),
      size_bytes: stats.size,
    })

    // Создаем директорию для извлечения
    const extractionPath = await ensureExtractionDirectory(telegramId)

    // Открываем ZIP архив
    const zip = new AdmZip(zipFilePath)
    const zipEntries = zip.getEntries()

    logger.info('🧬 Записи в ZIP архиве:', {
      total_entries: zipEntries.length,
      entries: zipEntries.map(entry => ({
        name: entry.entryName,
        size: entry.header.size,
        is_directory: entry.isDirectory,
      })),
    })

    // Извлекаем и валидируем изображения
    const extractedImages: ExtractedImage[] = []

    for (const entry of zipEntries) {
      // Пропускаем директории и системные файлы
      if (
        entry.isDirectory ||
        entry.entryName.startsWith('__MACOSX/') ||
        entry.entryName.startsWith('.')
      ) {
        logger.info('🧬 Пропускаем запись:', entry.entryName)
        continue
      }

      // Проверяем, является ли файл изображением
      if (!isValidImageFile(entry.entryName)) {
        logger.warn('🧬 Неподдерживаемый формат файла:', entry.entryName)
        continue
      }

      try {
        // Извлекаем данные файла
        const fileBuffer = entry.getData()

        if (fileBuffer.length === 0) {
          logger.warn('🧬 Пустой файл изображения:', entry.entryName)
          continue
        }

        // Определяем порядок изображения
        const order = extractOrderFromFilename(entry.entryName)

        // Создаем уникальное имя файла
        const filename = `${order.toString().padStart(3, '0')}_${path.basename(
          entry.entryName
        )}`
        const filePath = path.join(extractionPath, filename)

        // Сохраняем файл
        await fs.promises.writeFile(filePath, fileBuffer)

        const extractedImage: ExtractedImage = {
          filename,
          originalName: entry.entryName,
          path: filePath,
          // Убираем buffer - используем только путь к файлу
          order,
        }

        extractedImages.push(extractedImage)

        logger.info('🧬 Изображение извлечено:', {
          original_name: entry.entryName,
          filename,
          order,
          size_bytes: fileBuffer.length,
        })
      } catch (error) {
        logger.error('🧬 Ошибка извлечения файла:', {
          entry_name: entry.entryName,
          error: error instanceof Error ? error.message : String(error),
        })
        continue
      }
    }

    // Сортируем изображения по порядку
    extractedImages.sort((a, b) => a.order - b.order)

    // Проверяем количество извлеченных изображений
    if (extractedImages.length < DEFAULT_MORPHING_CONFIG.min_images) {
      throw new Error(
        `Too few images extracted: ${extractedImages.length} < ${DEFAULT_MORPHING_CONFIG.min_images}`
      )
    }

    if (extractedImages.length > DEFAULT_MORPHING_CONFIG.max_images) {
      throw new Error(
        `Too many images extracted: ${extractedImages.length} > ${DEFAULT_MORPHING_CONFIG.max_images}`
      )
    }

    if (expectedCount && extractedImages.length !== expectedCount) {
      logger.warn('🧬 Несоответствие ожидаемого количества изображений:', {
        expected: expectedCount,
        actual: extractedImages.length,
      })
    }

    const result: ZipExtractionResult = {
      success: true,
      images: extractedImages,
      totalCount: extractedImages.length,
      extractionPath,
    }

    logger.info('🧬 ZIP извлечение завершено успешно:', {
      total_images: extractedImages.length,
      extraction_path: extractionPath,
      first_image: extractedImages[0]?.filename,
      last_image: extractedImages[extractedImages.length - 1]?.filename,
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('🧬 Ошибка извлечения ZIP архива:', {
      zipFilePath,
      telegramId,
      error: errorMessage,
    })

    return {
      success: false,
      images: [],
      totalCount: 0,
      extractionPath: '',
      error: errorMessage,
    }
  }
}

/**
 * Очищает временные файлы извлечения
 */
export async function cleanupExtractionFiles(
  extractionPath: string
): Promise<void> {
  if (!extractionPath || !fs.existsSync(extractionPath)) {
    return
  }

  try {
    await fs.promises.rm(extractionPath, { recursive: true, force: true })
    logger.info('🧬 Временные файлы очищены:', { extractionPath })
  } catch (error) {
    logger.error('🧬 Ошибка очистки временных файлов:', {
      extractionPath,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Валидирует последовательность изображений
 */
export function validateImageSequence(images: ExtractedImage[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (images.length === 0) {
    errors.push('No images provided for validation')
    return { isValid: false, errors }
  }

  // Проверяем на дубликаты порядка
  const orders = images.map(img => img.order)
  const uniqueOrders = new Set(orders)

  if (uniqueOrders.size !== orders.length) {
    errors.push('Duplicate image order numbers detected')
  }

  // Проверяем, что все изображения доступны и имеют валидные размеры на диске
  const minFileSize = 1024 // 1KB

  for (const image of images) {
    try {
      const fs = require('fs')
      const stats = fs.statSync(image.path)

      if (stats.size === 0) {
        errors.push(`Empty image file: ${image.filename}`)
        continue
      }

      if (stats.size < minFileSize) {
        errors.push(`Image too small: ${image.filename} (${stats.size} bytes)`)
      }
    } catch (error) {
      errors.push(`Cannot access image file: ${image.filename}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
