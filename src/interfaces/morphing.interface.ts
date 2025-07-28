/**
 * 🧬 Интерфейсы для Морфинг API
 * Обработка ZIP архивов с изображениями и создание морфинг-видео
 */

// ================================
// ОСНОВНЫЕ ТИПЫ И ENUMS
// ================================

export enum MorphingType {
  SEAMLESS = 'seamless',
  LOOP = 'loop',
}

export enum MorphingModel {
  KLING_V16_PRO = 'kling-v1.6-pro',
}

export enum MorphingStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ERROR = 'error',
}

// ================================
// ЗАПРОС НА МОРФИНГ
// ================================

/**
 * Входные данные для морфинг эндпоинта
 * Приходят через FormData в POST /generate/morph-images
 */
export interface MorphImagesRequest {
  type: 'morphing'
  telegram_id: string
  images_zip: File
  image_count: string // Приходит как строка из FormData
  morphing_type: MorphingType
  model: MorphingModel
  is_ru: string // Приходит как строка из FormData
  bot_name: string
}

/**
 * Обработанные данные запроса (после валидации)
 */
export interface ProcessedMorphRequest {
  type: 'morphing'
  telegram_id: string
  image_count: number
  morphing_type: MorphingType
  model: MorphingModel
  is_ru: boolean
  bot_name: string
  zip_file_path: string
}

// ================================
// ОТВЕТ МОРФИНГ API
// ================================

/**
 * Ответ при успешном принятии запроса
 */
export interface MorphImagesSuccessResponse {
  message: string
  job_id: string
  status: MorphingStatus.PROCESSING
  estimated_time: string
}

/**
 * Ответ при ошибке
 */
export interface MorphImagesErrorResponse {
  message: string
  error: string
  status: MorphingStatus.ERROR
}

export type MorphImagesResponse =
  | MorphImagesSuccessResponse
  | MorphImagesErrorResponse

// ================================
// ОБРАБОТКА ZIP АРХИВА
// ================================

/**
 * Информация об извлеченном изображении
 */
export interface ExtractedImage {
  filename: string
  originalName: string
  path: string
  // Убираем buffer: Buffer - это вызывало output_too_large
  order: number // Порядок в последовательности (извлекается из имени файла)
}

/**
 * Результат распаковки ZIP архива
 */
export interface ZipExtractionResult {
  success: boolean
  images: ExtractedImage[]
  totalCount: number
  extractionPath: string
  error?: string
}

// ================================
// ИНТЕГРАЦИЯ С KLING API
// ================================

/**
 * Запрос к Kling API
 */
export interface KlingMorphingRequest {
  model: string // 'kling-v1.6-pro'
  task_type: 'image_morphing'
  images: string[] // Base64 encoded images
  transition_type: MorphingType
  output_format: 'mp4'
  quality: 'high'
  webhook_url?: string
}

/**
 * Ответ от Kling API
 */
export interface KlingMorphingResponse {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  model: string
  created_at: string
  output_url?: string
  output_duration?: number
  error?: string
  estimated_time?: number
}

/**
 * Результат обработки в Kling
 */
export interface KlingProcessingResult {
  success: boolean
  job_id: string
  video_url?: string
  error?: string
  processing_time?: number
}

// ================================
// СОХРАНЕНИЕ И ДОСТАВКА
// ================================

/**
 * Результат загрузки видео в хранилище
 */
export interface VideoStorageResult {
  success: boolean
  public_url: string
  file_size: number
  file_path: string
  error?: string
}

/**
 * Результат отправки в Telegram
 */
export interface TelegramDeliveryResult {
  success: boolean
  message_id?: number
  error?: string
  delivery_time?: number
}

// ================================
// ИТОГОВЫЙ РЕЗУЛЬТАТ МОРФИНГА
// ================================

/**
 * Полный результат процесса морфинга
 */
export interface MorphingJobResult {
  job_id: string
  telegram_id: string
  status: MorphingStatus

  // Входные данные
  original_request: ProcessedMorphRequest

  // Этапы обработки
  zip_extraction: ZipExtractionResult
  kling_processing: KlingProcessingResult
  video_storage: VideoStorageResult
  telegram_delivery: TelegramDeliveryResult

  // Метаданные
  created_at: Date
  completed_at?: Date
  processing_time?: number
  final_video_url?: string
  error?: string
}

// ================================
// КОНФИГУРАЦИЯ И НАСТРОЙКИ
// ================================

/**
 * Настройки морфинг процессора
 */
export interface MorphingConfig {
  // Ограничения
  max_images: number
  min_images: number
  max_file_size_mb: number
  allowed_image_formats: string[]

  // Временные настройки
  processing_timeout_ms: number
  cleanup_delay_ms: number

  // Kling API
  kling_api_url: string
  kling_model: string

  // Хранилище
  temp_dir: string
  output_dir: string
}

/**
 * Настройки по умолчанию
 */
export const DEFAULT_MORPHING_CONFIG: MorphingConfig = {
  max_images: 100,
  min_images: 2,
  max_file_size_mb: 50,
  allowed_image_formats: ['.jpg', '.jpeg', '.png', '.webp'],
  processing_timeout_ms: 600000, // 10 минут
  cleanup_delay_ms: 3600000, // 1 час
  kling_api_url: 'https://api.kling.kuaishou.com/v1',
  kling_model: 'kling-v1.6-pro',
  temp_dir: process.cwd() + '/tmp/morphing', // Абсолютный путь
  output_dir: process.cwd() + '/uploads/morphing', // Абсолютный путь
}

// ================================
// УТИЛИТАРНЫЕ ТИПЫ
// ================================

/**
 * Логирование этапов морфинга
 */
export interface MorphingLogEntry {
  timestamp: Date
  stage:
    | 'validation'
    | 'extraction'
    | 'morphing'
    | 'storage'
    | 'delivery'
    | 'cleanup'
  message: string
  details?: any
  error?: boolean
}

/**
 * Прогресс обработки
 */
export interface MorphingProgress {
  job_id: string
  current_stage: string
  progress_percent: number
  estimated_remaining_ms: number
  logs: MorphingLogEntry[]
}
