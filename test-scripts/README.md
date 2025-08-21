# Тестовые скрипты - Instagram Apify Scraper

Тестовые скрипты для функции парсинга Instagram Reels через Apify API.

## 📁 Структура

### instagram/
Тесты Instagram Apify Scraper функции:

- `test-instagram-apify.js` - основной тест функции
- `test-real-instagram-api.js` - тест подключения к RapidAPI  
- `test-real-instagram-with-different-user.js` - тест с разными пользователями
- `direct-real-instagram-scraper.js` - прямой тест без Inngest
- `check-instagram-results.js` - проверка результатов парсинга
- `test-debug-instagram-function.js` - отладка функции
- `test-instagram-api-debug.ts` - диагностика Instagram API
- `test-real-inngest-instagram.js` - тест через Inngest
- `test-neon-database.js` - тест подключения к базе данных

## 🚀 Использование

```bash
# Основной тест функции
node test-scripts/instagram/test-instagram-apify.js

# Тест API подключения  
node test-scripts/instagram/test-real-instagram-api.js

# Прямой тест с базой данных
node test-scripts/instagram/direct-real-instagram-scraper.js
```

## 🔧 Требования

Настройте переменные окружения:
```bash
APIFY_TOKEN=your-apify-token
RAPIDAPI_INSTAGRAM_KEY=your-rapidapi-key  
NEON_DATABASE_URL=your-db-connection-string
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
```