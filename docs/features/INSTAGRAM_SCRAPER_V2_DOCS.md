# 📱 Instagram Scraper V2 - Техническая документация

## 🎯 Обзор

Instagram Scraper V2 - это улучшенная версия парсера Instagram, которая:
- Автоматически создает и управляет проектами
- Парсит конкурентов и их рилсы
- Сохраняет данные в PostgreSQL с привязкой к проектам
- Генерирует отчеты в HTML и Excel
- Отправляет результаты в Telegram

---

## 🏗️ Архитектура

### Основные компоненты:

```
┌─────────────────────────────────────────┐
│           Inngest Event                  │
│         (instagram-scraping-v2)          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      InstagramScraperV2 Function        │
│         (instagramScraper-v2.ts)        │
├─────────────────────────────────────────┤
│ 1. Валидация входных данных (Zod)       │
│ 2. Проверка/создание проекта            │
│ 3. Вызов Instagram API                  │
│ 4. Сохранение в БД                      │
│ 5. Генерация отчетов                    │
│ 6. Отправка в Telegram                  │
└─────────────────────────────────────────┘
             │
    ┌────────┼────────┬────────┬─────────┐
    ▼        ▼        ▼        ▼         ▼
┌────────┐┌──────┐┌──────┐┌──────┐┌──────────┐
│Project ││IG    ││ DB   ││Report││ Telegram │
│Manager ││ API  ││Repos ││ Gen  ││   Bot    │
└────────┘└──────┘└──────┘└──────┘└──────────┘
```

---

## 📦 Структура файлов

```
inngest/functions/instagram/
├── instagramScraper-v2.ts      # Основная функция парсинга V2
├── instagramSingleUser.ts      # Парсинг одного пользователя
├── project-manager.ts          # Управление проектами
├── schemas.ts                  # Zod схемы валидации
├── repositories/
│   ├── instagram-reels.ts      # Работа с таблицей рилсов
│   └── instagram-users.ts      # Работа с таблицей пользователей
└── utils/
    ├── report-generator.ts     # Генерация HTML/Excel отчетов
    └── telegram.ts             # Отправка в Telegram
```

---

## 🔧 Схемы данных (Zod)

### InstagramScrapingEventSchema
```typescript
{
  username_or_id: string,              // Instagram username или ID (обязательно)
  project_id?: number,                 // ID проекта (опционально)
  requester_telegram_id?: string,      // Telegram ID запросившего
  telegram_username?: string,          // Telegram username
  bot_name?: string,                   // Имя бота (по умолчанию: neuro_blogger_bot)
  max_users?: number,                  // Макс. конкурентов (по умолчанию: 50)
  scrape_reels?: boolean,              // Парсить рилсы (по умолчанию: false)
  max_reels_per_user?: number,        // Макс. рилсов на юзера (по умолчанию: 10)
  language?: 'ru' | 'en'              // Язык отчетов (по умолчанию: 'en')
}
```

### SingleUserScrapingEventSchema
```typescript
{
  username: string,                    // Instagram username (обязательно)
  project_id?: number,                 // ID проекта (опционально)
  telegram_user_id?: string,          // Telegram ID
  telegram_username?: string,         // Telegram username
  bot_name?: string                   // Имя бота
}
```

---

## 🚀 Примеры запуска через Inngest

### 1. Минимальный запрос (автосоздание проекта)
```javascript
await inngest.send({
  name: "instagram-scraping-v2",
  data: {
    username_or_id: "cristiano",
    requester_telegram_id: "123456789",
    telegram_username: "john_doe"
  }
});
```

### 2. С указанием количества конкурентов
```javascript
await inngest.send({
  name: "instagram-scraping-v2",
  data: {
    username_or_id: "nike",
    requester_telegram_id: "123456789",
    telegram_username: "marketing_team",
    max_users: 100,
    scrape_reels: false
  }
});
```

### 3. Полный парсинг с рилсами
```javascript
await inngest.send({
  name: "instagram-scraping-v2",
  data: {
    username_or_id: "adidas",
    requester_telegram_id: "987654321",
    telegram_username: "content_manager",
    bot_name: "analytics_bot",
    max_users: 75,
    scrape_reels: true,
    max_reels_per_user: 15,
    language: "ru"
  }
});
```

