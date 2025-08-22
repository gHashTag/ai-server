import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'
import { logger } from '@/utils/logger'
import { MCP_TOOLS, MCPToolHandler, McpToolResponse } from './tools'
import { analyzeWithAI } from './ai-providers'

// Интерфейсы для типизации
interface McpToolRequest {
  name: string
  arguments?: Record<string, any>
}

interface PlanABConfig {
  useInngest: boolean
  fallbackMode: boolean
  abTestPercentage: number
}

/**
 * MCP-сервер на базе AI-SDK поверх ingest-функций
 * Реализует паттерн Plan A/Plan B для надежности
 */
class MCPServer {
  private server: Server
  private planConfig: PlanABConfig
  private toolHandler: MCPToolHandler

  constructor() {
    this.server = new Server(
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

    this.planConfig = {
      useInngest: process.env.USE_INNGEST === 'true',
      fallbackMode: process.env.FALLBACK_MODE === 'true',
      abTestPercentage: parseInt(process.env.AB_TEST_PERCENTAGE || '50', 10),
    }

    this.toolHandler = new MCPToolHandler({
      useInngest: this.planConfig.useInngest,
      fallbackMode: this.planConfig.fallbackMode,
      abTestPercentage: this.planConfig.abTestPercentage,
    })

    this.setupToolHandlers()
    logger.info('🚀 MCP Server инициализирован с AI-SDK и Plan A/B паттерном')
  }


  /**
   * Настройка обработчиков инструментов MCP
   */
  private setupToolHandlers(): void {
    // Список доступных инструментов
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        ...MCP_TOOLS,
        {
          name: 'analyze_with_ai',
          description: 'Анализ данных с помощью AI-SDK',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Запрос для анализа'
              },
              context: {
                type: 'string',
                description: 'Контекст для анализа',
                default: ''
              }
            },
            required: ['query']
          }
        }
      ]

      logger.info(`MCP Server: Предоставлено ${tools.length} инструментов`)
      
      return { tools }
    })

    // Выполнение инструментов
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params as McpToolRequest

      logger.info({
        message: 'MCP: Получен запрос на выполнение инструмента',
        toolName: name,
        args: { ...args, telegram_id: args?.telegram_id }, // Скрываем чувствительные данные в логах
      })

      try {
        // Специальная обработка для AI анализа (не требует bot_name)
        if (name === 'analyze_with_ai') {
          return await this.handleAIAnalysis(args)
        }

        // Все остальные инструменты обрабатываются через toolHandler
        const toolNames = MCP_TOOLS.map(tool => tool.name)
        if (toolNames.includes(name)) {
          return await this.toolHandler.handleTool(name, args || {})
        }

        throw new McpError(
          ErrorCode.MethodNotFound,
          `Неизвестный инструмент: ${name}`
        )
      } catch (error) {
        logger.error({
          message: 'MCP: Ошибка при выполнении инструмента',
          toolName: name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        throw new McpError(
          ErrorCode.InternalError,
          `Ошибка выполнения ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })
  }


  /**
   * Обработка AI анализа с использованием AI-SDK и Plan A/B провайдеров
   */
  private async handleAIAnalysis(args: Record<string, any>): Promise<McpToolResponse> {
    const { query, context = '' } = args

    try {
      const result = await analyzeWithAI(query, context, {
        maxTokens: 1000,
        temperature: 0.7,
      })

      logger.info({
        message: 'MCP: AI анализ выполнен',
        query: query.substring(0, 100),
        provider: result.provider,
        success: result.success,
        responseLength: result.text.length,
        tokensUsed: result.tokensUsed,
      })

      const statusEmoji = result.success ? '✅' : '❌'
      const providerInfo = result.provider !== 'none' ? `\n📡 Провайдер: ${result.provider}` : ''
      const tokensInfo = result.tokensUsed ? `\n🔢 Токенов использовано: ${result.tokensUsed}` : ''

      return {
        content: [
          {
            type: 'text',
            text: `🤖 AI Анализ ${statusEmoji}${providerInfo}${tokensInfo}\n\n${result.text}`,
          },
        ],
      }
    } catch (error) {
      logger.error({
        message: 'MCP: Критическая ошибка AI анализа',
        query,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка AI анализа: ${error instanceof Error ? error.message : 'Unknown error'}\n\nПопробуйте позже или обратитесь к администратору.`,
          },
        ],
      }
    }
  }

  /**
   * Запуск MCP-сервера
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)

    logger.info('🚀 MCP Server запущен и готов к работе')
    logger.info({
      message: 'MCP Server конфигурация',
      planConfig: this.planConfig,
    })
  }
}

// Экспорт для использования в других частях приложения
export const mcpServer = new MCPServer()

// Автозапуск, если файл запущен напрямую
if (require.main === module) {
  mcpServer.start().catch((error) => {
    logger.error('Ошибка запуска MCP Server:', error)
    process.exit(1)
  })
}