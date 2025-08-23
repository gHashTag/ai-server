# 🔧 ИСПРАВЛЕННОЕ РУКОВОДСТВО ПО ИНТЕГРАЦИИ

## 🚨 **ВАЖНОЕ ИСПРАВЛЕНИЕ!**

### ❌ **Проблема была обнаружена:**

В предыдущей документации использовалось **НЕПРАВИЛЬНОЕ** имя события!

### ✅ **ПРАВИЛЬНОЕ имя события для Telegram бота:**

```javascript
// ✅ ПРАВИЛЬНО - используйте ЭТО событие:
const eventData = {
  name: 'instagram/scraper-v2', // ← НЕ 'instagram/scrape-similar-users'!
  data: {
    username_or_id: userData.targetUsername,
    project_id: userData.projectId,
    max_users: userData.maxCompetitors || 10,
    max_reels_per_user: userData.maxReelsPerUser || 5,
    scrape_reels: userData.includeReels || false,
    requester_telegram_id: userData.telegramUserId,
  },
}
```

## 🎯 **ИСПРАВЛЕННАЯ функция для Telegram бота:**

```javascript
async function sendInstagramAnalysisToAIServer(userData) {
  const INNGEST_URL = 'http://localhost:8288/e/telegram-bot-key'

  const eventData = {
    name: 'instagram/scraper-v2', // ✅ ИСПРАВЛЕНО!
    data: {
      username_or_id: userData.targetUsername,
      project_id: userData.projectId,
      max_users: userData.maxCompetitors || 10,
      max_reels_per_user: userData.maxReelsPerUser || 5,
      scrape_reels: userData.includeReels || false,
      requester_telegram_id: userData.telegramUserId,
    },
  }

  try {
    const response = await fetch(INNGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    })

    const result = await response.json()

    if (result.status === 200) {
      return {
        success: true,
        eventId: result.ids[0],
        message: 'Анализ запущен успешно!',
      }
    } else {
      throw new Error(`Inngest error: ${result.error || 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Failed to send Instagram analysis:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}
```

## 🧪 **ИСПРАВЛЕННЫЕ тестовые команды:**

```bash
# ✅ ПРАВИЛЬНЫЙ тест подключения:
curl -X POST "http://localhost:8288/e/test-key" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "instagram/scraper-v2",
    "data": {
      "username_or_id": "vyacheslav_nekludov",
      "project_id": 37,
      "max_users": 5,
      "scrape_reels": true,
      "requester_telegram_id": "144022504"
    }
  }'

# Должен вернуть: {"ids":["EVENT_ID"],"status":200}
```

## 🎯 **Минимальная интеграция (5 минут) - ИСПРАВЛЕНО:**

```javascript
// 1. Добавить эту функцию в Telegram бота
async function analyzeInstagram(username, userId) {
  const response = await fetch('http://localhost:8288/e/bot-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'instagram/scraper-v2', // ✅ ИСПРАВЛЕНО!
      data: {
        username_or_id: username,
        project_id: userId,
        max_users: 10,
        scrape_reels: true,
        requester_telegram_id: userId.toString(),
      },
    }),
  })
  return await response.json()
}

// 2. Добавить команду
bot.command('analyze', async ctx => {
  const result = await analyzeInstagram('vyacheslav_nekludov', ctx.from.id)
  await ctx.reply(`🚀 Анализ запущен! ID: ${result.ids[0]}`)
})
```

## 📊 **Почему это важно:**

### ❌ **Что было неправильно:**

- Использовалось событие `instagram/scrape-similar-users`
- НЕТ функции Inngest, которая обрабатывает это событие
- События отправлялись "в пустоту"

### ✅ **Что теперь правильно:**

- Используется событие `instagram/scraper-v2`
- ЕСТЬ функция `instagramScraperV2`, которая обрабатывает это событие
- События будут успешно обработаны

## 🔍 **Проверка работоспособности:**

```javascript
// Тест в Telegram боте:
const testResult = await fetch('http://localhost:8288/e/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'instagram/scraper-v2', // ✅ ПРАВИЛЬНО!
    data: {
      username_or_id: 'test_user',
      project_id: 37,
      max_users: 3,
      scrape_reels: false,
      requester_telegram_id: ctx.from.id.toString(),
    },
  }),
})

const result = await testResult.json()
console.log('Event sent:', result.ids[0]) // Получим Event ID
```

---

## 🎉 **ИТОГ:**

**🔥 Проблема решена!** Теперь Telegram бот будет использовать **правильное событие** `instagram/scraper-v2`, которое **РЕАЛЬНО обрабатывается** нашим сервером.

### 📋 **Ключевые изменения:**

- ✅ Событие: `instagram/scraper-v2` (вместо `instagram/scrape-similar-users`)
- ✅ Функция-обработчик: `instagramScraperV2` существует и работает
- ✅ Production совместимость: должно работать как локально, так и в production

**🚀 Теперь интеграция будет работать корректно!**
