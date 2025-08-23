# 🔍 Универсальная система парсинга Instagram - Frontend API

## 📋 Архитектура

**Стек:** Node.js + Inngest + PostgreSQL + Instagram API  
**Принцип:** Универсальный алгоритм парсинга для любых пользователей

---

## 🎯 Основные Inngest функции

### 1. **instagramScraperV2**

Основной парсер похожих пользователей

```javascript
// Параметры
{
  username_or_id: "target_user",     // обязательно
  project_id: 123,                   // обязательно
  max_users: 50,                     // 1-100, по умолчанию 50
  max_reels_per_user: 50,           // 1-200, по умолчанию 50
  scrape_reels: false,              // по умолчанию false
  requester_telegram_id: "user123", // опционально
  bot_name: "your_bot"              // опционально
}
```

### 2. **competitorAutoParser**

Автоматический мониторинг (cron: каждые 24 часа в 08:00 UTC)

### 3. **createInstagramUser**

Ручное создание пользователя в БД

---

## 🔌 REST API Endpoints

### **Подписки на конкурентов**

#### `GET /api/competitor-subscriptions`

Получение подписок пользователя

```javascript
Query: ?user_telegram_id=user123&bot_name=your_bot

Response: {
  success: true,
  subscriptions: [
    {
      id: "uuid",
      competitor_username: "competitor1",
      max_reels: 10,           // 1-50
      min_views: 1000,         // минимальные просмотры
      max_age_days: 7,         // 1-30 дней
      delivery_format: "digest", // digest/individual/archive
      is_active: true,
      last_delivery: "2025-01-01T12:00:00Z"
    }
  ]
}
```

#### `POST /api/competitor-subscriptions`

Создание подписки (лимит: 10 активных на пользователя)

```javascript
Request: {
  user_telegram_id: "user123",
  bot_name: "your_bot",
  competitor_username: "competitor1",
  max_reels: 10,
  min_views: 1000,
  max_age_days: 7,
  delivery_format: "digest"
}
```

#### `PUT /api/competitor-subscriptions/:id`

Обновление параметров подписки

#### `DELETE /api/competitor-subscriptions/:id`

Удаление подписки

---

## 📊 Схемы данных (Zod)

### **Основные схемы**

```typescript
InstagramUserSchema // валидация из API
ValidatedInstagramUserSchema // для сохранения в БД
InstagramScrapingEventSchema // событие парсинга
RawInstagramReelSchema // рилс из API
CreateSubscriptionSchema // создание подписки
```

### **База данных**

- `instagram_similar_users` - найденные похожие пользователи
- `instagram_user_reels` - рилсы пользователей
- `competitor_subscriptions` - подписки на мониторинг

---

## ⚙️ Универсальный алгоритм парсинга

### **Процесс:**

1. **Валидация Zod** → входные параметры
2. **Проверка project_id** → существование в БД
3. **Instagram API** → retry логика + rate limiting
4. **Валидация данных** → Zod схемы
5. **Сохранение БД** → ON CONFLICT обработка дубликатов
6. **Парсинг рилсов** → опционально для каждого пользователя
7. **Генерация отчетов** → HTML/Excel/ZIP архив
8. **Telegram уведомления** → отправка результатов

### **Обработка ошибок:**

- Rate limiting (429) → автоматический retry
- Валидация ошибок → детальное описание через Zod
- БД транзакции → rollback при ошибках

---

## 🎨 Frontend компоненты

### **1. Универсальная форма парсинга**

```javascript
const ParsingForm = {
  targetUsername: { required: true, validation: /^[a-zA-Z0-9._]{1,30}$/ },
  projectId: { required: true, type: 'number', min: 1 },
  maxUsers: { type: 'number', min: 1, max: 100, default: 50 },
  scrapeReels: { type: 'boolean', default: false },
  maxReelsPerUser: { type: 'number', min: 1, max: 200, default: 50 },
}
```

### **2. Управление подписками**

```javascript
const SubscriptionManager = {
  list: 'GET /api/competitor-subscriptions',
  create: 'POST /api/competitor-subscriptions',
  update: 'PUT /api/competitor-subscriptions/:id',
  delete: 'DELETE /api/competitor-subscriptions/:id',
  maxActive: 10, // лимит активных подписок
}
```

### **3. Результаты парсинга**

```javascript
const ResultsDisplay = {
  competitors: Array, // список найденных конкурентов
  reports: {
    html: '/reports/analysis.html',
    excel: '/reports/data.xlsx',
    archive: '/reports/full.zip',
  },
  stats: { total: Number, verified: Number },
}
```

---

## 📡 Real-time статусы

### **WebSocket события:**

```javascript
const statuses = {
  parsing_started: { eventId, status: 'in_progress' },
  parsing_progress: { eventId, progress: 45 },
  parsing_completed: { eventId, results },
  reports_generated: { eventId, reports },
  parsing_failed: { eventId, error },
}
```

---

## 🔒 Валидация и безопасность

### **Rate Limiting:**

- 100 запросов/час на пользователя
- 10 одновременных задач парсинга
- Кеширование результатов: 1 час

### **Валидация:**

```javascript
// Username
const validateUsername = username => /^[a-zA-Z0-9._]{1,30}$/.test(username)

// Project ID
const validateProjectId = id => Number.isInteger(id) && id > 0
```

---

## 🚀 Интеграции

### **Instagram API (RapidAPI)**

- Host: `real-time-instagram-scraper-api1.p.rapidapi.com`
- Endpoints: `/v1/similar_users_v2`, `/v1/user_reels`
- Auth: RapidAPI key в headers

### **Telegram Bot**

- Автоотправка результатов
- Мультиязычность (ru/en)
- Архивы через download URL

---

## 📈 Оптимизация

### **Frontend:**

```javascript
// Lazy loading
const Results = lazy(() => import('./Results'))
const Subscriptions = lazy(() => import('./Subscriptions'))

// Caching
const useResults = (username, projectId) =>
  useQuery(['results', username, projectId], fetchResults, {
    staleTime: 1000 * 60 * 60, // 1 hour
    cacheTime: 1000 * 60 * 60 * 24, // 24 hours
  })

// Pagination
const usePaginatedCompetitors = filters =>
  useInfiniteQuery(['competitors', filters], fetchCompetitors)
```

---

## ✅ Готовые возможности

- ✅ Универсальный парсинг Instagram
- ✅ Автоматические подписки на конкурентов
- ✅ HTML/Excel отчеты с архивами
- ✅ Telegram интеграция
- ✅ Rate limiting и обработка ошибок
- ✅ Zod валидация всех данных
- ✅ PostgreSQL с обработкой дубликатов

**Система готова к использованию с любыми Instagram аккаунтами!** 🎯
