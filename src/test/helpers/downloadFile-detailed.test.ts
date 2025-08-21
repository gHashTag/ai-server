import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock axios before importing
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: (jest.fn() as any)
  },
  isAxiosError: (jest.fn() as any)
}))

import { downloadFile } from '@/helpers/downloadFile'

describe('downloadFile - Detailed Tests', () => {
  let mockAxiosGet: any
  let mockIsAxiosError: any

  beforeEach(() => {
    const axios = require('axios')
    mockAxiosGet = axios.default.get
    mockIsAxiosError = axios.isAxiosError
    
    jest.clearAllMocks()
  })

  describe('Successful Downloads', () => {
    it('should download file successfully', async () => {
      const mockBuffer = Buffer.from('test file content')
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer
      })

      const result = await downloadFile('https://example.com/test.jpg')

      expect(result).toEqual(mockBuffer)
      expect(mockAxiosGet).toHaveBeenCalledWith('https://example.com/test.jpg', {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 5,
        validateStatus: expect.any(Function)
      })
    })

    it('should handle large files under size limit', async () => {
      // 49MB file (under 50MB limit)
      const mockBuffer = Buffer.alloc(49 * 1024 * 1024)
      mockAxiosGet.mockResolvedValue({
        data: mockBuffer
      })

      const result = await downloadFile('https://example.com/large.jpg')
      expect(result).toEqual(mockBuffer)
    })
  })

  describe('URL Validation', () => {
    it('should reject invalid URL - not string', async () => {
      await expect(downloadFile(null as any)).rejects.toThrow('Invalid URL received: null')
    })

    it('should reject invalid URL - empty string', async () => {
      await expect(downloadFile('')).rejects.toThrow('Invalid URL received: ')
    })

    it('should reject invalid URL - not HTTP', async () => {
      await expect(downloadFile('ftp://example.com/file.jpg')).rejects.toThrow('Invalid URL received: ftp://example.com/file.jpg')
    })

    it('should accept HTTP URL', async () => {
      const mockBuffer = Buffer.from('test')
      mockAxiosGet.mockResolvedValue({ data: mockBuffer })

      await downloadFile('http://example.com/test.jpg')
      expect(mockAxiosGet).toHaveBeenCalledWith('http://example.com/test.jpg', expect.any(Object))
    })

    it('should accept HTTPS URL', async () => {
      const mockBuffer = Buffer.from('test')
      mockAxiosGet.mockResolvedValue({ data: mockBuffer })

      await downloadFile('https://example.com/test.jpg')
      expect(mockAxiosGet).toHaveBeenCalledWith('https://example.com/test.jpg', expect.any(Object))
    })
  })

  describe('File Size Limits', () => {
    it('should reject files over 50MB limit', async () => {
      // 51MB file (over 50MB limit)
      const mockBuffer = Buffer.alloc(51 * 1024 * 1024)
      mockAxiosGet.mockResolvedValue({ data: mockBuffer })

      await expect(downloadFile('https://example.com/huge.jpg')).rejects.toThrow('File size (53477376 bytes) exceeds Telegram limit of 52428800 bytes')
    })

    it('should handle exactly 50MB file', async () => {
      const mockBuffer = Buffer.alloc(50 * 1024 * 1024)
      mockAxiosGet.mockResolvedValue({ data: mockBuffer })

      const result = await downloadFile('https://example.com/exact50mb.jpg')
      expect(result).toEqual(mockBuffer)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty response data', async () => {
      mockAxiosGet.mockResolvedValue({ data: null })

      await expect(downloadFile('https://example.com/empty.jpg')).rejects.toThrow('Empty response data')
    })

    it('should handle axios errors with proper logging', async () => {
      const axiosError = new Error('Network error') as any
      axiosError.response = {
        data: 'Server error',
        status: 404,
        headers: { 'content-type': 'application/json' }
      }
      axiosError.config = {
        url: 'https://example.com/test.jpg',
        method: 'GET',
        headers: { 'User-Agent': 'test' }
      }

      mockAxiosGet.mockRejectedValue(axiosError)
      mockIsAxiosError.mockReturnValue(true)

      await expect(downloadFile('https://example.com/test.jpg')).rejects.toThrow('Failed to download file: Network error')
      expect(mockIsAxiosError).toHaveBeenCalledWith(axiosError)
    })

    it('should handle non-axios errors', async () => {
      const genericError = new Error('Generic error')
      mockAxiosGet.mockRejectedValue(genericError)
      mockIsAxiosError.mockReturnValue(false)

      await expect(downloadFile('https://example.com/test.jpg')).rejects.toThrow('Failed to download file: Generic error')
    })

    it('should handle non-Error objects', async () => {
      mockAxiosGet.mockRejectedValue('String error')
      mockIsAxiosError.mockReturnValue(false)

      await expect(downloadFile('https://example.com/test.jpg')).rejects.toThrow('Failed to download file: Unknown error')
    })
  })

  describe('validateStatus function', () => {
    it('should accept status 200', async () => {
      const mockBuffer = Buffer.from('test')
      mockAxiosGet.mockResolvedValue({ data: mockBuffer })

      await downloadFile('https://example.com/test.jpg')

      // Check that validateStatus function was passed
      const callArgs = mockAxiosGet.mock.calls[0][1]
      expect(callArgs.validateStatus(200)).toBe(true)
      expect(callArgs.validateStatus(404)).toBe(false)
      expect(callArgs.validateStatus(500)).toBe(false)
    })
  })
})