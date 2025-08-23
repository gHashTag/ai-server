#!/usr/bin/env node

/**
 * Development script to run both AI Server and Inngest Dev Server together
 * This replaces the need for PM2 in development mode
 */

const { spawn } = require('child_process')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

console.log('🚀 Starting AI Server development environment...')
console.log('📊 This will start:')
console.log('   - AI Server on http://localhost:4000') 
console.log('   - Inngest Dev Server on http://localhost:8289')
console.log('   - N8N Workflow Admin on http://localhost:5678')
console.log('='.repeat(50))

// Build first
console.log('🔨 Building project...')
const build = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..')
})

build.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed!')
    process.exit(1)
  }

  console.log('✅ Build completed!')
  console.log('🚀 Starting servers...')
  
  // Start AI Server
  const server = spawn('node', ['dist/server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: '4000',
      N8N_WEBHOOK_URL: 'http://localhost:5678'
    }
  })

  // Start Inngest Dev Server
  const inngest = spawn('npx', [
    'inngest-cli@latest', 
    'dev', 
    '-u', 
    'http://localhost:4000/api/inngest', 
    '--port', 
    '8289', 
    '--log-level', 
    'warn'
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    cwd: path.resolve(__dirname, '..')
  })

  // Start N8N locally with delay
  console.log('⏳ N8N will start in 3 seconds after AI Server is ready...')
  setTimeout(() => {
    console.log('🔧 Starting N8N locally...')
    
    const n8n = spawn('npx', ['n8n', 'start'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: path.resolve(__dirname, '..'),
      env: {
        ...process.env,
        N8N_BASIC_AUTH_ACTIVE: 'true',
        N8N_BASIC_AUTH_USER: process.env.N8N_BASIC_AUTH_USER || 'admin',
        N8N_BASIC_AUTH_PASSWORD: process.env.N8N_ADMIN_PASSWORD || 'admin123',
        N8N_HOST: process.env.N8N_HOST || 'localhost',
        N8N_PORT: '5678',
        N8N_PROTOCOL: process.env.N8N_PROTOCOL || 'http',
        N8N_SECURE_COOKIE: process.env.N8N_SECURE_COOKIE || 'false',
        WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || 'http://localhost:5678',
        GENERIC_TIMEZONE: 'Europe/Moscow',
        N8N_METRICS: 'true',
        N8N_LOG_LEVEL: 'info'
      }
    })

    // Handle N8N output
    n8n.stdout.on('data', (data) => {
      process.stdout.write(`[N8N] ${data}`)
    })
    
    n8n.stderr.on('data', (data) => {
      process.stderr.write(`[N8N] ${data}`)
    })

    n8n.on('close', (code) => {
      console.log(`[N8N] Process exited with code ${code}`)
    })

    // Update cleanup to include n8n
    cleanup = () => {
      console.log('\n🛑 Shutting down servers...')
      server.kill('SIGTERM')
      inngest.kill('SIGTERM')
      n8n.kill('SIGTERM')
      process.exit(0)
    }

    // Update existing handlers to include n8n
    server.removeAllListeners('close')
    inngest.removeAllListeners('close')

    server.on('close', (code) => {
      console.log(`[SERVER] Process exited with code ${code}`)
      if (code !== 0) {
        console.log('[SERVER] Non-zero exit, shutting down other services')
        inngest.kill('SIGTERM')
        n8n.kill('SIGTERM')
      }
    })

    inngest.on('close', (code) => {
      console.log(`[INNGEST] Process exited with code ${code}`)
      if (code !== 0) {
        console.log('[INNGEST] Non-zero exit, shutting down other services')
        server.kill('SIGTERM')
        n8n.kill('SIGTERM')
      }
    })

  }, 3000) // Wait 3 seconds for AI Server to start

  // Handle server output
  server.stdout.on('data', (data) => {
    process.stdout.write(`[SERVER] ${data}`)
  })
  
  server.stderr.on('data', (data) => {
    process.stderr.write(`[SERVER] ${data}`)
  })

  // Handle inngest output
  inngest.stdout.on('data', (data) => {
    process.stdout.write(`[INNGEST] ${data}`)
  })
  
  inngest.stderr.on('data', (data) => {
    process.stderr.write(`[INNGEST] ${data}`)
  })

  // Handle process termination - will be updated when N8N starts
  let cleanup = () => {
    console.log('\n🛑 Shutting down servers...')
    server.kill('SIGTERM')
    inngest.kill('SIGTERM')
    process.exit(0)
  }

  process.on('SIGINT', () => cleanup())
  process.on('SIGTERM', () => cleanup())

  server.on('close', (code) => {
    console.log(`[SERVER] Process exited with code ${code}`)
    if (code !== 0) {
      console.log('[SERVER] Non-zero exit, shutting down other services')
      inngest.kill('SIGTERM')
    }
  })

  inngest.on('close', (code) => {
    console.log(`[INNGEST] Process exited with code ${code}`)
    if (code !== 0) {
      console.log('[INNGEST] Non-zero exit, shutting down other services')
      server.kill('SIGTERM')
    }
  })
})