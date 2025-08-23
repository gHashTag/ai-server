# 🤖 Техническое задание: Интеграция Instagram Scraper V2 в Telegram Bot

## 📋 Обзор

Данная инструкция описывает интеграцию **Instagram Scraper V2** Inngest функции в Telegram бот для поиска конкурентов Instagram пользователей.

## 🏗️ Архитектура интеграции

```
Telegram Bot (Client) → HTTP API → Inngest Function → Database → Results
```

## 🔌 Способы интеграции

### Вариант 1: Прямой вызов Inngest (Рекомендуемый)

```javascript
// Установка Inngest клиента
npm install inngest

// В коде бота
const { Inngest } = require('inngest');

const inngest = new Inngest({
  id: 'telegram-bot-client',
  eventKey: process.env.INNGEST_EVENT_KEY // Если требуется
});

// Функция вызова парсинга
async function startInstagramScraping(userData) {
  try {
    const result = await inngest.send({
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: userData.targetUsername,
        project_id: userData.projectId,
        max_users: userData.maxCompetitors,
        max_reels_per_user: userData.maxReelsPerUser,
        scrape_reels: userData.includeReels,
        requester_telegram_id: userData.telegramUserId
      }
    });

    return {
      success: true,
      eventId: result.ids[0],
      message: 'Парсинг запущен успешно'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
```

### Вариант 2: HTTP API вызов

```javascript
// Вызов через HTTP API вашего сервера
async function triggerInstagramScraping(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/instagram/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`, // Если требуется
      },
      body: JSON.stringify({
        username_or_id: userData.targetUsername,
        project_id: userData.projectId,
        max_users: userData.maxCompetitors,
        max_reels_per_user: userData.maxReelsPerUser,
        scrape_reels: userData.includeReels,
        requester_telegram_id: userData.telegramUserId,
      }),
    })

    const result = await response.json()
    return result
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

## 📊 Параметры функции

### Обязательные параметры

| Параметр         | Тип      | Описание                               | Пример                  |
| ---------------- | -------- | -------------------------------------- | ----------------------- |
| `username_or_id` | `string` | Instagram username или ID пользователя | `"vyacheslav_nekludov"` |
| `project_id`     | `number` | ID проекта в системе                   | `37`                    |

### Опциональные параметры

| Параметр                | Тип       | По умолчанию | Описание                                               |
| ----------------------- | --------- | ------------ | ------------------------------------------------------ |
| `max_users`             | `number`  | `50`         | Максимальное количество конкурентов (1-100)            |
| `max_reels_per_user`    | `number`  | `50`         | Максимальное количество рилсов на пользователя (1-200) |
| `scrape_reels`          | `boolean` | `false`      | Включить парсинг рилсов конкурентов                    |
| `requester_telegram_id` | `string`  | `""`         | Telegram ID пользователя, сделавшего запрос            |

## 🎛️ Сбор данных от пользователя в боте

### Базовый сценарий

