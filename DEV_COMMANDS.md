# 🚀 Команды для разработки

## Основные команды

### `npm run dev` или `bun dev`
- Собирает проект
- Запускает всю экосистему разработки:
  - AI Server (порт 4000)
  - Inngest Dev Server (порт 8289)  
  - N8N Workflow Admin (порт 5678)
- **Автоматически показывает логи в реальном времени**

### `npm run dev:full`
- То же самое что `npm run dev` - запускает полную экосистему

### `npm run dev:server`
- Запускает только AI Server без Inngest и N8N

### `npm run dev:inngest`
- Запускает только Inngest Dev Server

## Новая Экосистема Сервисов

После запуска `npm run dev` будут работать:

1. **AI Server** (порт 4000)
   - Основной Express сервер
   - API эндпоинты
   - Inngest роуты
   - N8N интеграция

2. **Inngest Dev Server** (порт 8289)
   - Workflow автоматизация
   - Dashboard: http://localhost:8289

3. **N8N Workflow Admin** (порт 5678)
   - Визуальный редактор workflow'ов
   - Админка для управления автоматизацией
   - Dashboard: http://localhost:5678
   - Логин: admin / admin123

## Полезные URL

- **Основной сервер:** http://localhost:4000
- **Inngest Dashboard:** http://localhost:8289
- **Inngest API:** http://localhost:4000/api/inngest
- **N8N Admin Panel:** http://localhost:5678 (admin/admin123)
- **N8N API:** http://localhost:4000/api/n8n/*

## Логи

Все логи сохраняются в папке `./logs/`:
- `main-server-*.log` - логи основного сервера
- `mcp-*.log` - логи MCP сервера  
- `inngest-*.log` - логи Inngest сервера

## Примеры использования

```bash
# Запуск полной экосистемы разработки (AI Server + Inngest + N8N)
bun dev
# или
npm run dev

# Запуск только AI Server
npm run dev:server

# Запуск только Inngest
npm run dev:inngest

# N8N команды
npm run n8n:standalone    # Запуск только N8N отдельно
npm run dev:n8n          # То же что standalone
npm run n8n:test         # Тестирование N8N интеграции

# Проверка статуса
ps aux | grep n8n
```

## N8N Workflow Commands

```bash
# Быстрый тест N8N webhook'а
curl -X POST http://localhost:5678/webhook/test-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Проверка N8N API через AI Server
curl http://localhost:4000/api/n8n/health

# Получение списка workflow'ов
curl http://localhost:4000/api/n8n/workflows
```

## Что показывают логи

После запуска `bun dev` вы увидите:
- Процесс сборки проекта
- Запуск AI Server на порту 4000
- Запуск Inngest Dev Server на порту 8289  
- Запуск N8N контейнера на порту 5678
- **Реальные логи всех сервисов в одном окне с префиксами:**
  - `[SERVER]` - логи AI Server
  - `[INNGEST]` - логи Inngest 
  - `[N8N]` - логи N8N
- Ошибки и предупреждения
- Inngest события и выполнение функций
- N8N workflow выполнения
- HTTP запросы к серверу

Для выхода из просмотра логов используйте `Ctrl+C`.

## N8N Особенности

- N8N запускается через 3 секунды после AI Server для корректной инициализации
- Запускается локально через npx без Docker
- Доступен сразу после запуска на http://localhost:5678
- Интегрирован с AI Server API через http://localhost:4000/api/n8n/*
- Данные сохраняются в локальной папке `~/.n8n`