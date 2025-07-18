/**
 * Instagram Content Agent Event Interfaces
 * Jobs to be Done Architecture for Inngest Functions
 */

// =====================================
// JOB 1: FIND COMPETITORS EVENT
// =====================================

export interface FindCompetitorsEvent {
  username_or_id: string
  count?: number // Default: 10
  min_followers?: number // Minimum followers filter
  project_id?: number
  telegram_user_id?: string
  requester_telegram_id?: string
  metadata?: Record<string, any>
}

export interface FindCompetitorsEventPayload {
  name: 'instagram/find-competitors'
  data: FindCompetitorsEvent
}

// =====================================
// JOB 2: ANALYZE REELS EVENT
// =====================================

export interface AnalyzeReelsEvent {
  username: string
  max_reels?: number // Default: 15
  days_back?: number // Default: 14 days
  project_id?: number
  telegram_user_id?: string
  requester_telegram_id?: string
  metadata?: Record<string, any>
}

export interface AnalyzeReelsEventPayload {
  name: 'instagram/analyze-reels'
  data: AnalyzeReelsEvent
}

// =====================================
// JOB 3: EXTRACT TOP CONTENT EVENT
// =====================================

export interface ExtractTopContentEvent {
  username: string
  limit?: number // Default: 10
  sort_by?: 'views' | 'likes' | 'comments' // Default: 'views'
  days_back?: number // Default: 14 days
  project_id?: number
  telegram_user_id?: string
  requester_telegram_id?: string
  metadata?: Record<string, any>
}

export interface ExtractTopContentEventPayload {
  name: 'instagram/extract-top-content'
  data: ExtractTopContentEvent
}

// =====================================
// JOB 4: GENERATE CONTENT SCRIPTS EVENT
// =====================================

export interface GenerateContentScriptsEvent {
  reel_id: string
  record_id?: string // Alternative identifier
  ig_reel_url?: string
  project_id?: number
  telegram_user_id?: string
  requester_telegram_id?: string
  ai_model?: 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' // Default: 'gpt-4'
  language?: 'en' | 'ru' | 'es' | 'fr' // Default: 'en'
  metadata?: Record<string, any>
}

export interface GenerateContentScriptsEventPayload {
  name: 'instagram/generate-content-scripts'
  data: GenerateContentScriptsEvent
}

// =====================================
// JOB 5: TELEGRAM COMMAND EVENT
// =====================================

export interface TelegramCommandEvent {
  command: string // e.g. "/find", "/analyze", "/topreels", "/script"
  args: string[] // Command arguments
  user_id: string // Telegram user ID
  chat_id: string // Telegram chat ID
  message_id: number // Original message ID
  full_message: string // Full message text
  project_id?: number
  metadata?: Record<string, any>
}

export interface TelegramCommandEventPayload {
  name: 'telegram/command'
  data: TelegramCommandEvent
}

// =====================================
// RESPONSE INTERFACES
// =====================================

/**
 * Find Competitors Response
 */
export interface FindCompetitorsResponse {
  success: boolean
  competitors_found: number
  competitors_saved: number
  duplicates_skipped: number
  search_target: string
  project_id?: number
  telegram_message_sent: boolean
  error?: string
}

/**
 * Analyze Reels Response
 */
export interface AnalyzeReelsResponse {
  success: boolean
  reels_found: number
  reels_saved: number
  duplicates_skipped: number
  target_username: string
  project_id?: number
  telegram_message_sent: boolean
  error?: string
}

/**
 * Extract Top Content Response
 */
export interface ExtractTopContentResponse {
  success: boolean
  top_reels_count: number
  target_username: string
  sort_by: string
  days_back: number
  project_id?: number
  telegram_message_sent: boolean
  top_reels: Array<{
    reel_id: string
    ig_reel_url: string
    caption: string
    views_count: number
    likes_count: number
    comments_count: number
    created_at_instagram: string
  }>
  error?: string
}

/**
 * Generate Content Scripts Response
 */
