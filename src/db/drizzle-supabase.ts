import { drizzle } from 'drizzle-orm/postgres-js'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { schema } from './schema'

// Загружаем переменные окружения
config()

// Создаем Supabase клиент
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Создаем простой адаптер для Drizzle, который использует Supabase
class SupabaseAdapter {
  async execute(query: string, params?: any[]) {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: query,
      params: params || [],
    })

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`)
    }

    return data
  }

  async select(table: string, where?: string, params?: any[]) {
    let query = `SELECT * FROM ${table}`
    if (where) {
      query += ` WHERE ${where}`
    }

    return this.execute(query, params)
  }

  async insert(table: string, data: Record<string, any>) {
    const columns = Object.keys(data).join(', ')
    const placeholders = Object.keys(data)
      .map((_, i) => `$${i + 1}`)
      .join(', ')
    const values = Object.values(data)

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`
    return this.execute(query, values)
  }

  async update(
    table: string,
    data: Record<string, any>,
    where: string,
    whereParams: any[]
  ) {
    const setClause = Object.keys(data)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ')
    const values = [...Object.values(data), ...whereParams]

    const query = `UPDATE ${table} SET ${setClause} WHERE ${where} RETURNING *`
    return this.execute(query, values)
  }

  async delete(table: string, where: string, params: any[]) {
    const query = `DELETE FROM ${table} WHERE ${where} RETURNING *`
    return this.execute(query, params)
  }
}

// Создаем экземпляр адаптера
export const dbAdapter = new SupabaseAdapter()

// Функция для закрытия соединения (заглушка для совместимости)
export const closeConnection = async () => {
  // Supabase клиент не требует явного закрытия соединения
  return Promise.resolve()
}
