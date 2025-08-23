# Dart AI Task Manager Integration Guide

## 🎯 Обзор

Интеграция с **Dart AI Task Manager** обеспечивает двухстороннюю синхронизацию между GitHub Issues и задачами в системе управления проектами Dart AI.

### ✨ Основные возможности

- 🔄 **Двухсторонняя синхронизация** GitHub Issues ↔ Dart AI Tasks  
- 🔔 **Webhook поддержка** для автоматической синхронизации
- 🛠 **API для ручного управления** синхронизацией
- 📊 **Мониторинг и статистика** синхронизации
- 🚀 **Массовые операции** для batch-синхронизации

## 🚀 Быстрый старт

### 1. Настройка переменных окружения

```bash
# Dart AI API конфигурация
DART_AI_API_URL=https://api.dartai.com
DART_AI_API_KEY=your_dart_ai_api_key_here

# GitHub интеграция
GITHUB_TOKEN=your_github_token_here

# Основной репозиторий для синхронизации (опционально)
DEFAULT_GITHUB_REPO=gHashTag/ai-server
```

### 2. Запуск сервера

```bash
npm run dev
# или
npm start
```

### 3. Проверка статуса

```bash
curl http://localhost:4000/api/dart-ai/status
```

## 📡 API Endpoints

### 📊 Статус и мониторинг

#### `GET /api/dart-ai/status`
Получить статус интеграции и статистику

**Ответ:**
```json
{
  "success": true,
  "status": "operational",
  "health_check": {
    "success": true,
    "message": "Dart AI API доступен"
  },
  "sync_stats": {
    "total_syncs": 150,
    "successful_syncs": 145,
    "failed_syncs": 5,
    "last_sync": "2024-01-15T14:30:00Z"
  }
}
```

### 🔄 Ручная синхронизация

#### `POST /api/dart-ai/sync/github-issue`
Синхронизировать GitHub Issue в Dart AI

**Запрос:**
```json
{
  "issue_number": 42,
  "repository": "gHashTag/ai-server"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Issue synced successfully",
  "result": {
    "success": true,
    "tasks_created": 1
  }
}
```

#### `POST /api/dart-ai/sync/task`
Синхронизировать задачу Dart AI в GitHub Issue

**Запрос:**
```json
{
  "task_id": "dart-task-12345",
  "repository": "gHashTag/ai-server"
}
```

#### `POST /api/dart-ai/sync/bulk-issues`
Массовая синхронизация GitHub Issues

**Запрос:**
```json
{
  "repository": "gHashTag/ai-server",
  "state": "open",
  "limit": 50
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Bulk sync completed: 45/50 successful",
  "results": {
    "total": 50,
    "successful": 45,
    "failed": 5,
    "errors": ["Issue #123: API rate limit exceeded"]
  }
}
```

## 🔔 Webhook Endpoints

### Dart AI Webhooks

#### `POST /webhooks/dart-ai/tasks`
Обрабатывает события от Dart AI Task Manager

**Headers:**
```
x-dart-event: task.created | task.updated | task.completed | task.deleted
x-dart-delivery: unique-delivery-id
x-dart-signature: webhook-signature (если поддерживается)
```

**События:**
- `task.created` - создание новой задачи
- `task.updated` - обновление задачи  
- `task.completed` - завершение задачи
- `task.deleted` - удаление задачи

### GitHub Issues Webhooks

#### `POST /webhooks/github/issues`
Обрабатывает события от GitHub Issues

**Headers:**
```
x-github-event: issues
x-github-delivery: unique-delivery-id
```

**События:**
- `opened` - создание новой issue
- `edited` - изменение issue
- `closed` - закрытие issue
- `reopened` - переоткрытие issue

## 🔧 Настройка Webhooks

### Dart AI Webhook Setup

1. Войдите в панель управления Dart AI
2. Перейдите в настройки интеграций
3. Добавьте webhook URL: `https://your-domain.com/webhooks/dart-ai/tasks`
4. Выберите события: `task.created`, `task.updated`, `task.completed`
5. Сохраните настройки

### GitHub Repository Webhook Setup

1. Откройте настройки репозитория на GitHub
2. Перейдите в раздел "Webhooks"
3. Добавьте новый webhook:
   - **URL:** `https://your-domain.com/webhooks/github/issues`
   - **Content type:** `application/json`
   - **Events:** Issues
