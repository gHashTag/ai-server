# 🎯 Задание клиента: Тестирование интеграции Dart AI

## 📋 Цель задания

Протестировать работу двусторонней синхронизации между GitHub Issues и Dart AI Task Manager в продакшн-среде.

## 🔗 Доступ к системам

- **Dart AI Task Manager**: https://app.dartai.com
- **GitHub Repository**: https://github.com/gHashTag/ai-server
- **Production API**: https://ai-server-production.up.railway.app

## 🧪 Тестовые сценарии

### 1. Проверка API доступности

**Задача**: Убедиться, что Dart AI API endpoints работают

**Действия**:

```bash
# Проверить статус сервера
curl https://ai-server-production.up.railway.app/health

# Получить список задач из Dart AI
curl -X GET "https://ai-server-production.up.railway.app/api/dart-ai/tasks" \
  -H "Content-Type: application/json"
```

**Ожидаемый результат**:

- Healthcheck возвращает статус 200 OK
- API возвращает список задач в JSON формате

### 2. Создание задачи в Dart AI

**Задача**: Создать новую задачу через API

**Действия**:

```bash
curl -X POST "https://ai-server-production.up.railway.app/api/dart-ai/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Тестовая задача от клиента",
    "description": "Проверка работы интеграции Dart AI",
    "dartboard": "test-board"
  }'
```

**Проверка**:

- Зайти в https://app.dartai.com
- Найти созданную задачу "Тестовая задача от клиента"

### 3. Синхронизация с GitHub Issues

**Задача**: Проверить создание GitHub Issue из Dart AI задачи

**Действия**:

1. В Dart AI Task Manager найти созданную задачу
2. Добавить в описание задачи: `sync-to-github: true`
3. Выполнить синхронизацию:

```bash
curl -X POST "https://ai-server-production.up.railway.app/api/dart-ai/sync/to-github" \
  -H "Content-Type: application/json" \
  -d '{"taskId": "ID_СОЗДАННОЙ_ЗАДАЧИ"}'
```

**Проверка**:

- Открыть https://github.com/gHashTag/ai-server/issues
- Найти новый Issue с названием "Тестовая задача от клиента"

### 4. Обратная синхронизация

**Задача**: Проверить синхронизацию изменений из GitHub обратно в Dart AI

**Действия**:

1. В созданном GitHub Issue добавить комментарий: "Тест обратной синхронизации"
2. Выполнить синхронизацию:

```bash
curl -X POST "https://ai-server-production.up.railway.app/api/dart-ai/sync/from-github" \
  -H "Content-Type: application/json" \
  -d '{"issueNumber": НОМЕР_ISSUE}'
```

**Проверка**:

- Вернуться в Dart AI Task Manager
- Убедиться, что изменения из GitHub отражены в задаче

### 5. Webhook тестирование

**Задача**: Проверить автоматическую синхронизацию через webhooks

**Действия**:

1. Создать новый Issue в GitHub с меткой `dart-ai-sync`
2. Добавить комментарий в Issue
3. Закрыть Issue

**Проверка**:

- Задача должна автоматически появиться в Dart AI
- Комментарии должны синхронизироваться
- Статус задачи должен измениться при закрытии Issue

## 📊 Отчет о тестировании

### ✅ Пройденные тесты

- [ ] API доступность
- [ ] Создание задачи в Dart AI
- [ ] Синхронизация Dart AI → GitHub
- [ ] Обратная синхронизация GitHub → Dart AI
- [ ] Webhook автосинхронизация

### ❌ Обнаруженные проблемы

_Заполняется в процессе тестирования_

### 📝 Комментарии и предложения

_Заполняется клиентом_

## 🔍 Дополнительные проверки

### Проверка таймаутов

- Создать задачу с длинным описанием (>1000 символов)
- Проверить обработку Instagram reels parsing (если применимо)

### Проверка безопасности

- Убедиться, что API keys не отображаются в логах
- Проверить, что webhooks работают только для авторизованных запросов

## 📞 Контакты для поддержки

- При обнаружении проблем создать Issue в GitHub
- Описать воспроизводимые шаги
- Приложить логи и скриншоты

## ⏱ Срок выполнения

**Дедлайн**: 3 рабочих дня с момента получения задания

**Ожидаемое время**: 2-4 часа на полное тестирование

---

_Создано автоматически системой Claude Code - AI Server Production Testing Suite_
