import { jest, describe, it, expect } from '@jest/globals'

describe('Inngest Functions Basic Test', () => {
  beforeAll(() => {
    // Mock all dependencies
    jest.mock('@/services/generateImageToPrompt', () => ({
      generateImageToPrompt: jest.fn(),
    }))
    jest.mock('@/services/generateNeuroImage', () => ({
      generateNeuroImage: jest.fn(),
    }))
    jest.mock('@/services/generateNeuroImageV2', () => ({
      generateNeuroImageV2: jest.fn(),
    }))
    jest.mock('@/services/generateLipSync', () => ({
      generateLipSync: jest.fn(),
    }))
    jest.mock('@/services/generateModelTrainingV2', () => ({
      generateModelTrainingV2: jest.fn(),
    }))
    jest.mock('@/core/bot', () => ({
      getBotByName: jest.fn().mockReturnValue({
        bot: { telegram: { sendMessage: jest.fn() } },
      }),
    }))
    jest.mock('@/utils/logger', () => ({
      logger: {
        info: jest.fn(),
        error: jest.fn(),
      },
    }))
    jest.mock('@/core/inngest-client/clients', () => ({
      inngest: {
        createFunction: jest.fn().mockReturnValue({
          id: 'test-function',
          name: 'Test Function',
        }),
      },
    }))
  })

  it('should be able to import inngest helpers without errors', () => {
    expect(() => {
      require('@/core/inngest-client/helpers/generateImageToPrompt')
      require('@/core/inngest-client/helpers/generateNeuroImage')
      require('@/core/inngest-client/helpers/generateNeuroImageV2')
      require('@/core/inngest-client/helpers/generateLipSync')
      require('@/core/inngest-client/helpers/generateModelTrainingV2')
    }).not.toThrow()
  })

  it('should export functions from main helpers index', () => {
    const helpers = require('@/core/inngest-client/helpers')
    
    expect(helpers.generateImageToPromptInngest).toBeDefined()
    expect(helpers.generateNeuroImageInngest).toBeDefined()
    expect(helpers.generateNeuroImageV2Inngest).toBeDefined()
    expect(helpers.generateLipSyncInngest).toBeDefined()
    expect(helpers.generateModelTrainingV2Inngest).toBeDefined()
  })

  it('should have created all required Inngest functions', () => {
    const { inngest } = require('@/core/inngest-client/clients')
    
    // Simply check that createFunction was called - this means our functions were created
    expect(inngest.createFunction).toHaveBeenCalled()
  })

  it('should pass basic smoke test for all function files', () => {
    // This test just ensures all files can be loaded without runtime errors
    const functions = [
      '@/core/inngest-client/helpers/generateImageToPrompt',
      '@/core/inngest-client/helpers/generateNeuroImage',
      '@/core/inngest-client/helpers/generateNeuroImageV2',
      '@/core/inngest-client/helpers/generateLipSync',
      '@/core/inngest-client/helpers/generateModelTrainingV2',
    ]

    functions.forEach(functionPath => {
      expect(() => {
        const func = require(functionPath)
        expect(func).toBeDefined()
      }).not.toThrow()
    })
  })
})