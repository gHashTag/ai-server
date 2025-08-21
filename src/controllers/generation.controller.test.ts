import { Request, Response, NextFunction } from 'express'
import { GenerationController } from '@/controllers/generation.controller'
import { jest, describe, it, beforeEach, expect } from '@jest/globals'

// Mock all dependencies
jest.mock('@/core/inngest-client/clients')
jest.mock('@/services/generateTextToImage')
jest.mock('@/services/generateSpeech')
jest.mock('@/services/generateTextToVideo')
jest.mock('@/services/generateImageToVideo')
jest.mock('@/services/createVoiceAvatar')
jest.mock('@/services/generateImageToPrompt')
jest.mock('@/services/generateNeuroImage')
jest.mock('@/services/generateNeuroImageV2')
jest.mock('@/services/generateLipSync')
jest.mock('@/services/generateModelTrainingV2')
jest.mock('@/middlewares/validateUserParams')
jest.mock('@/config')
jest.mock('@/helpers')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

describe('GenerationController', () => {
  let generationController: GenerationController
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction

  beforeEach(() => {
    generationController = new GenerationController()
    req = {
      body: {},
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn() as NextFunction
    jest.clearAllMocks()
  })

  describe('textToImage', () => {
    it('should return 400 if prompt is missing', async () => {
      req.body = {
        model: 'test-model',
        telegram_id: '123456',
        username: 'testuser',
        is_ru: false,
        bot_name: 'test_bot',
      }

      await generationController.textToImage(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'prompt is required' })
    })

    it('should return 400 if model is missing', async () => {
      req.body = {
        prompt: 'test prompt',
        telegram_id: '123456',
        username: 'testuser',
        is_ru: false,
        bot_name: 'test_bot',
      }

      await generationController.textToImage(req as Request, res as Response, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ message: 'model is required' })
    })

    it('should handle valid request with all required parameters', async () => {
      req.body = {
        prompt: 'beautiful landscape',
        model: 'dall-e-3',
        num_images: 1,
        telegram_id: '123456',
        username: 'testuser',
        is_ru: false,
        bot_name: 'test_bot',
      }

      // Mock the service to avoid actual API calls
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockResolvedValue({ success: true })

      await generationController.textToImage(req as Request, res as Response, next)

      // Should not call res.status or res.json for valid requests
      // (they would be handled by the service or inngest)
      expect(res.status).not.toHaveBeenCalledWith(400)
    })

    it('should handle Russian language flag', async () => {
      req.body = {
        prompt: 'красивый пейзаж',
        model: 'dall-e-3',
        num_images: 1,
        telegram_id: '123456',
        username: 'testuser',
        is_ru: true,
        bot_name: 'test_bot',
      }

      await generationController.textToImage(req as Request, res as Response, next)

      expect(res.status).not.toHaveBeenCalledWith(400)
    })

    it('should handle optional num_images parameter', async () => {
      req.body = {
        prompt: 'test prompt',
        model: 'dall-e-3',
        telegram_id: '123456',
        username: 'testuser',
        is_ru: false,
        bot_name: 'test_bot',
        // num_images omitted - should use default
      }

      await generationController.textToImage(req as Request, res as Response, next)

      expect(res.status).not.toHaveBeenCalledWith(400)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      req.body = {
        prompt: 'test prompt',
        model: 'dall-e-3',
        telegram_id: '123456',
        username: 'testuser',
        is_ru: false,
        bot_name: 'test_bot',
      }

      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockRejectedValue(new Error('Service error'))

      // Should not throw an error - errors should be handled internally
      await expect(
        generationController.textToImage(req as Request, res as Response, next)
      ).resolves.not.toThrow()
    })
  })
})