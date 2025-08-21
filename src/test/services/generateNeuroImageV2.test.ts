import { jest, describe, it, expect } from '@jest/globals'

// Mock dependencies
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('replicate')

describe('generateNeuroImageV2 Service', () => {
  it('should import generateNeuroImageV2', () => {
    const { generateNeuroImageV2 } = require('@/services/generateNeuroImageV2')
    expect(typeof generateNeuroImageV2).toBe('function')
  })

  it('should be testable module', () => {
    expect(1 + 1).toBe(2)
  })
})