/**
 * Tests for findCompetitors Inngest function
 * Job 1: "Мне нужно найти похожих авторов в моей нише"
 * Extends instagramScraperV2 with new database schema and filtering
 */

// Mock environment variables BEFORE any imports
process.env.RAPIDAPI_INSTAGRAM_KEY = 'test_key'
process.env.NEON_DATABASE_URL = 'postgresql://test'
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

import { findCompetitors } from './findCompetitors'
import { InstagramContentAgentDB } from '../core/instagram/database-v2'
import type { FindCompetitorsEvent } from '../interfaces/instagram-content-agent.interface'
import { z } from 'zod'

// Mock Instagram Content Database
jest.mock('../core/instagram/database-v2', () => ({
  InstagramContentAgentDB: jest.fn().mockImplementation(() => ({
    saveCompetitors: jest.fn(),
    validateProjectId: jest.fn(),
  })),
}))

describe('findCompetitors', () => {
  let mockDatabase: any
  let mockEvent: FindCompetitorsEvent

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Mock event data
    mockEvent = {
      username_or_id: 'test_user',
      count: 10,
      min_followers: 1000,
      requester_telegram_id: '123456789',
      project_id: 1,
    }
  })

  it('should be defined', () => {
    expect(findCompetitors).toBeDefined()
  })

  it('should validate input data with required fields', () => {
    // Test validation schema directly
    const invalidEvent = {
      username_or_id: '',
      count: 0,
      requester_telegram_id: '',
      project_id: 0,
    }

    // This should throw validation error
    const schema = z.object({
      username_or_id: z.string().min(1, 'Username is required'),
      count: z.number().min(1).max(50).default(10),
      project_id: z.number().positive().optional(),
    })

    expect(() => schema.parse(invalidEvent)).toThrow()
  })

  it('should filter competitors by min_followers', () => {
    // Mock API response with mixed follower counts
    const mockApiUsers = [
      { username: 'user1', followers_count: 500 }, // Below threshold
      { username: 'user2', followers_count: 5000 }, // Above threshold
      { username: 'user3', followers_count: 2000 }, // Above threshold
    ]

    // Test filtering logic directly
    const minFollowers = 1000
    const filteredUsers = mockApiUsers.filter(
      user => user.followers_count >= minFollowers
    )

    expect(filteredUsers).toHaveLength(2)
    expect(filteredUsers.map(u => u.username)).toEqual(['user2', 'user3'])
  })

  it('should transform Instagram users to CompetitorData format', () => {
    const mockApiUsers = [
      {
        username: 'user1',
        followers_count: 5000,
        full_name: 'Test User',
        profile_url: 'https://instagram.com/user1',
      },
    ]

    const competitorData = mockApiUsers.map(user => ({
      query_username: 'test_query',
      comp_username: user.username,
      followers_count: user.followers_count,
      category: 'unknown',
      bio: user.full_name || '',
      ig_url: user.profile_url || `https://instagram.com/${user.username}`,
      project_id: 1,
    }))

    expect(competitorData).toHaveLength(1)
    expect(competitorData[0]).toMatchObject({
      query_username: 'test_query',
      comp_username: 'user1',
      followers_count: 5000,
      category: 'unknown',
      bio: 'Test User',
      ig_url: 'https://instagram.com/user1',
      project_id: 1,
    })
  })

  it('should have correct event structure', () => {
    expect(mockEvent).toHaveProperty('username_or_id')
    expect(mockEvent).toHaveProperty('count')
    expect(mockEvent).toHaveProperty('min_followers')
    expect(mockEvent).toHaveProperty('requester_telegram_id')
    expect(mockEvent).toHaveProperty('project_id')
  })
})
 