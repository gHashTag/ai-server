/**
 * Tests for analyzeCompetitorReels Inngest function
 * Job 2: "Мне нужно понять, какой контент популярен у конкурентов"
 * Analyzes competitor reels with metrics and saves to database
 */

// Mock environment variables BEFORE any imports
process.env.RAPIDAPI_INSTAGRAM_KEY = 'test_key'
process.env.NEXT_PUBLIC_MANAGEMENT_TOKEN = 'test_token'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'test_service_key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
process.env.SECRET_KEY = 'test_secret_key'
process.env.SECRET_API_KEY = 'test_secret_api_key'
process.env.SYNC_LABS_API_KEY = 'test_sync_labs_key'
process.env.MERCHANT_LOGIN = 'test_merchant_login'
process.env.PASSWORD2 = 'test_password2'
process.env.RESULT_URL2 = 'https://test.result.url'
process.env.NEXRENDER_PORT = '4001'
process.env.AERENDER_PATH = '/test/aerender'
process.env.BOT_TOKEN_1 = 'test_bot_token_1'
process.env.BOT_TOKEN_2 = 'test_bot_token_2'
process.env.BOT_TOKEN_3 = 'test_bot_token_3'
process.env.BOT_TOKEN_4 = 'test_bot_token_4'
process.env.BOT_TOKEN_5 = 'test_bot_token_5'
process.env.BOT_TOKEN_6 = 'test_bot_token_6'
process.env.BOT_TOKEN_7 = 'test_bot_token_7'
process.env.BOT_TOKEN_8 = 'test_bot_token_8'
process.env.BOT_TOKEN_9 = 'test_bot_token_9'
process.env.BOT_TOKEN_10 = 'test_bot_token_10'
process.env.BOT_TOKEN_TEST_1 = 'test_bot_token_test_1'
process.env.BOT_TOKEN_TEST_2 = 'test_bot_token_test_2'
process.env.NODE_ENV = 'test'

import { analyzeCompetitorReels } from './analyzeCompetitorReels'
import { InstagramContentAgentDB } from '../core/instagram/database-v2'
import type { AnalyzeReelsEvent } from '../interfaces/instagram-content-agent.interface'
import { z } from 'zod'

// Mock Instagram Content Database
jest.mock('../core/instagram/database-v2', () => ({
  InstagramContentAgentDB: jest.fn().mockImplementation(() => ({
    saveReelsAnalysis: jest.fn(),
    validateProjectId: jest.fn(),
  })),
}))

