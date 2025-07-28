/**
 * Scenario Clips Generation Event Interfaces
 * Генерация раскадровки из фотографии для создания клипов/Reels/YouTube роликов
 */

import { z } from 'zod'

// =====================================
// GENERATE SCENARIO CLIPS EVENT
// =====================================

export interface GenerateScenarioClipsEvent {
  photo_url: string // URL загруженного базового фото
  prompt: string // Базовый промт для генерации сцен
  scene_count: number // Количество различных сцен (1-20)
  variants_per_scene: number // Количество вариантов каждой сцены (1-5)
  aspect_ratio: '9:16' | '16:9' // Соотношение сторон
  flux_model?: string // Модель FLUX для использования (по умолчанию flux-1.1-pro)
  project_id: number
  requester_telegram_id: string
  metadata?: {
    timestamp: string
    test?: string
    test_env?: string
    version?: string
    bible_theme?: string // Специальная тема из библии вайп-кодинга
    blogger_style?: string // Добавляем поддержку блогерских стилей
  }
}

export interface GenerateScenarioClipsEventPayload {
  name: 'content/generate-scenario-clips'
  data: GenerateScenarioClipsEvent
}

// =====================================
// VALIDATION SCHEMAS
// =====================================

export const generateScenarioClipsSchema = z.object({
  photo_url: z.string().min(1, 'Требуется путь к фотографии или URL'), // Разрешаем локальные пути для тестов
  prompt: z
    .string()
    .min(10, 'Промт должен содержать минимум 10 символов')
    .max(500, 'Промт не должен превышать 500 символов'),
  scene_count: z
    .number()
    .int()
    .min(1, 'Минимум 1 сцена')
    .max(20, 'Максимум 20 сцен'),
  variants_per_scene: z
    .number()
    .int()
    .min(1, 'Минимум 1 вариант')
    .max(5, 'Максимум 5 вариантов на сцену'),
  aspect_ratio: z.enum(['9:16', '16:9']).default('9:16'),
  flux_model: z.string().optional().default('black-forest-labs/flux-1.1-pro'),
  project_id: z
    .number()
    .int()
    .positive('ID проекта должен быть положительным числом'),
  requester_telegram_id: z.string().min(1, 'Telegram ID обязателен'),
  metadata: z
    .object({
      timestamp: z.string(),
      test: z.string().optional(),
      test_env: z.string().optional(),
      version: z.string().optional(),
      bible_theme: z.string().optional(),
      blogger_style: z.string().optional(),
    })
    .optional(),
})

export type GenerateScenarioClipsInput = z.infer<
  typeof generateScenarioClipsSchema
>

// =====================================
// SCENE DATA STRUCTURES
// =====================================

export interface SceneData {
  scene_number: number // Номер сцены (1, 2, 3...)
  scene_prompt: string // Промт для конкретной сцены
  variants: SceneVariant[] // Варианты этой сцены
  theme?: string // Тематика сцены (например, "Сотворение света")
}

export interface SceneVariant {
  variant_number: number // Номер варианта (1, 2, 3...)
  image_url: string // URL сгенерированного изображения
  prompt_used: string // Фактически использованный промт
  flux_model: string // Использованная модель FLUX
  generation_time: number // Время генерации в секундах
  metadata?: {
    seed?: number
    steps?: number
    guidance_scale?: number
    replicate_model?: string
    aspect_ratio?: string
    generation_source?: string
    [key: string]: any // Позволяем дополнительные поля
  }
}

// =====================================
// DATABASE RECORD STRUCTURE
// =====================================

export interface ScenarioClipsRecord {
  id: string // UUID
  project_id: number
  requester_telegram_id: string
  base_photo_url: string
  base_prompt: string
  scene_count: number
  variants_per_scene: number
  aspect_ratio: '9:16' | '16:9'
  flux_model: string
  generated_scenes: SceneData[] // JSON массив всех сцен
  archive_path?: string // Путь к созданному ZIP архиву
  html_report_path?: string // Путь к HTML отчету
  excel_report_path?: string // Путь к Excel файлу
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  error_message?: string // Сообщение об ошибке если статус FAILED
  total_cost_stars: number // Общая стоимость в звездах
  processing_time_seconds?: number // Общее время обработки
  metadata?: any // Метаданные включая блогерские стили
  created_at: Date
  completed_at?: Date
}

// =====================================
// REPORT GENERATION TYPES
// =====================================

export interface ScenarioReportMetadata {
  base_photo_url: string
  base_prompt: string
  total_scenes: number
  total_variants: number
  total_images: number
  aspect_ratio: string
  flux_model: string
  generation_date: Date
  processing_time: number
  cost_breakdown: {
    total_stars: number
    cost_per_image: number
    estimated_rubles: number
  }
  blogger_style?: string // Блогерский стиль
  style_info?: any // Информация о стиле
}

export interface ArchiveContents {
  html_report: string // Путь к HTML файлу
  excel_report: string // Путь к Excel файлу
  scene_images: string[] // Пути ко всем сгенерированным изображениям
  readme_txt: string // Путь к README файлу
  base_photo: string // Путь к оригинальному фото
}

// =====================================
// BIBLE THEME PRESETS
// =====================================

export const BIBLE_THEMES = {
  CREATION: {
    name: 'Сотворение мира',
    scenes: [
      'Да будет свет - яркое сияние прорезает тьму',
      'Разделение неба и земли - небесная твердь',
      'Появление суши и морей - разделение воды',
      'Растения и деревья - зеленые насаждения',
      'Солнце, луна и звезды - небесные светила',
      'Рыбы и птицы - живые существа в воде и воздухе',
      'Звери земные и человек - венец творения',
      'День покоя - гармония и совершенство',
    ],
    base_style: 'epic biblical scene, divine light, majestic atmosphere',
  },
} as const

export type BibleTheme = keyof typeof BIBLE_THEMES

// =====================================
// EXPORT TYPES FOR CONVENIENCE
// =====================================

export type {
  GenerateScenarioClipsEvent as ScenarioClipsEvent,
  GenerateScenarioClipsEventPayload as ScenarioClipsEventPayload,
  GenerateScenarioClipsInput as ScenarioClipsInput,
}
