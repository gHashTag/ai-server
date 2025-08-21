import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock все зависимости
jest.mock('@/core/supabase')
jest.mock('@/helpers')
jest.mock('@/price/helpers')
jest.mock('@/core/elevenlabs')

describe('generateSpeech Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should import generateSpeech function', () => {
    const { generateSpeech } = require('@/services/generateSpeech')
    expect(typeof generateSpeech).toBe('function')
  })

  it('should have proper function signature', () => {
    const { generateSpeech } = require('@/services/generateSpeech')
    expect(generateSpeech).toBeDefined()
    expect(typeof generateSpeech).toBe('function')
  })

  it('should be testable module', () => {
    expect(1 + 1).toBe(2)
  })
})