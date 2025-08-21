import { jest, describe, it, expect } from '@jest/globals'
import ApiError from '@/utils/ApiError'

describe('ApiError', () => {
  it('should create ApiError instance with message and response', () => {
    const message = 'Test error message'
    const response = { status: 404 }
    
    const error = new ApiError(message, response)
    
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe(message)
    expect(error.response).toBe(response)
    expect(error.name).toBe('ApiError')
  })

  it('should handle null response', () => {
    const message = 'Test error'
    
    const error = new ApiError(message, null)
    
    expect(error.response).toBe(null)
    expect(error.message).toBe(message)
  })
})