```javascript
// Пример сбора данных через Telegram bot
async function handleInstagramScrapeCommand(ctx) {
  const chatId = ctx.chat.id
  const userId = ctx.from.id.toString()

  // Шаг 1: Запрос Instagram username
  await ctx.reply(
    '🔍 Введите Instagram username для поиска конкурентов:\n' +
      'Пример: vyacheslav_nekludov'
  )

  // Сохраняем состояние пользователя
  userSessions[userId] = {
    step: 'waiting_username',
    projectId: getUserProjectId(userId), // Получить project_id пользователя
  }
}

async function handleUserInput(ctx) {
  const userId = ctx.from.id.toString()
  const session = userSessions[userId]

  if (session?.step === 'waiting_username') {
    const username = ctx.message.text.trim().replace('@', '')

    // Валидация Instagram username
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
      return ctx.reply('❌ Неверный формат Instagram username')
    }

    // Шаг 2: Запрос количества конкурентов
    session.targetUsername = username
    session.step = 'waiting_count'

    await ctx.reply(
      `✅ Username: @${username}\n\n` +
        '📊 Сколько конкурентов найти? (1-50)\n' +
        'Рекомендуем: 10-20 для быстрого результата'
    )
  } else if (session?.step === 'waiting_count') {
    const count = parseInt(ctx.message.text)

    if (isNaN(count) || count < 1 || count > 50) {
      return ctx.reply('❌ Введите число от 1 до 50')
    }

    session.maxCompetitors = count
    session.step = 'waiting_reels'

    await ctx.reply(
      `✅ Количество конкурентов: ${count}\n\n` +
        '🎬 Анализировать рилсы конкурентов?\n' +
        'Выберите опцию:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Да, с рилсами', callback_data: 'reels_yes' }],
            [
              {
                text: '⚡ Нет, только пользователи',
                callback_data: 'reels_no',
              },
            ],
          ],
        },
      }
    )
  }
}

async function handleCallback(ctx) {
  const userId = ctx.from.id.toString()
  const session = userSessions[userId]

  if (
    ctx.callbackQuery?.data === 'reels_yes' ||
    ctx.callbackQuery?.data === 'reels_no'
  ) {
    session.includeReels = ctx.callbackQuery.data === 'reels_yes'
    session.maxReelsPerUser = session.includeReels ? 5 : 0

    // Запуск парсинга
    await startScrapingProcess(ctx, session)
  }
}
```

### Расширенный сценарий с настройками

```javascript
// Более детальный сбор настроек
async function collectAdvancedSettings(ctx, session) {
  await ctx.reply(
    '⚙️ Дополнительные настройки:\n\n' +
      `🎯 Instagram: @${session.targetUsername}\n` +
      `👥 Конкурентов: ${session.maxCompetitors}\n` +
      `🎬 Рилсы: ${session.includeReels ? 'Да' : 'Нет'}\n\n` +
      'Настроить детально?',
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Запустить сейчас', callback_data: 'start_now' }],
          [{ text: '⚙️ Настроить рилсы', callback_data: 'config_reels' }],
          [{ text: '🔄 Начать заново', callback_data: 'restart' }],
        ],
      },
    }
  )
}
```

## 🚀 Запуск парсинга

```javascript
async function startScrapingProcess(ctx, session) {
  const loadingMessage = await ctx.reply(
    '🔄 Запускаем поиск Instagram конкурентов...\n' +
      '⏳ Это может занять 3-7 минут\n\n' +
      '📋 В процессе создаются:\n' +
      '• 📊 Красивый HTML отчёт\n' +
      '• 📈 Excel файл с данными\n' +
      '• 📦 ZIP архив для скачивания'
  )

  try {
    // Собираем данные для запроса
    const scrapingData = {
      targetUsername: session.targetUsername,
      projectId: session.projectId,
      maxCompetitors: session.maxCompetitors,
      maxReelsPerUser: session.maxReelsPerUser || 5,
      includeReels: session.includeReels || false,
      telegramUserId: ctx.from.id.toString(),
    }

    // Вызываем функцию парсинга
    const result = await startInstagramScraping(scrapingData)

    if (result.success) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        `✅ Парсинг запущен успешно!\n\n` +
          `📊 Event ID: ${result.eventId}\n` +
          `⏳ Ожидайте результаты через 3-5 минут\n\n` +
          `📝 Параметры:\n` +
          `• Instagram: @${scrapingData.targetUsername}\n` +
          `• Конкурентов: ${scrapingData.maxCompetitors}\n` +
          `• Рилсы: ${scrapingData.includeReels ? 'Да' : 'Нет'}`
      )

      // Запланировать проверку результатов
      setTimeout(() => {
        checkScrapingResults(ctx, result.eventId, scrapingData)
      }, 180000) // 3 минуты
    } else {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMessage.message_id,
        undefined,
        `❌ Ошибка запуска парсинга:\n${result.error}`
      )
    }
  } catch (error) {
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      undefined,
      `❌ Критическая ошибка: ${error.message}`
    )
  }

  // Очищаем сессию
  delete userSessions[ctx.from.id.toString()]
}
```

