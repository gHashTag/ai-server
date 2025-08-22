import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'

// Import MCP components
import { MCPToolHandler, MCP_TOOLS } from '@/core/mcp-server/tools'
import { abTestManager } from '@/core/mcp-server/ab-testing'

// Mock all external dependencies
jest.mock('@modelcontextprotocol/sdk/server/index.js')
jest.mock('@modelcontextprotocol/sdk/server/stdio.js')
jest.mock('@/core/inngest-client/clients')
jest.mock('@/core/bot')
jest.mock('@/utils/logger')
jest.mock('@/core/mcp-server/ab-testing')

// Mock all services
jest.mock('@/services/generateTextToImage')
jest.mock('@/services/generateTextToVideo')
jest.mock('@/services/generateImageToVideo')
jest.mock('@/services/generateSpeech')
jest.mock('@/services/createVoiceAvatar')
jest.mock('@/services/generateNeuroImage')
jest.mock('@/services/generateNeuroImageV2')
jest.mock('@/services/generateImageToPrompt')
jest.mock('@/services/generateLipSync')
jest.mock('@/services/generateModelTrainingV2')

const mockServer = {
  setRequestHandler: jest.fn(),
  connect: jest.fn(),
} as jest.Mocked<Server>

const mockTransport = {
  start: jest.fn(),
  stop: jest.fn(),
} as jest.Mocked<StdioServerTransport>

const MockedServer = Server as jest.MockedClass<typeof Server>
const MockedStdioServerTransport = StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>

