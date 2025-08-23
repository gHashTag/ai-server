# 🌐 Network Check Monitoring System - Полное руководство

## 🎯 Обзор системы

Комплексная система мониторинга network check ошибок, которая решает проблему недоступности сервисов после деплоя. Система автоматически отслеживает состояние критичных эндпоинтов, уведомляет о проблемах и предпринимает попытки автоматического восстановления.

## 🚀 Основные компоненты

### 1. **Network Check Monitor** (`networkCheckMonitor`)

- **Запуск**: Каждые 10 минут
- **Функция**: Мониторинг доступности критичных эндпоинтов
- **Проверяемые эндпоинты**:
  - Main API (`/`)
  - Health Check (`/health`)
  - User Balance API (`/api/user/balance`)
  - Generation Status (`/api/generation/status`)

### 2. **Post-Deploy Network Check** (`postDeployNetworkCheck`)

- **Запуск**: После события `deployment/completed`
- **Функция**: Интенсивная проверка после деплоя
- **Алгоритм**: 3 проверки с интервалом в 1 минуту после 2-минутного ожидания

### 3. **Deployment Auto Detector** (`deploymentAutoDetector`)

- **Запуск**: Каждые 5 минут
- **Функция**: Автоматическое обнаружение новых деплоев
- **Детекция**: По изменению версии Railway/Docker

### 4. **Deployment Recovery System** (`deploymentRecoverySystem`)

- **Запуск**: По событию `deployment/recovery-needed`
- **Функция**: Автоматическое восстановление при критичных проблемах
- **Действия**: Перезапуск сервисов, ожидание стабилизации

### 5. **Railway Deployment Webhook** (`railwayDeploymentWebhook`)

- **Запуск**: По webhook от Railway
- **Функция**: Обработка уведомлений о деплое от Railway

## 📊 Алгоритм работы

### Обычный мониторинг:

1. **Каждые 10 минут** - проверка всех критичных эндпоинтов
2. **Сохранение результатов** в базу данных для анализа трендов
3. **Анализ трендов** за последние 2 часа
4. **Отправка уведомлений** только при обнаружении проблем

### После деплоя:

1. **Автоматическое обнаружение** нового деплоя
2. **Ожидание 2 минуты** для стабилизации
3. **3 проверки подряд** с интервалом в 1 минуту
4. **Анализ результатов** и отправка отчета
5. **Запуск восстановления** при критичном проценте неудач (>50%)

### Система восстановления:

1. **Уведомление о начале** процедуры восстановления
2. **Перезапуск сервисов** (Railway API/Docker)
3. **Ожидание стабилизации** (2 минуты)
4. **Проверка результата** (5 минут ожидания)
5. **Рекомендация отката** если восстановление не помогло

## 🔧 Установка и настройка

### 1. Переменные окружения

```env
# Основные настройки
APP_URL=https://your-app-url.railway.app
ADMIN_CHAT_ID=-1002250147975
ADMIN_TELEGRAM_ID=144022504

# Railway интеграция (автоматически)
RAILWAY_DEPLOYMENT_ID=auto-generated
RAILWAY_GIT_COMMIT_SHA=auto-generated
RAILWAY_GIT_BRANCH=auto-generated

# Опционально - Railway API для восстановления
RAILWAY_TOKEN=your-railway-token
```

### 2. База данных

Система автоматически создает необходимые таблицы:

```sql
CREATE TABLE network_check_history (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,
  response_time INTEGER NOT NULL,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Регистрация функций

Функции автоматически регистрируются в `src/inngest-functions/index.ts`:

```typescript
import {
  networkCheckMonitor,
  triggerNetworkCheck,
  postDeployNetworkCheck,
} from './networkCheckMonitor'