## 📊 Получение результатов

### Опрос базы данных

```javascript
// Подключение к PostgreSQL базе данных
const { Pool } = require('pg')

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function getScrapingResults(username, projectId) {
  try {
    const query = `
      SELECT 
        username,
        full_name,
        is_verified,
        is_private,
        profile_url,
        profile_chaining_secondary_label,
        social_context,
        created_at
      FROM instagram_similar_users 
      WHERE search_username = $1 AND project_id = $2
      ORDER BY created_at DESC
    `

    const result = await dbPool.query(query, [username, projectId])

    return {
      success: true,
      competitors: result.rows,
      total: result.rows.length,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

async function checkScrapingResults(ctx, eventId, scrapingData) {
  const results = await getScrapingResults(
    scrapingData.targetUsername,
    scrapingData.projectId
  )

  if (results.success && results.total > 0) {
    await sendResultsToUser(ctx, results.competitors, scrapingData)
  } else {
    await ctx.reply(
      `⏳ Парсинг ещё в процессе...\n` +
        `Event ID: ${eventId}\n` +
        `Попробуем проверить снова через 2 минуты`
    )

    // Повторная проверка через 2 минуты
    setTimeout(() => {
      checkScrapingResults(ctx, eventId, scrapingData)
    }, 120000)
  }
}
```

### Отправка результатов пользователю

```javascript
async function sendResultsToUser(
  ctx,
  competitors,
  scrapingData,
  reportInfo = null
) {
  const totalCompetitors = competitors.length
  const verifiedCount = competitors.filter(c => c.is_verified).length

  // Основное сообщение с результатами
  let message = `🎉 Поиск Instagram конкурентов завершён!\n\n`
  message += `📊 Найдено конкурентов: ${totalCompetitors}\n`
  message += `✅ Верифицированных: ${verifiedCount}\n`
  message += `🎯 Для: @${scrapingData.targetUsername}\n\n`

  // Информация о созданных отчётах
  if (reportInfo && reportInfo.generated) {
    message += `📋 Создан полный отчёт:\n`
    message += `• 📊 HTML отчёт (красивый дизайн)\n`
    message += `• 📈 Excel файл (данные для анализа)\n`
    message += `• 📦 ZIP архив: ${reportInfo.archiveFileName}\n\n`
  }

  // Топ-5 конкурентов
  message += `🏆 Топ-${Math.min(5, totalCompetitors)} конкурентов:\n\n`

  competitors.slice(0, 5).forEach((competitor, index) => {
    const verified = competitor.is_verified ? '✅' : ''
    const private_label = competitor.is_private ? '🔒' : '🔓'
    const category = competitor.profile_chaining_secondary_label || 'General'

    message += `${index + 1}. @${competitor.username} ${verified}\n`
    message += `   ${competitor.full_name || 'No name'} ${private_label}\n`
    message += `   📂 ${category}\n`
    if (competitor.social_context) {
      message += `   💬 ${competitor.social_context}\n`
    }
    message += `   🔗 ${competitor.profile_url}\n\n`
  })

  await ctx.reply(message)

  // Кнопки для дополнительных действий
  const buttons = [
    [
      {
        text: '📋 Показать всех',
        callback_data: `show_all_${scrapingData.targetUsername}`,
      },
    ],
    [
      {
        text: '🎬 Анализ рилсов',
        callback_data: `analyze_reels_${scrapingData.targetUsername}`,
      },
    ],
  ]

  // Если есть отчёты - добавляем кнопку скачивания
  if (reportInfo && reportInfo.generated) {
    buttons.push([
      {
        text: '📦 Скачать архив',
        callback_data: `download_archive_${scrapingData.targetUsername}`,
      },
    ])
  }

  buttons.push([{ text: '🔍 Новый поиск', callback_data: 'new_search' }])

  await ctx.reply('Что делать дальше?', {
    reply_markup: {
      inline_keyboard: buttons,
    },
  })
}
```

