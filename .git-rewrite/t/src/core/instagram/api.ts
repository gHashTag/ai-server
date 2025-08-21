/**
 * Instagram API Client for RapidAPI Integration
 * Handles API requests to Instagram Scraper endpoints
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
// Simple logger without config dependencies
const logger = {
  info: (message: string, data?: any) =>
    console.log(`[INSTAGRAM-API] ${message}`, data),
  error: (message: string, data?: any) =>
    console.error(`[INSTAGRAM-API] ${message}`, data),
  warn: (message: string, data?: any) =>
    console.warn(`[INSTAGRAM-API] ${message}`, data),
}
import {
  InstagramAPIConfig,
  SimilarUsersParams,
  InstagramSimilarUsersResponse,
  RawInstagramUser,
  InstagramAPIError,
  InstagramScrapingError,
  RateLimitInfo,
} from '@/interfaces/instagram.interface'

// =====================================
// API CLIENT CONFIGURATION
// =====================================

/**
 * Default Instagram API configuration
 */
const defaultConfig: InstagramAPIConfig = {
  rapidApiKey: process.env.RAPIDAPI_INSTAGRAM_KEY || '',
  rapidApiHost:
    process.env.RAPIDAPI_INSTAGRAM_HOST ||
    'real-time-instagram-scraper-api1.p.rapidapi.com',
  baseUrl: 'https://real-time-instagram-scraper-api1.p.rapidapi.com',
  timeoutMs: 30000,
  retryAttempts: 3,
}

// Validate environment variables
if (!process.env.RAPIDAPI_INSTAGRAM_KEY) {
  throw new Error('RAPIDAPI_INSTAGRAM_KEY environment variable is required')
}

if (!process.env.RAPIDAPI_INSTAGRAM_HOST) {
  throw new Error('RAPIDAPI_INSTAGRAM_HOST environment variable is required')
}

/**
 * Instagram API Client class
 */
export class InstagramAPIClient {
  private client: AxiosInstance
  private config: InstagramAPIConfig
  private rateLimitInfo: RateLimitInfo | null = null