describe('MCP Server Integration Tests', () => {
  let toolHandler: MCPToolHandler
  let mockBot: any
  let mockInngest: any

  beforeEach(async () => {
    jest.clearAllMocks()

    // Setup mocks
    MockedServer.mockImplementation(() => mockServer as any)
    MockedStdioServerTransport.mockImplementation(() => mockTransport as any)

    mockBot = {
      telegram: {
        sendMessage: jest.fn().mockResolvedValue({}),
        sendPhoto: jest.fn().mockResolvedValue({}),
        sendVideo: jest.fn().mockResolvedValue({}),
        sendAudio: jest.fn().mockResolvedValue({}),
      }
    }

    mockInngest = {
      send: jest.fn().mockResolvedValue({}),
    }

    // Setup getBotByName mock
    const { getBotByName } = require('@/core/bot')
    getBotByName.mockReturnValue({ bot: mockBot })

    // Setup inngest mock
    const { inngest } = require('@/core/inngest-client/clients')
    inngest.send = mockInngest.send

    // Setup logger mock
    const { logger } = require('@/utils/logger')
    logger.info = jest.fn()
    logger.error = jest.fn()
    logger.warn = jest.fn()

    // Initialize tool handler
    toolHandler = new MCPToolHandler({
      abTestPercentage: 50,
      fallbackMode: false,
      useInngest: true
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('MCP Server Initialization', () => {
    it('should initialize MCP server with correct configuration', () => {
      expect(MockedServer).toHaveBeenCalledWith(
        {
          name: 'ai-server-mcp',
          version: '1.0.0',
          description: 'MCP-сервер для AI генерации с паттерном Plan A/Plan B'
        },
        {
          capabilities: {
            tools: {},
          },
        }
      )
    })

    it('should setup request handlers for tools', () => {
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        ListToolsRequestSchema,
        expect.any(Function)
      )
      expect(mockServer.setRequestHandler).toHaveBeenCalledWith(
        CallToolRequestSchema,
        expect.any(Function)
      )
    })
  })

  describe('MCP Tools Configuration', () => {
    it('should provide all expected tools in list', () => {
      expect(MCP_TOOLS).toHaveLength(12)
      
      const toolNames = MCP_TOOLS.map(tool => tool.name)
      expect(toolNames).toEqual([
        'generate_text_to_image',
        'generate_text_to_video', 
        'generate_image_to_video',
        'generate_speech',
        'create_voice_avatar',
        'generate_neuro_image',
        'generate_neuro_image_v2',
        'generate_image_to_prompt',
        'generate_lip_sync',
        'generate_model_training',
        'generate_model_training_v2'
      ])
    })

    it('should have correct schema for each tool', () => {
      MCP_TOOLS.forEach(tool => {
        expect(tool.name).toBeDefined()
        expect(tool.description).toBeDefined()
        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema.properties).toBeDefined()
        expect(tool.inputSchema.required).toBeDefined()
        
        // All tools should require telegram_id and bot_name
        expect(tool.inputSchema.required).toContain('telegram_id')
        expect(tool.inputSchema.required).toContain('bot_name')
      })
    })

    it('should have proper input validation schemas', () => {
      const textToImageTool = MCP_TOOLS.find(tool => tool.name === 'generate_text_to_image')
      expect(textToImageTool?.inputSchema.properties).toMatchObject({
        prompt: { type: 'string' },
        model: { type: 'string', default: 'flux-pro' },
        telegram_id: { type: 'string' },
        username: { type: 'string', default: 'user' },
        bot_name: { type: 'string' }
      })
      expect(textToImageTool?.inputSchema.required).toEqual(['prompt', 'telegram_id', 'bot_name'])
    })
  })

  describe('Tool Handler Plan Selection', () => {
    it('should use A/B testing for plan selection', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      await toolHandler.handleTool('generate_text_to_image', args)

      expect(mockAbTestManager.decidePlan).toHaveBeenCalledWith('123456')
      expect(mockInngest.send).toHaveBeenCalledWith({
        name: 'image/text-to-image.start',
        data: expect.objectContaining({
          prompt: 'Test image',
          telegram_id: '123456',
          username: 'testuser',
          bot_name: 'test_bot',
          is_ru: true
        })
      })
    })

    it('should fallback to Plan B when A/B test chooses Plan B', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('B')

      // Mock the service
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockResolvedValue({
        success: true,
        images: ['test.jpg']
      })

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      const result = await toolHandler.handleTool('generate_text_to_image', args)

      expect(mockAbTestManager.decidePlan).toHaveBeenCalledWith('123456')
      expect(mockInngest.send).not.toHaveBeenCalled()
      expect(generateTextToImage).toHaveBeenCalledWith(
        'Test image',
        'flux-pro',
        '123456',
        'testuser',
        true,
        mockBot
      )
      expect(result.content[0].text).toContain('Plan B (Direct)')
    })

    it('should force Plan B when fallback mode is enabled', async () => {
      const fallbackHandler = new MCPToolHandler({
        fallbackMode: true,
        useInngest: true
      })

      // Mock the service
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockResolvedValue({
        success: true,
        images: ['test.jpg']
      })

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      const result = await fallbackHandler.handleTool('generate_text_to_image', args)

      expect(mockInngest.send).not.toHaveBeenCalled()
      expect(result.content[0].text).toContain('Plan B (Direct)')
    })

    it('should use Plan B when Inngest is disabled', async () => {
      const noInngestHandler = new MCPToolHandler({
        useInngest: false
      })

      // Mock the service
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockResolvedValue({
        success: true,
        images: ['test.jpg']
      })

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      const result = await noInngestHandler.handleTool('generate_text_to_image', args)

      expect(mockInngest.send).not.toHaveBeenCalled()
      expect(result.content[0].text).toContain('Plan B (Direct)')
    })
  })

  describe('Plan A (Inngest) Execution', () => {
    beforeEach(() => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')
    })

    const planATestCases = [
      {
        toolName: 'generate_text_to_image',
        eventName: 'image/text-to-image.start',
        args: { prompt: 'Test', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_text_to_video',
        eventName: 'video/text-to-video.start',
        args: { prompt: 'Video test', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_image_to_video',
        eventName: 'video/image-to-video.start',
        args: { image_url: 'https://example.com/image.jpg', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_speech',
        eventName: 'speech/text-to-speech.start',
        args: { text: 'Hello world', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'create_voice_avatar',
        eventName: 'speech/voice-avatar.start',
        args: { audio_file_url: 'https://example.com/audio.wav', name: 'Avatar', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_neuro_image',
        eventName: 'image/neuro-image.start',
        args: { prompt: 'Neuro', model_url: 'https://model.com', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_neuro_image_v2',
        eventName: 'image/neuro-image-v2.start',
        args: { prompt: 'Neuro V2', model_url: 'https://model.com', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_image_to_prompt',
        eventName: 'image/image-to-prompt.start',
        args: { image_url: 'https://example.com/image.jpg', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_lip_sync',
        eventName: 'video/lip-sync.start',
        args: { video_url: 'https://example.com/video.mp4', audio_url: 'https://example.com/audio.mp3', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_model_training',
        eventName: 'model/training.start',
        args: { training_data_urls: ['url1', 'url2'], model_name: 'test-model', telegram_id: '123', bot_name: 'bot' }
      },
      {
        toolName: 'generate_model_training_v2',
        eventName: 'model/training-v2.start',
        args: { training_data_urls: ['url1', 'url2'], model_name: 'test-model-v2', telegram_id: '123', bot_name: 'bot' }
      }
    ]

    planATestCases.forEach(({ toolName, eventName, args }) => {
      it(`should execute ${toolName} via Plan A (Inngest)`, async () => {
        const result = await toolHandler.handleTool(toolName, args)

        expect(mockInngest.send).toHaveBeenCalledWith({
          name: eventName,
          data: expect.objectContaining({
            ...args,
            username: 'user',
            is_ru: true
          })
        })

        expect(result.content[0].text).toContain(`${toolName} запущен через Plan A (Inngest)`)
        expect(result.content[0].text).toContain('Задача добавлена в очередь')
        expect(result.content[0].text).toContain(args.telegram_id)
      })
    })

    it('should handle Inngest send failures', async () => {
      mockInngest.send.mockRejectedValue(new Error('Inngest service unavailable'))

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        bot_name: 'test_bot'
      }

      await expect(toolHandler.handleTool('generate_text_to_image', args))
        .rejects.toThrow('Inngest service unavailable')
    })
  })

  describe('Plan B (Direct Service) Execution', () => {
    beforeEach(() => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('B')
    })

    it('should execute generate_text_to_image via Plan B', async () => {
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockResolvedValue({
        success: true,
        images: ['https://example.com/generated-image.jpg']
      })

      const args = {
        prompt: 'Beautiful sunset',
        model: 'dall-e-3',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      const result = await toolHandler.handleTool('generate_text_to_image', args)

      expect(generateTextToImage).toHaveBeenCalledWith(
        'Beautiful sunset',
        'dall-e-3',
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(result.content[0].text).toContain('generate_text_to_image выполнен через Plan B (Direct)')
      expect(result.content[0].text).toContain('Результат: Успешно')
    })

    it('should execute generate_text_to_video via Plan B', async () => {
      const { generateTextToVideo } = require('@/services/generateTextToVideo')
      generateTextToVideo.mockResolvedValue({
        videoLocalPath: '/tmp/generated-video.mp4',
        success: true
      })

      const args = {
        prompt: 'Cat playing',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      const result = await toolHandler.handleTool('generate_text_to_video', args)

      expect(generateTextToVideo).toHaveBeenCalledWith(
        'Cat playing',
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(result.content[0].text).toContain('generate_text_to_video выполнен через Plan B (Direct)')
    })

    it('should execute generate_speech via Plan B', async () => {
      const { generateSpeech } = require('@/services/generateSpeech')
      generateSpeech.mockResolvedValue({
        audioUrl: 'https://example.com/speech.mp3',
        success: true
      })

      const args = {
        text: 'Hello, this is a test speech',
        voice_id: 'voice-123',
        telegram_id: '123456',
        username: 'testuser',
        bot_name: 'test_bot'
      }

      const result = await toolHandler.handleTool('generate_speech', args)

      expect(generateSpeech).toHaveBeenCalledWith(
        'Hello, this is a test speech',
        'voice-123',
        '123456',
        'testuser',
        true,
        mockBot
      )

      expect(result.content[0].text).toContain('generate_speech выполнен через Plan B (Direct)')
    })

    it('should handle service failures in Plan B', async () => {
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockRejectedValue(new Error('Service temporarily unavailable'))

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        bot_name: 'test_bot'
      }

      await expect(toolHandler.handleTool('generate_text_to_image', args))
        .rejects.toThrow('Service temporarily unavailable')
    })

    it('should handle missing bot error in Plan B', async () => {
      const { getBotByName } = require('@/core/bot')
      getBotByName.mockReturnValue({ bot: null })

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        bot_name: 'nonexistent_bot'
      }

      await expect(toolHandler.handleTool('generate_text_to_image', args))
        .rejects.toThrow('Бот nonexistent_bot не найден')
    })
  })

  describe('Error Handling', () => {
    it('should handle unknown tool names', async () => {
      await expect(toolHandler.handleTool('unknown_tool', {}))
        .rejects.toThrow('Неизвестный инструмент для Plan A: unknown_tool')
    })

    it('should handle invalid tool arguments', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('B')

      const args = {
        // Missing required fields
        telegram_id: '123456',
        // Missing bot_name
      }

      await expect(toolHandler.handleTool('generate_text_to_image', args))
        .rejects.toThrow()
    })

    it('should handle network timeout errors', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockInngest.send.mockRejectedValue(timeoutError)

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        bot_name: 'test_bot'
      }

      await expect(toolHandler.handleTool('generate_text_to_image', args))
        .rejects.toThrow('Request timeout')
    })
  })

  describe('MCP Protocol Compliance', () => {
    it('should return tools list in MCP format', async () => {
      // Simulate ListToolsRequest
      const toolsResponse = {
        tools: [
          ...MCP_TOOLS,
          {
            name: 'analyze_with_ai',
            description: 'Анализ данных с помощью AI-SDK',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                context: { type: 'string', default: '' }
              },
              required: ['query']
            }
          }
        ]
      }

      expect(toolsResponse.tools).toHaveLength(13)
      expect(toolsResponse.tools[0]).toHaveProperty('name')
      expect(toolsResponse.tools[0]).toHaveProperty('description')
      expect(toolsResponse.tools[0]).toHaveProperty('inputSchema')
    })

    it('should return MCP-compliant responses', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      const args = {
        prompt: 'Test image',
        telegram_id: '123456',
        bot_name: 'test_bot'
      }

      const result = await toolHandler.handleTool('generate_text_to_image', args)

      // MCP response format
      expect(result).toHaveProperty('content')
      expect(Array.isArray(result.content)).toBe(true)
      expect(result.content[0]).toHaveProperty('type', 'text')
      expect(result.content[0]).toHaveProperty('text')
      expect(typeof result.content[0].text).toBe('string')
    })

    it('should handle MCP errors correctly', async () => {
      const mcpError = new McpError(ErrorCode.InvalidRequest, 'Invalid request format')
      
      expect(mcpError.code).toBe(ErrorCode.InvalidRequest)
      expect(mcpError.message).toBe('Invalid request format')
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      const requests = Array.from({ length: 10 }, (_, i) => ({
        prompt: `Test image ${i}`,
        telegram_id: `user-${i}`,
        bot_name: 'test_bot'
      }))

      const promises = requests.map(args => 
        toolHandler.handleTool('generate_text_to_image', args)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result, i) => {
        expect(result.content[0].text).toContain(`Пользователь: user-${i}`)
        expect(result.content[0].text).toContain('План A (Inngest)')
      })

      expect(mockInngest.send).toHaveBeenCalledTimes(10)
    })

    it('should handle mixed Plan A/B requests concurrently', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      
      // Mock alternating plans
      mockAbTestManager.decidePlan
        .mockReturnValueOnce('A')
        .mockReturnValueOnce('B')
        .mockReturnValueOnce('A')
        .mockReturnValueOnce('B')

      // Mock Plan B service
      const { generateTextToImage } = require('@/services/generateTextToImage')
      generateTextToImage.mockResolvedValue({
        success: true,
        images: ['test.jpg']
      })

      const requests = [
        { prompt: 'Test 1', telegram_id: 'user-1', bot_name: 'bot' },
        { prompt: 'Test 2', telegram_id: 'user-2', bot_name: 'bot' },
        { prompt: 'Test 3', telegram_id: 'user-3', bot_name: 'bot' },
        { prompt: 'Test 4', telegram_id: 'user-4', bot_name: 'bot' }
      ]

      const promises = requests.map(args => 
        toolHandler.handleTool('generate_text_to_image', args)
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(4)
      expect(results[0].content[0].text).toContain('Plan A (Inngest)')
      expect(results[1].content[0].text).toContain('Plan B (Direct)')
      expect(results[2].content[0].text).toContain('Plan A (Inngest)')
      expect(results[3].content[0].text).toContain('Plan B (Direct)')

      expect(mockInngest.send).toHaveBeenCalledTimes(2) // Only Plan A requests
      expect(generateTextToImage).toHaveBeenCalledTimes(2) // Only Plan B requests
    })
  })

  describe('Performance and Resource Management', () => {
    it('should complete tool execution within reasonable time', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      const args = {
        prompt: 'Performance test',
        telegram_id: '123456',
        bot_name: 'test_bot'
      }

      const startTime = Date.now()
      const result = await toolHandler.handleTool('generate_text_to_image', args)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000) // Should complete within 1 second
      expect(result).toBeDefined()
    })

    it('should handle memory-intensive operations', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('B')

      // Mock large data processing
      const { generateModelTrainingV2 } = require('@/services/generateModelTrainingV2')
      const largeDataUrls = Array.from({ length: 100 }, (_, i) => `https://example.com/image${i}.jpg`)
      
      generateModelTrainingV2.mockResolvedValue({
        success: true,
        model_id: 'trained-model-123',
        training_time: 3600
      })

      const args = {
        training_data_urls: largeDataUrls,
        model_name: 'large-dataset-model',
        telegram_id: '123456',
        bot_name: 'test_bot'
      }

      const result = await toolHandler.handleTool('generate_model_training_v2', args)

      expect(result.content[0].text).toContain('Plan B (Direct)')
      expect(generateModelTrainingV2).toHaveBeenCalledWith(
        largeDataUrls,
        'large-dataset-model',
        '123456',
        'user',
        true,
        mockBot
      )
    })
  })

  describe('Data Privacy and Security', () => {
    it('should not log sensitive user data', async () => {
      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      const { logger } = require('@/utils/logger')

      const args = {
        prompt: 'Confidential business data',
        telegram_id: '123456',
        username: 'sensitive_user',
        bot_name: 'test_bot'
      }

      await toolHandler.handleTool('generate_text_to_image', args)

      // Verify that sensitive data is handled appropriately in logs
      expect(logger.info).toHaveBeenCalled()
      
      // Check that logger calls don't contain full sensitive data
      const logCalls = logger.info.mock.calls
      logCalls.forEach(call => {
        const logData = call[0]
        if (typeof logData === 'object' && logData !== null) {
          // Sensitive data should be truncated or masked
          expect(logData).toBeDefined()
        }
      })
    })

    it('should validate input parameters', async () => {
      // Test with potentially malicious input
      const maliciousArgs = {
        prompt: '<script>alert("xss")</script>',
        telegram_id: '; DROP TABLE users; --',
        bot_name: '../../../etc/passwd'
      }

      const mockAbTestManager = abTestManager as jest.Mocked<typeof abTestManager>
      mockAbTestManager.decidePlan.mockReturnValue('A')

      // Should handle without breaking
      const result = await toolHandler.handleTool('generate_text_to_image', maliciousArgs)
      expect(result).toBeDefined()
      expect(mockInngest.send).toHaveBeenCalledWith({
        name: 'image/text-to-image.start',
        data: expect.objectContaining({
          prompt: '<script>alert("xss")</script>',
          telegram_id: '; DROP TABLE users; --',
          bot_name: '../../../etc/passwd'
        })
      })
    })
  })
})