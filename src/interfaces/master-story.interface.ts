/**
 * 🕉️ Интерфейсы для Генератора Мастерских Историй
 *
 * Типы данных для профессионального инструмента создания историй
 */

import {
  WriterStyle,
  StoryGenre,
  StoryStructureType,
  GeneratedStory,
  WisdomExtraction,
} from './story-architecture.interface'

// ================================
// ЗАПРОС НА ГЕНЕРАЦИЮ МАСТЕРСКОЙ ИСТОРИИ
// ================================

export interface MasterStoryRequest {
  // Базовые параметры
  project_id: string
  requester_telegram_id: string
  base_prompt: string

  // Настройки истории
  writer_style: WriterStyle
  genre: StoryGenre
  structure_type?: StoryStructureType

  // Настройки сложности
  complexity?: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
  character_count?: number // 2-8
  scene_count?: number // 5-50

  // Тематические элементы
  themes?: string[]
  wisdom_focus?: string

  // Стилистика
  pov?: 'FIRST' | 'THIRD_LIMITED' | 'THIRD_OMNISCIENT' | 'MULTIPLE'
  tone?: 'DARK' | 'LIGHT' | 'BALANCED' | 'HUMOROUS' | 'SERIOUS'

  // Технические параметры
  aspect_ratio?: '16:9' | '9:16'
  flux_model?: string

  // Мета-данные
  metadata?: {
    target_audience?: string
    content_warnings?: string[]
    inspiration_sources?: string[]
  }
}

// ================================
// ЗАПИСЬ В БАЗЕ ДАННЫХ
// ================================

export interface MasterStoryRecord {
  id: string
  project_id: string
  requester_telegram_id: string

  // Параметры запроса
  base_prompt: string
  writer_style: WriterStyle
  genre: StoryGenre
  structure_type: StoryStructureType
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
  character_count: number
  scene_count: number
  aspect_ratio: '16:9' | '9:16'
  flux_model: string

  // Результаты
  generated_story?: GeneratedStory
  archive_path?: string
  html_report_path?: string
  excel_report_path?: string

  // Метаданные
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  error_message?: string
  total_cost_stars: number
  processing_time_seconds?: number

  // Временные метки
  created_at: Date
  completed_at?: Date
}

// ================================
// РЕЗУЛЬТАТ ГЕНЕРАЦИИ
// ================================

export interface MasterStoryResult {
  success: boolean
  data?: {
    record_id: string
    story?: GeneratedStory
    characters: number
    scenes: number
    themes: number
    wisdom: string
    archive?: {
      path: string
      filename: string
    }
    metadata: {
      total_cost_stars: number
      processing_time: number
      complexity_score: number
      writer_style: WriterStyle
      genre: StoryGenre
    }
  }
  error?: string
}

// ================================
// СОБЫТИЯ INNGEST
// ================================

export interface MasterStoryGenerationEvent {
  name: 'content/generate-master-story'
  data: MasterStoryRequest
}

// ================================
// КОНФИГУРАЦИЯ СТИЛЕЙ ПИСАТЕЛЕЙ
// ================================

export interface WriterStyleConfig {
  name: string
  description: string
  key_characteristics: string[]
  recommended_genres: StoryGenre[]
  complexity_preference: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
  typical_themes: string[]
  visual_style: string
  color_palette: string
  mood: string
}

