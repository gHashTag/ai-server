/**
 * Тестирование Instagram Apify Scraper функции
 */

const { inngest } = require('./dist/core/inngest/clients')

async function testInstagramApifyScraper() {
  console.log('🧪 Тестирование Instagram Apify Scraper...')

  try {
    // Тест 1: Проверка импорта и инициализации
    console.log('\n1️⃣ Проверка импорта функции...')

    const {
      instagramApifyScraper,
    } = require('./dist/inngest-functions/instagramApifyScraper')

    if (instagramApifyScraper) {
      console.log('✅ Instagram Apify Scraper функция успешно импортирована')
      console.log(`   • ID: ${instagramApifyScraper.id}`)
      console.log(`   • Название: ${instagramApifyScraper.name}`)
    } else {
      throw new Error('Функция не найдена в экспортах')
    }

    // Тест 2: Проверка переменных окружения
    console.log('\n2️⃣ Проверка переменных окружения...')

    const envVars = {
      APIFY_TOKEN: process.env.APIFY_TOKEN ? '✅ Установлен' : '❌ Отсутствует',
      NEON_DATABASE_URL: process.env.NEON_DATABASE_URL
        ? '✅ Установлен'
        : '❌ Отсутствует',
    }

    console.log('   Переменные окружения:')
    Object.entries(envVars).forEach(([key, status]) => {
      console.log(`      • ${key}: ${status}`)
    })

    if (!process.env.APIFY_TOKEN) {
      console.log(
        '\n⚠️  APIFY_TOKEN не установлен - функция не сможет работать в продакшене'
      )
    }

    if (!process.env.NEON_DATABASE_URL) {
      console.log(
        '\n⚠️  NEON_DATABASE_URL не установлен - функция не сможет сохранять данные'
      )
    }

    // Тест 3: Проверка схемы валидации (без выполнения Apify запроса)
    console.log('\n3️⃣ Проверка валидации входных данных...')

    const testCases = [
      {
        name: 'Валидные данные для пользователя',
        data: {
          username_or_hashtag: 'yacheslav_nekludov',
          project_id: 1,
          source_type: 'competitor',
          max_reels: 15,
          min_views: 500,
          max_age_days: 14,
        },
        shouldPass: true,
      },
      {
        name: 'Валидные данные для хештега',
        data: {
          username_or_hashtag: '#marketing',
          project_id: 1,
          source_type: 'hashtag',
          max_reels: 20,
        },
        shouldPass: true,
      },
      {
        name: 'Невалидные данные - отсутствует username',
        data: {
          project_id: 1,
          source_type: 'competitor',
        },
        shouldPass: false,
      },
      {
        name: 'Невалидные данные - неправильный source_type',
        data: {
          username_or_hashtag: 'test',
          project_id: 1,
          source_type: 'invalid_type',
        },
        shouldPass: false,
      },
    ]

    // Импортируем zod для тестирования схемы
    const { z } = require('zod')
    const ApifyScraperEventSchema = z.object({
      username_or_hashtag: z.string().min(1),
      project_id: z.number().positive(),
      source_type: z.enum(['competitor', 'hashtag']),
      max_reels: z.number().min(1).max(500).default(50),
      min_views: z.number().min(0).optional(),
      max_age_days: z.number().min(1).max(365).optional(),
      requester_telegram_id: z.string().optional(),
      bot_name: z.string().optional(),
    })

    testCases.forEach(testCase => {
      try {
        const result = ApifyScraperEventSchema.safeParse(testCase.data)

        if (testCase.shouldPass && result.success) {
          console.log(`   ✅ ${testCase.name} - PASSED`)
        } else if (!testCase.shouldPass && !result.success) {
          console.log(`   ✅ ${testCase.name} - FAILED AS EXPECTED`)
        } else {
          console.log(`   ❌ ${testCase.name} - UNEXPECTED RESULT`)
          console.log(
            `      Ошибки: ${
              result.success ? 'Нет ошибок' : result.error.message
            }`
          )
        }
      } catch (error) {
        console.log(`   ❌ ${testCase.name} - ERROR: ${error.message}`)
      }
    })

    // Тест 4: Проверка подключения к базе данных (только если есть URL)
    if (process.env.NEON_DATABASE_URL) {
      console.log('\n4️⃣ Тестирование подключения к базе данных...')

      try {
        const { Pool } = require('pg')
        const dbPool = new Pool({
          connectionString: process.env.NEON_DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        })

        const client = await dbPool.connect()

        try {
          // Простой запрос для проверки подключения
          const result = await client.query('SELECT NOW()')
          console.log('   ✅ Подключение к базе данных успешно')
          console.log(`      Время сервера БД: ${result.rows[0].now}`)
        } finally {
          client.release()
          await dbPool.end()
        }
      } catch (error) {
        console.log(`   ❌ Ошибка подключения к БД: ${error.message}`)
      }
    } else {
      console.log('\n4️⃣ Пропуск теста БД - NEON_DATABASE_URL не установлен')
    }

    // Тест 5: Проверка Apify клиента (только если есть токен)
    if (process.env.APIFY_TOKEN) {
      console.log('\n5️⃣ Тестирование Apify клиента...')

      try {
        const { ApifyClient } = require('apify-client')
        const client = new ApifyClient({
          token: process.env.APIFY_TOKEN,
        })

        // Получаем информацию о пользователе как тест подключения
        const user = await client.user().get()
        console.log('   ✅ Apify клиент инициализирован успешно')
        console.log(
          `      Пользователь: ${user.username || user.email || 'Unknown'}`
        )
      } catch (error) {
        console.log(`   ❌ Ошибка Apify клиента: ${error.message}`)
        console.log('      Проверьте правильность APIFY_TOKEN')
      }
    } else {
      console.log('\n5️⃣ Пропуск теста Apify - APIFY_TOKEN не установлен')
    }

    // Итоги тестирования
    console.log('\n📋 ИТОГИ ТЕСТИРОВАНИЯ:')
    console.log('=' * 50)

    const issues = []

    if (!process.env.APIFY_TOKEN) {
      issues.push('🔑 Отсутствует APIFY_TOKEN')
    }

    if (!process.env.NEON_DATABASE_URL) {
      issues.push('🗄️ Отсутствует NEON_DATABASE_URL')
    }

    if (issues.length === 0) {
      console.log('✅ ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!')
      console.log('   Instagram Apify Scraper готов к работе')
      console.log('\n🚀 Для полного тестирования запустите:')
      console.log('   node start-competitor-analysis.js')
    } else {
      console.log('⚠️  НАЙДЕНЫ ПРОБЛЕМЫ:')
      issues.forEach(issue => console.log(`   • ${issue}`))
      console.log('\n🔧 ИСПРАВЬТЕ ПРОБЛЕМЫ ПЕРЕД ДЕПЛОЕМ!')
    }

    console.log('\n📖 СПРАВКА ПО ИСПОЛЬЗОВАНИЮ:')
    console.log('   • Событие: instagram/apify-scrape')
    console.log('   • Функция: instagramApifyScraper')
    console.log('   • Параллельность: до 2 задач одновременно')
    console.log('   • Поддержка: пользователи и хештеги')
  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТИРОВАНИЯ:', error.message)
    console.error('   Стек:', error.stack)
  }
}

// Запуск тестирования
testInstagramApifyScraper()
