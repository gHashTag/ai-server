#!/usr/bin/env node

/**
 * @description Specialized MCP server startup script for Cursor
 * Ensures proper stdio handling and environment loading
 */

// Load environment variables from .env file
require('dotenv').config()

// Set default SERVER_URL if not provided
if (!process.env.SERVER_URL) {
  process.env.SERVER_URL = 'http://localhost:4000'
}

// Ensure we're in the right directory
process.chdir(__dirname + '/..')

// Minimal logging to stderr (Cursor expects clean stdio)
console.error('[MCP] Starting server for Cursor...')

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error('[MCP] Received SIGINT, shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.error('[MCP] Received SIGTERM, shutting down...')
  process.exit(0)
})

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  console.error('[MCP] Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', reason => {
  console.error('[MCP] Unhandled rejection:', reason)
  process.exit(1)
})

// Start the MCP server
try {
  require('../dist/mcp/index.js')
} catch (error) {
  console.error('[MCP] Failed to start server:', error.message)
  process.exit(1)
}
