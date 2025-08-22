#!/usr/bin/env node

/**
 * Точка входа для MCP сервера
 * Запускает сервер для интеграции с AI-агентами
 */

import { AIServerMCP } from './server.js'

async function main() {
  const server = new AIServerMCP()
  await server.start()
}

main().catch(error => {
  console.error('Failed to start MCP server:', error)
  process.exit(1)
})
