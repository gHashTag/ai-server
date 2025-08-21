#!/usr/bin/env node

/**
 * @description Wrapper script to start main server with environment variables
 */

const { spawn } = require('child_process')
const path = require('path')

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

console.log('[SERVER] Starting AI server with environment variables...')
console.log('[SERVER] NODE_ENV:', process.env.NODE_ENV)
console.log('[SERVER] PORT:', process.env.PORT)

// Start the main server
const serverProcess = spawn('node', ['dist/server.js'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  env: process.env,
})

serverProcess.on('error', error => {
  console.error('[SERVER ERROR] Failed to start server:', error.message)
  process.exit(1)
})

serverProcess.on('exit', (code, signal) => {
  console.log(`[SERVER] Process exited with code ${code}, signal ${signal}`)
  process.exit(code)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] Received SIGTERM, shutting down gracefully...')
  serverProcess.kill('SIGTERM')
})

process.on('SIGINT', () => {
  console.log('[SERVER] Received SIGINT, shutting down gracefully...')
  serverProcess.kill('SIGINT')
})
