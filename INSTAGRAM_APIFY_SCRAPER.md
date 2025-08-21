# Instagram Apify Scraper

Функция для парсинга Instagram Reels через Apify API с сохранением в Supabase и отправкой в Telegram.

## 🎯 Основная функция

**Файл:** `src/inngest-functions/instagramApifyScraper.ts`  
**Событие:** `instagram/apify-scrape`  
**Функция:** `instagramApifyScraper`  

## 📝 Описание

Функция парсит Instagram Reels через Apify API, фильтрует их по параметрам и сохраняет в базу данных Supabase. Поддерживает парсинг как отдельных пользователей, так и хештегов.

## 🔧 Параметры события

```typescript
{
  username_or_hashtag: string,     // Instagram username или #хештег
  project_id: number,              // ID проекта
  source_type: 'competitor' | 'hashtag', // Тип источника
  max_reels: number,               // Максимальное количество рилсов (1-500)
  min_views?: number,              // Минимальное количество просмотров
  max_age_days?: number,           // Максимальный возраст в днях (1-365)
  requester_telegram_id?: string, // Telegram ID пользователя
  bot_name?: string                // Имя бота для уведомлений
}
```

## 📊 Пример запроса

```javascript
await inngest.send({
  name: 'instagram/apify-scrape',
  data: {
    username_or_hashtag: 'cristiano',
    project_id: 1,
    source_type: 'competitor',
    max_reels: 15,
    min_views: 10000,
    max_age_days: 30,
    requester_telegram_id: '123456789',
    bot_name: 'my_bot'
  }
})
```

## 🗄️ База данных

Функция сохраняет данные в таблицу `instagram_apify_reels` в Supabase:

```sql
CREATE TABLE instagram_apify_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id VARCHAR(255) UNIQUE,
  url TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  caption TEXT,
  hashtags JSONB,
  owner_username VARCHAR(255),
  owner_id VARCHAR(255),
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  duration FLOAT,
  published_at TIMESTAMP,
  music_artist VARCHAR(255),
  music_title VARCHAR(255),
  project_id INTEGER,
  scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 🔑 Переменные окружения

```bash
# Apify API
APIFY_TOKEN=your-apify-token

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key

# Telegram (опционально)
BOT_TOKEN_1=your-telegram-bot-token
```

## 🧪 Тестирование

Тестовые файлы находятся в `test-scripts/instagram/`:
- `test-instagram-apify.js` - основной тест функции
- `test-real-instagram-api.js` - тест RapidAPI подключения
- `direct-real-instagram-scraper.js` - прямой тест без Inngest

## 🎬 Результат

Функция возвращает:
- Количество найденных и сохранённых рилсов
- Топ рилсы по просмотрам
- Статистика парсинга
- При наличии Telegram ID - отправляет уведомление

## 🚀 Статус

✅ **Готово к продакшену**  
✅ **Протестировано**  
✅ **Интегрировано с Supabase**  
✅ **Поддержка Telegram уведомлений**