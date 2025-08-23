# 🔍 Техническое задание: Instagram Parsing System - Frontend Интеграция

## 📋 Обзор системы

**Цель:** Создать фронтенд для системы парсинга и анализа Instagram конкурентов с автоматической генерацией отчетов и контента.

**Архитектура:** Backend (Node.js + Express + Inngest) ↔ Frontend (React/Vue/Angular) ↔ Telegram Bot

---

## 🎯 Основные функции системы

### 1. **Instagram Parsing & Analysis**

- ✅ Поиск похожих авторов/конкурентов
- ✅ Анализ рилсов и контента
- ✅ Извлечение топ-контента за период
- ✅ Генерация сценариев для контента
- ✅ Автоматическая генерация HTML/Excel отчетов

### 2. **Competitor Subscriptions**

- ✅ Подписка на автоматический мониторинг конкурентов
- ✅ Настройка параметров парсинга (количество рилсов, минимальные просмотры)
- ✅ Автоматическая доставка обновлений

### 3. **Content Generation**

- ✅ Генерация сценариев на основе анализа
- ✅ Создание детальных скриптов раскадровки
- ✅ Морфинг изображений для видео-контента

---

## 🔌 API Endpoints для фронтенда

### **Base URL:**

```
https://your-server.com/api
```

### **1. Instagram Parsing**

#### **POST /api/inngest/instagram/scraper-v2**

Запуск полного парсинга похожих пользователей с генерацией отчетов

**Headers:**

```javascript
{
  "Content-Type": "application/json",
  "Authorization": "Bearer your-api-key" // если нужна авторизация
}
```

**Request Body:**

```javascript
{
  "username_or_id": "target_username",
  "project_id": 123,
  "max_users": 10,                    // 1-100, по умолчанию 50
  "max_reels_per_user": 5,           // 1-200, по умолчанию 50
  "scrape_reels": true,              // включить парсинг рилсов
  "requester_telegram_id": "user123", // опционально
  "metadata": {}                      // дополнительные данные
}
```

**Response:**

```javascript
{
  "success": true,
  "event_id": "01K0EW4J1W199GB56SNNGMG868",
  "message": "Instagram scraping started successfully"
}
```

#### **POST /api/inngest/instagram/analyze-reels**

Анализ рилсов конкурента

**Request Body:**

```javascript
{
  "comp_username": "competitor_username",
  "project_id": 123,
  "days_limit": 14,        // анализ за последние N дней
  "min_views": 1000,       // минимальные просмотры
  "bot_name": "your_bot",
  "telegram_id": "user123"
}
```

#### **POST /api/inngest/instagram/extract-top**

Извлечение топ-контента конкурента

**Request Body:**

```javascript
{
  "comp_username": "competitor_username",
  "project_id": 123,
  "days_limit": 14,
  "limit": 10              // количество топ-рилсов
}
```

#### **POST /api/inngest/instagram/generate-scripts**

Генерация сценариев для рилса

**Request Body:**

```javascript
{
  "reel_id": "reel_123",
  "project_id": 123,
  "openai_api_key": "sk-..." // опционально, если не в env
}
```

### **2. Competitor Subscriptions**

#### **GET /api/competitor-subscriptions**

Получение подписок пользователя

**Query Parameters:**

```
?user_telegram_id=user123&bot_name=your_bot
```

**Response:**

```javascript
{
  "success": true,
  "subscriptions": [
    {
      "id": "uuid",
      "competitor_username": "competitor1",
      "competitor_display_name": "Competitor Name",
      "max_reels": 10,
      "min_views": 1000,
      "max_age_days": 7,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "last_delivery": "2025-01-01T12:00:00Z",
      "last_delivery_reels_count": 5
    }
  ]
}
```

#### **POST /api/competitor-subscriptions**

Создание подписки на конкурента

**Request Body:**

```javascript
{
  "user_telegram_id": "user123",
  "user_chat_id": "chat123", // опционально
  "bot_name": "your_bot",
  "competitor_username": "competitor1",
  "competitor_display_name": "Competitor Name", // опционально
  "max_reels": 10,           // 1-50, по умолчанию 10
  "min_views": 1000,         // минимум 0, по умолчанию 1000
  "max_age_days": 7,         // 1-30, по умолчанию 7
  "delivery_format": "digest" // "digest" | "individual" | "archive"
}
```

