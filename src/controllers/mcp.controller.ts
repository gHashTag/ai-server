import { Request, Response } from 'express'
import { Container } from 'typedi'
import { mcpServer } from '@/core/mcp-server'
import { abTestManager } from '@/core/mcp-server/ab-testing'
import { aiProviderManager } from '@/core/mcp-server/ai-providers'
import { logger } from '@/utils/logger'

/**
 * Контроллер для управления MCP-сервером
 */
export class MCPController {
  
  /**
   * Получение статуса MCP-сервера
   */
  public getMCPStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const abTestMetrics = abTestManager.getMetrics()
      const abTestAnalysis = abTestManager.analyzeResults()
      const providerHealth = await aiProviderManager.healthCheck()

      res.status(200).json({
        success: true,
        data: {
          server: {
            name: 'ai-server-mcp',
            version: '1.0.0',
            status: 'running',
            uptime: process.uptime(),
          },
          abTesting: {
            enabled: process.env.AB_TESTING_ENABLED === 'true',
            metrics: abTestMetrics,
            analysis: abTestAnalysis,
            isStatisticallySignificant: abTestManager.isStatisticallySignificant(),
          },
          aiProviders: {
            health: providerHealth,
            usage: aiProviderManager.getUsageStats(),
          },
          environment: {
            useInngest: process.env.USE_INNGEST === 'true',
            fallbackMode: process.env.FALLBACK_MODE === 'true',
            abTestPercentage: process.env.AB_TEST_PERCENTAGE || '50',
          },
        },
      })

      logger.info('MCP Controller: Статус сервера запрошен')
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка получения статуса',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка получения статуса MCP-сервера',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Получение доступных инструментов MCP
   */
  public getMCPTools = async (req: Request, res: Response): Promise<void> => {
    try {
      // Эмулируем запрос к серверу для получения списка инструментов
      const tools = [
        {
          name: 'generate_text_to_image',
          description: 'Генерация изображения из текста с использованием AI моделей',
          category: 'image_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_text_to_video',
          description: 'Генерация видео из текста',
          category: 'video_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_image_to_video',
          description: 'Генерация видео из изображения',
          category: 'video_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_speech',
          description: 'Генерация речи из текста',
          category: 'audio_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'create_voice_avatar',
          description: 'Создание голосового аватара',
          category: 'audio_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_neuro_image',
          description: 'Генерация персонализированного изображения',
          category: 'personalized_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_neuro_image_v2',
          description: 'Генерация персонализированного изображения v2',
          category: 'personalized_generation',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_image_to_prompt',
          description: 'Генерация промпта из изображения',
          category: 'analysis',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_lip_sync',
          description: 'Генерация лип-синк видео',
          category: 'video_processing',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_model_training',
          description: 'Обучение персонализированной модели',
          category: 'model_training',
          planSupport: ['A', 'B'],
        },
        {
          name: 'generate_model_training_v2',
          description: 'Обучение персонализированной модели v2',
          category: 'model_training',
          planSupport: ['A', 'B'],
        },
        {
          name: 'analyze_with_ai',
          description: 'Анализ данных с помощью AI',
          category: 'analysis',
          planSupport: ['AI-SDK'],
        },
      ]

      const categoryCounts = tools.reduce((acc, tool) => {
        acc[tool.category] = (acc[tool.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      res.status(200).json({
        success: true,
        data: {
          tools,
          summary: {
            total: tools.length,
            categories: categoryCounts,
            planASupported: tools.filter(t => t.planSupport.includes('A')).length,
            planBSupported: tools.filter(t => t.planSupport.includes('B')).length,
            aiSDKSupported: tools.filter(t => t.planSupport.includes('AI-SDK')).length,
          },
        },
      })

      logger.info('MCP Controller: Список инструментов запрошен')
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка получения инструментов',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка получения инструментов MCP',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Получение метрик A/B тестирования
   */
  public getABTestMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = abTestManager.getMetrics()
      const analysis = abTestManager.analyzeResults()

      res.status(200).json({
        success: true,
        data: {
          metrics,
          analysis,
          isStatisticallySignificant: abTestManager.isStatisticallySignificant(),
          exportedAt: new Date().toISOString(),
        },
      })

      logger.info('MCP Controller: Метрики A/B тестирования запрошены')
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка получения метрик A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка получения метрик A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Сброс метрик A/B тестирования
   */
  public resetABTestMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      abTestManager.resetMetrics()

      res.status(200).json({
        success: true,
        message: 'Метрики A/B тестирования сброшены',
        timestamp: new Date().toISOString(),
      })

      logger.info('MCP Controller: Метрики A/B тестирования сброшены')
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка сброса метрик A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка сброса метрик A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Обновление конфигурации A/B тестирования
   */
  public updateABTestConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { enabled, planAPercentage, minSampleSize } = req.body

      const newConfig: any = {}
      
      if (typeof enabled === 'boolean') {
        newConfig.enabled = enabled
      }
      
      if (typeof planAPercentage === 'number' && planAPercentage >= 0 && planAPercentage <= 100) {
        newConfig.planAPercentage = planAPercentage
        newConfig.planBPercentage = 100 - planAPercentage
      }
      
      if (typeof minSampleSize === 'number' && minSampleSize > 0) {
        newConfig.minSampleSize = minSampleSize
      }

      abTestManager.updateConfig(newConfig)

      res.status(200).json({
        success: true,
        message: 'Конфигурация A/B тестирования обновлена',
        updatedConfig: newConfig,
        timestamp: new Date().toISOString(),
      })

      logger.info({
        message: 'MCP Controller: Конфигурация A/B тестирования обновлена',
        newConfig,
      })
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка обновления конфигурации A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка обновления конфигурации A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Экспорт полных метрик A/B тестирования
   */
  public exportABTestMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const exportData = abTestManager.exportMetrics()

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="ab-test-metrics-${new Date().toISOString().split('T')[0]}.json"`)
      
      res.status(200).send(exportData)

      logger.info('MCP Controller: Метрики A/B тестирования экспортированы')
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка экспорта метрик A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка экспорта метрик A/B тестирования',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Проверка здоровья AI провайдеров
   */
  public checkAIProvidersHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthStatus = await aiProviderManager.healthCheck()
      const usageStats = aiProviderManager.getUsageStats()

      res.status(200).json({
        success: true,
        data: {
          health: healthStatus,
          usage: usageStats,
          checkedAt: new Date().toISOString(),
        },
      })

      logger.info('MCP Controller: Проверка здоровья AI провайдеров выполнена')
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка проверки здоровья AI провайдеров',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка проверки здоровья AI провайдеров',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Тестовое выполнение AI анализа
   */
  public testAIAnalysis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, context } = req.body

      if (!query) {
        res.status(400).json({
          success: false,
          message: 'Параметр query обязателен',
        })
        return
      }

      const result = await aiProviderManager.analyzeWithAI(query, context)

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      })

      logger.info({
        message: 'MCP Controller: Тестовый AI анализ выполнен',
        query: query.substring(0, 100),
        success: result.success,
        provider: result.provider,
      })
    } catch (error) {
      logger.error({
        message: 'MCP Controller: Ошибка тестового AI анализа',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      res.status(500).json({
        success: false,
        message: 'Ошибка выполнения тестового AI анализа',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}