export const WRITER_STYLE_CONFIGS: Record<WriterStyle, WriterStyleConfig> = {
  [WriterStyle.STEPHEN_KING]: {
    name: 'Стивен Кинг',
    description: 'Мастер психологического ужаса и глубокой характеризации',
    key_characteristics: [
      'Обычные люди в необычных обстоятельствах',
      'Детальная психология персонажей',
      'Постепенное нарастание напряжения',
      'Социальная критика через ужас',
    ],
    recommended_genres: [
      StoryGenre.HORROR,
      StoryGenre.THRILLER,
      StoryGenre.CONTEMPORARY,
    ],
    complexity_preference: 'MODERATE',
    typical_themes: [
      'Страх',
      'Выживание',
      'Человеческая природа',
      'Сообщество',
    ],
    visual_style: 'Atmospheric horror with suburban gothic elements',
    color_palette: 'Deep shadows with stark highlights',
    mood: 'Dark and psychologically intense',
  },

  [WriterStyle.MARGARET_ATWOOD]: {
    name: 'Маргарет Этвуд',
    description: 'Пророчица дистопий и исследователь женского опыта',
    key_characteristics: [
      'Социальная критика через спекулятивную фантастику',
      'Сильные женские персонажи',
      'Экологические и политические темы',
      'Ироничный наблюдательный тон',
    ],
    recommended_genres: [
      StoryGenre.DYSTOPIAN,
      StoryGenre.SCIENCE_FICTION,
      StoryGenre.LITERARY_FICTION,
    ],
    complexity_preference: 'COMPLEX',
    typical_themes: ['Власть', 'Свобода', 'Экология', 'Гендер'],
    visual_style: 'Stark social realism with symbolic elements',
    color_palette: 'Muted earth tones with sharp contrasts',
    mood: 'Thought-provoking and politically charged',
  },

  [WriterStyle.NEIL_GAIMAN]: {
    name: 'Нил Гейман',
    description: 'Архитектор современных мифов и темного фэнтези',
    key_characteristics: [
      'Смешение мифологии с современностью',
      'Дети как главные герои',
      'Параллельные миры и скрытая магия',
      'Готическая атмосфера',
    ],
    recommended_genres: [
      StoryGenre.FANTASY,
      StoryGenre.MAGICAL_REALISM,
      StoryGenre.HORROR,
    ],
    complexity_preference: 'MODERATE',
    typical_themes: ['Взросление', 'Мифы', 'Семья', 'Магия'],
    visual_style: 'Gothic fantasy with mythological elements',
    color_palette: 'Rich jewel tones with ethereal highlights',
    mood: 'Mystical and otherworldly',
  },

  [WriterStyle.HARUKI_MURAKAMI]: {
    name: 'Харуки Мураками',
    description: 'Поэт современного отчуждения и магического реализма',
    key_characteristics: [
      'Магический реализм в повседневности',
      'Одинокие протагонисты',
      'Сюрреалистические элементы',
      'Медитативная проза',
    ],
    recommended_genres: [
      StoryGenre.MAGICAL_REALISM,
      StoryGenre.LITERARY_FICTION,
      StoryGenre.CONTEMPORARY,
    ],
    complexity_preference: 'MODERATE',
    typical_themes: ['Одиночество', 'Память', 'Музыка', 'Поиск'],
    visual_style: 'Surreal mundane scenes with dreamlike quality',
    color_palette: 'Soft pastels with unexpected pops of color',
    mood: 'Melancholic and contemplative',
  },

  [WriterStyle.GEORGE_RR_MARTIN]: {
    name: 'Джордж Мартин',
    description: 'Хронист власти и создатель эпических саг',
    key_characteristics: [
      'Множественные POV персонажи',
      'Политические интриги',
      'Моральная сложность',
      'Неожиданные смерти персонажей',
    ],
    recommended_genres: [
      StoryGenre.FANTASY,
      StoryGenre.HISTORICAL,
      StoryGenre.THRILLER,
    ],
    complexity_preference: 'COMPLEX',
    typical_themes: ['Власть', 'Честь', 'Война', 'Политика'],
    visual_style: 'Epic medieval fantasy with political intrigue',
    color_palette: 'Rich royal colors with metallic accents',
    mood: 'Epic and politically complex',
  },

  [WriterStyle.BIBLICAL]: {
    name: 'Библейский стиль',
    description: 'Притчи и откровения с вечными истинами',
    key_characteristics: [
      'Простые образы со скрытым смыслом',
      'Моральные уроки',
      'Символическая нагрузка',
      'Духовная трансформация',
    ],
    recommended_genres: [
      StoryGenre.BIBLICAL_PARABLE,
      StoryGenre.LITERARY_FICTION,
    ],
    complexity_preference: 'SIMPLE',
    typical_themes: ['Искупление', 'Прощение', 'Вера', 'Любовь'],
    visual_style: 'Classical religious art with divine lighting',
    color_palette: 'Golden warm tones with celestial blues',
    mood: 'Reverent and spiritually profound',
  },

  [WriterStyle.TONI_MORRISON]: {
    name: 'Тони Моррисон',
    description: 'Мастер поэтического языка и исследователь травмы',
    key_characteristics: [
      'Поэтический язык',
      'Афроамериканский опыт',
      'Исследование травмы и исцеления',
      'Магический реализм',
    ],
    recommended_genres: [
      StoryGenre.LITERARY_FICTION,
      StoryGenre.HISTORICAL,
      StoryGenre.MAGICAL_REALISM,
    ],
    complexity_preference: 'COMPLEX',
    typical_themes: ['Травма', 'Исцеление', 'Идентичность', 'Сообщество'],
    visual_style: 'Poetic imagery with cultural symbolism',
    color_palette: 'Earth tones with vibrant cultural colors',
    mood: 'Emotionally intense and healing',
  },

  [WriterStyle.URSULA_LE_GUIN]: {
    name: 'Урсула Ле Гуин',
    description: 'Философ фантастики и исследователь альтернативных обществ',
    key_characteristics: [
      'Философская научная фантастика',
      'Альтернативные социальные структуры',
      'Экологические темы',
      'Глубокая этика',
    ],
    recommended_genres: [
      StoryGenre.SCIENCE_FICTION,
      StoryGenre.FANTASY,
      StoryGenre.LITERARY_FICTION,
    ],
    complexity_preference: 'COMPLEX',
    typical_themes: ['Равновесие', 'Экология', 'Общество', 'Этика'],
    visual_style: 'Philosophical sci-fi with natural elements',
    color_palette: 'Natural colors with cosmic elements',
    mood: 'Philosophical and contemplative',
  },

  [WriterStyle.GABRIEL_MARQUEZ]: {
    name: 'Габриэль Маркес',
    description: 'Мастер магического реализма и латиноамериканской культуры',
    key_characteristics: [
      'Магический реализм',
      'Семейные саги',
      'Латиноамериканская культура',
      'Циклическое время',
    ],
    recommended_genres: [
      StoryGenre.MAGICAL_REALISM,
      StoryGenre.LITERARY_FICTION,
      StoryGenre.HISTORICAL,
    ],
    complexity_preference: 'MODERATE',
    typical_themes: ['Судьба', 'Время', 'Семья', 'Магия'],
    visual_style: 'Magical realism with tropical elements',
    color_palette: 'Vibrant tropical colors with golden accents',
    mood: 'Magical and cyclical',
  },

  [WriterStyle.RUSSIAN_CLASSICS]: {
    name: 'Русская классика',
    description:
      'Глубина человеческой души в традициях Толстого и Достоевского',
    key_characteristics: [
      'Глубокая психологическая проработка',
      'Философские дискуссии',
      'Социальная критика',
      'Духовные поиски',
    ],
    recommended_genres: [
      StoryGenre.LITERARY_FICTION,
      StoryGenre.HISTORICAL,
      StoryGenre.CONTEMPORARY,
    ],
    complexity_preference: 'COMPLEX',
    typical_themes: ['Душа', 'Справедливость', 'Любовь', 'Страдание'],
    visual_style: 'Classical Russian realism with emotional depth',
    color_palette: 'Deep emotional colors with winter elements',
    mood: 'Profound and emotionally expansive',
  },
}

// ================================
// УТИЛИТЫ ДЛЯ РАБОТЫ СО СТИЛЯМИ
// ================================

export class WriterStyleUtils {
  static getConfig(style: WriterStyle): WriterStyleConfig {
    return WRITER_STYLE_CONFIGS[style]
  }

  static getRecommendedGenres(style: WriterStyle): StoryGenre[] {
    return this.getConfig(style).recommended_genres
  }

  static getComplexityPreference(
    style: WriterStyle
  ): 'SIMPLE' | 'MODERATE' | 'COMPLEX' {
    return this.getConfig(style).complexity_preference
  }

  static getVisualStyle(style: WriterStyle): string {
    return this.getConfig(style).visual_style
  }

  static getColorPalette(style: WriterStyle): string {
    return this.getConfig(style).color_palette
  }

  static getAllStyles(): WriterStyleConfig[] {
    return Object.values(WRITER_STYLE_CONFIGS)
  }

  static findStyleByName(name: string): WriterStyle | null {
    const entry = Object.entries(WRITER_STYLE_CONFIGS).find(([_, config]) =>
      config.name.toLowerCase().includes(name.toLowerCase())
    )
    return entry ? (entry[0] as WriterStyle) : null
  }
}