#### **PUT /api/competitor-subscriptions/:id**

Обновление подписки

**Request Body:**

```javascript
{
  "max_reels": 15,
  "min_views": 500,
  "max_age_days": 14,
  "delivery_format": "individual",
  "is_active": false
}
```

#### **DELETE /api/competitor-subscriptions/:id**

Удаление подписки

### **3. Content Generation**

#### **POST /api/generate/morph-images**

Морфинг изображений для видео

**Headers:**

```javascript
{
  "Content-Type": "multipart/form-data"
}
```

**Form Data:**

```javascript
{
  "type": "morphing",
  "telegram_id": "user123",
  "username": "frontend_user",
  "image_count": "3",           // 2-10
  "morphing_type": "seamless",  // "seamless" | "loop"
  "model": "kling-v1.6-pro",
  "is_ru": "true",
  "bot_name": "clip_maker_neuro_bot", // используйте этот бот
  "images_zip": File              // ZIP архив с изображениями
}
```

**Response:**

```javascript
{
  "success": true,
  "task_id": "morph_task_123",
  "message": "Morphing started successfully"
}
```

### **4. Results & Reports**

#### **GET /api/results/instagram/:username**

Получение результатов парсинга

**Query Parameters:**

```
?project_id=123&telegram_id=user123
```

**Response:**

```javascript
{
  "success": true,
  "competitors": [
    {
      "username": "competitor1",
      "full_name": "Competitor Name",
      "is_verified": true,
      "is_private": false,
      "profile_url": "https://instagram.com/competitor1",
      "social_context": "Followed by 5 people you follow",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "reports": {
    "generated": true,
    "html_report_url": "/reports/instagram_analysis_username_timestamp.html",
    "excel_report_url": "/reports/instagram_data_username_timestamp.xlsx",
    "archive_url": "/reports/instagram_competitors_username_timestamp.zip",
    "archive_filename": "instagram_competitors_username_timestamp.zip"
  },
  "total": 10
}
```

---

## 🎨 UI/UX Компоненты

### **1. Dashboard (Главная страница)**

```javascript
// Основные метрики
const DashboardStats = {
  totalCompetitors: 157,
  activeSubscriptions: 12,
  reportsGenerated: 45,
  lastUpdate: '2025-01-01 12:00',
}

// Недавние отчеты
const RecentReports = [
  {
    id: 'report_1',
    username: 'competitor1',
    competitorsFound: 10,
    reelsAnalyzed: 50,
    generatedAt: '2025-01-01 10:00',
    status: 'completed',
  },
]
```

### **2. Instagram Parser Form**

```javascript
const InstagramParserForm = {
  fields: {
    targetUsername: {
      type: 'text',
      placeholder: 'competitor_username',
      required: true,
      validation: /^[a-zA-Z0-9._]{1,30}$/,
    },
    maxUsers: {
      type: 'number',
      min: 1,
      max: 100,
      default: 10,
      label: 'Количество конкурентов',
    },
    scrapeReels: {
      type: 'boolean',
      default: false,
      label: 'Анализировать рилсы',
    },
    maxReelsPerUser: {
      type: 'number',
      min: 1,
      max: 200,
      default: 5,
      label: 'Рилсов на пользователя',
    },
  },
}
```

### **3. Results Display**

```javascript
const CompetitorCard = {
  username: 'competitor1',
  fullName: 'Competitor Name',
  isVerified: true,
  isPrivate: false,
  profileUrl: 'https://instagram.com/competitor1',
  socialContext: 'Followed by 5 people',
  actions: ['View Profile', 'Add to Subscriptions', 'Analyze Reels'],
}

const ReportsSection = {
  htmlPreview: '/reports/preview.html',
  downloadOptions: [
    { type: 'html', label: 'HTML Report', url: '/reports/report.html' },
    { type: 'excel', label: 'Excel Data', url: '/reports/data.xlsx' },
    { type: 'zip', label: 'Full Archive', url: '/reports/archive.zip' },
  ],
}
```

### **4. Subscriptions Management**