### 4. С существующим project_id
```javascript
await inngest.send({
  name: "instagram-scraping-v2",
  data: {
    username_or_id: "messi",
    project_id: 42,
    max_users: 50,
    scrape_reels: true
  }
});
```

### 5. Парсинг одного пользователя
```javascript
await inngest.send({
  name: "instagram-single-user",
  data: {
    username: "ronaldo",
    telegram_user_id: "123456789",
    telegram_username: "sports_analyst"
  }
});
```

---

## 💾 Структура базы данных

### Таблица `projects`
```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  telegram_id VARCHAR(255),
  telegram_username VARCHAR(255),
  bot_name VARCHAR(255),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(telegram_id, bot_name)
);
```

### Таблица `instagram_similar_users`
```sql
CREATE TABLE instagram_similar_users (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  instagram_user_id VARCHAR(255),
  username VARCHAR(255),
  full_name VARCHAR(255),
  is_private BOOLEAN,
  is_verified BOOLEAN,
  profile_pic_url TEXT,
  profile_pic_url_hd TEXT,
  biography TEXT,
  follower_count INTEGER,
  following_count INTEGER,
  media_count INTEGER,
  external_url VARCHAR(255),
  category VARCHAR(255),
  is_business_account BOOLEAN,
  public_email VARCHAR(255),
  contact_phone_number VARCHAR(50),
  public_phone_country_code VARCHAR(10),
  public_phone_number VARCHAR(50),
  business_contact_method VARCHAR(50),
  engagement_rate DECIMAL(5,2),
  avg_likes INTEGER,
  avg_comments INTEGER,
  last_post_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

### Таблица `instagram_user_reels`
```sql
CREATE TABLE instagram_user_reels (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id),
  instagram_user_id VARCHAR(255),
  username VARCHAR(255),
  reel_id VARCHAR(255),
  reel_code VARCHAR(255),
  caption TEXT,
  media_type VARCHAR(50),
  video_url TEXT,
  thumbnail_url TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  play_count INTEGER,
  share_count INTEGER,
  save_count INTEGER,
  view_count INTEGER,
  duration DECIMAL(10,2),
  created_time TIMESTAMP,
  location_name VARCHAR(255),
  location_id VARCHAR(255),
  is_paid_partnership BOOLEAN,
  sponsor_tags JSONB,
  hashtags JSONB,
  mentions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

---

## 📊 Формат отчетов

### HTML отчет содержит:
- 📈 Сводную статистику
- 👥 Топ конкурентов по подписчикам
- 💎 Топ по engagement rate
- 🎬 Список всех рилсов (если парсились)
- 📱 Детальная информация о каждом аккаунте

### Excel отчет содержит листы:
1. **Summary** - общая статистика
2. **Users** - все спарсенные пользователи
3. **Reels** - все рилсы (если парсились)
4. **Top Engagement** - топ по вовлеченности
5. **Business Accounts** - бизнес-аккаунты

---

## 🔌 API Instagram (RapidAPI)

### Endpoints используемые:

1. **GET /user_info** - информация о пользователе
```javascript
const userInfo = await instagramAPI.getUserInfo(username);
```

2. **GET /user_similar_accounts** - похожие аккаунты
```javascript
const similarUsers = await instagramAPI.getSimilarAccounts(userId, count);
```

3. **GET /user_reels** - рилсы пользователя
```javascript
const reels = await instagramAPI.getUserReels(userId, count);
```

---

## 🤖 Telegram интеграция

### Формат сообщения в Telegram:
```
✅ Instagram Scraping Complete!

📊 Results:
• Target: @cristiano
• Similar users found: 50
• Reels scraped: 250
• Processing time: 45 seconds

📎 Download your report:
[Download Report Archive]

The report includes:
• HTML visualization
• Excel data export
• All scraped data

💡 Project ID: 42
```

### Поддерживаемые боты:
- `neuro_blogger_bot` (по умолчанию)
- `analytics_bot`
- Любой кастомный бот с токеном в ENV

