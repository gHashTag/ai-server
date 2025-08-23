# 📋 Управление логами AI Server

## 🎯 Быстрый старт

```bash
# Обычные логи (много шума)
npm run logs:all

# Чистые логи (только важное)
npm run logs:clean

# Только ошибки
npm run logs:errors

# Только API запросы
npm run logs:api

# Минимум логов
npm run logs:minimal

# Справка
npm run logs:help
```

## 🔧 Конфигурация через переменные окружения

Скопируйте из `.env.logs` в ваш `.env`:

```bash
# Минимальные логи - только ошибки и старт
MINIMAL_LOGS=true

# Скрыть health checks
SHOW_HEALTH_CHECKS=false

# Уровень логирования
LOG_LEVEL=warn

# Inngest только ошибки
INNGEST_LOG_LEVEL=error
```

## 📊 Уровни фильтрации

### 1. **minimal** - Супер чисто

- Только ошибки и старт сервера
- Никакого шума
- Идеально для продакшена

### 2. **important** - Разумный баланс (по умолчанию)

- Ошибки + предупреждения
- API запросы
- Старт/остановка сервисов
- Нет health checks

### 3. **error** - Только проблемы

- ERROR уровень
- Сбои и исключения
- Критические события

### 4. **api** - Только HTTP API

- POST/GET/PUT/DELETE /api/\*
- Полезно для отладки API

## 🎛 Продвинутая настройка

### Inngest CLI опции

Уже настроено в `ecosystem.mcp.config.js`:

```javascript
args: [
  'inngest-cli@latest',
  'dev',
  '--log-level',
  'warn', // только предупреждения
  '--json', // структурированный вывод
]
```

### Winston Logger настройки

В `src/utils/logger.ts` контролируется через переменные:

- `MINIMAL_LOGS=true` - супер тихий режим
- `SHOW_TIMESTAMPS=false` - убрать временные метки
- `SHOW_HEALTH_CHECKS=true` - показать health checks

## 🚀 Практические примеры

### Разработка

```bash
# Обычная разработка - баланс информации
npm run dev

# Тихая разработка - минимум шума
MINIMAL_LOGS=true npm run dev
```

### Отладка

```bash
# Смотрим только ошибки
npm run logs:errors

# Следим за API
npm run logs:api

# Все важное
npm run logs:clean
```

### Продакшн

```bash
# В .env
LOG_LEVEL=error
MINIMAL_LOGS=true
INNGEST_LOG_LEVEL=error
```

## 🔍 Диагностика проблем

1. **Много шума от Inngest**:
   - Увеличьте `INNGEST_LOG_LEVEL=error`
2. **Много HTTP запросов**:
   - Установите `SHOW_HEALTH_CHECKS=false`
3. **Совсем тихо**:

   - Установите `MINIMAL_LOGS=true`

4. **Отладка API**:
   - Используйте `npm run logs:api`

## 📁 Файлы логов

Логи сохраняются в `./logs/`:

- `main-server.log` - основной сервер
- `inngest.log` - Inngest функции
- `mcp.log` - MCP сервер

## 💡 Tips

- Используйте `Ctrl+C` для выхода из просмотра логов
- Комбинируйте переменные окружения для точной настройки
- В продакшене всегда используйте `LOG_LEVEL=warn` или выше
- Для CI/CD установите `MINIMAL_LOGS=true`
