/**
 * MCP Tool: Instagram Scraper
 * Triggers Instagram similar users scraping with comprehensive reels support
 */

import { z } from 'zod'
import { triggerInstagramScrapingV2 } from '../../inngest-functions/instagramScraper-v2.js'
import { InstagramScrapingEventSchema } from '../../core/instagram/schemas'

/**
 * Создает задачу для скрапинга похожих пользователей Instagram
 * ВАЖНО: project_id обязателен для сохранения данных в правильный проект Neon DB
 */
export async function createInstagramScraping(input: {
  username_or_id: string
  project_id: number
  max_users?: number
  max_reels_per_user?: number
  scrape_reels?: boolean
  requester_telegram_id?: string
}) {
  try {
    // Валидация входных данных с помощью Zod
    const validatedData = InstagramScrapingEventSchema.parse({
      username_or_id: input.username_or_id,
      project_id: input.project_id, // Обязательный параметр!
      max_users: input.max_users || 50,
      max_reels_per_user: input.max_reels_per_user || 50,
      scrape_reels: input.scrape_reels || false,
      requester_telegram_id: input.requester_telegram_id,
      metadata: {
        source: 'mcp_tool',
        timestamp: new Date().toISOString(),
      },
    })

    // Запускаем Inngest функцию
    const result = await triggerInstagramScrapingV2(validatedData)

    return {
      success: true,
      message: `Instagram scraping started successfully for "${input.username_or_id}"`,
      eventId: result.eventId,
      projectId: input.project_id,
      targetUsername: input.username_or_id,
      maxUsers: validatedData.max_users,
      maxReelsPerUser: validatedData.max_reels_per_user,
      scrapeReels: validatedData.scrape_reels,
      dashboardUrl: 'http://localhost:8288/events',
      functionUrl: `http://localhost:8288/functions/instagram-scraper-v2`,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation Error',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        hint: 'Make sure project_id is a positive integer',
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check if all required environment variables are set (RAPIDAPI_INSTAGRAM_KEY, NEON_DATABASE_URL)',
    }
  }
}

// Схема для валидации параметров MCP инструмента
export const InstagramScrapingMCPSchema = z.object({
  username_or_id: z
    .string()
    .min(1, 'Username or Instagram ID is required')
    .describe('Target Instagram username or ID to find similar users'),
  project_id: z
    .number()
    .int()
    .positive('Project ID must be a positive integer')
    .describe('Neon Database Project ID where data will be saved'),
  max_users: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of similar users to scrape (1-200)'),
  max_reels_per_user: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of reels to scrape per user (1-200)'),
  scrape_reels: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to scrape reels'),
  requester_telegram_id: z
    .string()
    .optional()
    .describe('Telegram ID of the person requesting the scraping'),
})

export type InstagramScrapingMCPInput = z.infer<
  typeof InstagramScrapingMCPSchema
>
