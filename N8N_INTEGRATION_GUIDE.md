# 🔥 N8N Workflow Automation - Полная Интеграция с AI Server

## 🎯 Обзор

Эта интеграция превращает N8N в мощную административную панель для управления AI Server workflow'ами. N8N обеспечивает визуальный интерфейс для создания сложных автоматизированных процессов.

## ✨ Возможности

### 🚀 **Основной Функционал**
- **Визуальный редактор workflow'ов** - создание сложных автоматизированных процессов
- **Кастомные ноды для AI Server** - прямая интеграция со всеми API эндпоинтами
- **Webhook интеграция** - двунаправленная связь между N8N и AI Server
- **Мониторинг и логи** - отслеживание выполнения workflow'ов

### 🎨 **Доступные AI Сервисы через N8N**
- **Instagram Scraping** - автоматический парсинг профилей и конкурентов
- **Neuro Image Generation** - генерация изображений через FLUX, Midjourney
- **Text-to-Video** - создание видео контента
- **Speech Generation** - синтез речи через ElevenLabs
- **User Management** - управление пользователями и балансами

### 📊 **Готовые Workflow Templates**
- **"Анализ Конкурентов"** - парсинг → анализ → генерация рекомендаций
- **"Создание Контента"** - получение заявки → генерация → доставка
- **"Мониторинг Системы"** - проверка статуса → уведомления → отчеты

## 🛠️ Установка и Настройка

### 1. **Запуск через Docker Compose**

```bash
# Клонируйте репозиторий и перейдите в директорию
cd /path/to/your/ai-server

# Настройте переменные окружения
cp .env.example .env
# Отредактируйте .env файл, добавьте:
# N8N_ADMIN_PASSWORD=your_secure_password

# Запустите всю систему
docker-compose up -d

# Проверьте статус контейнеров
docker-compose ps
```

### 2. **Доступ к интерфейсам**

- **N8N Admin Panel**: http://localhost:5678
  - Пользователь: `admin` 
  - Пароль: из переменной `N8N_ADMIN_PASSWORD`
  
- **AI Server API**: http://localhost:3000
- **N8N API Endpoints**: http://localhost:3000/api/n8n/*

### 3. **Настройка Credentials в N8N**

1. Откройте N8N интерфейс: http://localhost:5678
2. Перейдите в **Credentials** → **Add Credential**
3. Выберите **AI Server API**
4. Заполните поля:
   - **API URL**: `http://app:3000` (внутри Docker сети)
   - **API Key**: ваш API ключ
   - **Secret Key**: ваш секретный ключ

## 🎮 Быстрый Старт

### **Шаг 1: Тестирование Интеграции**

```bash
# Запустите тестовую функцию интеграции
node tests/n8n/test-n8n-integration.js
```

### **Шаг 2: Импорт Тестового Workflow'а**

1. Откройте N8N: http://localhost:5678
2. Нажмите **Import from file**
3. Загрузите: `n8n/workflows/test-ai-server-integration.json`
4. Активируйте workflow

### **Шаг 3: Тестовый Запуск**

```bash
# Отправьте тестовый webhook
curl -X POST http://localhost:5678/webhook/test-webhook \\
  -H "Content-Type: application/json" \\
  -d '{"username": "test_user", "prompt": "Beautiful landscape"}'
```

## 🔧 API Эндпоинты

### **N8N Management API**

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `GET` | `/api/n8n/health` | Проверка статуса интеграции |
| `GET` | `/api/n8n/workflows` | Список всех workflow'ов |
| `POST` | `/api/n8n/workflows` | Создание нового workflow'а |
| `PATCH` | `/api/n8n/workflows/:id/toggle` | Активация/деактивация |
| `GET` | `/api/n8n/executions/:id` | Статус выполнения |
| `POST` | `/api/n8n/webhook` | Получение данных из N8N |

### **Trigger Workflows**

```bash
# Запуск workflow'а по имени
curl -X POST http://localhost:3000/api/n8n/trigger/instagram-analysis \\
  -H "Content-Type: application/json" \\
  -d '{"telegram_id": "123456", "competitors_count": 5}'
```

## 📋 Примеры Workflow'ов

### **1. Instagram Competitor Analysis**