```javascript
const SubscriptionCard = {
  id: 'sub_123',
  competitorUsername: 'competitor1',
  competitorName: 'Competitor Name',
  isActive: true,
  settings: {
    maxReels: 10,
    minViews: 1000,
    maxAgeDays: 7,
    deliveryFormat: 'digest',
  },
  lastDelivery: '2025-01-01 12:00',
  lastReelsCount: 5,
  actions: ['Edit', 'Pause', 'Delete'],
}
```

### **5. Content Generation**

```javascript
const ContentGeneratorForm = {
  reel: {
    id: 'reel_123',
    url: 'https://instagram.com/reel/ABC123',
    preview: 'thumbnail.jpg',
  },
  generationOptions: {
    scriptTypes: ['emotional', 'educational', 'entertaining'],
    language: 'ru',
    tone: 'professional',
  },
}

const MorphingForm = {
  images: [], // File objects
  settings: {
    imageCount: 3,
    morphingType: 'seamless',
    model: 'kling-v1.6-pro',
  },
}
```

---

## 📡 WebSocket/Real-time Updates

### **События для real-time обновлений:**

```javascript
const websocket = new WebSocket('wss://your-server.com/ws')

// События от сервера
websocket.onmessage = event => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'parsing_started':
      updateParsingStatus(data.eventId, 'in_progress')
      break

    case 'parsing_progress':
      updateProgress(data.eventId, data.progress)
      break

    case 'parsing_completed':
      displayResults(data.eventId, data.results)
      break

    case 'reports_generated':
      showReportsReady(data.eventId, data.reports)
      break

    case 'subscription_delivery':
      notifyNewContent(data.subscriptionId, data.reels)
      break
  }
}
```

---

## 🔒 Аутентификация и безопасность

### **1. API Keys**

```javascript
// Заголовки для защищенных endpoint'ов
const apiHeaders = {
  Authorization: 'Bearer your-api-key',
  'Content-Type': 'application/json',
  'X-Client-Version': '1.0.0',
}
```

### **2. Rate Limiting**

- Максимум 100 запросов в час на пользователя
- Максимум 10 одновременных задач парсинга
- Кеширование результатов на 1 час

### **3. Валидация данных**

```javascript
const validateUsername = username => {
  const regex = /^[a-zA-Z0-9._]{1,30}$/
  return regex.test(username)
}

const validateProjectId = id => {
  return Number.isInteger(id) && id > 0
}
```

---

## 📊 Состояния и статусы

### **Статусы парсинга:**

```javascript
const PARSING_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}
```

### **Статусы генерации контента:**

```javascript
const GENERATION_STATUSES = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
}
```

---

## 🎯 UX Flow Examples

### **1. Парсинг конкурентов**

```
1. Пользователь вводит username → валидация
2. Выбор параметров (количество, рилсы) → форма
3. Отправка запроса → loading state
4. Real-time обновления прогресса → progress bar
5. Результаты готовы → показ конкурентов + отчеты
6. Возможность скачать отчеты → download links
```

### **2. Управление подписками**

```
1. Список текущих подписок → table/cards
2. Добавление новой подписки → modal form
3. Настройка параметров → settings panel
4. Активация/деактивация → toggle switches
5. Получение уведомлений о новом контенте → notifications
```

### **3. Генерация контента**

```
1. Выбор рилса для анализа → reel selector
2. Настройка параметров генерации → options panel
3. Запуск генерации → loading state
4. Получение результатов → scripts display
5. Сохранение/экспорт сценариев → save options
```

---

## 🔄 Error Handling

### **Типичные ошибки и их обработка:**

```javascript
const ERROR_CODES = {
  USERNAME_NOT_FOUND: {
    code: 'USERNAME_NOT_FOUND',
    message: 'Instagram пользователь не найден',
    action: 'Проверьте правильность username',
  },
  API_RATE_LIMIT: {
    code: 'API_RATE_LIMIT',
    message: 'Превышен лимит запросов',
    action: 'Попробуйте позже через 1 час',
  },
  INVALID_PROJECT_ID: {
    code: 'INVALID_PROJECT_ID',
    message: 'Неверный ID проекта',
    action: 'Обратитесь в поддержку',
  },
  PARSING_FAILED: {
    code: 'PARSING_FAILED',
    message: 'Ошибка парсинга данных',
    action: 'Попробуйте еще раз или обратитесь в поддержку',
  },
}

// Компонент для отображения ошибок
const ErrorAlert = ({ error }) => (
  <Alert severity="error">
    <AlertTitle>{error.message}</AlertTitle>
    {error.action && <p>{error.action}</p>}
    <Button onClick={retryAction}>Попробовать еще раз</Button>
  </Alert>
)
```

