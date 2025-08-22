import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Import all new Inngest functions
import { generateImageToPromptInngest } from '@/core/inngest-client/helpers/generateImageToPrompt'
import { generateNeuroImageInngest } from '@/core/inngest-client/helpers/generateNeuroImage'
import { generateNeuroImageV2Inngest } from '@/core/inngest-client/helpers/generateNeuroImageV2'
import { generateLipSyncInngest } from '@/core/inngest-client/helpers/generateLipSync'
import { generateModelTrainingV2Inngest } from '@/core/inngest-client/helpers/generateModelTrainingV2'

// Mock all services
jest.mock('@/services/generateImageToPrompt')
jest.mock('@/services/generateNeuroImage')
jest.mock('@/services/generateNeuroImageV2')
jest.mock('@/services/generateLipSync')
jest.mock('@/services/generateModelTrainingV2')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

describe('Inngest Functions Integration', () => {
  const mockStep = {
    run: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup common mocks
    const { getBotByName } = require('@/core/bot')
    getBotByName.mockReturnValue({
      bot: { telegram: { sendMessage: jest.fn(), sendPhoto: jest.fn() } },
    })

    const { logger } = require('@/utils/logger')
    logger.info = jest.fn()
    logger.error = jest.fn()

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })
  })

  describe('All Inngest Functions Configuration', () => {
    it('should have correct function IDs and names', () => {
      const functions = [
        { func: generateImageToPromptInngest, id: 'generate-image-to-prompt', name: 'Generate Image to Prompt via Inngest' },
        { func: generateNeuroImageInngest, id: 'generate-neuro-image', name: 'Generate Neuro Image via Inngest' },
        { func: generateNeuroImageV2Inngest, id: 'generate-neuro-image-v2', name: 'Generate Neuro Image V2 via Inngest' },
        { func: generateLipSyncInngest, id: 'generate-lip-sync', name: 'Generate Lip Sync via Inngest' },
        { func: generateModelTrainingV2Inngest, id: 'generate-model-training-v2', name: 'Generate Model Training V2 via Inngest' },
      ]

      functions.forEach(({ func, id, name }) => {
        expect(func.id).toBe(id)
        expect(func.name).toBe(name)
      })
    })
  })

  describe('Error Handling Consistency', () => {
    it('should handle errors consistently across all functions', async () => {
      const error = new Error('Service error')
      const telegram_id = '123456'

      // Mock all services to throw errors
      const services = [
        'generateImageToPrompt',
        'generateNeuroImage', 
        'generateNeuroImageV2',
        'generateLipSync',
        'generateModelTrainingV2'
      ]

      services.forEach(serviceName => {
        const service = require(`@/services/${serviceName}`)
        service[serviceName]?.mockRejectedValue(error)
      })

      const functions = [
        { func: generateImageToPromptInngest, event: { data: { imageUrl: 'url', telegram_id, username: 'test', is_ru: false, bot_name: 'bot' } } },
        { func: generateNeuroImageInngest, event: { data: { prompt: 'test', model_url: 'model', num_images: 1, telegram_id, username: 'test', is_ru: false, bot_name: 'bot' } } },
        { func: generateNeuroImageV2Inngest, event: { data: { prompt: 'test', num_images: 1, telegram_id, is_ru: false, bot_name: 'bot' } } },
        { func: generateLipSyncInngest, event: { data: { telegram_id, video: 'video', audio: 'audio', is_ru: false } } },
        { func: generateModelTrainingV2Inngest, event: { data: { zipUrl: 'zip', triggerWord: 'word', modelName: 'model', steps: 100, telegram_id, is_ru: false, bot_name: 'bot' } } },
      ]

      for (const { func, event } of functions) {
        await expect(
          func._fn({ event, step: mockStep } as any)
        ).rejects.toThrow('Service error')
      }

      const { logger } = require('@/utils/logger')
      expect(logger.error).toHaveBeenCalledTimes(5)
    })
  })

  describe('Success Response Consistency', () => {
    it('should return consistent success responses', async () => {
      // Mock all services to return success
      const { generateImageToPrompt } = require('@/services/generateImageToPrompt')
      generateImageToPrompt.mockResolvedValue('Generated prompt')

      const { generateNeuroImage } = require('@/services/generateNeuroImage')
      generateNeuroImage.mockResolvedValue({ success: true })

      const { generateNeuroImageV2 } = require('@/services/generateNeuroImageV2')
      generateNeuroImageV2.mockResolvedValue({ success: true })

      const { generateLipSync } = require('@/services/generateLipSync')
      generateLipSync.mockResolvedValue({ id: 'lip-sync-id' })

      const { generateModelTrainingV2 } = require('@/services/generateModelTrainingV2')
      generateModelTrainingV2.mockResolvedValue({ success: true, message: 'Training started' })

      const telegram_id = '123456'
      const functions = [
        { func: generateImageToPromptInngest, event: { data: { imageUrl: 'url', telegram_id, username: 'test', is_ru: false, bot_name: 'bot' } } },
        { func: generateNeuroImageInngest, event: { data: { prompt: 'test', model_url: 'model' as const, num_images: 1, telegram_id, username: 'test', is_ru: false, bot_name: 'bot' } } },
        { func: generateNeuroImageV2Inngest, event: { data: { prompt: 'test', num_images: 1, telegram_id, is_ru: false, bot_name: 'bot' } } },
        { func: generateLipSyncInngest, event: { data: { telegram_id, video: 'video', audio: 'audio', is_ru: false } } },
        { func: generateModelTrainingV2Inngest, event: { data: { zipUrl: 'zip', triggerWord: 'word', modelName: 'model', steps: 100, telegram_id, is_ru: false, bot_name: 'bot' } } },
      ]

      for (const { func, event } of functions) {
        const result = await func._fn({ event, step: mockStep } as any)
        
        expect(result).toMatchObject({
          success: true,
          telegram_id,
          timestamp: expect.any(String),
        })
        expect(result.result).toBeDefined()
      }
    })
  })

  describe('Logging Consistency', () => {
    it('should log start and completion messages for all functions', async () => {
      // Mock all services to return success
      const { generateImageToPrompt } = require('@/services/generateImageToPrompt')
      generateImageToPrompt.mockResolvedValue('Generated prompt')

      const { generateNeuroImage } = require('@/services/generateNeuroImage')
      generateNeuroImage.mockResolvedValue({ success: true })

      const telegram_id = '123456'
      
      await generateImageToPromptInngest._fn({
        event: { data: { imageUrl: 'url', telegram_id, username: 'test', is_ru: false, bot_name: 'bot' } },
        step: mockStep,
      } as any)

      await generateNeuroImageInngest._fn({
        event: { data: { prompt: 'test', model_url: 'model' as const, num_images: 1, telegram_id, username: 'test', is_ru: false, bot_name: 'bot' } },
        step: mockStep,
      } as any)

      const { logger } = require('@/utils/logger')
      
      // Check that both start and completion logs are called for each function
      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Inngest: Начинаем'),
          telegram_id,
        })
      )

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('успешно'),
          telegram_id,
        })
      )
    })
  })
})