export const functions = [
  // ... другие функции
  networkCheckMonitor,
  triggerNetworkCheck,
  postDeployNetworkCheck,
  deploymentAutoDetector,
  deploymentRecoverySystem,
  railwayDeploymentWebhook,
]
```

## 🧪 Тестирование

### Запуск тестов:

```bash
# Полный набор тестов
node tests/network-check/test-network-monitoring.js

# Ручной запуск network check
npx inngest-cli@latest send -n "network/trigger-check" -d '{"userId":"admin"}'

# Симуляция завершения деплоя
npx inngest-cli@latest send -n "deployment/completed" -d '{"version":"test-v1.0.0","deployedAt":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

### Проверка работы:

1. **Inngest Dashboard**: http://localhost:8288
2. **Логи функций** в реальном времени
3. **Telegram уведомления** в группе
4. **База данных** - таблица `network_check_history`

## 📱 Уведомления

### Типы уведомлений:

#### 🌐 Network Check Failure

```
🚨🌐 NETWORK CHECK FAILURE!

🕐 Время: 23.08.2025, 15:30:00
🚀 Деплой: v1.2.3 (15 мин назад)

📊 Статистика за 2 часа:
• Всего проверок: 36
• Неудачных: 8 (22.2%)

🔍 Результаты проверки:
❌ Main API (timeout)
✅ Health Check (245ms)
❌ User Balance API (HTTP 500)
✅ Generation Status (156ms)

⚠️ Проблемные эндпоинты:
• Main API
• User Balance API

🛠 Действия:
• Проверить успешность деплоя
• Откатить изменения при необходимости
• Проверить состояние серверов
• Проверить сетевые соединения
```

#### 🚀 Post-Deploy Report

```
🚀 POST-DEPLOY NETWORK CHECK REPORT

📦 Версия: railway-deploy-abc123
🕐 Время деплоя: 23.08.2025, 15:15:00

📊 Результат 3-х проверок:
• Всего проверок: 12
• Успешных: 12
• Неудачных: 0
• Процент неудач: 0.0%

✅ ДЕПЛОЙ УСПЕШЕН - все проверки пройдены
```

#### 🛠 Recovery System

```
🛠 АВТОМАТИЧЕСКОЕ ВОССТАНОВЛЕНИЕ ЗАПУЩЕНО

📦 Проблемная версия: v1.2.3
📊 Процент неудач: 75%
⚠️ Критичные эндпоинты: Main API, User Balance API

🔄 Начинаю процедуру восстановления...
```

## 🔄 Интеграция с деплоем

### Автоматическая интеграция с Railway:

Railway автоматически предоставляет переменные:

- `RAILWAY_DEPLOYMENT_ID`
- `RAILWAY_GIT_COMMIT_SHA`
- `RAILWAY_GIT_BRANCH`

### Ручная интеграция:

```typescript
import { manualDeploymentNotification } from '@/utils/deploymentReporter'

// После успешного деплоя
await manualDeploymentNotification('v1.2.3', 'production')
```

### Webhook интеграция:

```bash
# Настройка webhook в Railway
curl -X POST "https://your-app.railway.app/webhook/railway/deployment" \
  -H "Content-Type: application/json" \
  -d '{"status":"SUCCESS","deploymentId":"abc123","service":"ai-server"}'
```

## 📈 Мониторинг и аналитика

### Просмотр истории:

```sql
-- Статистика за сутки
SELECT
  endpoint,
  COUNT(*) as total_checks,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  AVG(response_time) as avg_response_time
FROM network_check_history
WHERE checked_at >= NOW() - INTERVAL '1 day'
GROUP BY endpoint;

-- Проблемные периоды
SELECT
  DATE_TRUNC('hour', checked_at) as hour,
  COUNT(CASE WHEN status != 'success' THEN 1 END) as failures
FROM network_check_history
WHERE checked_at >= NOW() - INTERVAL '7 days'
GROUP BY hour
HAVING COUNT(CASE WHEN status != 'success' THEN 1 END) > 0
ORDER BY hour DESC;
```

### Inngest Dashboard:

