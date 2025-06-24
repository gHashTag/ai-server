/**
 * Instagram API Integration Interfaces
 * Defines all TypeScript types for Instagram Scraper functionality
 */

// =====================================
// RAW API RESPONSE INTERFACES
// =====================================

/**
 * Raw Instagram user data from RapidAPI response
 */
export interface RawInstagramUser {
  pk: string // Instagram ID
  username: string // Username (@username)
  full_name: string // Display name
  is_private: boolean // Private account flag
  is_verified: boolean // Verified account flag
  profile_pic_url: string // Avatar URL
  profile_chaining_secondary_label: string // Secondary display label
  social_context: string // Social context info
}

/**
 * Instagram API similar users response structure
 */
export interface InstagramSimilarUsersResponse {
  success: boolean
  data: {
    users: RawInstagramUser[]
    count: number
    next_cursor?: string // For pagination
  }
  message?: string
  error?: string
}

// =====================================
// DATABASE ENTITY INTERFACES
// =====================================

/**
 * Instagram user entity for database storage
 */
export interface InstagramUserEntity {
  id: string // UUID primary key
  search_username: string // Original search target
  user_pk: string // Instagram user ID
  username: string // Username
  full_name: string | null // Display name (nullable)
  is_private: boolean // Private account flag
  is_verified: boolean // Verified account flag
  profile_pic_url: string | null // Avatar URL (nullable)
  profile_chaining_secondary_label: string | null // Secondary label (nullable)
  social_context: string | null // Social context (nullable)
  scraped_at: Date // When scraped
  created_at: Date // When first saved
  updated_at: Date // When last updated
}

/**
 * Insert payload for new Instagram user record
 */
export interface CreateInstagramUserPayload {
  search_username: string
  user_pk: string
  username: string
  full_name?: string | null
  is_private?: boolean
  is_verified?: boolean
  profile_pic_url?: string | null
  profile_chaining_secondary_label?: string | null
  social_context?: string | null
}

// =====================================
// INNGEST EVENT INTERFACES
// =====================================

/**
 * Instagram scraping event data
 */
export interface InstagramScrapingEventData {
  username_or_id: string // Target username or Instagram ID
  max_users?: number // Max users to scrape (default: 50)
  requester_telegram_id?: string // ID of user who requested (optional)
  metadata?: Record<string, any> // Additional metadata
}

/**
 * Complete Instagram scraping event
 */
export interface InstagramScrapingEvent {
  name: 'instagram/scrape-similar-users'
  data: InstagramScrapingEventData
}

// =====================================
// API CLIENT INTERFACES
// =====================================

/**
 * Configuration for Instagram API client
 */
export interface InstagramAPIConfig {
  rapidApiKey: string // RapidAPI key
  rapidApiHost: string // RapidAPI host
  baseUrl: string // Base API URL
  timeoutMs?: number // Request timeout (default: 30000)
  retryAttempts?: number // Retry attempts (default: 3)
}

/**
 * Parameters for similar users API call
 */
export interface SimilarUsersParams {
  username_or_id: string // Target username or ID
  count?: number // Number of users to return
}

// =====================================
// SERVICE INTERFACES
// =====================================

/**
 * Result of Instagram API scraping operation
 */
export interface InstagramScrapingResult {
  success: boolean
  usersScraped: number
  usersSaved: number // Successfully saved to DB
  duplicatesSkipped: number // Duplicate users found
  errors: string[] // Any errors encountered
  searchTarget: string // Original search target
  scrapedAt: Date // When operation completed
}

/**
 * Instagram user validation result
 */
export interface InstagramUserValidation {
  isValid: boolean
  errors: string[] // Validation errors
  warnings: string[] // Non-critical issues
}

// =====================================
// DATABASE OPERATION INTERFACES
// =====================================

/**
 * Bulk insert result for Instagram users
 */
export interface BulkInsertResult {
  totalProcessed: number
  inserted: number
  updated: number
  skipped: number // Duplicates or invalid records
  errors: Array<{
    record: CreateInstagramUserPayload
    error: string
  }>
}

/**
 * Query filters for Instagram users
 */
export interface InstagramUserFilters {
  search_username?: string
  is_verified?: boolean
  is_private?: boolean
  scraped_after?: Date
  scraped_before?: Date
  limit?: number
  offset?: number
}

// =====================================
// ERROR HANDLING INTERFACES
// =====================================

/**
 * Instagram API error response
 */
export interface InstagramAPIError {
  status: number
  message: string
  code?: string
  details?: any
}

/**
 * Custom Instagram scraping error
 */
export class InstagramScrapingError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message)
    this.name = 'InstagramScrapingError'
  }
}

// =====================================
// UTILITY TYPES
// =====================================

/**
 * Supported Instagram identifier types
 */
export type InstagramIdentifier = string // Can be username or numeric ID

/**
 * Scraping status for monitoring
 */
export type ScrapingStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rate_limited'

/**
 * API rate limit information
 */
export interface RateLimitInfo {
  limit: number // Requests per time window
  remaining: number // Remaining requests
  resetAt: Date // When limit resets
  retryAfter?: number // Seconds to wait if rate limited
}
