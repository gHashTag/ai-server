# 🎨 NeuroPhoto N8N Workflow - Полное Руководство

## 🎯 Обзор

Создан полноценный N8N workflow для функции **NeuroPhoto** - одной из ключевых функций вашего AI сервера. Workflow автоматизирует весь процесс генерации персонализированных изображений.

## ⚡ Что Такое NeuroPhoto?

**NeuroPhoto** - это функция генерации персонализированных изображений с использованием пользовательских моделей:

- 📸 Генерирует изображения с лицом конкретного пользователя
- 🎭 Использует персональные модели, обученные на фотографиях пользователя  
- 💰 Автоматически списывает баланс в звездах
- 📱 Доставляет результаты через Telegram бот

### API Эндпоинт: `POST /api/generate/neuro-photo`

---

## 🚀 Быстрый Старт

### 1. **Запустить Экосистему**
```bash
bun dev
# Запускает AI Server + N8N + Inngest
```

### 2. **Импортировать Workflow**
1. Откройте N8N: http://localhost:5678 (admin/admin123)
2. Нажмите **Import from file**  
3. Выберите файл: `n8n/workflows/neurophoto-generation-workflow.json`
4. **Активируйте workflow** (переключатель Active)

### 3. **Протестировать Workflow**
```bash
# Запуск автоматических тестов
node tests/n8n/test-neurophoto-workflow.js
```

---

## 📋 Структура Workflow

### **Поток Выполнения:**
```
📥 Webhook          → ✅ Validation      → 🎨 NeuroPhoto API
    ↓                    ↓                     ↓
📤 Response        ← 📊 Process Result  ← ✔️ Check Success
```

### **Ноды Workflow:**

1. **📥 NeuroPhoto Webhook** - принимает запросы
2. **✅ Validate Input** - проверяет обязательные поля
3. **🎨 Call NeuroPhoto API** - вызывает AI Server API
4. **✔️ Check API Success** - анализирует результат
5. **📊 Process Success/Error** - обрабатывает ответ
6. **📤 Response** - возвращает результат

---

## 🔧 Параметры Запроса

### **Обязательные:**
- `prompt` (string) - текст для генерации  
- `telegram_id` (string) - ID пользователя в Telegram
- `model_url` (string) - URL персональной модели пользователя

### **Опциональные:**
- `username` (string) - имя пользователя
- `num_images` (number) - количество изображений (по умолчанию 1)
- `is_ru` (boolean) - русский интерфейс (по умолчанию true)
- `bot_name` (string) - название бота (по умолчанию 'neuro_blogger_bot')
- `gender` (string) - пол для генерации ('male'/'female')

### **Пример запроса:**
```json
{
  "prompt": "Beautiful portrait in a magical forest, high quality",
  "telegram_id": "123456789", 
  "model_url": "user123/model-version-1",
  "username": "john_doe",
  "num_images": 2,
  "is_ru": true,
  "bot_name": "neuro_blogger_bot",
  "gender": "male"
}
```

---

## 🧪 Тестирование

### **Автоматические Тесты:**
```bash
# Полный набор тестов
node tests/n8n/test-neurophoto-workflow.js
```

**Тесты проверяют:**
- ✅ Корректную обработку валидных запросов
- ❌ Валидацию обязательных полей 
- 🔧 Работу с опциональными параметрами
- 🚨 Обработку ошибок API

### **Ручное Тестирование:**

**Webhook URL:** http://localhost:5678/webhook/neurophoto-generation

```bash
# Тест с корректными данными
curl -X POST http://localhost:5678/webhook/neurophoto-generation \\
  -H "Content-Type: application/json" \\
  -d '{
    "prompt": "Professional headshot, business style",
    "telegram_id": "123456789",
    "model_url": "test-user/model-v1",
    "num_images": 1
  }'

# Тест ошибки валидации (отсутствует prompt)
curl -X POST http://localhost:5678/webhook/neurophoto-generation \\
  -H "Content-Type: application/json" \\
  -d '{
    "telegram_id": "123456789",
    "model_url": "test-user/model-v1"
  }'
```

---

## 📊 Ответы Workflow

### **✅ Успешный Ответ:**
```json
{
  "success": true,
  "message": "NeuroPhoto generation completed successfully",
  "workflow_id": "neurophoto-generation",
  "timestamp": "2025-08-23T12:00:00.000Z",
  "data": {
    "job_id": "neuro_photo_123456789_1692792000000",
    "telegram_id": "123456789",
    "prompt": "Beautiful portrait...",
    "model_url": "user123/model-v1",
    "num_images": 2
  },
  "processing_info": {
    "workflow_executed_at": "2025-08-23T12:00:00.000Z",
    "api_call_successful": true,
    "estimated_completion": "Асинхронная обработка, результат будет доставлен в Telegram"
  }
}
```

### **❌ Ошибка Валидации:**
```json
{
  "success": false,
  "message": "Validation failed: missing required fields",
  "validation_error": {
    "missing_fields": ["prompt", "model_url"],
    "required_fields": ["prompt", "telegram_id", "model_url"]
  },
  "example_request": { ... }
}
```

### **🚨 Ошибка API:**
```json
{
  "success": false,
  "message": "NeuroPhoto generation failed", 
  "error": {
    "reason": "Insufficient balance",
    "possible_causes": [
      "Недостаточно баланса пользователя",
      "Некорректный model_url",
      "Ошибка внешнего API (Replicate)"
    ]
  },
  "troubleshooting": { ... }
}
```

---

## 🎛️ Мониторинг в N8N

### **В N8N Dashboard:**
1. **Executions** - история выполнения workflow'ов
2. **Logs** - детальные логи каждого выполнения  
3. **Performance** - время выполнения нод
4. **Errors** - журнал ошибок с детализацией

### **Ключевые Метрики:**
- Успешность выполнения workflow'ов
- Время обработки запросов
- Частые ошибки валидации
- Производительность API вызовов

---

## 🔧 Настройка и Кастомизация

### **Изменение Timeout:**
В ноде "Call NeuroPhoto API" → Options → Timeout (по умолчанию 60 секунд)

### **Добавление Логирования:**
В нодах "Process Success/Error" можно добавить дополнительные console.log

### **Интеграция с Другими Системами:**
- Добавить ноды для отправки в Slack
- Интегрировать с базой данных для логирования
- Подключить email уведомления

---

## 🚀 Production Советы

### **Безопасность:**
- Используйте HTTPS для production
- Настройте аутентификацию webhook'ов
- Ограничьте доступ к N8N интерфейсу

### **Масштабирование:**
- Настройте очереди для обработки пиков нагрузки
- Добавьте retry механизмы для надежности
- Мониторьте производительность

### **Отладка:**
- Включите детальное логирование в production
- Настройте алерты на критические ошибки
- Регулярно тестируйте workflow

---

## 🎉 Готово!

NeuroPhoto workflow полностью интегрирован и готов к использованию! 

**Следующие шаги:**
1. ✅ Активируйте workflow в N8N
2. 🧪 Запустите тесты: `node tests/n8n/test-neurophoto-workflow.js`
3. 🎨 Начните генерировать нейрофото через N8N!

**Happy AI Generation! 🎨✨**