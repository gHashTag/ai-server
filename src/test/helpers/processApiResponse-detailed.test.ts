import { jest, describe, it, expect } from '@jest/globals'
import { processApiResponse } from '@/helpers/processApiResponse'

describe('processApiResponse - Detailed Tests', () => {
  describe('String Input Processing', () => {
    it('should return string as-is', async () => {
      const input = 'https://example.com/direct.jpg'
      const result = await processApiResponse(input)
      expect(result).toBe('https://example.com/direct.jpg')
    })

    it('should handle empty string', async () => {
      const input = ''
      const result = await processApiResponse(input)
      expect(result).toBe('')
    })
  })

  describe('Array Input Processing', () => {
    it('should extract first string from array', async () => {
      const input = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      const result = await processApiResponse(input)
      expect(result).toBe('https://example.com/image1.jpg')
    })

    it('should handle single-element array', async () => {
      const input = ['https://example.com/single.jpg']
      const result = await processApiResponse(input)
      expect(result).toBe('https://example.com/single.jpg')
    })
  })

  describe('Object with output property', () => {
    it('should extract output from object', async () => {
      const input = { output: 'https://example.com/output.jpg' }
      const result = await processApiResponse(input)
      expect(result).toBe('https://example.com/output.jpg')
    })

    it('should handle complex object with output', async () => {
      const input = { 
        id: 'test-123',
        status: 'completed',
        output: 'https://example.com/complex.jpg',
        metadata: { created_at: '2023-01-01' }
      }
      const result = await processApiResponse(input)
      expect(result).toBe('https://example.com/complex.jpg')
    })
  })

  describe('Error Cases', () => {
    it('should throw error for null input', async () => {
      await expect(processApiResponse(null)).rejects.toThrow('Некорректный ответ от API: null')
    })

    it('should throw error for undefined input', async () => {
      await expect(processApiResponse(undefined)).rejects.toThrow('Некорректный ответ от API: undefined')
    })

    it('should throw error for number input', async () => {
      await expect(processApiResponse(123)).rejects.toThrow('Некорректный ответ от API: 123')
    })

    it('should throw error for boolean input', async () => {
      await expect(processApiResponse(true)).rejects.toThrow('Некорректный ответ от API: true')
    })

    it('should throw error for object without output property', async () => {
      const input = { id: 'test', status: 'failed' }
      await expect(processApiResponse(input)).rejects.toThrow('Некорректный ответ от API:')
    })

    it('should throw error for empty array', async () => {
      const input: unknown[] = []
      await expect(processApiResponse(input)).rejects.toThrow('Некорректный ответ от API: []')
    })

    it('should throw error for array with non-string first element', async () => {
      const input = [123, 'https://example.com/second.jpg']
      await expect(processApiResponse(input)).rejects.toThrow('Некорректный ответ от API:')
    })
  })

  describe('Edge Cases', () => {
    it('should handle array with null as first element', async () => {
      const input = [null, 'https://example.com/second.jpg']
      await expect(processApiResponse(input)).rejects.toThrow('Некорректный ответ от API:')
    })

    it('should handle object with null output', async () => {
      const input = { output: null }
      const result = await processApiResponse(input)
      expect(result).toBeNull()
    })

    it('should handle object with undefined output', async () => {
      const input = { output: undefined }
      const result = await processApiResponse(input)
      expect(result).toBeUndefined()
    })
  })

  describe('Real API Response Formats', () => {
    it('should handle typical Replicate response with output array', async () => {
      const input = {
        id: 'pred_123',
        status: 'succeeded',
        output: 'https://replicate.delivery/image1.jpg',
        logs: 'Generation complete'
      }
      const result = await processApiResponse(input)
      expect(result).toBe('https://replicate.delivery/image1.jpg')
    })

    it('should handle string array response', async () => {
      const input = [
        'https://example.com/first.png',
        'https://example.com/second.png'
      ]
      const result = await processApiResponse(input)
      expect(result).toBe('https://example.com/first.png')
    })
  })
})