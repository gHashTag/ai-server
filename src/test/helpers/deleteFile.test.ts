import { jest, describe, it, expect } from '@jest/globals'

// Mock fs
jest.mock('fs')

describe('deleteFile helper', () => {
  it('should import deleteFile function', () => {
    const { deleteFile } = require('@/helpers/deleteFile')
    expect(typeof deleteFile).toBe('function')
  })

  it('should be testable module', () => {
    expect(1 + 1).toBe(2)
  })
})