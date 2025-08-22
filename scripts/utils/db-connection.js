/**
 * Безопасное подключение к базе данных
 * Использует только переменные окружения
 */

const { Pool } = require('pg')

function createDatabaseConnection() {
  const connectionString = process.env.SUPABASE_URL
  
  if (!connectionString) {
    console.error('❌ Database connection string is required')
    console.error('Please set SUPABASE_URL in your .env file')
    console.error('Example: SUPABASE_URL=postgresql://user:password@host:port/database')
    process.exit(1)
  }

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 20,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  })
}

function validateConnection(pool) {
  return pool.query('SELECT NOW()').then(() => {
    console.log('✅ Database connection successful')
  }).catch(error => {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  })
}

module.exports = {
  createDatabaseConnection,
  validateConnection
}