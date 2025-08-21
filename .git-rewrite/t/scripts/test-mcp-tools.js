#!/usr/bin/env node

/**
 * @description Test script to verify MCP server tools
 * Based on best practices from MCP community
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🔍 Testing MCP Server Tools...')

// Start MCP server
const mcpProcess = spawn('node', ['scripts/start-mcp-for-cursor.js'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
})

let output = ''
let errorOutput = ''
let responseCount = 0

mcpProcess.stdout.on('data', data => {
  const response = data.toString().trim()
  if (response) {
    console.log('📥 MCP Response:', response)
    output += response + '\n'
    responseCount++
  }
})

mcpProcess.stderr.on('data', data => {
  errorOutput += data.toString()
  console.log('📋 MCP Log:', data.toString().trim())
})

// Send initialize request first (required by MCP protocol)
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    },
  }

  console.log('📤 Sending initialize request...')
  mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n')
}, 500)

// Send initialized notification
setTimeout(() => {
  const initializedNotification = {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  }

  console.log('📤 Sending initialized notification...')
  mcpProcess.stdin.write(JSON.stringify(initializedNotification) + '\n')
}, 1000)

// Send list tools request
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  }

  console.log('📤 Sending tools/list request...')
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n')
}, 1500)

// Test tool call
setTimeout(() => {
  console.log('📤 Sending tool call request...')
  const toolCallRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'create_neurophoto',
      arguments: {
        prompt:
          'Professional businessman in suit, confident smile, office background',
        gender: 'male',
        telegram_id: '144022504',
      },
    },
  }

  mcpProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n')
}, 2000)

// Clean up after 10 seconds
setTimeout(() => {
  console.log('🛑 Stopping test...')
  mcpProcess.kill('SIGTERM')

  console.log('\n📊 Test Summary:')
  console.log(`Responses received: ${responseCount}`)
  console.log('Error Output:', errorOutput)
  console.log('Standard Output:', output)

  if (responseCount === 0) {
    console.log(
      '❌ No responses received - MCP server may not be working correctly'
    )
    process.exit(1)
  } else {
    console.log('✅ MCP server responded to requests')
    process.exit(0)
  }
}, 10000)

mcpProcess.on('error', error => {
  console.error('❌ Process error:', error.message)
  process.exit(1)
})

mcpProcess.on('exit', (code, signal) => {
  console.log(`🔚 MCP process exited with code ${code}, signal ${signal}`)
})
