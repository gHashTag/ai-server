#!/usr/bin/env node

/**
 * Простой тест для проверки N8N прокси
 */

const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const PORT = 4000

// Middleware
app.use(express.json())

// N8N Proxy
const n8nPort = process.env.N8N_PORT || '5678'
const n8nHost = process.env.N8N_HOST || 'localhost'

console.log(`🔗 Настройка прокси для N8N: http://${n8nHost}:${n8nPort}`)

app.use(
  '/n8n',
  createProxyMiddleware({
    target: `http://${n8nHost}:${n8nPort}`,
    changeOrigin: true,
    pathRewrite: {
      '^/n8n': '', // убираем /n8n из пути при проксировании
    },
    ws: true,
    logLevel: 'info',
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        `📡 N8N Proxy: ${req.method} ${req.url} -> http://${n8nHost}:${n8nPort}${proxyReq.path}`
      )
    },
    onError: (err, req, res) => {
      console.error(`❌ N8N Proxy Error: ${err.message}`)
      res.status(503).json({
        error: 'N8N service unavailable',
        message: 'N8N server is not responding',
        hint: 'Make sure N8N is running on port ' + n8nPort,
        target: `http://${n8nHost}:${n8nPort}`,
      })
    },
  })
)

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'N8N Proxy Test Server',
    timestamp: new Date().toISOString(),
    n8n_target: `http://${n8nHost}:${n8nPort}`,
    proxy_path: '/n8n',
  })
})

// Main endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'N8N Proxy Test Server',
    endpoints: {
      'GET /health': 'Health check',
      'GET /n8n': 'N8N Admin Panel (proxied)',
      'ALL /n8n/*': 'All N8N endpoints (proxied)',
    },
    instructions: [
      '1. Запустите N8N: npm run dev:n8n',
      '2. Откройте http://localhost:4000/n8n',
      '3. Должна открыться админка N8N',
    ],
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`
🧪 N8N Proxy Test Server
========================
🚀 Server running on: http://localhost:${PORT}
🔗 N8N proxy available at: http://localhost:${PORT}/n8n
🎯 N8N target: http://${n8nHost}:${n8nPort}

📋 To test:
1. Start N8N: npm run dev:n8n
2. Open: http://localhost:${PORT}/n8n
3. Should show N8N admin panel

✅ Ready for N8N proxy testing!
========================
`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Proxy test server shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\n🛑 Proxy test server shutting down gracefully...')
  process.exit(0)
})
