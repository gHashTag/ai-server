/**
 * 🕉️ Священные Структуры Повествования
 * Универсальная архитектура для создания глубоких, многослойных историй
 */

// ================================
// БАЗОВЫЕ СТРУКТУРЫ ПОВЕСТВОВАНИЯ
// ================================

export enum StoryStructureType {
  THREE_ACT = 'THREE_ACT',
  SEVEN_ACT = 'SEVEN_ACT',
  HERO_JOURNEY = 'HERO_JOURNEY',
  NESTED_LOOPS = 'NESTED_LOOPS',
  SPARKLINES = 'SPARKLINES',
  MOUNTAIN = 'MOUNTAIN',
  CONVERGING_IDEAS = 'CONVERGING_IDEAS',
  FICHTEAN_CURVE = 'FICHTEAN_CURVE',
  IN_MEDIA_RES = 'IN_MEDIA_RES',
  NONLINEAR = 'NONLINEAR',
}

export enum WriterStyle {
  STEPHEN_KING = 'STEPHEN_KING', // Ужас, глубокая психология персонажей
  MARGARET_ATWOOD = 'MARGARET_ATWOOD', // Дистопия, социальная критика
  NEIL_GAIMAN = 'NEIL_GAIMAN', // Современная мифология, темное фэнтези
  HARUKI_MURAKAMI = 'HARUKI_MURAKAMI', // Магический реализм, отчуждение
  GEORGE_RR_MARTIN = 'GEORGE_RR_MARTIN', // Эпическое фэнтези, политические интриги
  BIBLICAL = 'BIBLICAL', // Притчи, духовные уроки
  TONI_MORRISON = 'TONI_MORRISON', // Поэтический язык, исследование травмы
  URSULA_LE_GUIN = 'URSULA_LE_GUIN', // Философская фантастика
  GABRIEL_MARQUEZ = 'GABRIEL_MARQUEZ', // Магический реализм, латиноамериканский колорит
  RUSSIAN_CLASSICS = 'RUSSIAN_CLASSICS', // Глубина души, философские поиски
}

export enum StoryGenre {
  FANTASY = 'FANTASY',
  SCIENCE_FICTION = 'SCIENCE_FICTION',
  HORROR = 'HORROR',
  THRILLER = 'THRILLER',
  MYSTERY = 'MYSTERY',
  ROMANCE = 'ROMANCE',
  CONTEMPORARY = 'CONTEMPORARY',
  HISTORICAL = 'HISTORICAL',
  LITERARY_FICTION = 'LITERARY_FICTION',
  MAGICAL_REALISM = 'MAGICAL_REALISM',
  DYSTOPIAN = 'DYSTOPIAN',
  BIBLICAL_PARABLE = 'BIBLICAL_PARABLE',
}

// ================================
// СТРУКТУРЫ ПЕРСОНАЖЕЙ И ТЕМ
// ================================

export interface CharacterPsychology {
  core_fear: string
  core_need: string
  theory_of_control: string
  lie_believed: string
  truth_needed: string
  internal_conflict: string
}

export interface CharacterRelationship {
  with_character_id: string
  relationship_type:
    | 'FAMILY'
    | 'FRIEND'
    | 'ENEMY'
    | 'MENTOR'
    | 'LOVE_INTEREST'
    | 'RIVAL'
  dynamic: string
  conflict_source?: string
  emotional_connection: number // 1-10
}

export interface CharacterProfile {
  id: string
  name: string
  role:
    | 'PROTAGONIST'
    | 'ANTAGONIST'
    | 'MENTOR'
    | 'ALLY'
    | 'SHADOW'
    | 'TRICKSTER'
  theme_embodiment: string
  psychology: CharacterPsychology
  relationships: CharacterRelationship[]
  speech_pattern: string
  quirks: string[]
  arc_type: {
    positive: boolean
    growth: boolean
    change: boolean
    fall?: boolean
  }
}

export interface Theme {
  name: string
  description: string
  central_question: string
  opposing_values: [string, string]
  universal_truth: string
  character_embodiments: string[]
  symbolic_elements: string[]
  moral_dilemma: string
}

// ================================
// СТРУКТУРЫ СЦЕН
// ================================

export interface SceneSetting {
  location: string
  time_period: string
  season: string
  weather: string
  atmosphere: string
  symbolic_meaning: string
}

