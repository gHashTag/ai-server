import { jest, describe, it, expect } from '@jest/globals'

// Mock dependencies before importing functions
jest.mock('@/services/generateImageToPrompt')
jest.mock('@/services/generateNeuroImage')
jest.mock('@/services/generateNeuroImageV2')
jest.mock('@/services/generateLipSync')
jest.mock('@/services/generateModelTrainingV2')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')
jest.mock('@/core/inngest-client/clients', () => ({
  inngest: {
    createFunction: jest.fn().mockImplementation((config, trigger, handler) => ({
      id: config.id,
      name: config.name,
      config,
      trigger,
      handler,
    })),
  },
}))

describe('Inngest Functions - Simple Tests', () => {
  describe('Function Exports', () => {
    it('should export all new Inngest functions', async () => {
      const functions = await import('@/core/inngest-client/helpers')
      
      expect(functions.generateImageToPromptInngest).toBeDefined()
      expect(functions.generateNeuroImageInngest).toBeDefined()
      expect(functions.generateNeuroImageV2Inngest).toBeDefined()
      expect(functions.generateLipSyncInngest).toBeDefined()
      expect(functions.generateModelTrainingV2Inngest).toBeDefined()
    })
  })

  describe('Function Configuration', () => {
    it('should have correct configuration for generateImageToPromptInngest', async () => {
      const { generateImageToPromptInngest } = await import('@/core/inngest-client/helpers/generateImageToPrompt')
      
      expect(generateImageToPromptInngest.id).toBe('generate-image-to-prompt')
      expect(generateImageToPromptInngest.name).toBe('Generate Image to Prompt via Inngest')
    })

    it('should have correct configuration for generateNeuroImageInngest', async () => {
      const { generateNeuroImageInngest } = await import('@/core/inngest-client/helpers/generateNeuroImage')
      
      expect(generateNeuroImageInngest.id).toBe('generate-neuro-image')
      expect(generateNeuroImageInngest.name).toBe('Generate Neuro Image via Inngest')
    })

    it('should have correct configuration for generateNeuroImageV2Inngest', async () => {
      const { generateNeuroImageV2Inngest } = await import('@/core/inngest-client/helpers/generateNeuroImageV2')
      
      expect(generateNeuroImageV2Inngest.id).toBe('generate-neuro-image-v2')
      expect(generateNeuroImageV2Inngest.name).toBe('Generate Neuro Image V2 via Inngest')
    })

    it('should have correct configuration for generateLipSyncInngest', async () => {
      const { generateLipSyncInngest } = await import('@/core/inngest-client/helpers/generateLipSync')
      
      expect(generateLipSyncInngest.id).toBe('generate-lip-sync')
      expect(generateLipSyncInngest.name).toBe('Generate Lip Sync via Inngest')
    })

    it('should have correct configuration for generateModelTrainingV2Inngest', async () => {
      const { generateModelTrainingV2Inngest } = await import('@/core/inngest-client/helpers/generateModelTrainingV2')
      
      expect(generateModelTrainingV2Inngest.id).toBe('generate-model-training-v2')
      expect(generateModelTrainingV2Inngest.name).toBe('Generate Model Training V2 via Inngest')
    })
  })

  describe('Function Creation', () => {
    it('should call inngest.createFunction for each new function', async () => {
      const { inngest } = require('@/core/inngest-client/clients')
      
      // Import all functions to trigger creation
      await import('@/core/inngest-client/helpers/generateImageToPrompt')
      await import('@/core/inngest-client/helpers/generateNeuroImage')
      await import('@/core/inngest-client/helpers/generateNeuroImageV2')
      await import('@/core/inngest-client/helpers/generateLipSync')
      await import('@/core/inngest-client/helpers/generateModelTrainingV2')
      
      // Verify that createFunction was called for each new function
      const createFunctionCalls = inngest.createFunction.mock.calls
      const newFunctionIds = [
        'generate-image-to-prompt',
        'generate-neuro-image',
        'generate-neuro-image-v2',
        'generate-lip-sync',
        'generate-model-training-v2',
      ]

      newFunctionIds.forEach(id => {
        const callExists = createFunctionCalls.some(call => call[0].id === id)
        expect(callExists).toBe(true)
      })
    })
  })

  describe('Event Patterns', () => {
    it('should use correct event patterns for each function', async () => {
      const { inngest } = require('@/core/inngest-client/clients')
      
      // Import functions
      await import('@/core/inngest-client/helpers/generateImageToPrompt')
      await import('@/core/inngest-client/helpers/generateNeuroImage')
      await import('@/core/inngest-client/helpers/generateNeuroImageV2')
      await import('@/core/inngest-client/helpers/generateLipSync')
      await import('@/core/inngest-client/helpers/generateModelTrainingV2')
      
      const calls = inngest.createFunction.mock.calls
      const expectedEvents = [
        { id: 'generate-image-to-prompt', event: 'image/image-to-prompt.start' },
        { id: 'generate-neuro-image', event: 'image/neuro-image.start' },
        { id: 'generate-neuro-image-v2', event: 'image/neuro-image-v2.start' },
        { id: 'generate-lip-sync', event: 'video/lip-sync.start' },
        { id: 'generate-model-training-v2', event: 'training/model-training-v2.start' },
      ]

      expectedEvents.forEach(({ id, event }) => {
        const call = calls.find(call => call[0].id === id)
        expect(call).toBeDefined()
        expect(call[1].event).toBe(event)
      })
    })
  })
})