## 📦 Отправка архива клиенту

### Получение результата с архивом

```javascript
async function checkScrapingResults(ctx, eventId, scrapingData) {
  const results = await getScrapingResults(
    scrapingData.targetUsername,
    scrapingData.projectId
  )

  // Получаем информацию об архиве из результата Inngest функции
  const reportInfo = await getReportInfo(eventId) // Получаем через API или из базы

  if (results.success && results.total > 0) {
    await sendResultsToUser(ctx, results.competitors, scrapingData, reportInfo)

    // Если есть архив - предлагаем его скачать
    if (reportInfo && reportInfo.generated) {
      setTimeout(async () => {
        await sendArchiveToUser(ctx, reportInfo, scrapingData)
      }, 2000) // Задержка для лучшего UX
    }
  }
}

async function sendArchiveToUser(ctx, reportInfo, scrapingData) {
  try {
    // Отправляем архив как документ
    await ctx.replyWithDocument(
      {
        source: reportInfo.archivePath, // Путь к ZIP файлу
        filename: reportInfo.archiveFileName,
      },
      {
        caption:
          `📦 Полный отчёт по анализу конкурентов @${scrapingData.targetUsername}\n\n` +
          `📊 В архиве:\n` +
          `• HTML отчёт - откройте в браузере\n` +
          `• Excel файл - для работы с данными\n` +
          `• README - инструкция по использованию\n\n` +
          `💡 Откройте HTML файл для красивого просмотра результатов!`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔍 Новый анализ', callback_data: 'new_search' }],
            [
              {
                text: '🎯 Анализ другого аккаунта',
                callback_data: 'analyze_different',
              },
            ],
          ],
        },
      }
    )

    log.info(`📦 Архив отправлен пользователю: ${reportInfo.archiveFileName}`)
  } catch (error) {
    log.error('❌ Ошибка отправки архива:', error)
    await ctx.reply(
      `❌ Ошибка отправки архива.\n\n` +
        `📝 ID отчёта: ${reportInfo.archiveFileName}\n` +
        `🔧 Обратитесь в поддержку с этим ID`
    )
  }
}
```

### Обработка callback для скачивания

```javascript
// Обработка кнопки "Скачать архив"
bot.on('callback_query', async ctx => {
  const callbackData = ctx.callbackQuery?.data

  if (callbackData?.startsWith('download_archive_')) {
    const username = callbackData.replace('download_archive_', '')

    // Получаем информацию об архиве
    const reportInfo = await getLatestReportByUsername(username, ctx.from.id)

    if (reportInfo && reportInfo.archivePath) {
      await sendArchiveToUser(ctx, reportInfo, { targetUsername: username })
      await ctx.answerCbQuery('📦 Архив отправляется...')
    } else {
      await ctx.answerCbQuery('❌ Архив не найден', { show_alert: true })
    }
  }

  // Другие callback обработчики...
})
```

### Получение информации об отчёте

```javascript
// Функция для получения информации об архиве из результата Inngest
async function getReportInfo(eventId) {
  try {
    // Вариант 1: Через API Inngest (если доступно)
    const inngestApi = `https://api.inngest.com/v1/events/${eventId}/runs`
    // ... запрос к Inngest API

    // Вариант 2: Через базу данных (если сохраняется там)
    const query = `
      SELECT 
        reports_data,
        created_at
      FROM inngest_run_results 
      WHERE event_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `
    const result = await dbPool.query(query, [eventId])

    if (result.rows.length > 0) {
      const reportData = JSON.parse(result.rows[0].reports_data)
      return reportData.reports // Возвращает объект reports из finalResult
    }

    return null
  } catch (error) {
    console.error('Ошибка получения информации об отчёте:', error)
    return null
  }
}

