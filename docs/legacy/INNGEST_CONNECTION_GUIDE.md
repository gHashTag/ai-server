# 🔥 Inngest Connection Guide - Подключение к нашему серверу

## 📋 Способы подключения к Inngest серверу

Есть **3 основных способа** подключиться к нашему Inngest серверу из Telegram бота:

---

## 🔧 Способ 1: Подключение к Dev Server (Разработка)

### 📍 **Для локальной разработки**

**Наш сервер:** `http://localhost:8288` (Inngest Dev Server)

### 🎯 **В Telegram боте:**

```javascript
const { Inngest } = require('inngest')

// Принудительное подключение к Dev Server
const inngest = new Inngest({
  id: 'telegram-bot-client',
  // Принудительно указываем наш dev server
  baseUrl: 'http://localhost:8288', // URL нашего сервера
  isDev: true, // Включаем dev mode
})

// Или через переменные окружения
process.env.INNGEST_DEV = 'http://localhost:8288' // Наш dev server
process.env.INNGEST_BASE_URL = 'http://localhost:8288'

// Отправка события
await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov',
    project_id: 37,
    max_users: 5,
    scrape_reels: true,
    requester_telegram_id: '144022504',
  },
})
```

### 📁 **.env файл в Telegram боте:**

```bash
# Подключение к нашему Dev Server
INNGEST_DEV=http://localhost:8288
INNGEST_BASE_URL=http://localhost:8288

# Event key НЕ нужен в dev mode
```

### ⚠️ **Ограничения:**

- Работает только локально
- Не подходит для production
- Оба сервера должны работать на одной машине

---

## 🌐 Способ 2: HTTP API (Universal)

### 🎯 **Прямая отправка через HTTP**

**Самый простой способ!** Не нужен SDK, работает из любого места.

```javascript
// В Telegram боте
async function sendInstagramEvent(userData) {
  const eventData = {
    name: 'instagram/scraper-v2',
    data: {
      username_or_id: userData.targetUsername,
      project_id: userData.projectId,
      max_users: userData.maxCompetitors || 10,
      scrape_reels: userData.includeReels || false,
      requester_telegram_id: userData.telegramId,
    },
  }

  try {
    const response = await fetch('http://localhost:8288/e/dummy-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    })

    const result = await response.json()
    console.log('Event sent:', result.ids[0])
    return result.ids[0]
  } catch (error) {
    console.error('Failed to send event:', error)
    throw error
  }
}

// Использование
const eventId = await sendInstagramEvent({
  targetUsername: 'vyacheslav_nekludov',
  projectId: 37,
  maxCompetitors: 5,
  includeReels: true,
  telegramId: '144022504',
})
```

### 🎯 **Для production (если будет нужно):**

```javascript
// Production HTTP API
const response = await fetch('https://inn.gs/e/YOUR_EVENT_KEY', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(eventData),
})
```

---

## ⚡ Способ 3: Общий Production Account

### 📍 **Если оба проекта в production**

Оба сервера используют **один Inngest аккаунт** в облаке.

### 🎯 **В Telegram боте (.env):**

```bash
# Production Inngest Cloud
INNGEST_EVENT_KEY=your-production-event-key
INNGEST_SIGNING_KEY=your-signing-key  # Если нужен
```

### 🎯 **Код в Telegram боте:**

```javascript
const { Inngest } = require('inngest')

const inngest = new Inngest({
  id: 'telegram-bot-production',
  eventKey: process.env.INNGEST_EVENT_KEY, // Ключ из Inngest Dashboard
})

await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    /* ... */
  },
})
```

---

## 🚀 Рекомендуемый подход для разработки

### 📁 **В Telegram боте создайте файл: `inngest-client.js`**