  constructor(config: Partial<InstagramAPIConfig> = {}) {
    this.config = { ...defaultConfig, ...config }

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeoutMs,
      headers: {
        'x-rapidapi-key': this.config.rapidApiKey,
        'x-rapidapi-host': this.config.rapidApiHost,
        'Content-Type': 'application/json',
      },
    })

    // Setup request/response interceptors
    this.setupInterceptors()
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        logger.info('🔄 Instagram API request initiated', {
          description: 'API request starting',
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params,
        })
        return config
      },
      error => {
        logger.error('❌ Instagram API request setup failed', {
          description: 'Request interceptor error',
          error: error.message,
        })
        return Promise.reject(error)
      }
    )

    // Response interceptor for rate limit tracking and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Track rate limit information from headers
        this.updateRateLimitInfo(response)

        logger.info('✅ Instagram API request completed successfully', {
          description: 'API response received',
          status: response.status,
          dataSize: JSON.stringify(response.data).length,
        })

        return response
      },
      error => {
        // Track rate limit information even on errors
        if (error.response) {
          this.updateRateLimitInfo(error.response)
        }

        logger.error('❌ Instagram API request failed', {
          description: 'API response error',
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })

        return Promise.reject(this.handleAPIError(error))
      }
    )
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: AxiosResponse): void {
    const headers = response.headers

    if (headers['x-ratelimit-limit']) {
      this.rateLimitInfo = {
        limit: parseInt(headers['x-ratelimit-limit']),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
        resetAt: new Date(
          Date.now() + parseInt(headers['x-ratelimit-reset'] || '0') * 1000
        ),
        retryAfter: headers['retry-after']
          ? parseInt(headers['retry-after'])
          : undefined,
      }

      logger.info('📊 Rate limit information updated', {
        description: 'API rate limits',
        ...this.rateLimitInfo,
      })
    }
  }

  /**
   * Handle API errors and convert to InstagramScrapingError
   */
  private handleAPIError(error: any): InstagramScrapingError {
    if (error.response) {
      const apiError: InstagramAPIError = {
        status: error.response.status,
        message: error.response.data?.message || error.response.statusText,
        code: error.response.data?.error_code,
        details: error.response.data,
      }

      // Handle specific error types
      switch (error.response.status) {
        case 429:
          return new InstagramScrapingError(
            'Rate limit exceeded. Please wait before making more requests.',
            'RATE_LIMIT_EXCEEDED',
            apiError
          )
        case 401:
          return new InstagramScrapingError(
            'Invalid API key or unauthorized access',
            'UNAUTHORIZED',
            apiError
          )
        case 404:
          return new InstagramScrapingError(
            'Instagram user not found or endpoint unavailable',
            'USER_NOT_FOUND',
            apiError
          )
        case 500:
          return new InstagramScrapingError(
            'Instagram API server error',
            'SERVER_ERROR',
            apiError
          )
        default:
          return new InstagramScrapingError(
            `Instagram API error: ${apiError.message}`,
            'API_ERROR',
            apiError
          )
      }
    } else if (error.code === 'ECONNABORTED') {
      return new InstagramScrapingError(
        'Request timeout - Instagram API did not respond in time',
        'TIMEOUT',
        error
      )
    } else {
      return new InstagramScrapingError(
        `Network error: ${error.message}`,
        'NETWORK_ERROR',
        error
      )
    }
  }

  /**
   * Get similar users for a given Instagram username or ID
   */
  async getSimilarUsers(
    params: SimilarUsersParams
  ): Promise<RawInstagramUser[]> {
    try {
      logger.info('🔍 Fetching similar Instagram users...', {
        description: 'Similar users API call',
        target: params.username_or_id,
        count: params.count,
      })

      // Check rate limits before making request
      if (this.rateLimitInfo && this.rateLimitInfo.remaining <= 0) {
        const waitTime = Math.max(
          0,
          this.rateLimitInfo.resetAt.getTime() - Date.now()
        )

        if (waitTime > 0) {
          logger.warn('⏳ Rate limit reached, waiting...', {
            description: 'Rate limit prevention',
            waitTimeSeconds: Math.ceil(waitTime / 1000),
          })

          throw new InstagramScrapingError(
            `Rate limit exceeded. Try again in ${Math.ceil(
              waitTime / 1000
            )} seconds.`,
            'RATE_LIMIT_EXCEEDED',
            { waitTime, resetAt: this.rateLimitInfo.resetAt }
          )
        }
      }

      const response =
        await this.makeRequestWithRetry<InstagramSimilarUsersResponse>(
          '/v1/similar_users_v2',
          {
            username_or_id: params.username_or_id,
            count: params.count || 50,
          }
        )

      // Validate response structure
      if (!response.success || !response.data?.users) {
        throw new InstagramScrapingError(
          'Invalid response format from Instagram API',
          'INVALID_RESPONSE',
          response
        )
      }

      const users = response.data.users

      logger.info('✅ Similar users fetched successfully', {
        description: 'API call completed',
        target: params.username_or_id,
        usersFound: users.length,
      })

      return users
    } catch (error) {
      if (error instanceof InstagramScrapingError) {
        throw error
      }

      logger.error('❌ Failed to fetch similar users', {
        description: 'getSimilarUsers error',
        target: params.username_or_id,
        error: error instanceof Error ? error.message : String(error),
      })

      throw new InstagramScrapingError(
        `Failed to fetch similar users for ${params.username_or_id}`,
        'FETCH_ERROR',
        error
      )
    }
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequestWithRetry<T>(
    endpoint: string,
    params: Record<string, any>,
    attempt = 1
  ): Promise<T> {
    try {
      const response = await this.client.get<T>(endpoint, { params })
      return response.data
    } catch (error) {
      if (attempt < this.config.retryAttempts) {
        const delay = Math.pow(2, attempt) * 1000 // Exponential backoff

        logger.warn(
          `⏳ Retrying API request (attempt ${attempt + 1}/${
            this.config.retryAttempts
          })`,
          {
            description: 'Request retry',
            endpoint,
            delay,
            error: error instanceof Error ? error.message : String(error),
          }
        )

        await new Promise(resolve => setTimeout(resolve, delay))
        return this.makeRequestWithRetry<T>(endpoint, params, attempt + 1)
      }

      throw error
    }
  }

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo
  }

  /**
   * Check if API is currently rate limited
   */
  isRateLimited(): boolean {
    if (!this.rateLimitInfo) return false
    return (
      this.rateLimitInfo.remaining <= 0 &&
      new Date() < this.rateLimitInfo.resetAt
    )
  }
}

// =====================================
// GLOBAL API CLIENT INSTANCE
// =====================================

/**
 * Global Instagram API client instance
 */
export const instagramAPI = new InstagramAPIClient()

/**
 * Helper function to get similar users (wrapper for global client)
 */
export async function getSimilarInstagramUsers(
  usernameOrId: string,
  count?: number
): Promise<RawInstagramUser[]> {
  return instagramAPI.getSimilarUsers({
    username_or_id: usernameOrId,
    count,
  })
}
