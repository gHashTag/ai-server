import { jest, describe, it, beforeEach, expect } from '@jest/globals'
import { generateImageToPromptInngest } from '@/core/inngest-client/helpers/generateImageToPrompt'

// Mock dependencies
jest.mock('@/services/generateImageToPrompt')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')

describe('generateImageToPromptInngest', () => {
  const mockEvent = {
    data: {
      imageUrl: 'https://example.com/image.jpg',
      telegram_id: '123456',
      username: 'testuser',
      is_ru: false,
      bot_name: 'test_bot',
    },
  }

  const mockStep = {
    run: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the original service
    const { generateImageToPrompt } = require('@/services/generateImageToPrompt')
    generateImageToPrompt.mockResolvedValue('Generated prompt from image')

    // Mock getBotByName
    const { getBotByName } = require('@/core/bot')
    getBotByName.mockReturnValue({
      bot: { telegram: { sendMessage: jest.fn() } },
    })

    // Mock logger
    const { logger } = require('@/utils/logger')
    logger.info = jest.fn()
    logger.error = jest.fn()
  })

  it('should have correct function configuration', () => {
    expect(generateImageToPromptInngest.id).toBe('generate-image-to-prompt')
    expect(generateImageToPromptInngest.name).toBe('Generate Image to Prompt via Inngest')
  })

  it('should process image to prompt generation successfully', async () => {
    const expectedResult = {
      success: true,
      result: 'Generated prompt from image',
      telegram_id: '123456',
      timestamp: expect.any(String),
    }

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    const result = await generateImageToPromptInngest._fn({
      event: mockEvent,
      step: mockStep,
    } as any)

    expect(mockStep.run).toHaveBeenCalledWith('generate-image-to-prompt', expect.any(Function))
    expect(result).toEqual(expectedResult)
  })

  it('should handle errors gracefully', async () => {
    const error = new Error('Service error')
    const { generateImageToPrompt } = require('@/services/generateImageToPrompt')
    generateImageToPrompt.mockRejectedValue(error)

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await expect(
      generateImageToPromptInngest._fn({
        event: mockEvent,
        step: mockStep,
      } as any)
    ).rejects.toThrow('Service error')

    const { logger } = require('@/utils/logger')
    expect(logger.error).toHaveBeenCalledWith({
      message: 'Inngest: Ошибка при генерации промпта',
      telegram_id: '123456',
      error: 'Service error',
    })
  })

  it('should log process start and completion', async () => {
    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await generateImageToPromptInngest._fn({
      event: mockEvent,
      step: mockStep,
    } as any)

    const { logger } = require('@/utils/logger')
    
    expect(logger.info).toHaveBeenCalledWith({
      message: 'Inngest: Начинаем генерацию промпта из изображения',
      telegram_id: '123456',
      imageUrl: 'https://example.com/image.jpg',
      bot_name: 'test_bot',
    })

    expect(logger.info).toHaveBeenCalledWith({
      message: 'Inngest: Промпт успешно сгенерирован',
      telegram_id: '123456',
      resultLength: 27,
    })
  })

  it('should call original service with correct parameters', async () => {
    const { generateImageToPrompt } = require('@/services/generateImageToPrompt')
    const { getBotByName } = require('@/core/bot')

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await generateImageToPromptInngest._fn({
      event: mockEvent,
      step: mockStep,
    } as any)

    expect(getBotByName).toHaveBeenCalledWith('test_bot')
    expect(generateImageToPrompt).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      '123456',
      'testuser',
      false,
      { telegram: { sendMessage: expect.any(Function) } }
    )
  })

  it('should handle Russian language flag', async () => {
    const russianEvent = {
      ...mockEvent,
      data: {
        ...mockEvent.data,
        is_ru: true,
      },
    }

    mockStep.run.mockImplementation(async (stepName, fn) => {
      return await fn()
    })

    await generateImageToPromptInngest._fn({
      event: russianEvent,
      step: mockStep,
    } as any)

    const { generateImageToPrompt } = require('@/services/generateImageToPrompt')
    expect(generateImageToPrompt).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      '123456',
      'testuser',
      true,
      { telegram: { sendMessage: expect.any(Function) } }
    )
  })
})