// Получение последнего отчёта по username
async function getLatestReportByUsername(username, telegramUserId) {
  try {
    const query = `
      SELECT 
        archive_path,
        archive_filename,
        html_report_path,
        excel_report_path,
        created_at
      FROM instagram_reports
      WHERE target_username = $1 AND requester_telegram_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `

    const result = await dbPool.query(query, [
      username,
      telegramUserId.toString(),
    ])

    if (result.rows.length > 0) {
      const row = result.rows[0]
      return {
        generated: true,
        archivePath: row.archive_path,
        archiveFileName: row.archive_filename,
        htmlReportPath: row.html_report_path,
        excelReportPath: row.excel_report_path,
      }
    }

    return null
  } catch (error) {
    console.error('Ошибка получения отчёта:', error)
    return null
  }
}
```

### Сохранение информации об отчётах (опционально)

```javascript
// SQL для создания таблицы отчётов (выполнить в базе данных)
const createReportsTable = `
  CREATE TABLE IF NOT EXISTS instagram_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_username VARCHAR(255) NOT NULL,
    project_id INTEGER NOT NULL,
    requester_telegram_id VARCHAR(255) NOT NULL,
    inngest_event_id VARCHAR(255),
    archive_path TEXT,
    archive_filename VARCHAR(255),
    html_report_path TEXT,
    excel_report_path TEXT,
    competitors_count INTEGER DEFAULT 0,
    reels_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Индекс для быстрого поиска
  CREATE INDEX IF NOT EXISTS idx_instagram_reports_user_search 
  ON instagram_reports(target_username, requester_telegram_id, created_at DESC);
`

// Функция для сохранения информации об отчёте
async function saveReportInfo(reportData, scrapingData) {
  try {
    const query = `
      INSERT INTO instagram_reports (
        target_username, project_id, requester_telegram_id,
        archive_path, archive_filename, html_report_path, excel_report_path,
        competitors_count, reels_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `

    const values = [
      scrapingData.targetUsername,
      scrapingData.projectId,
      scrapingData.telegramUserId,
      reportData.archivePath,
      reportData.archiveFileName,
      reportData.htmlReportPath,
      reportData.excelReportPath,
      scrapingData.competitorsCount || 0,
      scrapingData.reelsCount || 0,
    ]

    const result = await dbPool.query(query, values)
    console.log(`✅ Информация об отчёте сохранена: ${result.rows[0].id}`)

    return result.rows[0].id
  } catch (error) {
    console.error('❌ Ошибка сохранения информации об отчёте:', error)
    return null
  }
}
```

## 🔧 Переменные окружения

```bash
# .env файл в проекте Telegram бота

# Inngest (если используется прямой вызов)
INNGEST_EVENT_KEY=your-inngest-event-key

# API сервер (если используется HTTP API)
API_BASE_URL=https://your-api-server.com
API_TOKEN=your-api-token

# База данных для получения результатов
DATABASE_URL=postgresql://user:password@host:port/database

# Telegram Bot
BOT_TOKEN=your-telegram-bot-token
```

## 📈 Обработка ошибок

```javascript
// Типичные ошибки и их обработка
const ERROR_MESSAGES = {
  username_not_found: 'Instagram пользователь не найден',
  api_rate_limit: 'Превышен лимит запросов API. Попробуйте позже',
  invalid_username: 'Неверный формат Instagram username',
  database_error: 'Ошибка сохранения данных',
  network_error: 'Ошибка сети. Проверьте подключение',
}

