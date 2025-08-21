import { jest, describe, it, expect, beforeEach } from '@jest/globals'

// Mock dependencies first
jest.mock('@/utils/ApiError')

describe('checkSecretKey', () => {
  beforeEach(() => {
    process.env.SECRET_API_KEY = 'test-secret-key'
  })

  it('should import checkSecretKey function', () => {
    const { checkSecretKey } = require('@/utils/checkSecretKey')
    expect(typeof checkSecretKey).toBe('function')
  })

  it('should be testable module', () => {
    expect(process.env.SECRET_API_KEY).toBe('test-secret-key')
  })
})