4. Сохраните webhook

## 📋 Примеры использования

### Автоматическая синхронизация

При создании новой задачи в Dart AI автоматически создается соответствующая GitHub Issue:

```javascript
// Dart AI отправляет webhook
{
  "event": "task.created",
  "task": {
    "id": "dart-task-123",
    "title": "Реализовать новую функцию",
    "description": "Подробное описание задачи",
    "status": "open"
  },
  "repository": "gHashTag/ai-server"
}

// Система создает GitHub Issue #456
// И связывает его с задачей в Dart AI
```

### Ручная синхронизация через API

```bash
# Синхронизация конкретной GitHub Issue
curl -X POST http://localhost:4000/api/dart-ai/sync/github-issue \
  -H "Content-Type: application/json" \
  -d '{
    "issue_number": 123,
    "repository": "gHashTag/ai-server"
  }'

# Массовая синхронизация открытых Issues
curl -X POST http://localhost:4000/api/dart-ai/sync/bulk-issues \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "gHashTag/ai-server",
    "state": "open",
    "limit": 20
  }'
```

## 🔍 Тестирование

### Запуск интеграционных тестов

```bash
node tests/dart-ai/test-dart-ai-integration.js
```

### HTTP тесты

Используйте файл `src/http/dart-ai.http` для тестирования API endpoints в IDE.

### Тестовые сценарии

1. **Создание задачи в Dart AI** → Автоматическое создание GitHub Issue
2. **Изменение GitHub Issue** → Обновление задачи в Dart AI  
3. **Закрытие задачи в Dart AI** → Закрытие связанной GitHub Issue
4. **Массовая синхронизация** → Обработка множественных issues

## 📊 Мониторинг и логирование

### Просмотр логов

```bash
# Логи API запросов
npm run logs:api

# Логи ошибок
npm run logs:errors

# Минимальные логи
npm run logs:minimal
```

### Метрики синхронизации

Система отслеживает следующие метрики:
- Общее количество синхронизаций
- Успешные синхронизации  
- Неудачные синхронизации
- Время последней синхронизации
- Доступность API Dart AI

## ⚠️ Ограничения и рекомендации

### API Limits

- **GitHub API:** 5000 запросов/час для аутентифицированных пользователей
- **Dart AI API:** Ограничения согласно вашему плану
- **Рекомендуется:** Использовать batch операции для больших объемов данных

### Безопасность

- ✅ Всегда используйте HTTPS для webhook endpoints
- ✅ Валидируйте webhook подписи (когда доступно)
- ✅ Храните API ключи в переменных окружения
- ❌ Никогда не коммитьте API ключи в репозиторий

### Производительность  

- Используйте фоновые задачи для массовых операций
- Реализуйте retry логику для неудачных запросов
- Мониторьте rate limits API
- Кэшируйте часто запрашиваемые данные

## 🛠 Расширение функциональности

### Добавление новых событий

1. Расширьте `DartAIController` новым handler'ом
2. Добавьте соответствующий case в `handleTaskWebhook`
3. Обновите типы в `dart-ai.service.ts`
4. Добавьте тесты для нового события

### Интеграция с другими системами

Архитектура позволяет легко добавить поддержку:
- Jira Integration  
- Slack Notifications
- Telegram Bot Updates
- Email Notifications

## 📞 Поддержка

При возникновении проблем:

1. **Проверьте статус:** `GET /api/dart-ai/status`
2. **Просмотрите логи:** `npm run logs:errors`
3. **Запустите тесты:** `node tests/dart-ai/test-dart-ai-integration.js`
4. **Проверьте настройки webhook'ов**

### Типичные проблемы

**❌ "Dart AI API недоступен"**
- Проверьте `DART_AI_API_KEY` и `DART_AI_API_URL`
- Убедитесь в доступности api.dartai.com

**❌ "GitHub Issue not found"**  
- Проверьте права доступа `GITHUB_TOKEN`
- Убедитесь в существовании issue в репозитории

**❌ "Webhook signature invalid"**
- Проверьте настройки webhook в Dart AI
- Убедитесь в корректности `DART_AI_WEBHOOK_SECRET`

---

🚀 **Интеграция готова к использованию!** Для вопросов обращайтесь к документации API или в техническую поддержку.