#!/usr/bin/env node

/**
 * Development script to run both AI Server and Inngest Dev Server together
 * This replaces the need for PM2 in development mode
 */

const { spawn } = require('child_process')
const path = require('path')

console.log('🚀 Starting AI Server development environment...')
console.log('📊 This will start:')
console.log('   - AI Server on http://localhost:4000') 
console.log('   - Inngest Dev Server on http://localhost:8289')
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
      PORT: '4000'
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

  // Handle process termination
  const cleanup = () => {
    console.log('\n🛑 Shutting down servers...')
    server.kill('SIGTERM')
    inngest.kill('SIGTERM')
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  server.on('close', (code) => {
    console.log(`[SERVER] Process exited with code ${code}`)
    inngest.kill('SIGTERM')
  })

  inngest.on('close', (code) => {
    console.log(`[INNGEST] Process exited with code ${code}`)
    server.kill('SIGTERM')
  })
})