```json
{
  "name": "Instagram Competitor Analysis",
  "trigger": "webhook",
  "nodes": [
    {
      "type": "aiServerApi",
      "operation": "scrapeProfile",
      "parameters": {
        "username": "{{$json.username}}"
      }
    },
    {
      "type": "aiServerApi", 
      "operation": "analyzeCompetitors",
      "parameters": {
        "telegramId": "{{$json.telegram_id}}",
        "competitorsCount": 3
      }
    }
  ]
}
```

### **2. Content Generation Pipeline**

```json
{
  "name": "Content Generation Pipeline",
  "nodes": [
    {
      "type": "aiServerApi",
      "operation": "generateNeuroImage",
      "parameters": {
        "prompt": "{{$json.prompt}}",
        "model": "flux-schnell",
        "aspectRatio": "16:9"
      }
    },
    {
      "type": "aiServerApi",
      "operation": "generateSpeech", 
      "parameters": {
        "text": "{{$json.voice_text}}"
      }
    }
  ]
}
```

## 🔍 Мониторинг и Отладка

### **Логи и Мониторинг**

```bash
# Просмотр логов N8N
docker-compose logs -f n8n-admin

# Просмотр логов AI Server
docker-compose logs -f ai-server

# Мониторинг выполнения workflow'ов
curl http://localhost:3000/api/n8n/executions/EXECUTION_ID
```

### **Отладка Проблем**

1. **N8N недоступен**:
   ```bash
   docker-compose restart n8n-admin
   ```

2. **Ошибки аутентификации**:
   - Проверьте credentials в N8N
   - Убедитесь, что API ключи корректны

3. **Workflow не выполняется**:
   - Проверьте активность workflow'а в N8N
   - Убедитесь, что webhook URL корректен

## 🚀 Расширенные Возможности

### **Создание Кастомных Нодов**

1. Создайте файл в `n8n/custom-nodes/nodes/YourNode/YourNode.node.ts`
2. Добавьте ноду в `n8n/custom-nodes/package.json`
3. Перезапустите N8N контейнер

### **Интеграция с External APIs**

```javascript
// Пример кастомной ноды для внешнего API
export class CustomApiNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Custom API Node',
    name: 'customApi',
    // ... остальная конфигурация
  };
}
```

### **Автоматические Отчеты**

Настройте workflow'ы для автоматической генерации отчетов:
- Ежедневные сводки по генерации контента  
- Еженедельные отчеты по Instagram аналитике
- Мониторинг системных ресурсов

## 🎯 Production Deployment

### **Для Production использования:**

1. **Безопасность**:
   ```env
   N8N_BASIC_AUTH_PASSWORD=very_secure_password
   N8N_JWT_AUTH_ACTIVE=true
   N8N_ENCRYPTION_KEY=your_encryption_key
   ```

2. **База данных**:
   ```env
   DB_TYPE=postgres  
   DB_POSTGRESDB_HOST=postgres
   DB_POSTGRESDB_DATABASE=n8n
   ```

3. **SSL/HTTPS**:
   ```env
   N8N_PROTOCOL=https
   WEBHOOK_URL=https://your-domain.com
   ```

## 🆘 Помощь и Поддержка

### **Полезные Команды**

```bash
# Полная перезагрузка системы
docker-compose down && docker-compose up -d

# Очистка данных N8N (ОСТОРОЖНО!)
docker volume rm n8n_n8n_data

# Экспорт всех workflow'ов
curl -u admin:password http://localhost:5678/api/v1/workflows > workflows_backup.json
```

### **Troubleshooting**

| Проблема | Решение |
|----------|---------|
| N8N не стартует | Проверьте доступность порта 5678 |
| Workflow не срабатывает | Убедитесь в активации и правильности webhook URL |
| API ошибки | Проверьте credentials и доступность AI Server |
| Медленное выполнение | Оптимизируйте ресурсы Docker контейнеров |

---

## 🎉 Заключение

N8N интеграция превращает ваш AI Server в полноценную автоматизированную платформу с визуальным управлением workflow'ами. Это решение масштабируется от простых автоматизаций до сложных enterprise workflow'ов.

**Следующие шаги:**
1. Запустите тестирование интеграции
2. Создайте свои первые workflow'ы
3. Настройте мониторинг и уведомления
4. Расширьте функционал кастомными нодами

**Удачной автоматизации! 🚀**