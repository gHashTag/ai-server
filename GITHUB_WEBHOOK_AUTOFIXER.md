# 🤖 GitHub Webhook Auto-fixer - Полная Интеграция с Claude Code

## 🎯 Обзор

**GitHub Webhook Auto-fixer** - это автоматическая система исправления проблем в Pull Request'ах с использованием Claude Code API. Система автоматически обнаруживает проблемы в PR (failed tests, build errors, conflicts) и исправляет их без вмешательства человека.

### ✨ Возможности

- 🔍 **Автоматическое обнаружение проблем** в PR через GitHub webhook'и
- 🤖 **Интеграция с Claude Code** для анализа и исправления кода
- 🔒 **Безопасная валидация** GitHub webhook подписей 
- ⚡ **Real-time обработка** событий GitHub
- 📊 **Rate limiting** и мониторинг
- 🧪 **Ручное тестирование** PR через API
- 📈 **Статистика** и логирование

---

## 🚀 Быстрый Старт

### 1. **Переменные Окружения**

Добавь в `.env` файл:

```bash
# GitHub Integration
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your-webhook-secret-key

# Claude Code API
CLAUDE_API_KEY=sk-ant-your-claude-api-key

# Optional: Custom settings  
NODE_ENV=development
```

### 2. **Настройка GitHub Webhook**

В настройках репозитория GitHub:

1. **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL:** `https://your-domain.com/webhooks/github/pr-issues`
3. **Content type:** `application/json`
4. **Secret:** твой `GITHUB_WEBHOOK_SECRET`
5. **Events:** Выбери:
   - ✅ Pull requests
   - ✅ Check suites
   - ✅ Check runs  
   - ✅ Pull request reviews

### 3. **Запуск Сервера**

```bash
# Development
npm run dev

# Production
npm run start
```

---

## 📡 API Endpoints

### **POST** `/webhooks/github/pr-issues`
**Основной endpoint для GitHub webhook'ов**

**Headers:**
- `X-GitHub-Event`: тип события (pull_request, check_suite, etc.)
- `X-GitHub-Delivery`: уникальный ID доставки
- `X-Hub-Signature-256`: HMAC подпись для валидации

**События:**
- `pull_request` (opened, synchronize, reopened)
- `check_suite` (completed with failures)
- `check_run` (individual failures)  
- `pull_request_review` (changes_requested)

**Пример ответа:**
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "event": "pull_request",
  "delivery": "12345678-1234-1234-1234-123456789abc",
  "processing_time_ms": 1250,
  "result": "fixes_applied"
}
```

### **GET** `/webhooks/github/status`
**Получить статус системы**

**Ответ:**
```json
{
  "success": true,
  "status": "operational",
  "github_token_configured": true,
  "claude_api_configured": true,
  "webhook_secret_configured": true,
  "stats": {
    "total_processed": 42,
    "successful_fixes": 38,
    "failed_fixes": 4,
    "last_activity": "2025-08-23T12:00:00.000Z"
  }
}
```

### **POST** `/webhooks/github/analyze/:pr_number`
**Ручной анализ PR**

**Параметры:**
- `pr_number`: номер PR для анализа

**Body:**
```json
{
  "repository": "gHashTag/ai-server"
}
```

**Пример:**
```bash
curl -X POST http://localhost:4000/webhooks/github/analyze/45 \
  -H "Content-Type: application/json" \
  -d '{"repository": "gHashTag/ai-server"}'
```

### **GET** `/webhooks/github/health`
**Health check endpoint**

---

## 🔧 Как Это Работает

### **Шаг 1: GitHub Event**
GitHub отправляет webhook при:
- Создании/обновлении PR
- Провале CI/CD проверок
- Запросе изменений в review

### **Шаг 2: Валидация**
Система проверяет:
- ✅ Подпись HMAC-SHA256
- ✅ Тип события GitHub
- ✅ Rate limiting
- ✅ Формат данных

### **Шаг 3: Анализ PR**
Автоматически получает:
- 📋 Информацию о PR
- ❌ Список проваленных checks
- 📊 Diff изменений
- 📁 Измененные файлы

### **Шаг 4: Claude Code Analysis**
Отправляет в Claude Code:
- 🔍 Контекст проблемы
- 📝 Код и diff
- 🚨 Типы ошибок
- 📊 Метаданные PR

### **Шаг 5: Применение Исправлений**
Claude Code возвращает:
- 🔧 Конкретные исправления
- 📁 Изменения файлов
- 💡 Объяснения решений
- ✅ Готовый commit message

### **Шаг 6: Автоматический Commit**
Система:
- ✏️ Применяет изменения к файлам
- 📝 Создает commit с исправлениями  
- 📤 Пушит в ветку PR
- 📊 Обновляет статистику

---

## 🛠️ Конфигурация

### **Настройки GitHub Token**

Создай Personal Access Token с правами:
- `repo` - доступ к репозиториям
- `workflow` - управление GitHub Actions
- `write:packages` - если нужен доступ к пакетам

### **Claude Code API**

Получи API ключ:
1. Зайди на [Claude API](https://console.anthropic.com/)
2. Создай API ключ
3. Добавь в `CLAUDE_API_KEY`

### **Webhook Secret**

Сгенерируй случайный секрет:
```bash
# macOS/Linux
openssl rand -hex 20

