import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from 'dotenv'

// Загружаем переменные окружения
config()

// Создаем клиент PostgreSQL
// Формируем строку подключения из переменных Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let connectionString = process.env.SUPABASE_URL_DIRECT || process.env.DATABASE_URL

// Если нет прямой строки подключения, формируем из Supabase переменных
if (!connectionString && supabaseUrl && supabaseServiceKey) {
  // Извлекаем хост из SUPABASE_URL (например: https://xxx.supabase.co)
  const url = new URL(supabaseUrl)
  const projectRef = url.hostname.split('.')[0]
  
  // Формируем строку подключения для PostgreSQL
  connectionString = `postgresql://postgres:${supabaseServiceKey}@db.${projectRef}.supabase.co:5432/postgres`
}

if (!connectionString) {
  throw new Error('Database connection string is required. Please set SUPABASE_URL_DIRECT, DATABASE_URL, or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
}

// Настройки для Supabase (отключаем prepare для Transaction pool mode)
export const client = postgres(connectionString, {
  prepare: false,
  max: 10, // максимум соединений
  idle_timeout: 20, // таймаут простоя
  connect_timeout: 10, // таймаут подключения
})

// Создаем экземпляр Drizzle
export const db = drizzle(client)

// Функция для закрытия соединения (для тестов и graceful shutdown)
export const closeConnection = async () => {
  await client.end()
}