- **Функции**: Все зарегистрированные функции
- **События**: История запусков и результатов
- **Логи**: Подробные логи каждого выполнения
- **Ошибки**: Трассировка ошибок и повторы

## 🛠 Настройка и кастомизация

### Добавление новых эндпоинтов:

```typescript
// В networkCheckMonitor.ts
const CRITICAL_ENDPOINTS = [
  { url: `${process.env.APP_URL}`, name: 'Main API' },
  { url: `${process.env.APP_URL}/health`, name: 'Health Check' },
  { url: `${process.env.APP_URL}/api/user/balance`, name: 'User Balance API' },
  // Добавьте свой эндпоинт
  {
    url: `${process.env.APP_URL}/api/custom/endpoint`,
    name: 'Custom Endpoint',
  },
]
```

### Изменение расписания:

```typescript
// Изменить частоту проверок
{ cron: '*/5 * * * *' }, // Каждые 5 минут вместо 10

// Изменить частоту автодетекции
{ cron: '*/10 * * * *' }, // Каждые 10 минут вместо 5
```

### Настройка критериев восстановления:

```typescript
// В deploymentMonitor.ts - изменить порог для восстановления
if (failureRate > 30) {
  // Вместо 50%
  await triggerRecoveryIfNeeded(version, failureRate, criticalEndpoints)
}
```

## 📋 Troubleshooting

### Частые проблемы:

#### 1. **Функции не запускаются**

```bash
# Проверьте регистрацию в index.ts
# Перезапустите Inngest Dev Server
npx inngest-cli@latest dev --port 8288
```

#### 2. **Уведомления не приходят**

```bash
# Проверьте переменные окружения
echo $ADMIN_CHAT_ID
echo $ADMIN_TELEGRAM_ID

# Проверьте токен бота
curl "https://api.telegram.org/bot$BOT_TOKEN/getMe"
```

#### 3. **Ошибки базы данных**

```sql
-- Проверьте подключение
SELECT NOW();

-- Создайте таблицу вручную если нужно
CREATE TABLE IF NOT EXISTS network_check_history (...);
```

#### 4. **Таймауты эндпоинтов**

```typescript
// Увеличьте таймаут в networkCheckMonitor.ts
const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 сек
```

### Логи и отладка:

```bash
# Логи Inngest
tail -f /tmp/logs/inngest.log

# Логи приложения
tail -f /tmp/logs/combined.log

# Проверка статуса функций
curl http://localhost:8288/v0/functions
```

## 🎯 Рекомендации по использованию

### Для production:

1. **Настройте proper alerting** - интеграция со Slack/Email
2. **Используйте Redis** для хранения состояния версий
3. **Настройте Railway API токен** для автоматического восстановления
4. **Мониторьте performance** - добавьте метрики в Grafana
5. **Регулярно очищайте** таблицу `network_check_history`

### Для development:

1. **Используйте staging endpoints** для тестирования
2. **Отключите автоматическое восстановление**
3. **Настройте отдельный Telegram chat** для уведомлений
4. **Запускайте тесты** перед каждым релизом

### Best Practices:

1. **Мониторьте тренды**, а не только мгновенные сбои
2. **Настройте разные уровни критичности** для разных эндпоинтов
3. **Документируйте все изменения** в конфигурации
4. **Регулярно проверяйте** работу системы восстановления
5. **Имейте план отката** на случай критических проблем

---

## 💡 Заключение

Система Network Check Monitoring обеспечивает:

✅ **Проактивное обнаружение** проблем после деплоя  
✅ **Автоматическое уведомление** команды через Telegram  
✅ **Детальная аналитика** и история проверок  
✅ **Автоматическое восстановление** при критичных сбоях  
✅ **Интеграция с Railway** и другими платформами  
✅ **Гибкая настройка** под нужды проекта

Теперь вы больше не будете терять изменения из-за network check ошибок! 🎉
