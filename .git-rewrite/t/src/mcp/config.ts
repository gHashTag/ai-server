import dotenv from 'dotenv'
import path from 'path'

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), '.env') })

/**
 * Конфигурация для MCP сервера
 * Минимальная конфигурация, необходимая для работы
 */
export const mcpConfig = {
  // Основные настройки
  nodeEnv: process.env.NODE_ENV || 'development',

  // Настройки логирования
  logLevel: process.env.LOG_LEVEL || 'info',

  // Настройки для интеграции с основным сервером
  serverUrl: process.env.SERVER_URL || 'http://localhost:4000',

  // Настройки MCP
  mcpServerName: 'ai-server-mcp',
  mcpServerVersion: '1.0.0',

  // Настройки по умолчанию для инструментов
  defaultBotName: 'mcp-server',
  defaultLanguage: true, // is_ru
  defaultNumImages: 1,
}

/**
 * Проверяет, что все необходимые переменные окружения установлены
 */
export function validateMcpConfig(): void {
  const requiredVars = []

  // Пока что не требуем обязательных переменных для MCP сервера
  // В будущем можно добавить проверки

  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    )
  }
}
