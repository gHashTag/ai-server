import { HttpException } from '@/exceptions/HttpException'
import { jest, describe, it, expect } from '@jest/globals'

describe('HttpException', () => {
  it('should create HttpException with status and message', () => {
    const status = 404
    const message = 'Not found'
    
    const exception = new HttpException(status, message)
    
    expect(exception).toBeInstanceOf(Error)
    expect(exception.status).toBe(status)
    expect(exception.message).toBe(message)
    expect(exception.name).toBe('Error')
  })

  it('should create HttpException with different status codes', () => {
    const testCases = [
      { status: 400, message: 'Bad Request' },
      { status: 401, message: 'Unauthorized' },
      { status: 403, message: 'Forbidden' },
      { status: 404, message: 'Not Found' },
      { status: 422, message: 'Unprocessable Entity' },
      { status: 500, message: 'Internal Server Error' },
    ]

    testCases.forEach(({ status, message }) => {
      const exception = new HttpException(status, message)
      
      expect(exception.status).toBe(status)
      expect(exception.message).toBe(message)
    })
  })

  it('should handle empty message', () => {
    const status = 400
    const message = ''
    
    const exception = new HttpException(status, message)
    
    expect(exception.status).toBe(status)
    expect(exception.message).toBe(message)
  })

  it('should handle zero status code', () => {
    const status = 0
    const message = 'Unknown error'
    
    const exception = new HttpException(status, message)
    
    expect(exception.status).toBe(status)
    expect(exception.message).toBe(message)
  })

  it('should be throwable', () => {
    const status = 500
    const message = 'Server error'
    
    expect(() => {
      throw new HttpException(status, message)
    }).toThrow(HttpException)
    
    try {
      throw new HttpException(status, message)
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException)
      expect((error as HttpException).status).toBe(status)
      expect((error as HttpException).message).toBe(message)
    }
  })

  it('should preserve stack trace', () => {
    const exception = new HttpException(500, 'Test error')
    
    expect(exception.stack).toBeDefined()
    expect(typeof exception.stack).toBe('string')
    expect(exception.stack).toContain('HttpException.test.ts')
  })

  it('should work with instanceof Error', () => {
    const exception = new HttpException(404, 'Not found')
    
    expect(exception instanceof Error).toBe(true)
    expect(exception instanceof HttpException).toBe(true)
  })
})