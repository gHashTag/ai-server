import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock dependencies first
jest.mock('@/core/supabase')
jest.mock('@/price/helpers')
jest.mock('@/core/supabase/ai')
jest.mock('@/core/supabase/savePrompt')
jest.mock('@/helpers/processApiResponse')
jest.mock('@/helpers')
jest.mock('@/core/replicate')
jest.mock('@/helpers/errorMessageAdmin')

// Import after mocking
import { generateNeuroImage } from '@/services/generateNeuroImage'

describe('generateNeuroImage - Detailed Tests', () => {
  const mockBot = {
    telegram: {
      sendPhoto: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 })
    }
  } as any

  // Get references to mocked modules
  let mockGetUserByTelegramId: any
  let mockProcessBalanceOperation: any
  let mockGetAspectRatio: any
  let mockSavePrompt: any
  let mockProcessApiResponse: any
  let mockSaveFileLocally: any
  let mockReplicate: any

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset all mocks
    const { getUserByTelegramId } = require('@/core/supabase')
    const { processBalanceOperation } = require('@/price/helpers')
    const { getAspectRatio } = require('@/core/supabase/ai')
    const { savePrompt } = require('@/core/supabase/savePrompt')
    const { processApiResponse } = require('@/helpers/processApiResponse')
    const { saveFileLocally } = require('@/helpers')
    const { replicate } = require('@/core/replicate')

    mockGetUserByTelegramId = getUserByTelegramId
    mockProcessBalanceOperation = processBalanceOperation
    mockGetAspectRatio = getAspectRatio
    mockSavePrompt = savePrompt
    mockProcessApiResponse = processApiResponse
    mockSaveFileLocally = saveFileLocally
    mockReplicate = replicate
    
    // Default successful mocks
    mockGetUserByTelegramId.mockResolvedValue({ telegram_id: '123456', level: 5 })
    mockProcessBalanceOperation.mockResolvedValue({ success: true, newBalance: 100 })
    mockGetAspectRatio.mockResolvedValue('1:1')
    mockSavePrompt.mockResolvedValue('test-prompt-id')
    mockProcessApiResponse.mockResolvedValue('https://fake-image-url.jpg')
    mockSaveFileLocally.mockResolvedValue('/fake/local/path/image.jpg')
    mockReplicate.run.mockResolvedValue(['https://fake-image-url.jpg'])
  })

  describe('Error Handling', () => {
    it('should handle user not found', async () => {
      mockGetUserByTelegramId.mockResolvedValue(null)

      await expect(generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )).rejects.toThrow('User with ID 123456 does not exist.')
    })

    it('should handle balance check failure', async () => {
      mockProcessBalanceOperation.mockResolvedValue({ 
        success: false, 
        error: 'Insufficient balance' 
      })

      await expect(generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )).rejects.toThrow('Insufficient balance')
    })
  })

  describe('Aspect Ratios', () => {
    it('should handle 16:9 aspect ratio', async () => {
      mockGetAspectRatio.mockResolvedValue('16:9')

      await generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(mockReplicate.run).toHaveBeenCalledWith(
        'stable-diffusion/stable-diffusion',
        expect.objectContaining({
          input: expect.objectContaining({
            width: 1368,
            height: 768,
            aspect_ratio: '16:9'
          })
        })
      )
    })

    it('should handle 9:16 aspect ratio', async () => {
      mockGetAspectRatio.mockResolvedValue('9:16')

      await generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(mockReplicate.run).toHaveBeenCalledWith(
        'stable-diffusion/stable-diffusion',
        expect.objectContaining({
          input: expect.objectContaining({
            width: 768,
            height: 1368,
            aspect_ratio: '9:16'
          })
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty.zip response', async () => {
      mockProcessApiResponse.mockResolvedValue('https://fake-image-url/empty.zip')

      const result = await generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(result).toBeNull()
    })

    it('should handle null savePrompt result', async () => {
      mockSavePrompt.mockResolvedValue(null)

      const result = await generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(result).toBeNull()
    })

    it('should return successful result', async () => {
      const result = await generateNeuroImage(
        'test prompt',
        'stable-diffusion/stable-diffusion',
        1,
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(result).toEqual({
        image: expect.stringContaining('neuro-photo'),
        prompt_id: 'test-prompt-id'
      })
    })
  })
})