```javascript
const { Inngest } = require('inngest')

// Определяем окружение
const isDevelopment = process.env.NODE_ENV === 'development'

let inngestConfig

if (isDevelopment) {
  // Development: подключение к вашему dev server
  inngestConfig = {
    id: 'telegram-bot-dev',
    baseUrl: process.env.INNGEST_BASE_URL || 'http://localhost:8288',
    isDev: true,
  }
} else {
  // Production: подключение к Inngest Cloud
  inngestConfig = {
    id: 'telegram-bot-prod',
    eventKey: process.env.INNGEST_EVENT_KEY,
  }
}

const inngest = new Inngest(inngestConfig)

// Функция отправки Instagram события
async function sendInstagramAnalysisEvent(userData) {
  try {
    const result = await inngest.send({
      name: 'instagram/scraper-v2',
      data: {
        username_or_id: userData.targetUsername,
        project_id: userData.projectId,
        max_users: userData.maxCompetitors || 10,
        max_reels_per_user: userData.maxReelsPerUser || 5,
        scrape_reels: userData.includeReels || false,
        requester_telegram_id: userData.telegramUserId,
      },
    })

    return {
      success: true,
      eventId: result.ids[0],
      message: 'Event sent successfully',
    }
  } catch (error) {
    console.error('Failed to send Instagram analysis event:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

module.exports = {
  inngest,
  sendInstagramAnalysisEvent,
}
```

### 📁 **Переменные окружения (.env):**

```bash
# Development
NODE_ENV=development
INNGEST_BASE_URL=http://localhost:8288

# Production (когда нужно)
# NODE_ENV=production
# INNGEST_EVENT_KEY=your-production-key
```

### 📁 **Использование в Telegram боте:**

```javascript
const { sendInstagramAnalysisEvent } = require('./inngest-client')

// В обработчике команды бота
bot.command('analyze', async ctx => {
  const userData = {
    targetUsername: 'vyacheslav_nekludov',
    projectId: 37,
    maxCompetitors: 5,
    includeReels: true,
    telegramUserId: ctx.from.id.toString(),
  }

  const result = await sendInstagramAnalysisEvent(userData)

  if (result.success) {
    await ctx.reply(
      `🚀 Анализ запущен!\n` +
        `📋 Event ID: ${result.eventId}\n` +
        `⏳ Результаты через 3-5 минут`
    )
  } else {
    await ctx.reply(`❌ Ошибка: ${result.error}`)
  }
})
```

---

## 🔍 Проверка подключения

### 📋 **Тест подключения к Dev Server:**

```javascript
// test-connection.js
const { inngest } = require('./inngest-client')

async function testConnection() {
  try {
    console.log('🧪 Тестируем подключение к Inngest...')

    const result = await inngest.send({
      name: 'test/connection',
      data: {
        message: 'Hello from Telegram bot!',
        timestamp: new Date().toISOString(),
      },
    })

    console.log('✅ Подключение успешно!')
    console.log('📋 Event ID:', result.ids[0])
  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message)

    if (error.message.includes('ECONNREFUSED')) {
      console.log(
        '💡 Убедитесь, что Inngest Dev Server запущен на localhost:8288'
      )
    }
  }
}

testConnection()
```

---

## 📊 Мониторинг результатов

### 📋 **Проверка статуса выполнения:**

```javascript
// Через 5 минут после отправки события
setTimeout(async () => {
  // Проверяем результаты в базе данных
  const results = await checkInstagramResults(
    userData.targetUsername,
    userData.projectId
  )

  if (results.success && results.competitors.length > 0) {
    await ctx.reply(`✅ Найдено ${results.competitors.length} конкурентов!`)
    // Отправить архив с отчётами
  } else {
    await ctx.reply('⏳ Анализ ещё выполняется...')
  }
}, 5 * 60 * 1000)
```

---

## ⚙️ Настройка нашего сервера

### 📋 **Убедиться, что Dev Server запущен:**

```bash
# На нашем сервере
cd /Users/playra/ai-server
npx inngest-cli@latest dev --port 8288

# Или если уже запущен
pm2 status inngest
```

### 📋 **Проверить доступность:**

```bash
# Проверить, что сервер отвечает
curl http://localhost:8288

# Проверить endpoint для событий
curl -X POST http://localhost:8288/e/dummy-key \
  -H 'Content-Type: application/json' \
  -d '{"name": "test", "data": {"test": true}}'
```

---

## 🎯 Краткая сводка для Telegram бота

### ✅ **Что нужно сделать:**

1. **Установить Inngest SDK:** `npm install inngest`

2. **Создать клиент:**

```javascript
const inngest = new Inngest({
  id: 'telegram-bot',
  baseUrl: 'http://localhost:8288', // Адрес нашего сервера
  isDev: true,
})
```

3. **Отправлять события:**

```javascript
await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    /* параметры анализа */
  },
})
```

4. **Получать результаты:** Через базу данных или архивы в папке `./output`

### 🔥 **Готово!** Теперь Telegram бот может подключиться к нашему Inngest серверу и запускать анализ Instagram!
