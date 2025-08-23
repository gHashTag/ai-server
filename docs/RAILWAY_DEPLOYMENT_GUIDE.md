# 🚄 Railway Deployment Guide

## Обзор

Этот проект настроен для деплоя на Railway с двумя окружениями:

- **Staging (тестовое)** - автодеплой из ветки `main`
- **Production (продакшн)** - автодеплой из ветки `production`

## 📋 Шаги для настройки деплоя

### 1. Создание проекта в Railway

1. Перейдите на [railway.app](https://railway.app)
2. Создайте новый проект
3. Подключите свой GitHub репозиторий

### 2. Создание двух окружений

#### Staging Environment (тестовое)

1. В Railway Dashboard перейдите в раздел "Environments"
2. Создайте окружение "staging"
3. Настройте автодеплой из ветки `main`
4. Добавьте переменные окружения (см. раздел ниже)

#### Production Environment (продакшн)

1. Создайте окружение "production"
2. Настройте автодеплой из ветки `production`
3. Добавьте переменные окружения для продакшна

### 3. Переменные окружения

#### Обязательные для обоих окружений:

```bash
# App Configuration
NODE_ENV=production
PORT=${{ PORT }}  # Railway автоматически предоставляет

# Database
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
OPENAI_API_KEY=your_openai_key
REPLICATE_API_TOKEN=your_replicate_token
ELEVENLABS_API_KEY=your_elevenlabs_key
BFL_API_KEY=your_bfl_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_admin_chat_id

# Authentication
JWT_SECRET_KEY=your_jwt_secret

# Inngest
INNGEST_EVENT_KEY=your_inngest_event_key
INNGEST_SIGNING_KEY=your_inngest_signing_key

# Payment
ROBOKASSA_MERCHANT_LOGIN=your_merchant_login
ROBOKASSA_PASSWORD_1=your_password_1
ROBOKASSA_PASSWORD_2=your_password_2
```

#### Различия между окружениями:

**Staging:**

```bash
APP_ENV=staging
BASE_URL=https://your-staging-app.railway.app
LOG_LEVEL=debug
ENABLE_LOGGING=true
```

**Production:**

```bash
APP_ENV=production
BASE_URL=https://your-production-app.railway.app
LOG_LEVEL=info
ENABLE_LOGGING=false
```

### 4. Настройка доменов

1. В Railway настройте custom домены для каждого окружения:
   - Staging: `staging.yourdomain.com`
   - Production: `yourdomain.com`

### 5. Health Checks

Railway использует health check endpoint: `/health`

Настройки в `railway.toml`:

- `healthcheckPath = "/health"`
- `healthcheckTimeout = 60`

### 6. Мониторинг и логи

1. В Railway Dashboard перейдите в раздел "Deployments"
2. Просматривайте логи для каждого окружения
3. Настройте уведомления о деплоях

## 🔧 Команды для разработки

### Локальная разработка

```bash
npm run dev:simple
```

### Тестирование перед деплоем

```bash
npm run build
npm start
```

### Проверка health endpoint

```bash
curl http://localhost:4000/health
```

## 📝 Workflow развертывания

### Для тестового окружения:

1. Создайте feature branch из `main`
2. Внесите изменения
3. Создайте PR в `main`
4. После мержа в `main` - автоматический деплой в staging

### Для продакшн окружения:

1. Создайте PR из `main` в `production`
2. Проведите тестирование в staging
3. После мержа в `production` - автоматический деплой в продакшн

## 🚨 Troubleshooting

### Проблемы с деплоем:

1. Проверьте логи в Railway Dashboard
2. Убедитесь, что все переменные окружения установлены
3. Проверьте статус health check

### Распространенные ошибки:

- **Build failed**: Проверьте `package.json` и зависимости
- **Health check failed**: Убедитесь, что сервер отвечает на `/health`
- **Port issues**: Railway автоматически назначает PORT

## 📊 Мониторинг

Railway предоставляет:

- Метрики производительности
- Логи приложения
- Статистику использования ресурсов
- Уведомления о статусе деплоя

## 🔐 Безопасность

1. Используйте переменные окружения для всех секретных данных
2. Не коммитьте `.env` файлы
3. Регулярно обновляйте API ключи
4. Используйте разные ключи для staging и production

## 💡 Лучшие практики

1. **Zero-downtime deployments**: Railway поддерживает по умолчанию
2. **Environment parity**: Используйте одинаковую конфигурацию для staging и production
3. **Database migrations**: Запускайте миграции перед деплоем
4. **Testing**: Всегда тестируйте в staging перед production
5. **Rollback plan**: Держите готовый план отката изменений
