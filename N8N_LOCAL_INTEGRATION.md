# 🚀 N8N Local Integration - БЕЗ Docker!

## ✅ Обновление Завершено

N8N теперь запускается **локально через npm** без необходимости Docker. Все интегрировано в привычную команду `bun dev`.

## 🎯 Что Изменилось

### ❌ **Убрано:**
- Docker контейнеры для N8N
- Docker команды в dev-full.js
- Зависимости от Docker в development

### ✅ **Добавлено:**
- N8N как npm dependency
- Локальный запуск через `npx n8n start`
- Переменные окружения в процессе Node.js
- Упрощенные команды

## 🚀 Быстрый Старт

```bash
# 1. Установить зависимости (включая N8N)
npm install

# 2. Запустить полную экосистему
bun dev
# Автоматически запускает:
# - AI Server (порт 4000)
# - Inngest (порт 8289)  
# - N8N (порт 5678) ← БЕЗ Docker!

# 3. Открыть N8N админку
# http://localhost:5678
# Логин: admin / Пароль: admin123
```

## 🎛️ Доступные Команды

```bash
# Основные
bun dev              # Полная экосистема
npm run dev:n8n      # Только N8N отдельно
npm run n8n:standalone # То же что dev:n8n

# Тестирование
npm run n8n:test        # Тест интеграции N8N
npm run test:ecosystem  # Тест всей экосистемы

# Проверка процессов
ps aux | grep n8n       # Статус N8N процесса
```

## 📊 Архитектура

```
bun dev запускает:
├── 🎯 AI Server (node dist/server.js)
├── ⚡ Inngest (npx inngest-cli dev) 
└── 🎛️ N8N (npx n8n start) ← Локальный процесс!
```

## 💡 Преимущества Локального Запуска

- ✅ **Быстрее** - нет накладных расходов Docker
- ✅ **Проще отладка** - прямые процессы Node.js
- ✅ **Меньше зависимостей** - не нужен Docker для dev
- ✅ **Единая экосистема** - все через npm
- ✅ **Логи в одном месте** - все префиксы `[SERVER]`, `[INNGEST]`, `[N8N]`

## 🔧 Конфигурация N8N

N8N настраивается через переменные окружения:
```env
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin  
N8N_BASIC_AUTH_PASSWORD=admin123
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=http
WEBHOOK_URL=http://localhost:5678
GENERIC_TIMEZONE=Europe/Moscow
```

Данные сохраняются в `~/.n8n/` локально.

## 🧪 Тестирование

```bash
# Полный тест экосистемы
npm run test:ecosystem

# Только N8N интеграция  
npm run n8n:test

# Проверка что N8N отвечает
curl http://localhost:5678/healthz
```

## 🎉 Готово!

Теперь `bun dev` запускает всю экосистему без Docker зависимостей. N8N работает как обычный Node.js процесс в составе вашей системы разработки.

**Интеграция полностью готова к использованию! 🚀**