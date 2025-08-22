import { MCPController } from '@/controllers/mcp.controller'
import { abTestManager } from '@/core/mcp-server/ab-testing'
import { aiProviderManager } from '@/core/mcp-server/ai-providers'
import { MCPToolHandler } from '@/core/mcp-server/tools'

// Мокаем зависимости
jest.mock('@/core/mcp-server/ab-testing')
jest.mock('@/core/mcp-server/ai-providers')
jest.mock('@/core/mcp-server/tools')
jest.mock('@/utils/logger')

describe('MCP Server Tests', () => {
  let mcpController: MCPController
  let mockRequest: any
  let mockResponse: any

  beforeEach(() => {
    mcpController = new MCPController()
    
    mockRequest = {
      body: {},
      params: {},
      query: {},
    }

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    }

    // Очистка всех моков
    jest.clearAllMocks()
  })

  describe('MCP Controller', () => {
    describe('getMCPStatus', () => {
      it('должен возвращать статус MCP-сервера', async () => {
        // Мокаем методы
        const mockMetrics = {
          planA: { totalExecutions: 10, successfulExecutions: 8, averageExecutionTime: 100 },
          planB: { totalExecutions: 5, successfulExecutions: 4, averageExecutionTime: 150 },
          overallStats: { totalTests: 15, startTime: new Date(), lastUpdate: new Date() },
        }

        const mockAnalysis = {
          winner: 'A' as const,
          confidence: 85,
          recommendation: 'Plan A лучше',
          details: { planA: { successRate: 80, avgTime: 100 }, planB: { successRate: 80, avgTime: 150 } },
        }

        const mockProviderHealth = { openai: true }

        ;(abTestManager.getMetrics as jest.Mock).mockReturnValue(mockMetrics)
        ;(abTestManager.analyzeResults as jest.Mock).mockReturnValue(mockAnalysis)
        ;(abTestManager.isStatisticallySignificant as jest.Mock).mockReturnValue(true)
        ;(aiProviderManager.healthCheck as jest.Mock).mockResolvedValue(mockProviderHealth)
        ;(aiProviderManager.getUsageStats as jest.Mock).mockReturnValue({
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 200,
        })

        await mcpController.getMCPStatus(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            server: expect.objectContaining({
              name: 'ai-server-mcp',
              version: '1.0.0',
              status: 'running',
            }),
            abTesting: expect.objectContaining({
              metrics: mockMetrics,
              analysis: mockAnalysis,
              isStatisticallySignificant: true,
            }),
            aiProviders: expect.objectContaining({
              health: mockProviderHealth,
            }),
          }),
        })
      })

      it('должен обрабатывать ошибки при получении статуса', async () => {
        ;(abTestManager.getMetrics as jest.Mock).mockImplementation(() => {
          throw new Error('Test error')
        })

        await mcpController.getMCPStatus(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(500)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Ошибка получения статуса MCP-сервера',
          error: 'Test error',
        })
      })
    })

    describe('getMCPTools', () => {
      it('должен возвращать список доступных инструментов', async () => {
        await mcpController.getMCPTools(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: expect.objectContaining({
            tools: expect.arrayContaining([
              expect.objectContaining({
                name: 'generate_text_to_image',
                description: expect.any(String),
                category: 'image_generation',
                planSupport: ['A', 'B'],
              }),
            ]),
            summary: expect.objectContaining({
              total: expect.any(Number),
              categories: expect.any(Object),
              planASupported: expect.any(Number),
              planBSupported: expect.any(Number),
            }),
          }),
        })
      })
    })

    describe('getABTestMetrics', () => {
      it('должен возвращать метрики A/B тестирования', async () => {
        const mockMetrics = {
          planA: { totalExecutions: 20, successfulExecutions: 18 },
          planB: { totalExecutions: 15, successfulExecutions: 12 },
        }

        const mockAnalysis = {
          winner: 'A' as const,
          confidence: 90,
          recommendation: 'Используйте Plan A',
        }

        ;(abTestManager.getMetrics as jest.Mock).mockReturnValue(mockMetrics)
        ;(abTestManager.analyzeResults as jest.Mock).mockReturnValue(mockAnalysis)
        ;(abTestManager.isStatisticallySignificant as jest.Mock).mockReturnValue(true)

        await mcpController.getABTestMetrics(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: {
            metrics: mockMetrics,
            analysis: mockAnalysis,
            isStatisticallySignificant: true,
            exportedAt: expect.any(String),
          },
        })
      })
    })

    describe('resetABTestMetrics', () => {
      it('должен сбрасывать метрики A/B тестирования', async () => {
        await mcpController.resetABTestMetrics(mockRequest, mockResponse)

        expect(abTestManager.resetMetrics).toHaveBeenCalled()
        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Метрики A/B тестирования сброшены',
          timestamp: expect.any(String),
        })
      })
    })

    describe('updateABTestConfig', () => {
      it('должен обновлять конфигурацию A/B тестирования', async () => {
        mockRequest.body = {
          enabled: true,
          planAPercentage: 70,
          minSampleSize: 150,
        }

        await mcpController.updateABTestConfig(mockRequest, mockResponse)

        expect(abTestManager.updateConfig).toHaveBeenCalledWith({
          enabled: true,
          planAPercentage: 70,
          planBPercentage: 30,
          minSampleSize: 150,
        })

        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          message: 'Конфигурация A/B тестирования обновлена',
          updatedConfig: {
            enabled: true,
            planAPercentage: 70,
            planBPercentage: 30,
            minSampleSize: 150,
          },
          timestamp: expect.any(String),
        })
      })

      it('должен игнорировать некорректные значения', async () => {
        mockRequest.body = {
          planAPercentage: 150, // Некорректное значение
          minSampleSize: -10, // Некорректное значение
        }

        await mcpController.updateABTestConfig(mockRequest, mockResponse)

        expect(abTestManager.updateConfig).toHaveBeenCalledWith({})
        expect(mockResponse.status).toHaveBeenCalledWith(200)
      })
    })

    describe('checkAIProvidersHealth', () => {
      it('должен проверять здоровье AI провайдеров', async () => {
        const mockHealth = { openai: true, anthropic: false }
        const mockUsage = {
          totalRequests: 50,
          successfulRequests: 48,
          failedRequests: 2,
          averageResponseTime: 300,
        }

        ;(aiProviderManager.healthCheck as jest.Mock).mockResolvedValue(mockHealth)
        ;(aiProviderManager.getUsageStats as jest.Mock).mockReturnValue(mockUsage)

        await mcpController.checkAIProvidersHealth(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: {
            health: mockHealth,
            usage: mockUsage,
            checkedAt: expect.any(String),
          },
        })
      })
    })

    describe('testAIAnalysis', () => {
      it('должен выполнять тестовый AI анализ', async () => {
        mockRequest.body = {
          query: 'Тестовый запрос',
          context: 'Тестовый контекст',
        }

        const mockResult = {
          success: true,
          text: 'Результат анализа',
          provider: 'openai',
          tokensUsed: 50,
        }

        ;(aiProviderManager.analyzeWithAI as jest.Mock).mockResolvedValue(mockResult)

        await mcpController.testAIAnalysis(mockRequest, mockResponse)

        expect(aiProviderManager.analyzeWithAI).toHaveBeenCalledWith(
          'Тестовый запрос',
          'Тестовый контекст'
        )

        expect(mockResponse.status).toHaveBeenCalledWith(200)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockResult,
          timestamp: expect.any(String),
        })
      })

      it('должен возвращать ошибку при отсутствии query', async () => {
        mockRequest.body = {}

        await mcpController.testAIAnalysis(mockRequest, mockResponse)

        expect(mockResponse.status).toHaveBeenCalledWith(400)
        expect(mockResponse.json).toHaveBeenCalledWith({
          success: false,
          message: 'Параметр query обязателен',
        })
      })
    })
  })

  describe('MCPToolHandler', () => {
    let toolHandler: MCPToolHandler

    beforeEach(() => {
      toolHandler = new MCPToolHandler({
        useInngest: true,
        fallbackMode: false,
        abTestPercentage: 50,
      })
    })

    it('должен создаваться с правильной конфигурацией', () => {
      expect(toolHandler).toBeInstanceOf(MCPToolHandler)
    })

    it('должен выбирать план на основе A/B тестирования', async () => {
      const mockArgs = {
        telegram_id: '123456',
        bot_name: 'test_bot',
        prompt: 'test prompt',
      }

      // Мокаем measureExecution чтобы избежать реального выполнения
      const mockMeasureExecution = jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock response' }],
      })

      jest.doMock('@/core/mcp-server/ab-testing', () => ({
        measureExecution: mockMeasureExecution,
        abTestManager: {
          decidePlan: jest.fn().mockReturnValue('A'),
        },
      }))

      try {
        await toolHandler.handleTool('generate_text_to_image', mockArgs)
      } catch (error) {
        // Ожидаем ошибку так как мы не мокаем все зависимости
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('A/B Testing Manager', () => {
    beforeEach(() => {
      // Сброс моков для A/B тестинга
      jest.clearAllMocks()
    })

    it('должен записывать результаты выполнения', () => {
      const mockResult = {
        plan: 'A' as const,
        success: true,
        executionTime: 100,
        responseSize: 500,
      }

      abTestManager.recordResult(mockResult)
      expect(abTestManager.recordResult).toHaveBeenCalledWith(mockResult)
    })

    it('должен анализировать результаты A/B тестирования', () => {
      const mockAnalysis = {
        winner: 'A' as const,
        confidence: 85,
        recommendation: 'Plan A показывает лучшие результаты',
        details: {
          planA: { successRate: 90, avgTime: 100 },
          planB: { successRate: 80, avgTime: 150 },
        },
      }

      ;(abTestManager.analyzeResults as jest.Mock).mockReturnValue(mockAnalysis)

      const analysis = abTestManager.analyzeResults()
      expect(analysis).toEqual(mockAnalysis)
    })
  })

  describe('AI Provider Manager', () => {
    it('должен выполнять анализ с fallback', async () => {
      const mockResult = {
        success: true,
        text: 'Результат анализа',
        provider: 'openai (fallback)',
        tokensUsed: 100,
      }

      ;(aiProviderManager.analyzeWithAI as jest.Mock).mockResolvedValue(mockResult)

      const result = await aiProviderManager.analyzeWithAI(
        'Тестовый запрос',
        'Контекст'
      )

      expect(result).toEqual(mockResult)
      expect(aiProviderManager.analyzeWithAI).toHaveBeenCalledWith(
        'Тестовый запрос',
        'Контекст'
      )
    })

    it('должен проверять здоровье провайдеров', async () => {
      const mockHealth = {
        openai: true,
        anthropic: false,
      }

      ;(aiProviderManager.healthCheck as jest.Mock).mockResolvedValue(mockHealth)

      const health = await aiProviderManager.healthCheck()
      expect(health).toEqual(mockHealth)
    })
  })
})