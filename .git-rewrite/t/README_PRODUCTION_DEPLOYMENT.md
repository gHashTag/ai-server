# Production Deployment Guide - Instagram AI Functions

## 🚀 Готовность к деплою

Все Instagram AI функции готовы к деплою в production:

### ✅ **Завершенные компоненты:**
- **Instagram Reels API** - исправлены ошибки валидации Zod
- **Валидация проектов** - убраны заглушки, добавлена реальная валидация
- **4 Inngest функции** - полностью протестированы и готовы к использованию
- **База данных** - схема PostgreSQL готова для production

### 🛠️ **Готовые функции:**
1. **analyzeCompetitorReels** - анализ рилсов конкурентов
2. **findCompetitors** - поиск похожих авторов
3. **extractTopContent** - извлечение топового контента
4. **generateContentScripts** - генерация сценариев контента
5. **instagramScraperV2** - основной скрапер с валидацией

---

## 📋 Checklist для деплоя

### 1. **Environment Variables**
Убедитесь, что все переменные окружения настроены:

```env
# Database
NEON_DATABASE_URL=postgresql://username:password@host/database

# Instagram API
RAPIDAPI_INSTAGRAM_KEY=your_rapidapi_key
RAPIDAPI_INSTAGRAM_HOST=real-time-instagram-scraper-api1.p.rapidapi.com

# OpenAI (для generateContentScripts)
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORG_ID=your_openai_org_id

# Telegram Bot (для интеграции)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Server Config
NODE_ENV=production
PORT=4000
```

### 2. **База данных PostgreSQL**
Функции автоматически создадут необходимые таблицы:

```sql
-- Основные таблицы для Instagram AI
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_username VARCHAR(255) NOT NULL,
  comp_username VARCHAR(255) NOT NULL,
  followers_count INTEGER,
  category VARCHAR(100),
  bio TEXT,
  ig_url TEXT,
  project_id INTEGER REFERENCES projects(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reels_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comp_username VARCHAR(255) NOT NULL,
  reel_id VARCHAR(255) NOT NULL,
  ig_reel_url TEXT NOT NULL,
  caption TEXT,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at_instagram TIMESTAMP WITH TIME ZONE,
  project_id INTEGER REFERENCES projects(id)
);

CREATE TABLE content_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id VARCHAR(255) NOT NULL,
  orig_caption TEXT,
  orig_transcript TEXT,
  script_v1 TEXT,
  script_v2 TEXT,
  script_v3 TEXT,
  ig_reel_url TEXT,
  project_id INTEGER REFERENCES projects(id)
);
```

### 3. **Сборка и деплой**

```bash
# Сборка для production
npm run build

# Или с помощью Docker
docker build -t instagram-ai-functions .
docker run -p 4000:4000 instagram-ai-functions

# Или с помощью Docker Compose
docker-compose up -d
```

### 4. **Inngest Setup**
Убедитесь, что Inngest сервер запущен:

```bash
# Development
npm run dev:inngest

# Production
inngest-cli serve --prod
```

---

## 🧪 Тестирование в production

### 1. **Базовый тест доступности**
```bash
curl http://your-server:4000/api/inngest
```

### 2. **Тест валидации проектов**
```bash
# Создайте тестовый проект в базе данных
INSERT INTO projects (name, is_active) VALUES ('Test Project', true);

# Запустите тест
curl -X POST http://your-server:4000/api/inngest/test \
  -H "Content-Type: application/json" \
  -d '{
    "name": "instagram/analyze-reels",
    "data": {
      "username": "test_user",
      "project_id": 1,
      "max_reels": 5
    }
  }'
```

### 3. **Мониторинг логов**
```bash
# Docker logs
docker logs -f instagram-ai-functions

# PM2 logs
pm2 logs

# Системные логи
tail -f /var/log/your-app.log
```

---

## 🔧 Интеграция с Telegram Bot

### Примеры вызовов функций:

```typescript
// 1. Анализ рилсов конкурентов
await inngest.send({
  name: 'instagram/analyze-reels',
  data: {
    username: 'competitor_username',
    max_reels: 15,
    days_back: 14,
    project_id: 1,
    requester_telegram_id: user.telegram_id
  }
})

// 2. Поиск конкурентов
await inngest.send({
  name: 'instagram/find-competitors',
  data: {
    username_or_id: 'your_username',
    max_users: 10,
    min_followers: 1000,
    project_id: 1,
    requester_telegram_id: user.telegram_id
  }
})

// 3. Извлечение топового контента
await inngest.send({
  name: 'instagram/extract-top-content',
  data: {
    username: 'competitor_username',
    limit: 10,
    days_back: 14,
    project_id: 1,
    requester_telegram_id: user.telegram_id
  }
})

// 4. Генерация сценариев
await inngest.send({
  name: 'instagram/generate-content-scripts',
  data: {
    reel_id: 'reel_id_from_database',
    ig_reel_url: 'https://instagram.com/p/CODE/',
    project_id: 1,
    requester_telegram_id: user.telegram_id
  }
})
```

---

## 📊 Мониторинг и аналитика

### 1. **Inngest Dashboard**
- URL: `http://your-server:8288` (в development)
- Для production используйте Inngest Cloud

### 2. **Метрики для мониторинга**
- Количество обработанных событий
- Время выполнения функций
- Количество ошибок валидации проектов
- Успешность API вызовов к Instagram

### 3. **Логи для отслеживания**
```bash
# Ищите эти ключевые слова в логах
grep "✅ Project validation successful" logs.txt
grep "❌ Project validation failed" logs.txt  
grep "✅ Reels API Success" logs.txt
grep "❌ API returned error" logs.txt
```

---

## 🚨 Troubleshooting

### Проблема: "Project validation failed"
```bash
# Проверьте, существует ли проект
SELECT * FROM projects WHERE id = YOUR_PROJECT_ID AND is_active = true;

# Создайте проект если нужно
INSERT INTO projects (name, is_active) VALUES ('Your Project', true);
```

### Проблема: "Instagram API error"
```bash
# Проверьте API ключ
echo $RAPIDAPI_INSTAGRAM_KEY

# Проверьте квоты API
curl -H "X-RapidAPI-Key: $RAPIDAPI_INSTAGRAM_KEY" \
     -H "X-RapidAPI-Host: real-time-instagram-scraper-api1.p.rapidapi.com" \
     "https://real-time-instagram-scraper-api1.p.rapidapi.com/user_info?username=test"
```

### Проблема: "Database connection failed"
```bash
# Проверьте подключение к базе данных
psql $NEON_DATABASE_URL -c "SELECT 1"
```

---

## 🎯 Готово к использованию!

Система готова к production и может обрабатывать:
- ✅ **Анализ рилсов** до 50 рилсов на пользователя
- ✅ **Поиск конкурентов** до 200 пользователей
- ✅ **Извлечение топового контента** с сортировкой по популярности
- ✅ **Генерация сценариев** через OpenAI GPT-4
- ✅ **Валидация проектов** с реальной базой данных

**Следующий шаг:** Интеграция с Telegram Bot для удобного управления через команды. 