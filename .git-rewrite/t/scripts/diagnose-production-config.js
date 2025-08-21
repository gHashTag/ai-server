#!/usr/bin/env node

console.log('🔍 Диагностика Production Конфигурации')
console.log('=====================================')

console.log('\n📊 Переменные окружения:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('ORIGIN:', process.env.ORIGIN)
console.log('NGROK_URL:', process.env.NGROK_URL)

// Проверяем, загружается ли конфигурация
try {
  const config = require('../dist/config/index.js')
  console.log('\n✅ Конфигурация загружена успешно')
  console.log('isDev:', config.isDev)
  console.log('API_URL:', config.API_URL)
  console.log(
    'Webhook URL для Replicate:',
    `${config.API_URL}/webhooks/replicate`
  )

  // Проверяем логику выбора API_URL
  console.log('\n🔍 Логика выбора API_URL:')
  console.log('isDev =', config.isDev)
  if (config.isDev) {
    console.log('Используется NGROK_URL:', process.env.NGROK_URL)
  } else {
    console.log('Используется ORIGIN:', process.env.ORIGIN)
  }
} catch (error) {
  console.error('\n❌ Ошибка загрузки конфигурации:', error.message)
}

console.log('\n🔍 Проверка всех env переменных, связанных с URL:')
const urlVars = Object.keys(process.env).filter(
  key =>
    key.includes('URL') || key.includes('ORIGIN') || key.includes('WEBHOOK')
)
urlVars.forEach(key => {
  console.log(`${key}:`, process.env[key])
})

console.log('\n✅ Диагностика завершена!')