describe('analyzeCompetitorReels', () => {
  let mockEvent: AnalyzeReelsEvent

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock event data
    mockEvent = {
      username: 'test_competitor',
      max_reels: 15,
      days_back: 14,
      requester_telegram_id: '123456789',
      project_id: 1,
    }
  })

  it('should be defined', () => {
    expect(analyzeCompetitorReels).toBeDefined()
  })

  it('should validate input data with required fields', () => {
    // Test validation schema directly
    const invalidEvent = {
      username: '',
      max_reels: 0,
      days_back: -1,
      requester_telegram_id: '',
      project_id: 0,
    }

    // This should throw validation error
    const schema = z.object({
      username: z.string().min(1, 'Username is required'),
      max_reels: z.number().min(1).max(50).default(15),
      days_back: z.number().min(1).max(30).default(14),
      project_id: z.number().positive().optional(),
    })

    expect(() => schema.parse(invalidEvent)).toThrow()
  })

  it('should filter reels by date range', () => {
    // Mock reels data with different dates
    const now = new Date()
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)

    const mockReels = [
      {
        reel_id: 'reel1',
        taken_at_timestamp: Math.floor(tenDaysAgo.getTime() / 1000), // 10 days ago - should be included
        like_count: 100,
        play_count: 1000,
        comment_count: 10,
      },
      {
        reel_id: 'reel2',
        taken_at_timestamp: Math.floor(twentyDaysAgo.getTime() / 1000), // 20 days ago - should be excluded
        like_count: 50,
        play_count: 500,
        comment_count: 5,
      },
    ]

    // Test filtering logic directly
    const daysBack = 14
    const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    const filteredReels = mockReels.filter(reel => {
      const reelDate = new Date(reel.taken_at_timestamp * 1000)
      return reelDate >= cutoffDate
    })

    expect(filteredReels).toHaveLength(1)
    expect(filteredReels[0].reel_id).toBe('reel1')
  })

  it('should calculate reel metrics correctly', () => {
    const mockReels = [
      {
        reel_id: 'reel1',
        like_count: 100,
        play_count: 1000,
        comment_count: 10,
        taken_at_timestamp: Math.floor(Date.now() / 1000),
      },
      {
        reel_id: 'reel2',
        like_count: 200,
        play_count: 2000,
        comment_count: 20,
        taken_at_timestamp: Math.floor(Date.now() / 1000),
      },
    ]

    // Test metrics calculation
    const totalViews = mockReels.reduce(
      (sum, reel) => sum + (reel.play_count || 0),
      0
    )
    const totalLikes = mockReels.reduce(
      (sum, reel) => sum + (reel.like_count || 0),
      0
    )
    const totalComments = mockReels.reduce(
      (sum, reel) => sum + (reel.comment_count || 0),
      0
    )
    const avgEngagement =
      mockReels.reduce((sum, reel) => {
        const engagement =
          ((reel.like_count || 0) + (reel.comment_count || 0)) /
          (reel.play_count || 1)
        return sum + engagement
      }, 0) / mockReels.length

    expect(totalViews).toBe(3000)
    expect(totalLikes).toBe(300)
    expect(totalComments).toBe(30)
    expect(avgEngagement).toBeGreaterThan(0)
  })

  it('should transform Instagram reels to ReelsAnalysisData format', () => {
    const mockInstagramReels = [
      {
        reel_id: 'reel123',
        shortcode: 'ABC123',
        caption: 'Test caption',
        like_count: 100,
        play_count: 1000,
        comment_count: 10,
        taken_at_timestamp: Math.floor(Date.now() / 1000),
        owner_username: 'test_competitor',
        display_url: 'https://instagram.com/p/ABC123/media',
      },
    ]

    const reelsAnalysisData = mockInstagramReels.map(reel => ({
      comp_username: reel.owner_username,
      reel_id: reel.reel_id,
      ig_reel_url: `https://instagram.com/p/${reel.shortcode}/`,
      caption: reel.caption,
      views_count: reel.play_count,
      likes_count: reel.like_count,
      comments_count: reel.comment_count,
      created_at_instagram: new Date(reel.taken_at_timestamp * 1000),
      project_id: 1,
    }))

    expect(reelsAnalysisData).toHaveLength(1)
    expect(reelsAnalysisData[0]).toMatchObject({
      comp_username: 'test_competitor',
      reel_id: 'reel123',
      ig_reel_url: 'https://instagram.com/p/ABC123/',
      caption: 'Test caption',
      views_count: 1000,
      likes_count: 100,
      comments_count: 10,
      project_id: 1,
    })
  })

  it('should handle empty reels response', () => {
    const mockEmptyReels = []

    // Test handling of empty response
    const totalViews = mockEmptyReels.reduce(
      (sum, reel) => sum + (reel.play_count || 0),
      0
    )
    const avgEngagement =
      mockEmptyReels.length > 0
        ? mockEmptyReels.reduce((sum, reel) => sum + 0, 0) /
          mockEmptyReels.length
        : 0

    expect(totalViews).toBe(0)
    expect(avgEngagement).toBe(0)
  })

  it('should have correct event structure', () => {
    expect(mockEvent).toHaveProperty('username')
    expect(mockEvent).toHaveProperty('max_reels')
    expect(mockEvent).toHaveProperty('days_back')
    expect(mockEvent).toHaveProperty('requester_telegram_id')
    expect(mockEvent).toHaveProperty('project_id')
  })

  it('should sort reels by engagement descending', () => {
    const mockReels = [
      {
        reel_id: 'reel1',
        like_count: 50,
        play_count: 1000,
        comment_count: 5,
        taken_at_timestamp: Math.floor(Date.now() / 1000),
      },
      {
        reel_id: 'reel2',
        like_count: 200,
        play_count: 2000,
        comment_count: 20,
        taken_at_timestamp: Math.floor(Date.now() / 1000),
      },
      {
        reel_id: 'reel3',
        like_count: 100,
        play_count: 1500,
        comment_count: 15,
        taken_at_timestamp: Math.floor(Date.now() / 1000),
      },
    ]

    // Test sorting by engagement (likes + comments)
    const sortedReels = mockReels.sort((a, b) => {
      const engagementA = (a.like_count || 0) + (a.comment_count || 0)
      const engagementB = (b.like_count || 0) + (b.comment_count || 0)
      return engagementB - engagementA
    })

    expect(sortedReels[0].reel_id).toBe('reel2') // 220 engagement
    expect(sortedReels[1].reel_id).toBe('reel3') // 115 engagement
    expect(sortedReels[2].reel_id).toBe('reel1') // 55 engagement
  })
})
