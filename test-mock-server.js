#!/usr/bin/env node

/**
 * Mock AI Server for testing N8N NeuroPhoto workflow
 * Simulates the real AI Server API endpoints
 */

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 4000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Mock logger
const log = (message, data = {}) => {
  console.log(`[MOCK-SERVER] ${message}`, data)
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Server Mock',
    timestamp: new Date().toISOString(),
  })
})

// Main endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Mock AI Server for N8N Testing',
    endpoints: {
      'GET /health': 'Health check',
      'POST /api/generate/neuro-photo': 'NeuroPhoto generation (mock)',
    },
  })
})

// Mock NeuroPhoto generation endpoint
app.post('/api/generate/neuro-photo', async (req, res) => {
  const {
    prompt,
    telegram_id,
    model_url,
    username,
    num_images,
    is_ru,
    bot_name,
    gender,
  } = req.body

  log('NeuroPhoto request received:', {
    prompt: prompt?.substring(0, 50) + '...',
    telegram_id,
    model_url,
    username,
    num_images,
    is_ru,
    bot_name,
    gender,
  })

  // Simulate validation
  if (!prompt || !telegram_id || !model_url) {
    log('Validation failed - missing required fields')
    return res.status(400).json({
      success: false,
      error: 'Missing required fields',
      required: ['prompt', 'telegram_id', 'model_url'],
      received: {
        prompt: !!prompt,
        telegram_id: !!telegram_id,
        model_url: !!model_url,
      },
    })
  }

  // Simulate processing delay
  const delay = Math.random() * 2000 + 1000 // 1-3 seconds
  await new Promise(resolve => setTimeout(resolve, delay))

  // Simulate success response
  const job_id = `neuro_photo_${telegram_id}_${Date.now()}`

  log(`Mock processing completed successfully for job: ${job_id}`)

  res.json({
    success: true,
    message: 'NeuroPhoto generation started successfully (MOCK)',
    data: {
      job_id,
      telegram_id,
      prompt: prompt.substring(0, 100),
      model_url,
      num_images: num_images || 1,
      username,
      processing_status: 'STARTED',
      estimated_completion_time: '2-5 minutes',
      mock_note: 'This is a mock response for testing N8N integration',
    },
    api_info: {
      processing_time_ms: Math.round(delay),
      mock_mode: true,
      real_ai_server_status: 'Not running - this is a test mock',
    },
  })
})

// Mock N8N health endpoint
app.get('/api/n8n/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'N8N Integration Mock',
    n8n_status: 'Connected to localhost:5678',
  })
})

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found in Mock AI Server`,
    available_routes: [
      'GET /',
      'GET /health',
      'POST /api/generate/neuro-photo',
      'GET /api/n8n/health',
    ],
  })
})

// Error handler
app.use((error, req, res, next) => {
  log('Error occurred:', error.message)
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    mock_note: 'This error occurred in the mock server',
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`
🎭 Mock AI Server for N8N Testing
=================================
🚀 Server running on: http://localhost:${PORT}
🎯 Purpose: Testing N8N NeuroPhoto workflow
⚡ N8N Admin: http://localhost:5678

📋 Available Endpoints:
   GET  /                           - Server info
   GET  /health                     - Health check  
   POST /api/generate/neuro-photo   - Mock NeuroPhoto API
   GET  /api/n8n/health             - N8N integration status

🧪 Ready for N8N workflow testing!
=================================
`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Mock server shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Mock server shutting down gracefully...')
  process.exit(0)
})
