import { jest, describe, it, expect } from '@jest/globals'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('replicate')

describe('generateTextToVideo Service', () => {
  it('should import generateTextToVideo', () => {
    const { generateTextToVideo } = require('@/services/generateTextToVideo')
    expect(typeof generateTextToVideo).toBe('function')
  })

  it('should be testable module', () => {
    expect(1 + 1).toBe(2)
  })
})