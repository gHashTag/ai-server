#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { mcpConfig, validateMcpConfig } from './config.js'
import { createNeuroPhoto } from './tools/neurophoto.js'

/**
 * Минимальное логирование для MCP сервера (только в stderr)
 */
const mcpLogger = {
  info: (message: string, data?: any) => {
    console.error(`[MCP] ${message}`)
  },
  error: (message: string, data?: any) => {
    console.error(`[MCP ERROR] ${message}`)
  },
  warn: (message: string, data?: any) => {
    console.error(`[MCP WARN] ${message}`)
  },
  debug: (message: string, data?: any) => {
    // Отключаем debug в продакшене
    if (process.env.NODE_ENV === 'development') {
      console.error(`[MCP DEBUG] ${message}`)
    }
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

    mcpLogger.info('Tools configured: create_neurophoto')
  }

  async start() {
    try {
      const transport = new StdioServerTransport()

      // Обработчики событий для диагностики
      transport.onclose = () => {
        mcpLogger.info('Transport closed')
      }

      transport.onerror = error => {
        mcpLogger.error(`Transport error: ${error}`)
      }

      await this.server.connect(transport)
      mcpLogger.info('MCP Server started successfully')
    } catch (error) {
      mcpLogger.error(
        `Failed to start: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      process.exit(1)
    }
  }
}

// Экспорт для использования в других модулях
export { AIServerMCP }

// Запуск сервера только если это главный модуль
if (require.main === module) {
  const mcpServer = new AIServerMCP()
  mcpServer.start().catch(error => {
    console.error(
      `Critical error: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
    process.exit(1)
  })
}
