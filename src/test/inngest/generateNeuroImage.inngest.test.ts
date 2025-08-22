import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { generateNeuroImageInngest } from '@/core/inngest-client/helpers/generateNeuroImage'

// Mock dependencies
jest.mock('@/services/generateNeuroImage')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

describe('generateNeuroImageInngest', () => {
  const mockEvent = {
    data: {
      prompt: 'Beautiful landscape painting',
      model_url: 'user/model:version' as const,
      num_images: 2,
      telegram_id: '123456',
      username: 'testuser',
      is_ru: false,
      bot_name: 'test_bot',
    },
  }

  const mockStep = {
    run: jest.fn(),
  }

  const mockGenerationResult = {
    success: true,
    images: ['url1', 'url2'],
    prompt: 'Beautiful landscape painting',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the original service
    const { generateNeuroImage } = require('@/services/generateNeuroImage')
    generateNeuroImage.mockResolvedValue(mockGenerationResult)

    // Mock getBotByName
    const { getBotByName } = require('@/core/bot')
    getBotByName.mockReturnValue({
      bot: { telegram: { sendPhoto: jest.fn() } },
    })

    // Mock logger
    const { logger } = require('@/utils/logger')
    logger.info = jest.fn()
    logger.error = jest.fn()
  })

  it('should have correct function configuration', () => {
    expect(generateNeuroImageInngest.id).toBe('generate-neuro-image')
    expect(generateNeuroImageInngest.name).toBe('Generate Neuro Image via Inngest')
  })

  it('should process neuro image generation successfully', async () => {
    const expectedResult = {
      success: true,
      result: mockGenerationResult,
      telegram_id: '123456',
      timestamp: expect.any(String),
    }

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    const result = await generateNeuroImageInngest._fn({
      event: mockEvent,
      step: mockStep,
    } as any)

    expect(mockStep.run).toHaveBeenCalledWith('generate-neuro-image', expect.any(Function))
    expect(result).toEqual(expectedResult)
  })

  it('should handle null result from service', async () => {
    const { generateNeuroImage } = require('@/services/generateNeuroImage')
    generateNeuroImage.mockResolvedValue(null)

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    const result = await generateNeuroImageInngest._fn({
      event: mockEvent,
      step: mockStep,
    } as any)

    expect(result.result).toBeNull()
    
    const { logger } = require('@/utils/logger')
    expect(logger.info).toHaveBeenCalledWith({
      message: 'Inngest: Нейро-изображение успешно сгенерировано',
      telegram_id: '123456',
      resultStatus: 'null',
    })
  })

  it('should handle errors gracefully', async () => {
    const error = new Error('Model training failed')
    const { generateNeuroImage } = require('@/services/generateNeuroImage')
    generateNeuroImage.mockRejectedValue(error)

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await expect(
      generateNeuroImageInngest._fn({
        event: mockEvent,
        step: mockStep,
      } as any)
    ).rejects.toThrow('Model training failed')

    const { logger } = require('@/utils/logger')
    expect(logger.error).toHaveBeenCalledWith({
      message: 'Inngest: Ошибка при генерации нейро-изображения',
      telegram_id: '123456',
      error: 'Model training failed',
    })
  })

  it('should truncate long prompts in logs', async () => {
    const longPromptEvent = {
      ...mockEvent,
      data: {
        ...mockEvent.data,
        prompt: 'A'.repeat(200), // 200 символов
      },
    }

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await generateNeuroImageInngest._fn({
      event: longPromptEvent,
      step: mockStep,
    } as any)

    const { logger } = require('@/utils/logger')
    expect(logger.info).toHaveBeenCalledWith({
      message: 'Inngest: Начинаем генерацию нейро-изображения',
      telegram_id: '123456',
      prompt: 'A'.repeat(100), // Должно быть обрезано до 100
      model_url: 'user/model:version',
      num_images: 2,
      bot_name: 'test_bot',
    })
  })

  it('should call original service with correct parameters', async () => {
    const { generateNeuroImage } = require('@/services/generateNeuroImage')
    const { getBotByName } = require('@/core/bot')

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await generateNeuroImageInngest._fn({
      event: mockEvent,
      step: mockStep,
    } as any)

    expect(getBotByName).toHaveBeenCalledWith('test_bot')
    expect(generateNeuroImage).toHaveBeenCalledWith(
      'Beautiful landscape painting',
      'user/model:version',
      2,
      '123456',
      'testuser',
      false,
      { telegram: { sendPhoto: expect.any(Function) } }
    )
  })
})