/**
 * Интеграционный тест для Instagram Scraper
 * Полный цикл: Inngest → API → База данных → Валидация
 */

import { spawn, ChildProcess } from 'child_process'
import { Inngest } from 'inngest'
import axios from 'axios'
import { Client } from 'pg'
import { setTimeout as sleep } from 'timers/promises'

// Конфигурация теста
const TEST_CONFIG = {
  username: 'vyacheslav_nekludov', // ИСПРАВЛЕННЫЙ username
  project_id: 38,
  requester_telegram_id: '289259562',
  max_users: 30, // ПОЛНЫЙ ПАРСИНГ: 30 конкурентов
  max_reels_per_user: 5, // ПОЛНЫЙ ПАРСИНГ: 5 рилсов для каждого
  scrape_reels: true, // ВКЛЮЧАЕМ рилсы

  // Inngest конфигурация
  inngest_port: 8288,
  inngest_host: 'localhost',

  // Таймауты (увеличиваем для полного парсинга)
  server_start_timeout: 30000, // 30 секунд на запуск сервера
  parsing_timeout: 600000, // 10 минут на парсинг (увеличено для полного парсинга)
  polling_interval: 10000, // 10 секунд между проверками (увеличено)
}

// Создаем клиент Inngest
const inngest = new Inngest({
  id: 'integration-test-vyacheslav',
  name: 'Integration Test Vyacheslav',
  isDev: true,
  eventKey: process.env.INNGEST_EVENT_KEY || 'test',
})

