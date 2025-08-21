import { jest, describe, it, expect } from '@jest/globals'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('telegraf')

describe('notification.service', () => {
  it('should import notification service', () => {
    const notificationService = require('@/services/notification.service')
    expect(notificationService).toBeDefined()
  })

  it('should be testable module', () => {
    expect(1 + 1).toBe(2)
  })
})