---

## 📱 Responsive Design

### **Breakpoints:**

```css
/* Mobile First */
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  /* Tablet */
  .container {
    max-width: 768px;
    margin: 0 auto;
  }
}

@media (min-width: 1024px) {
  /* Desktop */
  .container {
    max-width: 1200px;
    display: grid;
    grid-template-columns: 1fr 3fr;
    gap: 2rem;
  }
}
```

### **Мобильная адаптация:**

- Compact cards для конкурентов
- Bottom sheet для настроек
- Swipe actions для подписок
- Touch-friendly кнопки и формы

---

## 🧪 Testing & Validation

### **Unit Tests:**

```javascript
// Тест валидации username
test('validates Instagram username correctly', () => {
  expect(validateUsername('valid_user')).toBe(true)
  expect(validateUsername('invalid-user!')).toBe(false)
  expect(validateUsername('')).toBe(false)
})

// Тест API вызова
test('makes parsing request correctly', async () => {
  const response = await parseInstagramUser({
    username: 'test_user',
    project_id: 123,
    max_users: 10,
  })

  expect(response.success).toBe(true)
  expect(response.event_id).toBeDefined()
})
```

### **Integration Tests:**

```javascript
// Тест полного флоу парсинга
test('complete parsing flow works', async () => {
  // 1. Запуск парсинга
  const startResponse = await startParsing(testData)
  expect(startResponse.success).toBe(true)

  // 2. Ожидание результатов
  await waitForCompletion(startResponse.event_id)

  // 3. Получение результатов
  const results = await getResults(startResponse.event_id)
  expect(results.competitors.length).toBeGreaterThan(0)
})
```

---

## 📈 Performance Optimization

### **Lazy Loading:**

```javascript
// Lazy loading компонентов
const CompetitorsList = lazy(() => import('./CompetitorsList'))
const ReportsViewer = lazy(() => import('./ReportsViewer'))
const SubscriptionsManager = lazy(() => import('./SubscriptionsManager'))
```

### **Caching:**

```javascript
// Cache для результатов парсинга
const useInstagramResults = (username, projectId) => {
  return useQuery(
    ['instagram-results', username, projectId],
    () => fetchInstagramResults(username, projectId),
    {
      staleTime: 1000 * 60 * 60, // 1 hour
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    }
  )
}
```

### **Pagination:**

```javascript
// Пагинация для больших списков
const usePaginatedCompetitors = filters => {
  const [page, setPage] = useState(1)
  const limit = 20

  return useInfiniteQuery(
    ['competitors', filters],
    ({ pageParam = 1 }) =>
      fetchCompetitors({ ...filters, page: pageParam, limit }),
    {
      getNextPageParam: lastPage =>
        lastPage.hasMore ? lastPage.nextPage : undefined,
    }
  )
}
```

---

## 🎉 Заключение

Эта спецификация покрывает все основные аспекты интеграции фронтенда с Instagram Parsing System:

### ✅ **Что включено:**

1. **Полный API Reference** - все endpoints с примерами
2. **UI/UX Components** - готовые компоненты для всех функций
3. **Real-time Updates** - WebSocket интеграция
4. **Error Handling** - обработка всех типов ошибок
5. **Security & Auth** - аутентификация и безопасность
6. **Performance** - оптимизация и кеширование
7. **Testing** - примеры тестов
8. **Responsive Design** - адаптивность

### 🚀 **Готово к разработке:**

- Все API endpoints протестированы и работают
- Схемы данных валидированы с Zod
- Inngest функции развернуты и активны
- Автоматическая генерация отчетов включена
- Telegram интеграция настроена

### 📊 **Поддерживаемые функции:**

- ✅ Instagram парсинг и анализ
- ✅ Автоматические подписки на конкурентов
- ✅ Генерация контента и сценариев
- ✅ HTML/Excel отчеты
- ✅ Морфинг изображений
- ✅ Real-time уведомления

**Система готова к продуктивному использованию!** 🎯

---

_Документ обновлен: 2025-01-20_  
_Версия API: v2.0_  
_Статус: Production Ready_ ✅
