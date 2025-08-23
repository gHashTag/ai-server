# Dart AI ↔ GitHub Issues: Руководство по двухсторонней синхронизации

## 🔍 Результаты исследования

### ⚠️ Ключевая находка
**API Dart AI доступен только для чтения (READ-ONLY)**

После детального изучения документации и тестирования API выяснилось:
- ✅ `GET /tasks` - работает
- ✅ `GET /spaces` - работает  
- ❌ `POST /tasks` - не поддерживается (Method "POST" not allowed)
- ❌ `PATCH /tasks/{id}` - не поддерживается
- ❌ `DELETE /tasks/{id}` - не поддерживается

## 🔄 Реализованное решение: Гибридная синхронизация

### Направление 1: Dart AI → GitHub (Автоматическая)
- ✅ **Работает полностью**: Задачи из Dart AI автоматически создают GitHub Issues
- ✅ **API интеграция**: Получаем задачи через `/api/v0/tasks`
- ✅ **Создание Issues**: Через GitHub API с подробным описанием

### Направление 2: GitHub → Dart AI (С симуляцией)
- ⚠️ **Симулируется**: GitHub Issues обрабатываются webhook'ами 
- 📝 **Логируется**: Действия записываются в лог для ручного переноса
- 🤝 **Интегрируется**: В будущем, когда API станет полным

## 🚀 Настройка интеграции

### 1. Переменные окружения

```bash
# .env файл
DART_AI_API_KEY=dsa_e4231f3e7b1fa6bdbeb44c181ee2de1ca1db84184325f27f46adbd66266423f4
GITHUB_TOKEN=your_github_token_here
DEFAULT_GITHUB_REPO=gHashTag/ai-server
```

### 2. Webhook настройка в GitHub

```
URL: https://your-server.com/webhooks/github/issues
Content type: application/json
Events: Issues
```

### 3. Dart AI интеграция (будущее)

Когда Dart AI API станет полнофункциональным:
```
URL: https://your-server.com/webhooks/dart-ai/tasks
Content type: application/json  
Events: task.created, task.updated, task.completed
```

## 📊 Доступные API endpoints

### GitHub → Dart AI
```bash
# Ручная синхронизация issue в задачу
POST /api/dart-ai/sync/github-issue
{
  "issue_number": 123,
  "repository": "gHashTag/ai-server"
}

# Webhook от GitHub (автоматический)
POST /webhooks/github/issues
```

### Dart AI → GitHub  
```bash
# Ручная синхронизация задачи в issue
POST /api/dart-ai/sync/task
{
  "task_id": "dart_task_id",
  "repository": "gHashTag/ai-server"  
}

# Массовая синхронизация
POST /api/dart-ai/sync/bulk-issues
{
  "repository": "gHashTag/ai-server",
  "state": "open",
  "limit": 50
}

# Статус интеграции
GET /api/dart-ai/status
```

## 🧪 Тестирование

### Запуск тестового webhook сервера
```bash
node test-github-webhook.js
```

### Создание тестового issue
```bash
curl -X POST http://localhost:3001/test/create-issue \
  -H "Content-Type: application/json" \
  -d '{"title": "Тест двухсторонней синхронизации"}'
```

### Проверка статуса
```bash
curl http://localhost:3001/status
```

## 📈 Мониторинг и статистика

Система ведет статистику синхронизации:
- **total_syncs**: Общее количество попыток
- **successful_syncs**: Успешные синхронизации
- **failed_syncs**: Неудачные попытки
- **last_sync**: Время последней синхронизации

## 🔮 Будущие возможности

Когда Dart AI API станет полнофункциональным, система автоматически перейдет к полной двухсторонней синхронизации:

1. **Реальное создание задач** в Dart AI
2. **Обновление статусов** задач из GitHub
3. **Автоматические webhooks** от Dart AI
4. **Полная синхронизация метаданных**

## 🎯 Текущие возможности

### ✅ Что работает сейчас:
- Получение всех задач из Dart AI
- Создание GitHub Issues из задач Dart AI  
- Webhook обработка GitHub Issues (с симуляцией)
- Подробное логирование всех операций
- REST API для ручного управления
- Статистика и мониторинг

### 🔧 Что симулируется:
- Создание задач в Dart AI из GitHub Issues
- Обновление статуса задач в Dart AI
- Webhooks от Dart AI

## 💡 Рекомендации по использованию

1. **Используйте Dart AI → GitHub** для автоматического создания Issues
2. **Мониторьте логи** для отслеживания GitHub → Dart AI событий
3. **Настройте GitHub webhooks** для получения обновлений
4. **Проверяйте статус** интеграции регулярно

## 🛠 Troubleshooting

### Проблема: Issues не создаются
- Проверьте `GITHUB_TOKEN` в `.env`
- Убедитесь что токен имеет права на создание Issues

### Проблема: Dart AI API недоступен
- Проверьте `DART_AI_API_KEY` 
- Убедитесь что API ключ актуален

### Проблема: Webhooks не работают
- Проверьте URL webhook'а в настройках GitHub
- Убедитесь что сервер доступен извне

---

> 🎉 **Система готова к использованию!** Полная двухсторонняя синхронизация будет активирована автоматически, как только Dart AI API станет полнофункциональным.