function handleScrapingError(error, ctx) {
  const userMessage = ERROR_MESSAGES[error.code] || 'Неизвестная ошибка'

  ctx.reply(
    `❌ ${userMessage}\n\n` +
      `🔧 Если проблема повторяется, обратитесь в поддержку\n` +
      `📝 Error ID: ${error.eventId || 'N/A'}`
  )
}
```

## 🧪 Тестирование интеграции

```javascript
// Тестовые данные для проверки
const TEST_DATA = {
  username_or_id: 'vyacheslav_nekludov',
  project_id: 37,
  max_users: 3,
  max_reels_per_user: 5,
  scrape_reels: true,
  requester_telegram_id: 'test_user_123',
}

// Функция для тестирования
async function testIntegration() {
  console.log('🧪 Тестируем интеграцию Instagram Scraper V2...')

  const result = await startInstagramScraping(TEST_DATA)
  console.log('✅ Результат теста:', result)

  if (result.success) {
    console.log(`📊 Event ID: ${result.eventId}`)
    console.log('⏳ Проверьте результаты через 2-3 минуты')
  }
}
```

## 📚 Полезные ссылки

- [Inngest Documentation](https://www.inngest.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Node.js PostgreSQL Guide](https://node-postgres.com/)

---

## 🚀 Готовый пример интеграции

```javascript
// bot.js - Полный пример интеграции
const { Telegraf } = require('telegraf')
const { Inngest } = require('inngest')
const { Pool } = require('pg')

const bot = new Telegraf(process.env.BOT_TOKEN)
const inngest = new Inngest({ id: 'telegram-bot' })
const db = new Pool({ connectionString: process.env.DATABASE_URL })

const userSessions = {}

// Команда для запуска парсинга
bot.command('findcompetitors', async ctx => {
  await handleInstagramScrapeCommand(ctx)
})

// Обработка текстовых сообщений
bot.on('text', async ctx => {
  await handleUserInput(ctx)
})

// Обработка callback кнопок
bot.on('callback_query', async ctx => {
  await handleCallback(ctx)
})

bot.launch()
console.log('🤖 Telegram bot запущен с интеграцией Instagram Scraper V2')
```

## 🎯 Краткая сводка новых возможностей

### ✨ Что нового в Instagram Scraper V2

**🆕 Автоматическая генерация отчётов:**

- 📊 **HTML отчёт** - красивая визуализация с адаптивным дизайном
- 📈 **Excel файл** - данные в удобном табличном формате (3 листа)
- 📦 **ZIP архив** - все файлы + README инструкция

**📋 Структура Excel файла:**

1. **Лист "Конкуренты"** - полная информация по найденным аккаунтам
2. **Лист "Рилсы"** - данные по рилсам (лайки, комментарии, просмотры)
3. **Лист "Аналитика"** - общая статистика и метрики

**🎨 HTML отчёт включает:**

- Интерактивные карточки конкурентов
- Статистические виджеты
- Адаптивный дизайн для мобильных устройств
- Категоризацию аккаунтов

### 🔄 Обновлённый результат функции

Теперь `finalResult` содержит объект `reports`:

```javascript
{
  success: true,
  // ... остальные поля
  reports: {
    generated: true,
    htmlReport: "/path/to/instagram_analysis_username_timestamp.html",
    excelReport: "/path/to/instagram_data_username_timestamp.xlsx",
    archivePath: "/path/to/instagram_competitors_username_timestamp.zip",
    archiveFileName: "instagram_competitors_username_timestamp.zip",
    error: null
  },
  mode: 'REAL_API_V2_WITH_NEON_DB_SIMPLIFIED_WITH_REPORTS'
}
```

### 🚀 Быстрый тест

```bash
# Тест с генерацией отчётов (3 конкурента)
node test-instagram-with-reports.js
```

---

## 📞 Поддержка

Если возникнут вопросы по интеграции или работе с отчётами, обращайтесь за помощью!

---

Этот гайд содержит всё необходимое для интеграции Instagram Scraper V2 функции с **автоматической генерацией красивых отчётов** в ваш Telegram бот!
