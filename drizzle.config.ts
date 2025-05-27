import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

// Загружаем переменные окружения
config()

export default defineConfig({
  // Схемы базы данных
  schema: './src/db/schema/*',

  // Папка для миграций
  out: './src/db/migrations',

  // Диалект PostgreSQL
  dialect: 'postgresql',

  // Подключение к Supabase
  dbCredentials: {
    url: process.env.SUPABASE_URL_DIRECT || process.env.DATABASE_URL!,
  },

  // Подробный вывод
  verbose: true,

  // Строгий режим
  strict: true,

  // Настройки для Supabase
  schemaFilter: ['public'],

  // Интроспекция существующих таблиц
  introspect: {
    casing: 'snake_case',
  },
})