# Или используй любой генератор
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
```

---

## 🧪 Тестирование

### **Локальное Тестирование**

```bash
# Health check
curl http://localhost:4000/webhooks/github/health

# Status check
curl http://localhost:4000/webhooks/github/status

# Manual PR analysis
curl -X POST http://localhost:4000/webhooks/github/analyze/45 \
  -H "Content-Type: application/json" \
  -d '{"repository": "gHashTag/ai-server"}'
```

### **Тестирование Webhook'а**

Используй ngrok для локального тестирования:

```bash
# Установи ngrok
npm install -g ngrok

# Прокинь локальный сервер
ngrok http 4000

# Используй ngrok URL в GitHub webhook settings
# https://abc123.ngrok.io/webhooks/github/pr-issues
```

### **Отладочные Логи**

```bash
# Включить debug логи
export DEBUG=github-webhook:*

# Или установить log level
export LOG_LEVEL=debug
```

---

## 📊 Мониторинг и Логирование

### **Логи Webhook'ов**

Система логирует:
- 📨 Все входящие webhook'и
- ✅ Успешные валидации
- ❌ Ошибки и failures  
- ⏱️ Время обработки
- 📊 Статистику использования

### **Метрики**

Доступны через `/webhooks/github/status`:
- `total_processed` - общее количество обработанных webhook'ов
- `successful_fixes` - успешные исправления
- `failed_fixes` - неудачные попытки
- `last_activity` - последняя активность

### **Алерты**

Система может быть интегрирована с:
- 📧 Email уведомлениями
- 💬 Slack/Discord ботами  
- 📱 Telegram уведомлениями
- 📊 Grafana/Prometheus мониторингом

---

## 🔒 Безопасность

### **Валидация Подписей**

Все webhook'и валидируются через:
- HMAC-SHA256 подпись
- Timing-safe сравнение
- Secret key проверка

### **Rate Limiting**

Защита от спама:
- Максимум 100 webhook'ов в минуту с IP
- Автоматический reset каждую минуту
- 429 статус при превышении

### **Логирование Безопасности**

Система логирует:
- ❌ Неудачные попытки валидации
- 🚨 Подозрительную активность
- 📊 IP адреса и user-agent'ы
- ⏰ Временные метки всех событий

---

## 🚀 Production Deployment

### **Environment Variables**

```bash
# Production settings
NODE_ENV=production
PORT=4000

# GitHub
GITHUB_TOKEN=your-production-github-token
GITHUB_WEBHOOK_SECRET=your-production-webhook-secret

# Claude Code  
CLAUDE_API_KEY=your-production-claude-api-key

# Optional
LOG_LEVEL=info
MAX_WEBHOOK_RETRIES=3
WEBHOOK_TIMEOUT_MS=60000
```

### **Railway Deployment**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway deploy

# Set environment variables
railway env set GITHUB_TOKEN=your-token
railway env set GITHUB_WEBHOOK_SECRET=your-secret
railway env set CLAUDE_API_KEY=your-claude-key
```

### **Docker Deployment**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

---

## 🔧 Настройка Workflow'ов

Можно интегрировать с GitHub Actions:

```yaml
name: Auto-fix PR Issues
on:
  pull_request:
    types: [opened, synchronize]
  check_suite:
    types: [completed]

jobs:
  notify-auto-fixer:
    runs-on: ubuntu-latest
    if: failure()
    steps:
      - name: Notify Auto-fixer
        run: |
          curl -X POST ${{ secrets.AUTO_FIXER_URL }}/webhooks/github/pr-issues \
            -H "Content-Type: application/json" \
            -H "X-GitHub-Event: manual_trigger" \
            -d '{"pr_number": ${{ github.event.number }}, "repository": "${{ github.repository }}"}'
```

---

## 📈 Примеры Использования

### **Типичные Исправления**

Система может автоматически исправить:

1. **TypeScript ошибки**
   - Отсутствующие импорты
   - Неправильные типы
   - Синтаксические ошибки

2. **Linting проблемы**
   - ESLint правила
   - Prettier форматирование
   - Unused imports

3. **Test failures**
   - Обновление snapshot'ов
   - Исправление мocked данных
   - Timeout настройки

4. **Build errors**
   - Dependency конфликты  
   - Path resolution
   - Environment variables

5. **Merge conflicts**
   - Автоматическое разрешение
   - Rebase конфликтов
   - File deletions

### **Workflow для Команды**

1. **Developer** создает PR
2. **CI/CD** запускает проверки  
3. **GitHub** отправляет webhook при failure
4. **Auto-fixer** анализирует проблемы
5. **Claude Code** предлагает решения
6. **System** применяет исправления автоматически
7. **CI/CD** перезапускается с исправлениями
8. **PR** готов к review без ошибок! 🎉

---

## 🎉 Готово!

GitHub Webhook Auto-fixer настроен и готов к использованию!

**Следующие шаги:**
1. ✅ Настрой переменные окружения  
2. 🔗 Добавь webhook в GitHub репозиторий
3. 🧪 Протестируй на тестовом PR
4. 📊 Мониторь статистику через `/status`
5. 🚀 Наслаждайся автоматическими исправлениями!

**Никаких ручных фиксов больше!** 🤖✨