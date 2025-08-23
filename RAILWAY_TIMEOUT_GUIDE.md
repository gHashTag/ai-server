# 🚄 Railway Timeout Настройки для Парсинга Instagram Reels

## 🔍 Проблема с Timeout

**Вопрос**: Почему 20 секунд timeout мало для парсинга множества рилсов?

## ⏱️ Типы Timeout в Railway

### 1. **Healthcheck Timeout** (для запуска сервиса)
```toml
healthcheckTimeout = 300  # 5 минут - МАКСИМУМ и по умолчанию в Railway
```
- **Что это**: Время ожидания готовности сервиса при деплое
- **Когда используется**: Только при запуске контейнера
- **НЕ влияет** на длительность HTTP запросов

### 2. **HTTP Request Timeout** (для обработки запросов)
- **Лимит Railway**: **МАКСИМУМ 5 минут (300 секунд)**
- **НЕ настраивается** пользователем
- **Жесткое ограничение** платформы
- **Применяется ко всем** HTTP запросам

### 3. **Database Query Timeout** (настраиваемый)
```typescript
queryTimeout: 60000, // 60 секунд на выполнение SQL запроса
```

## 🚨 Ключевая Проблема

**Railway HTTP Request Timeout = 5 минут МАКСИМУМ**

Это означает:
- ❌ Нельзя парсить 100+ рилсов в одном HTTP запросе  
- ❌ Нельзя увеличить timeout свыше 5 минут
- ❌ Любой HTTP запрос длиннее 5 минут = 502/504 ошибка

## ✅ Решения для Долгих Операций

### 1. **Background Jobs с Inngest** (РЕКОМЕНДУЕТСЯ)
```typescript
// Вместо долгого HTTP запроса:
POST /api/parse-reels → 5+ минут = TIMEOUT ❌

// Используем фоновую задачу:
POST /api/start-parsing → Мгновенный ответ ✅
// Inngest обрабатывает в фоне без timeout ограничений
```

### 2. **Chunked Processing** (Разбивка на части)
```typescript
// Вместо парсинга 100 рилсов:
parseReels(100) // = 8+ минут = TIMEOUT ❌

// Разбиваем на части:
for (let i = 0; i < 100; i += 10) {
  await parseReels(10) // = 30 сек = OK ✅
}
```

### 3. **Streaming Response** (Потоковая передача)
```typescript
// Возвращаем промежуточные результаты
res.write(JSON.stringify({progress: 25, parsed: 25}))
res.write(JSON.stringify({progress: 50, parsed: 50}))
// Клиент получает обновления в real-time
```

## 🛠 Текущая Конфигурация

### Railway.toml
```toml
[deploy]
healthcheckTimeout = 300        # 5 минут - максимум Railway
# HTTP timeout = 5 минут - НЕ настраивается

[environments.production.variables]
RAILWAY_HEALTHCHECK_TIMEOUT_SEC = "300"
```

### Instagram Scraper настройки
```typescript
// Database timeouts (настраиваемые):
connectionTimeoutMillis: 30000,  // 30 сек подключение
queryTimeout: 60000,            // 60 сек SQL запрос  
acquireTimeoutMillis: 20000,    // 20 сек из пула
```

## 🚀 Рекомендации для Production

### Для парсинга Instagram Reels:

1. **Используйте Inngest для долгих задач**:
   ```typescript
   // API endpoint запускает задачу и сразу отвечает
   app.post('/api/parse-instagram', async (req, res) => {
     await inngest.send({
       name: 'instagram/scraper-v2',
       data: { usernames: req.body.usernames }
     })
     
     res.json({ status: 'started', message: 'Parsing in background' })
   })
   ```

2. **Мониторинг через webhooks**:
   ```typescript
   // Уведомления о прогрессе парсинга
   await inngest.send({
     name: 'parsing/progress',
     data: { progress: 50, total: 100 }
   })
   ```

3. **Результат через отдельный endpoint**:
   ```typescript
   app.get('/api/parsing-status/:jobId', (req, res) => {
     // Возвращаем статус и результаты парсинга
   })
   ```

## ⚡ Итог

- **Healthcheck timeout**: ✅ Увеличен до максимума (300 сек)
- **HTTP request timeout**: ❌ НЕ настраивается (лимит 5 минут) 
- **Решение**: 🚀 Используйте Background Jobs для долгих операций

**Для парсинга 100+ рилсов ОБЯЗАТЕЛЬНО использовать Inngest background jobs!**