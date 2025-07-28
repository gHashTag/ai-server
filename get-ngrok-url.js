#!/usr/bin/env node

/**
 * 🌐 Утилита для получения актуального ngrok URL
 * Используйте: node get-ngrok-url.js
 */

const axios = require('axios')

async function getNgrokUrl() {
  try {
    console.log('🔍 Получение актуального ngrok URL...')

    const response = await axios.get('http://localhost:4040/api/tunnels')
    const tunnels = response.data.tunnels

    if (!tunnels || tunnels.length === 0) {
      console.error('❌ Ngrok туннели не найдены. Убедитесь что ngrok запущен.')
      process.exit(1)
    }

    const httpsTunnel = tunnels.find(tunnel =>
      tunnel.public_url.startsWith('https://')
    )

    if (!httpsTunnel) {
      console.error('❌ HTTPS туннель не найден.')
      process.exit(1)
    }

    const ngrokUrl = httpsTunnel.public_url
    const morphingEndpoint = `${ngrokUrl}/generate/morph-images`

    console.log('✅ Актуальные URLs:')
    console.log(`   Ngrok URL: ${ngrokUrl}`)
    console.log(`   Морфинг API: ${morphingEndpoint}`)
    console.log('')
    console.log('📋 Для обновления фронт-энда используйте:')
    console.log(`   const API_BASE_URL = "${ngrokUrl}";`)
    console.log('')

    // Тестируем доступность
    try {
      const healthResponse = await axios.get(`${ngrokUrl}/health`, {
        timeout: 5000,
      })
      console.log('🟢 API сервер доступен')
      console.log(`   Health check: ${JSON.stringify(healthResponse.data)}`)
    } catch (error) {
      console.log('🔴 API сервер недоступен')
      console.log(`   Ошибка: ${error.message}`)
    }
  } catch (error) {
    console.error('❌ Ошибка получения ngrok URL:', error.message)
    console.error('   Убедитесь, что ngrok запущен на порту 4000')
    process.exit(1)
  }
}

// Запуск
getNgrokUrl()