---

## 🔐 Переменные окружения

```bash
# База данных (обязательно)
SUPABASE_URL=postgresql://user:password@host:5432/database

# Instagram API (обязательно)
RAPIDAPI_INSTAGRAM_KEY=your_rapidapi_key_here
RAPIDAPI_INSTAGRAM_HOST=instagram-scraper-api3.p.rapidapi.com

# Telegram боты
BOT_TOKEN_NEURO_BLOGGER=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
BOT_TOKEN_ANALYTICS=0987654321:ZYXwvuTSRqpONMlkjIHGfedCBA

# S3/Storage (для отчетов)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Inngest
INNGEST_EVENT_KEY=your_inngest_key
INNGEST_SIGNING_KEY=your_signing_key
```

---

## 🧪 Тестирование

### Локальный запуск с Inngest Dev Server:
```bash
# 1. Запустить Inngest Dev Server
npx inngest-cli@latest dev

# 2. Запустить приложение
npm run dev

# 3. Отправить тестовое событие через UI
# Перейти на http://localhost:8288
```

### Пример теста через curl:
```bash
curl -X POST http://localhost:8288/e/instagram-scraping-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "username_or_id": "cristiano",
      "requester_telegram_id": "123456789",
      "telegram_username": "test_user",
      "max_users": 5,
      "scrape_reels": true,
      "max_reels_per_user": 3
    }
  }'
```

---

## ⚠️ Ограничения и лимиты

### Instagram API:
- **Rate limit**: 100 запросов в минуту
- **Max users per request**: 200
- **Max reels per user**: 50
- **Retry attempts**: 3 с exponential backoff

### База данных:
- **Max connections**: 100
- **Query timeout**: 30 секунд
- **Batch insert size**: 1000 записей

### Отчеты:
- **Max HTML size**: 50 MB
- **Max Excel rows**: 1,048,576
- **Archive max size**: 100 MB

---

## 🐛 Обработка ошибок

### Стратегия retry:
```typescript
// Автоматический retry для Instagram API
const retryConfig = {
  attempts: 3,
  delay: (attempt) => Math.pow(2, attempt) * 1000, // 2s, 4s, 8s
  onRetry: (error, attempt) => {
    logger.warn(`Retry attempt ${attempt}:`, error);
  }
};
```

### Типичные ошибки:

1. **Invalid project_id**
   - Автоматически создается новый проект
   
2. **Instagram user not found**
   - Возвращается ошибка с предложением проверить username

3. **Rate limit exceeded**
   - Автоматический retry с задержкой

4. **Database connection error**
   - Retry с экспоненциальной задержкой

---

## 📈 Мониторинг и логирование

### Inngest Dashboard метрики:
- Количество успешных парсингов
- Среднее время выполнения
- Количество ошибок
- Размер обработанных данных

### Структура логов:
```typescript
{
  timestamp: "2024-01-15T10:30:00Z",
  level: "info",
  function: "instagramScraper-v2",
  event_id: "evt_123abc",
  project_id: 42,
  username: "cristiano",
  users_found: 50,
  reels_scraped: 250,
  duration_ms: 45000,
  status: "success"
}
```

---

## 🔄 Версионирование

- **v2.0.0** - Текущая версия с автоматическим созданием проектов
- **v1.0.0** - Legacy версия с обязательным project_id

### Миграция с v1 на v2:
1. project_id теперь опциональный
2. Добавлены поля telegram_username, bot_name
3. Автоматическое создание проектов
4. Улучшенная валидация через Zod

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в Inngest Dashboard
2. Убедитесь в правильности ENV переменных
3. Проверьте лимиты API
4. Обратитесь к команде разработки

---

## ✅ Чеклист запуска

- [ ] Настроены ENV переменные
- [ ] База данных доступна
- [ ] Таблицы созданы (projects, instagram_similar_users, instagram_user_reels)
- [ ] Instagram API ключ активен
- [ ] Telegram бот токен настроен
- [ ] Inngest функции зарегистрированы
- [ ] S3/Storage настроен для отчетов
- [ ] Тестовый запуск выполнен успешно
