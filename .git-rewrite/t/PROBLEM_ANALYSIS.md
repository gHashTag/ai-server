# 🔍 АНАЛИЗ ПРОБЛЕМЫ: Функция недоступна в Production

## 🚨 **Обнаруженная проблема:**

В production Inngest Dashboard видна функция **"Instagram Scraper V2 (Real API + Zod)"** с событием `instagram/scrape-similar-users`, НО в нашем коде есть **НЕСООТВЕТСТВИЕ**:

### 📊 **Что есть в коде:**

1. **✅ Функция `instagramScraperV2`** (строка 1189 в `instagramScraper-v2.ts`):
   - **Обрабатывает событие:** `instagram/scraper-v2`
   - **Статус:** Экспортирована, работает локально

2. **⚠️ Helper функция `triggerInstagramScrapingV2`** (строка 1620):
   - **Отправляет событие:** `instagram/scrape-similar-users` 
   - **Проблема:** НЕТ функции, которая это событие обрабатывает!

### 🔥 **В чем проблема:**

```typescript
// В коде есть ЭТА функция (работает):
export const instagramScraperV2 = inngest.createFunction(
  { id: 'instagram-scraper-v2', name: '🤖 Instagram Scraper V2 (Real API + Zod)' },
  { event: 'instagram/scraper-v2' },  // ← ОБРАБАТЫВАЕТ ЭТО событие
  async ({ event, step }) => { /* ... */ }
)

// Но есть helper, который отправляет ДРУГОЕ событие:
export async function triggerInstagramScrapingV2(data) {
  const result = await inngest.send({
    name: 'instagram/scrape-similar-users',  // ← ОТПРАВЛЯЕТ ЭТО событие
    data: validatedData,
  })
}

// ПРОБЛЕМА: НЕТ функции, которая обрабатывает 'instagram/scrape-similar-users'!
```

### 🎯 **Production vs Local:**

- **Local Dev Server:** Показывает функции из `src/inngest-functions/index.ts`
- **Production Server:** Показывает **другой набор** функций (возможно из старой версии кода)

## 🔧 **РЕШЕНИЕ:**

### ✅ **Вариант 1: Использовать существующее событие**

Для Telegram бота использовать событие `instagram/scraper-v2`:

```javascript
// В Telegram боте использовать ЭТО событие:
await fetch('http://localhost:8288/e/telegram-key', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'instagram/scraper-v2',  // ← Это работает!
    data: {
      username_or_id: 'vyacheslav_nekludov',
      project_id: 37,
      max_users: 10,
      scrape_reels: true,
      requester_telegram_id: '144022504'
    }
  })
});
```

### ✅ **Вариант 2: Создать недостающую функцию**

Добавить функцию, которая обрабатывает `instagram/scrape-similar-users`:

```typescript
// Добавить в instagramScraper-v2.ts:
export const instagramScrapeUsersFunction = inngest.createFunction(
  { 
    id: 'instagram-scrape-users',
    name: '🔍 Instagram Scrape Similar Users' 
  },
  { event: 'instagram/scrape-similar-users' },  // ← Обрабатывает это событие
  async ({ event, step }) => {
    // Переиспользуем логику из instagramScraperV2
    return await instagramScraperV2.handler({ event, step });
  }
)
```

### ✅ **Вариант 3: Проверить production код**

Возможно в production версии функция называется по-другому или есть алиас.

## 🚀 **БЫСТРОЕ ИСПРАВЛЕНИЕ:**

Обновить документацию и тесты для использования **правильного события**:

```javascript
// ИСПОЛЬЗОВАТЬ ЭТО в Telegram боте:
const eventData = {
  name: 'instagram/scraper-v2',  // ← НЕ scrape-similar-users!
  data: {
    username_or_id: 'vyacheslav_nekludov',
    project_id: 37,
    max_users: 10,
    scrape_reels: true,
    requester_telegram_id: '144022504'
  }
};
```

## 📋 **Что нужно проверить:**

1. ✅ Функция `instagramScraperV2` экспортирована в `index.ts`
2. ✅ Событие `instagram/scraper-v2` работает локально  
3. ❌ В production код может отличаться от local версии
4. ❌ Нет обработчика для `instagram/scrape-similar-users`

---

**🎯 ВЫВОД:** Используйте событие `instagram/scraper-v2` вместо `instagram/scrape-similar-users` в Telegram боте! 