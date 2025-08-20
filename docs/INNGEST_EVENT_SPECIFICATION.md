# 🔥 Instagram Scraper V2 - Inngest Event Specification

## 📋 Общая информация

**Event Name:** `instagram/scraper-v2`  
**Функция:** `🤖 Instagram Scraper V2 (Real API + Zod)`  
**Назначение:** Поиск конкурентов Instagram + анализ рилсов + генерация отчётов

---

## 📊 Структура события

### 🎯 Основное событие

```javascript
const inngest = new Inngest({ id: 'telegram-bot-client' });

const result = await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    // ОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ
    username_or_id: 'target_username',      // Instagram username для анализа
    project_id: 37,                         // ID проекта пользователя
    
    // ОПЦИОНАЛЬНЫЕ ПАРАМЕТРЫ
    max_users: 10,                          // Количество конкурентов (по умолчанию: 50)
    max_reels_per_user: 5,                  // Рилсов на конкурента (по умолчанию: 50)  
    scrape_reels: true,                     // Парсить рилсы (по умолчанию: false)
    requester_telegram_id: '144022504'      // Telegram ID пользователя (по умолчанию: '')
  }
});
```

---

## 🔧 Параметры события

### ✅ Обязательные

| Параметр | Тип | Описание | Пример |
|----------|-----|----------|---------|
| `username_or_id` | `string` | Instagram username (без @) | `"vyacheslav_nekludov"` |
| `project_id` | `number` | ID проекта, положительное число | `37` |

### ⚙️ Опциональные

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `max_users` | `number` | `50` | Максимальное количество конкурентов (1-100) |
| `max_reels_per_user` | `number` | `50` | Максимальное количество рилсов на пользователя (1-200) |
| `scrape_reels` | `boolean` | `false` | Включить анализ рилсов конкурентов |
| `requester_telegram_id` | `string` | `""` | Telegram ID пользователя, сделавшего запрос |

---

## 🚀 Примеры использования

### 📱 Базовый запрос (только конкуренты)

```javascript
await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'target_account',
    project_id: 123
  }
});
```

### 🎬 Полный анализ (конкуренты + рилсы)

```javascript
await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'vyacheslav_nekludov',
    project_id: 37,
    max_users: 10,
    max_reels_per_user: 5,
    scrape_reels: true,
    requester_telegram_id: '144022504'
  }
});
```

### ⚡ Быстрый тест (3 конкурента)

```javascript
await inngest.send({
  name: 'instagram/scraper-v2',
  data: {
    username_or_id: 'test_account',
    project_id: 1,
    max_users: 3,
    scrape_reels: false
  }
});
```

---

## 📋 Результат выполнения

### ✅ Успешный результат

```javascript
{
  success: true,
  timestamp: "2024-07-22T10:00:00.000Z",
  runId: "01K0RXE67TB8W3P2KJX922N2E3",
  targetUser: "vyacheslav_nekludov",
  projectId: 37,
  usersScraped: 50,
  usersSaved: 10,
  usersSkipped: 2,
  validationErrors: [],
  
  // Информация о рилсах
  reelsEnabled: true,
  reelsScraped: 25,
  reelsDuplicates: 3,
  reelsPerUser: 5,
  reelsResults: [
    {
      username: "competitor1",
      saved: 5,
      duplicatesSkipped: 1,
      totalProcessed: 6
    }
  ],
  
  // 🆕 НОВОЕ: Информация об отчётах  
  reports: {
    generated: true,
    htmlReport: "/path/to/instagram_analysis_vyacheslav_nekludov_1234567890.html",
    excelReport: "/path/to/instagram_data_vyacheslav_nekludov_1234567890.xlsx",
    archivePath: "/path/to/instagram_competitors_vyacheslav_nekludov_1234567890.zip",
    archiveFileName: "instagram_competitors_vyacheslav_nekludov_1234567890.zip",
    error: null
  },
  
  mode: "REAL_API_V2_WITH_NEON_DB_SIMPLIFIED_WITH_REPORTS"
}
```

---

## 📦 Созданные файлы

### 🎯 ZIP Архив содержит:

1. **📊 HTML отчёт** - красивая визуализация с адаптивным дизайном
2. **📈 Excel файл** - 3 листа данных:
   - "Конкуренты" - полная информация об аккаунтах
   - "Рилсы" - метрики рилсов (лайки, просмотры, комментарии)
   - "Аналитика" - общая статистика проекта
3. **📝 README.txt** - инструкция по использованию

### 📁 Пути к файлам:

- **HTML:** `./output/instagram_analysis_{username}_{timestamp}.html`
- **Excel:** `./output/instagram_data_{username}_{timestamp}.xlsx` 
- **ZIP:** `./output/instagram_competitors_{username}_{timestamp}.zip`

---

## 🗄️ Сохраняемые данные

### 📊 Таблица: `instagram_similar_users`