export interface GeneratedScene {
  id: string
  scene_number: number
  story_beat: string
  title: string
  setting: SceneSetting
  characters_present: string[]
  pov_character: string
  narrative_summary: string
  key_dialogue: string[]
  internal_monologue: string[]
  sensory_details: {
    visual: string[]
    auditory: string[]
    tactile: string[]
    olfactory: string[]
    gustatory: string[]
  }
  techniques_used: string[]
  foreshadowing: string[]
  symbolism: string[]
  subtext: string[]
  opening_emotion: string
  closing_emotion: string
  tension_level: number
  stakes: string
  connects_to_scenes: string[]
  advances_plot: string
  develops_character: string
  explores_theme: string
  visual_prompt: string
  mood: string
  color_palette: string
  imagery_style: WriterStyle
}

// ================================
// МУДРОСТЬ И ИЗВЛЕЧЕНИЕ СМЫСЛА
// ================================

export interface WisdomExtraction {
  core_message: string
  moral_lesson: string
  philosophical_insight: string
  practical_wisdom: string
  universal_truth: string
  emotional_resonance: string
  call_to_action: string
}

// ================================
// СТРУКТУРА ИСТОРИИ
// ================================

export interface StoryStructure {
  type: StoryStructureType
  name: string
  description: string
  beats: string[]
  strengths: string[]
  best_for_genres: StoryGenre[]
  writer_styles: WriterStyle[]
}

export interface SubplotThread {
  id: string
  name: string
  characters_involved: string[]
  central_conflict: string
  resolution: string
  weaves_with_main_plot: string
  themes_explored: string[]
}

export interface StoryAnalysis {
  pacing_analysis: string
  character_development_score: number
  thematic_coherence: number
  emotional_resonance: number
  originality_score: number
  potential_issues: string[]
  strengths: string[]
  improvement_suggestions: string[]
}

export interface WritingPrompt {
  type: string
  prompt: string
  purpose: string
}

export interface VisualStoryboard {
  scene_id: string
  frame_number: number
  visual_description: string
  emotional_tone: string
  camera_angle: string
  composition: string
  key_visual_elements: string[]
}

export interface CharacterDesign {
  character_id: string
  physical_description: string
  clothing_style: string
  signature_items: string[]
  body_language: string
  facial_expressions: string[]
  color_associations: string[]
}

export interface GenerationMetadata {
  created_at: Date
  processing_time: number
  model_used: string
  prompt_iterations: number
  total_tokens_used: number
  complexity_score: number
  user_satisfaction_prediction: number
}

// ================================
// ЗАПРОС НА ГЕНЕРАЦИЮ ИСТОРИИ
// ================================

export interface StoryGenerationRequest {
  base_prompt: string
  structure_type: StoryStructureType
  writer_style: WriterStyle
  genre: StoryGenre
  character_count: number
  subplot_count: number
  scene_count: number
  themes: string[]
  wisdom_focus: string
  moral_complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX'
  pov: 'FIRST' | 'THIRD_LIMITED' | 'THIRD_OMNISCIENT' | 'MULTIPLE'
  tense: 'PAST' | 'PRESENT' | 'FUTURE'
  tone: 'DARK' | 'LIGHT' | 'BALANCED' | 'HUMOROUS' | 'SERIOUS'
  target_length: 'SHORT' | 'MEDIUM' | 'LONG'
  dialogue_to_narrative_ratio: number
  innovation_level: number // 0-1
  emotional_intensity: number // 0-1
  philosophical_depth: number // 0-1
}

// ================================
// ИТОГОВАЯ СГЕНЕРИРОВАННАЯ ИСТОРИЯ
// ================================

export interface GeneratedStory {
  id: string
  request: StoryGenerationRequest
  title: string
  tagline: string
  genre_blend: StoryGenre[]
  estimated_word_count: number
  structure: StoryStructure
  characters: CharacterProfile[]
  themes: Theme[]
  wisdom: WisdomExtraction
  scenes: GeneratedScene[]
  character_relationship_web: CharacterRelationship[]
  subplot_threads: SubplotThread[]
  story_analysis: StoryAnalysis
  writing_prompts: WritingPrompt[]
  expansion_suggestions: string[]
  visual_storyboard: VisualStoryboard[]
  character_designs: CharacterDesign[]
  generation_metadata: GenerationMetadata
}
