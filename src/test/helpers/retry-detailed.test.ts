import { jest, describe, it, expect } from '@jest/globals'
import { retry } from '@/helpers/retry'

describe('retry - Detailed Tests', () => {
  describe('Successful Operations', () => {
    it('should return result on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')

      const result = await retry(mockFn as any)

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should work with different return types', async () => {
      const numberFn = jest.fn().mockResolvedValue(42)
      const objectFn = jest.fn().mockResolvedValue({ key: 'value' })
      const arrayFn = jest.fn().mockResolvedValue([1, 2, 3])

      expect(await retry(numberFn as any)).toBe(42)
      expect(await retry(objectFn as any)).toEqual({ key: 'value' })
      expect(await retry(arrayFn as any)).toEqual([1, 2, 3])
    })
  })

  describe('Retry Logic', () => {
    it('should retry on failure and succeed on second try', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success')

      const result = await retry(mockFn as any, 3, 0)

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should retry specified number of times before giving up', async () => {
      const error = new Error('Persistent failure')
      const mockFn = jest.fn().mockRejectedValue(error)

      await expect(retry(mockFn as any, 3, 0)).rejects.toThrow('Persistent failure')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should use default retry count of 3', async () => {
      const error = new Error('Default retry test')
      const mockFn = jest.fn().mockRejectedValue(error)

      await expect(retry(mockFn as any)).rejects.toThrow('Default retry test')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should succeed on last possible attempt', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success on third try')

      const result = await retry(mockFn as any, 3, 0)

      expect(result).toBe('success on third try')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })
  })

  describe('Exponential Backoff', () => {
    it('should use exponential backoff (delay doubles)', async () => {
      // Note: Testing actual timing is flaky, so we'll test the logic indirectly
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success')

      const startTime = Date.now()
      await retry(mockFn as any, 3, 50) // Start with 50ms delay

      const totalTime = Date.now() - startTime
      // First retry: 50ms, second retry: 100ms, so at least 150ms total
      expect(totalTime).toBeGreaterThanOrEqual(150)
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('should use default delay of 1000ms', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success')

      const startTime = Date.now()
      await retry(mockFn as any, 2) // Default 1000ms delay

      const elapsedTime = Date.now() - startTime
      expect(elapsedTime).toBeGreaterThanOrEqual(1000)
    })
  })

  describe('Different Function Types', () => {
    it('should work with async functions', async () => {
      const asyncFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return 'async result'
      }

      const result = await retry(asyncFn, 1, 0)
      expect(result).toBe('async result')
    })

    it('should work with Promise-returning functions', async () => {
      const promiseFn = () => Promise.resolve('promise result')

      const result = await retry(promiseFn, 1, 0)
      expect(result).toBe('promise result')
    })

    it('should work with functions that throw synchronously', async () => {
      const syncFn = () => {
        throw new Error('Sync error')
      }

      await expect(retry(syncFn, 2, 0)).rejects.toThrow('Sync error')
    })
  })

  describe('Error Preservation', () => {
    it('should preserve the last error thrown', async () => {
      const error1 = new Error('First error')
      const error2 = new Error('Second error') 
      const finalError = new Error('Final error')

      const mockFn = jest.fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockRejectedValueOnce(finalError)

      await expect(retry(mockFn as any, 3, 0)).rejects.toThrow('Final error')
    })

    it('should preserve error properties', async () => {
      const customError = new Error('Custom error') as any
      customError.code = 'CUSTOM_CODE'
      customError.statusCode = 500

      const mockFn = jest.fn().mockRejectedValue(customError)

      try {
        await retry(mockFn as any, 2, 0)
      } catch (error: any) {
        expect(error.code).toBe('CUSTOM_CODE')
        expect(error.statusCode).toBe(500)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle attempts = 1 (no retries)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Single attempt'))

      await expect(retry(mockFn as any, 1, 0)).rejects.toThrow('Single attempt')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should handle attempts = 0 (invalid, but treated as no execution)', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Zero attempts'))

      await expect(retry(mockFn as any, 0, 0)).rejects.toThrow('Zero attempts')
      expect(mockFn).toHaveBeenCalledTimes(0)
    })

    it('should handle zero delay', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success')

      const startTime = Date.now()
      await retry(mockFn as any, 2, 0)
      const elapsedTime = Date.now() - startTime

      // Should complete very quickly with 0 delay
      expect(elapsedTime).toBeLessThan(50)
    })
  })

  describe('Function Context', () => {
    it('should maintain function context when retrying', async () => {
      class TestClass {
        value = 'test'
        
        async method() {
          return this.value
        }
      }

      const instance = new TestClass()
      const boundMethod = instance.method.bind(instance)

      const result = await retry(boundMethod, 1, 0)
      expect(result).toBe('test')
    })

    it('should handle function that needs to access closure', async () => {
      const closureValue = 'closure test'
      const closureFn = async () => {
        return closureValue
      }

      const result = await retry(closureFn, 1, 0)
      expect(result).toBe('closure test')
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle network-like failures', async () => {
      let attemptCount = 0
      const networkFn = async () => {
        attemptCount++
        if (attemptCount < 3) {
          throw new Error('Network timeout')
        }
        return { data: 'Network success', attemptCount }
      }

      const result = await retry(networkFn, 3, 0)
      expect(result).toEqual({ data: 'Network success', attemptCount: 3 })
    })
  })
})