// Создаем клиент PostgreSQL
const dbClient = new Client({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

interface TestResult {
  success: boolean
  message: string
  data?: any
  error?: any
}

class InngestIntegrationTest {
  private inngestProcess: ChildProcess | null = null
  private eventId: string | null = null
  private startTime = 0

  async runFullTest(): Promise<TestResult> {
    console.log('🚀 Запуск полного интеграционного теста...\n')

    try {
      // Шаг 1: Запуск Inngest сервера
      console.log('📦 Шаг 1: Запуск Inngest Dev Server...')
      await this.startInngestServer()

      // Шаг 2: Подключение к базе данных
      console.log('🗄️ Шаг 2: Подключение к базе данных...')
      await this.connectToDatabase()

      // Шаг 3: Очистка предыдущих данных (опционально)
      console.log('🧹 Шаг 3: Очистка предыдущих данных...')
      await this.cleanupPreviousData()

      // Шаг 4: Отправка события
      console.log('📤 Шаг 4: Отправка события парсинга...')
      await this.sendParsingEvent()

      // Шаг 5: Ожидание завершения
      console.log('⏳ Шаг 5: Ожидание завершения парсинга...')
      await this.waitForCompletion()

      // Шаг 6: Проверка результатов в базе данных
      console.log('✅ Шаг 6: Проверка результатов в базе данных...')
      const dbResults = await this.validateDatabaseResults()

      // Шаг 7: Генерация отчета
      console.log('📊 Шаг 7: Генерация отчета...')
      const report = await this.generateReport(dbResults)

      return {
        success: true,
        message: 'Интеграционный тест выполнен успешно',
        data: report,
      }
    } catch (error) {
      console.error('❌ Ошибка интеграционного теста:', error)
      return {
        success: false,
        message: `Тест провален: ${error.message}`,
        error: error,
      }
    } finally {
      // Очистка ресурсов
      await this.cleanup()
    }
  }

  private async startInngestServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('   🔄 Запуск Inngest сервера...')

      // Запускаем Inngest dev сервер
      this.inngestProcess = spawn('npx', ['inngest-cli', 'dev'], {
        stdio: 'pipe',
        env: { ...process.env, PORT: TEST_CONFIG.inngest_port.toString() },
      })

      let serverReady = false
      const timeout = global.setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Inngest сервер не запустился в течение таймаута'))
        }
      }, TEST_CONFIG.server_start_timeout)

      this.inngestProcess.stdout?.on('data', data => {
        const output = data.toString()
        console.log(`   📋 Inngest: ${output.trim()}`)

        // Проверяем, что сервер запустился
        if (
          output.includes('Inngest dev server running') ||
          output.includes('localhost:8288')
        ) {
          serverReady = true
          global.clearTimeout(timeout)
          resolve()
        }
      })

      this.inngestProcess.stderr?.on('data', data => {
        console.log(`   ⚠️ Inngest stderr: ${data.toString().trim()}`)
      })

      this.inngestProcess.on('error', error => {
        global.clearTimeout(timeout)
        reject(new Error(`Ошибка запуска Inngest: ${error.message}`))
      })
    })
  }

  private async connectToDatabase(): Promise<void> {
    try {
      await dbClient.connect()
      console.log('   ✅ Подключение к базе данных установлено')

      // Тестируем подключение
      const result = await dbClient.query('SELECT NOW()')
      console.log('   🕐 Текущее время БД:', result.rows[0].now)
    } catch (error) {
      throw new Error(`Ошибка подключения к БД: ${error.message}`)
    }
  }

  private async cleanupPreviousData(): Promise<void> {
    try {
      // Удаляем предыдущие данные для этого пользователя и проекта
      const deleteQuery = `
        DELETE FROM instagram_similar_users 
        WHERE search_username = $1 AND project_id = $2
      `
      const result = await dbClient.query(deleteQuery, [
        TEST_CONFIG.username,
        TEST_CONFIG.project_id,
      ])

      console.log(`   🧹 Удалено ${result.rowCount} предыдущих записей`)
    } catch (error) {
      console.log(`   ⚠️ Ошибка очистки данных: ${error.message}`)
    }
  }

  private async sendParsingEvent(): Promise<void> {
    const event = {
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: TEST_CONFIG.username,
        requester_telegram_id: TEST_CONFIG.requester_telegram_id,
        project_id: TEST_CONFIG.project_id,
        max_users: TEST_CONFIG.max_users,
        max_reels_per_user: TEST_CONFIG.max_reels_per_user,
        scrape_reels: TEST_CONFIG.scrape_reels,
        metadata: {
          source: 'integration_test',
          timestamp: new Date().toISOString(),
          test_run: true,
        },
      },
    }

    try {
      const result = await inngest.send(event)
      this.eventId = result.ids[0]
      this.startTime = Date.now()

      console.log('   📤 Событие отправлено:')
      console.log(`      Event ID: ${this.eventId}`)
      console.log(`      Username: ${event.data.username_or_id}`)
      console.log(`      Project ID: ${event.data.project_id}`)
      console.log(`      Max Users: ${event.data.max_users}`)
    } catch (error) {
      throw new Error(`Ошибка отправки события: ${error.message}`)
    }
  }

  private async waitForCompletion(): Promise<void> {
    const startTime = Date.now()
    const maxWaitTime = TEST_CONFIG.parsing_timeout

    console.log(
      `   ⏱️ Ожидание завершения (макс. ${maxWaitTime / 1000} сек)...`
    )

    while (Date.now() - startTime < maxWaitTime) {
      // Проверяем статус через Inngest API
      const status = await this.checkInngestStatus()

      if (status.completed) {
        console.log(
          `   ✅ Парсинг завершен за ${(Date.now() - startTime) / 1000} сек`
        )
        return
      }

      if (status.failed) {
        throw new Error(`Парсинг провален: ${status.error}`)
      }

      console.log(
        `   ⏳ Выполняется... (${Math.floor((Date.now() - startTime) / 1000)}s)`
      )
      await sleep(TEST_CONFIG.polling_interval)
    }

    throw new Error('Таймаут ожидания завершения парсинга')
  }

  private async checkInngestStatus(): Promise<{
    completed: boolean
    failed: boolean
    error?: string
  }> {
    try {
      // Проверяем статус через Inngest dashboard API
      const response = await axios.get(
        `http://${TEST_CONFIG.inngest_host}:${TEST_CONFIG.inngest_port}/api/v1/events/${this.eventId}`,
        { timeout: 5000 }
      )

      const status = response.data?.status || 'unknown'

      return {
        completed: status === 'completed',
        failed: status === 'failed',
        error: response.data?.error,
      }
    } catch (error) {
      // Если API недоступен, проверяем БД
      return await this.checkDatabaseForResults()
    }
  }

  private async checkDatabaseForResults(): Promise<{
    completed: boolean
    failed: boolean
    error?: string
  }> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM instagram_similar_users 
        WHERE search_username = $1 AND project_id = $2
      `
      const result = await dbClient.query(query, [
        TEST_CONFIG.username,
        TEST_CONFIG.project_id,
      ])
      const count = parseInt(result.rows[0].count)

      return {
        completed: count > 0,
        failed: false,
      }
    } catch (error) {
      return {
        completed: false,
        failed: true,
        error: error.message,
      }
    }
  }

  private async validateDatabaseResults(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        search_username,
        project_id,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created
      FROM instagram_similar_users 
      WHERE search_username = $1 AND project_id = $2
      GROUP BY search_username, project_id
    `

    const result = await dbClient.query(query, [
      TEST_CONFIG.username,
      TEST_CONFIG.project_id,
    ])

    if (result.rows.length === 0) {
      throw new Error('Данные не найдены в базе данных')
    }

    const data = result.rows[0]
    console.log('   📊 Результаты в базе данных:')
    console.log(`      Найдено пользователей: ${data.total_users}`)
    console.log(`      Search Username: ${data.search_username}`)
    console.log(`      Project ID: ${data.project_id}`)
    console.log(`      Первое создание: ${data.first_created}`)
    console.log(`      Последнее создание: ${data.last_created}`)

    // Проверяем, что данные корректны
    if (data.project_id !== TEST_CONFIG.project_id) {
      throw new Error(
        `Неверный project_id: ожидался ${TEST_CONFIG.project_id}, получен ${data.project_id}`
      )
    }

    if (data.search_username !== TEST_CONFIG.username) {
      throw new Error(
        `Неверный username: ожидался ${TEST_CONFIG.username}, получен ${data.search_username}`
      )
    }

    if (parseInt(data.total_users) === 0) {
      throw new Error('Пользователи не найдены в базе данных')
    }

    return data
  }

  private async generateReport(dbResults: any): Promise<any> {
    const executionTime = Date.now() - this.startTime

    const report = {
      test_status: 'SUCCESS',
      execution_time_ms: executionTime,
      execution_time_formatted: `${Math.floor(executionTime / 1000)}s ${
        executionTime % 1000
      }ms`,

      // Конфигурация теста
      test_config: TEST_CONFIG,

      // Результаты
      results: {
        event_id: this.eventId,
        users_found: parseInt(dbResults.total_users),
        database_verification: 'PASSED',
        project_id_correct: dbResults.project_id === TEST_CONFIG.project_id,
        username_correct: dbResults.search_username === TEST_CONFIG.username,
      },

      // Времена
      timestamps: {
        test_start: new Date(this.startTime).toISOString(),
        test_end: new Date().toISOString(),
        first_db_record: dbResults.first_created,
        last_db_record: dbResults.last_created,
      },
    }

    console.log('\n📋 ОТЧЕТ О ТЕСТИРОВАНИИ:')
    console.log(JSON.stringify(report, null, 2))

    return report
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Очистка ресурсов...')

    // Закрываем соединение с БД
    try {
      await dbClient.end()
      console.log('   ✅ Соединение с БД закрыто')
    } catch (error) {
      console.log(`   ⚠️ Ошибка закрытия БД: ${error.message}`)
    }

    // Останавливаем Inngest сервер
    if (this.inngestProcess) {
      this.inngestProcess.kill('SIGTERM')
      console.log('   ✅ Inngest сервер остановлен')
    }
  }
}

// Запуск теста
async function main() {
  const test = new InngestIntegrationTest()

  try {
    const result = await test.runFullTest()

    if (result.success) {
      console.log('\n🎉 ИНТЕГРАЦИОННЫЙ ТЕСТ ПРОЙДЕН УСПЕШНО!')
      console.log('✅ Система готова к работе')
      process.exit(0)
    } else {
      console.log('\n❌ ИНТЕГРАЦИОННЫЙ ТЕСТ ПРОВАЛЕН')
      console.log('Причина:', result.message)
      process.exit(1)
    }
  } catch (error) {
    console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error)
    process.exit(1)
  }
}

// Запускаем, если файл вызван напрямую
if (require.main === module) {
  main()
}

export { InngestIntegrationTest, TEST_CONFIG }
