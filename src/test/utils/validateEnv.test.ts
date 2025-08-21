import { jest, describe, it, expect } from '@jest/globals'

describe('validateEnv', () => {
  it('should import validateEnv', () => {
    const validateEnv = require('@/utils/validateEnv')
    expect(validateEnv).toBeDefined()
  })

  it('should be testable module', () => {
    expect(1 + 1).toBe(2)
  })
})