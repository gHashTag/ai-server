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

  // Start N8N Docker Container with delay
  console.log('⏳ N8N will start in 3 seconds after AI Server is ready...')
  setTimeout(() => {
    console.log('🔧 Starting N8N container...')
    
    // First, clean up any existing n8n-dev container
    spawn('docker', ['stop', 'n8n-dev'], { stdio: 'ignore' })
    
    const n8n = spawn('docker', [
      'run',
      '--rm',
      '--name', 'n8n-dev',
      '-p', '5678:5678',
      '-v', 'n8n_dev_data:/home/node/.n8n',
      '-e', 'N8N_BASIC_AUTH_ACTIVE=true',
      '-e', 'N8N_BASIC_AUTH_USER=admin',
      '-e', 'N8N_BASIC_AUTH_PASSWORD=admin123',
      '-e', 'N8N_HOST=0.0.0.0',
      '-e', 'N8N_PORT=5678',
      '-e', 'N8N_PROTOCOL=http',
      '-e', 'WEBHOOK_URL=http://localhost:5678',
      '-e', 'GENERIC_TIMEZONE=Europe/Moscow',
      '-e', 'N8N_METRICS=true',
      '-e', 'N8N_LOG_LEVEL=info',
      'docker.n8n.io/n8nio/n8n:latest'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: path.resolve(__dirname, '..')
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
      spawn('docker', ['stop', 'n8n-dev'], { stdio: 'ignore' })
      process.exit(0)
    }

    // Update existing handlers to include n8n
    server.removeAllListeners('close')
    inngest.removeAllListeners('close')

    server.on('close', (code) => {
      console.log(`[SERVER] Process exited with code ${code}`)
      inngest.kill('SIGTERM')
      n8n.kill('SIGTERM')
    })

    inngest.on('close', (code) => {
      console.log(`[INNGEST] Process exited with code ${code}`)
      server.kill('SIGTERM')
      n8n.kill('SIGTERM')
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
    spawn('docker', ['stop', 'n8n-dev'], { stdio: 'ignore' })
    process.exit(0)
  }

  process.on('SIGINT', () => cleanup())
  process.on('SIGTERM', () => cleanup())

  server.on('close', (code) => {
    console.log(`[SERVER] Process exited with code ${code}`)
    inngest.kill('SIGTERM')
  })

  inngest.on('close', (code) => {
    console.log(`[INNGEST] Process exited with code ${code}`)
    server.kill('SIGTERM')
  })
})