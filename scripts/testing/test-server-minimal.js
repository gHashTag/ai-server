/**
 * Тест запуска сервера с минимальными настройками
 */

// Устанавливаем минимальные переменные окружения
process.env.NODE_ENV = 'development'
process.env.PORT = '4000'
process.env.SUPABASE_URL = 'dummy_url'
process.env.SUPABASE_ANON_KEY = 'dummy_key'
process.env.SUPABASE_SERVICE_KEY = 'dummy_service_key'
process.env.NEON_DATABASE_URL =
  process.env.NEON_DATABASE_URL ||
  'postgresql://user:password@localhost:5432/testdb'

console.log('🚀 Запуск сервера с минимальными настройками...')

try {
  // Импортируем и запускаем приложение
  const { App } = require('./dist/app.js')
  const { routes } = require('./dist/routes/index.js')

  const app = new App(routes)
  const server = app.listen()

  console.log('✅ Сервер запущен на порту 4000')
  console.log(
    '🔗 Можно тестировать: http://localhost:4000/api/competitor-subscriptions'
  )

  // Тестируем основные эндпоинты через 2 секунды
  setTimeout(async () => {
    try {
      const axios = require('axios')

      console.log('\n🧪 Тестирование эндпоинтов...')

      // Тест health check
      try {
        const healthResponse = await axios.get('http://localhost:4000/health')
        console.log(
          '✅ Health check:',
          healthResponse.status,
          healthResponse.data.status
        )
      } catch (error) {
        console.log('❌ Health check failed:', error.message)
      }

      // Тест корневого эндпоинта
      try {
        const rootResponse = await axios.get('http://localhost:4000/')
        console.log(
          '✅ Root endpoint:',
          rootResponse.status,
          rootResponse.data.message
        )
      } catch (error) {
        console.log('❌ Root endpoint failed:', error.message)
      }

      // Тест статистики подписок
      try {
        const statsResponse = await axios.get(
          'http://localhost:4000/api/competitor-subscriptions/stats'
        )
        console.log(
          '✅ Competitor stats:',
          statsResponse.status,
          'Users:',
          statsResponse.data.stats?.total_users
        )
      } catch (error) {
        console.log(
          '❌ Competitor stats failed:',
          error.response?.status,
          error.message
        )
      }

      console.log('\n🎉 Тестирование завершено! Сервер работает!')
    } catch (error) {
      console.error('❌ Ошибка тестирования:', error.message)
    }
  }, 2000)
} catch (error) {
  console.error('❌ Ошибка запуска сервера:', error.message)
  process.exit(1)
}