```sql
CREATE TABLE instagram_similar_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_username VARCHAR(255) NOT NULL,        -- Исходный username
  user_pk VARCHAR(255) NOT NULL,               -- Instagram user ID
  username VARCHAR(255) NOT NULL,              -- Найденный конкурент
  full_name VARCHAR(255),                      -- Полное имя
  is_private BOOLEAN DEFAULT false,            -- Приватный аккаунт
  is_verified BOOLEAN DEFAULT false,           -- Верифицированный
  profile_pic_url TEXT,                        -- URL аватара
  profile_url TEXT,                            -- Ссылка на профиль
  profile_chaining_secondary_label VARCHAR(255), -- Категория аккаунта
  social_context VARCHAR(255),                 -- Социальный контекст
  project_id INTEGER,                          -- ID проекта
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(search_username, user_pk)
);
```

### 🎬 Таблица: `instagram_user_reels` (если scrape_reels = true)

```sql  
CREATE TABLE instagram_user_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraped_for_user_pk VARCHAR(255) NOT NULL,   -- Для какого пользователя собрано
  owner_username VARCHAR(255),                 -- Автор рилса
  shortcode VARCHAR(255) NOT NULL,             -- Shortcode рилса
  like_count INTEGER DEFAULT 0,               -- Количество лайков
  comment_count INTEGER DEFAULT 0,            -- Количество комментариев
  play_count INTEGER DEFAULT 0,               -- Количество просмотров
  video_duration DECIMAL DEFAULT 0,           -- Длительность видео
  taken_at_timestamp BIGINT,                  -- Unix timestamp создания
  display_url TEXT,                           -- URL изображения/видео
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shortcode, scraped_for_user_pk)
);
```

---

## ⚠️ Валидация и ошибки

### 🔴 Частые ошибки:

```javascript
// Отсутствует username_or_id
throw new Error('username_or_id is required')

// Неверный project_id  
throw new Error('project_id must be a positive number')

// Неверный формат данных
throw new Error('Event data must be an object')
```

### ✅ Успешная валидация:

```javascript
// Логируется в Inngest:
log.info('✅ Event data parsed successfully:', {
  username_or_id: "vyacheslav_nekludov",
  project_id: 37,
  max_users: 10,
  max_reels_per_user: 5,
  scrape_reels: true,
  requester_telegram_id: "144022504"
})
```

---

## 🧪 Тестирование

### 📋 Тестовый скрипт

```javascript
#!/usr/bin/env node
const { Inngest } = require('inngest');

async function testInstagramScraper() {
  const inngest = new Inngest({ id: 'test-client' });
  
  const result = await inngest.send({
    name: 'instagram/scraper-v2',
    data: {
      username_or_id: 'vyacheslav_nekludov',
      project_id: 37,
      max_users: 3,                     // Быстрый тест
      max_reels_per_user: 5,
      scrape_reels: true,
      requester_telegram_id: '144022504'
    }
  });
  
  console.log('Event ID:', result.ids[0]);
  console.log('Ожидайте результаты через 3-5 минут');
}

testInstagramScraper();
```

---

## 🔗 Интеграция с Telegram Bot

### 📱 Отправка события из бота:

```javascript
// В обработчике команды Telegram бота
async function handleInstagramAnalysis(ctx, userData) {
  const inngest = new Inngest({ id: 'telegram-bot' });
  
  const result = await inngest.send({
    name: 'instagram/scraper-v2',
    data: {
      username_or_id: userData.targetUsername,      // Получено от пользователя
      project_id: userData.projectId,               // ID пользователя в системе  
      max_users: userData.maxCompetitors || 10,     // Выбор пользователя
      max_reels_per_user: 5,
      scrape_reels: userData.includeReels || false, // Checkbox пользователя
      requester_telegram_id: ctx.from.id.toString()// Telegram ID
    }
  });
  
  return result.ids[0]; // Event ID для отслеживания
}
```

### 📦 Получение архива:

```javascript
// Через 3-5 минут получить результат и отправить архив
async function sendReportToUser(ctx, eventId, scrapingData) {
  const reportInfo = await getReportInfo(eventId);
  
  if (reportInfo && reportInfo.generated) {
    await ctx.replyWithDocument({
      source: reportInfo.archivePath,
      filename: reportInfo.archiveFileName
    }, {
      caption: `📦 Анализ конкурентов для @${scrapingData.targetUsername}\n` +
               `📊 HTML отчёт + Excel данные + README инструкция`
    });
  }
}
```

---

## ⏱️ Время выполнения

- **Только конкуренты:** 1-2 минуты
- **Конкуренты + рилсы:** 3-5 минут  
- **С отчётами:** +30-60 секунд

---

## 🔑 Переменные окружения (на сервере)

```bash
# Instagram API
RAPIDAPI_INSTAGRAM_KEY=da6f54ca68mshc06984da37c569bp1743f1jsne4c79beeb969
RAPIDAPI_INSTAGRAM_HOST=real-time-instagram-scraper-api1.p.rapidapi.com

# База данных
NEON_DATABASE_URL=postgresql://...

# Inngest
INNGEST_EVENT_KEY=your-event-key
```

---

## 🎯 Готово к интеграции!

Используйте эту спецификацию для интеграции в Telegram бот. Все примеры кода готовы для копирования и использования! 