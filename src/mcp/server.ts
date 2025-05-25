#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { mcpConfig, validateMcpConfig } from './config.js'
import { createNeuroPhoto } from './tools/neurophoto.js'

/**
 * Простое логирование для MCP сервера
 */
const mcpLogger = {
  info: (message: string, data?: any) => {
    console.log(
      `[MCP INFO] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  },
  error: (message: string, data?: any) => {
    console.error(
      `[MCP ERROR] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  },
  warn: (message: string, data?: any) => {
    console.warn(
      `[MCP WARN] ${message}`,
      data ? JSON.stringify(data, null, 2) : ''
    )
  },
}

/**
 * MCP Server для AI-агентов
 * Предоставляет инструменты для работы с нейросервисами
 */
class AIServerMCP {
  private server: McpServer

  constructor() {
    // Валидируем конфигурацию
    validateMcpConfig()

    this.server = new McpServer({
      name: mcpConfig.mcpServerName,
      version: mcpConfig.mcpServerVersion,
    })

    this.setupTools()
  }

  private setupTools() {
    // Инструмент для создания нейрофото
    this.server.tool(
      'create_neurophoto',
      {
        prompt: z.string().describe('Описание для генерации нейрофото'),
        gender: z.enum(['male', 'female']).describe('Пол для генерации'),
        telegram_id: z.string().describe('Telegram ID пользователя'),
      },
      createNeuroPhoto
    )

    mcpLogger.info('🔧 MCP Tools настроены:', {
      description: 'MCP server tools configured',
      tools: ['create_neurophoto'],
    })
  }

  async start() {
    try {
      const transport = new StdioServerTransport()
      await this.server.connect(transport)

      mcpLogger.info('🚀 MCP Server запущен:', {
        description: 'MCP server started successfully',
        transport: 'stdio',
        server_name: mcpConfig.mcpServerName,
        version: mcpConfig.mcpServerVersion,
      })
    } catch (error) {
      mcpLogger.error('❌ Ошибка запуска MCP Server:', {
        description: 'Failed to start MCP server',
        error: error instanceof Error ? error.message : String(error),
        error_details: error,
      })
      process.exit(1)
    }
  }
}

// Запуск сервера
if (require.main === module) {
  const mcpServer = new AIServerMCP()
  mcpServer.start().catch(error => {
    mcpLogger.error('❌ Критическая ошибка MCP Server:', {
      description: 'Critical MCP server error',
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  })
}

export { AIServerMCP }