export interface GenerateContentScriptsResponse {
  success: boolean
  reel_id: string
  scripts_generated: number
  transcript_length: number
  ai_model_used: string
  language: string
  project_id?: number
  telegram_message_sent: boolean
  scripts: {
    script_v1: string
    script_v2: string
    script_v3: string
  }
  error?: string
}

/**
 * Telegram Command Response
 */
export interface TelegramCommandResponse {
  success: boolean
  command: string
  args: string[]
  user_id: string
  action_taken: string
  triggered_function?: string
  response_sent: boolean
  memory_saved: boolean
  error?: string
}

// =====================================
// UTILITY TYPES
// =====================================

/**
 * Available Telegram Commands
 */
export type TelegramCommand =
  | '/find'
  | '/analyze'
  | '/topreels'
  | '/script'
  | '/help'
  | '/status'

/**
 * Command Parameters
 */
export interface CommandParams {
  find: {
    count: number
    username: string
    min_followers?: number
  }
  analyze: {
    username: string
    max_reels?: number
    days_back?: number
  }
  topreels: {
    username: string
    limit?: number
    sort_by?: 'views' | 'likes' | 'comments'
  }
  script: {
    reel_id: string
    ai_model?: string
    language?: string
  }
}

/**
 * Inngest Function IDs
 */
export const INNGEST_FUNCTION_IDS = {
  FIND_COMPETITORS: 'find-competitors',
  ANALYZE_REELS: 'analyze-competitor-reels',
  EXTRACT_TOP_CONTENT: 'extract-top-content',
  GENERATE_CONTENT_SCRIPTS: 'generate-content-scripts',
  TELEGRAM_COMMAND_HANDLER: 'telegram-command-handler',
} as const

/**
 * Inngest Event Names
 */
export const INNGEST_EVENT_NAMES = {
  FIND_COMPETITORS: 'instagram/find-competitors',
  ANALYZE_REELS: 'instagram/analyze-reels',
  EXTRACT_TOP_CONTENT: 'instagram/extract-top-content',
  GENERATE_CONTENT_SCRIPTS: 'instagram/generate-content-scripts',
  TELEGRAM_COMMAND: 'telegram/command',
} as const

// =====================================
// ERROR TYPES
// =====================================

export class InstagramContentAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public job: string,
    public details?: any
  ) {
    super(message)
    this.name = 'InstagramContentAgentError'
  }
}

export type InstagramContentAgentErrorCode =
  | 'COMPETITORS_NOT_FOUND'
  | 'REELS_NOT_FOUND'
  | 'TRANSCRIPT_FAILED'
  | 'SCRIPT_GENERATION_FAILED'
  | 'TELEGRAM_SEND_FAILED'
  | 'DATABASE_ERROR'
  | 'API_RATE_LIMITED'
  | 'INVALID_COMMAND'
  | 'INVALID_PARAMETERS'

// =====================================
// CONFIGURATION
// =====================================

export interface InstagramContentAgentConfig {
  // Rate limiting
  api_rate_limit: {
    requests_per_minute: number
    burst_limit: number
  }

  // Default values
  defaults: {
    competitors_count: number
    reels_count: number
    top_content_limit: number
    days_back: number
    ai_model: string
    language: string
  }

  // Telegram settings
  telegram: {
    max_message_length: number
    memory_limit: number
    command_timeout: number
  }

  // Database settings
  database: {
    connection_timeout: number
    query_timeout: number
    pool_size: number
  }
}

export const DEFAULT_CONFIG: InstagramContentAgentConfig = {
  api_rate_limit: {
    requests_per_minute: 30,
    burst_limit: 10,
  },
  defaults: {
    competitors_count: 10,
    reels_count: 15,
    top_content_limit: 10,
    days_back: 14,
    ai_model: 'gpt-4',
    language: 'en',
  },
  telegram: {
    max_message_length: 4096,
    memory_limit: 10,
    command_timeout: 30000,
  },
  database: {
    connection_timeout: 30000,
    query_timeout: 60000,
    pool_size: 20,
  },
}
