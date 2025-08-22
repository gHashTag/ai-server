# 🚀 Автоматическое создание проектов для Instagram парсинга

## ✅ Что изменилось

Теперь **project_id опциональный**! Система автоматически создает уникальный проект для каждого пользователя, если project_id не передан.

---

## 📋 Как это работает

### 1️⃣ **Автоматическое создание проекта (НОВОЕ!)**

Если клиент не передает `project_id`, система автоматически:
1. Создает новый проект на основе `telegram_id` пользователя
2. Привязывает проект к конкретному боту
3. Сохраняет все данные парсинга в этом проекте

**Пример запроса БЕЗ project_id:**
```json
{
  "username_or_id": "cristiano",
  "requester_telegram_id": "123456789",
  "telegram_username": "john_doe",
  "bot_name": "neuro_blogger_bot",
  "max_users": 50,
  "scrape_reels": true,
  "max_reels_per_user": 5
}
```

**Результат:**
- ✅ Автоматически создастся проект: "Instagram Analytics @john_doe"
- ✅ Проект получит уникальный ID (например, 42)
- ✅ Все данные сохранятся с привязкой к этому проекту

---

### 2️⃣ **Использование существующего проекта**

Если пользователь уже парсил данные, система найдет его существующий проект:

```json
{
  "username_or_id": "messi",
  "requester_telegram_id": "123456789",  // Тот же telegram_id
  "bot_name": "neuro_blogger_bot",       // Тот же бот
  "max_users": 30
}
```

**Результат:**
- ✅ Найдется существующий проект пользователя
- ✅ Новые данные добавятся к существующим
- ✅ История парсинга сохранится

---

### 3️⃣ **Ручное указание project_id (для обратной совместимости)**

Можно по-прежнему указать project_id вручную:

```json
{
  "username_or_id": "neymarjr",
  "project_id": 37,  // Явно указанный ID
  "max_users": 25
}
```

---

## 🗄️ Структура таблицы projects

```sql
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,                    -- Авто-инкрементный ID
  name VARCHAR(255) NOT NULL,              -- Название проекта
  telegram_id VARCHAR(255),                -- ID пользователя в Telegram
  telegram_username VARCHAR(255),          -- Username в Telegram
  bot_name VARCHAR(255),                   -- Имя бота
  description TEXT,                        -- Описание проекта
  is_active BOOLEAN DEFAULT true,          -- Активен ли проект
  created_at TIMESTAMP,                    -- Дата создания
  updated_at TIMESTAMP,                    -- Дата обновления
  metadata JSONB,                          -- Дополнительные данные
  UNIQUE(telegram_id, bot_name)           -- Уникальность по пользователю и боту
)
```

---

## 🔄 Сценарии использования

### **Сценарий 1: Первый парсинг нового клиента**

```javascript
// Клиент запускает парсинг впервые
const event = {
  "username_or_id": "nike",
  "requester_telegram_id": "987654321",
  "telegram_username": "maria_marketing",
  "max_users": 100,
  "scrape_reels": true
}

// Результат:
// ✅ Создается проект: "Instagram Analytics @maria_marketing" (ID: 123)
// ✅ Парсятся 100 конкурентов Nike
// ✅ Все данные сохраняются в project_id: 123
```

### **Сценарий 2: Повторный парсинг тем же клиентом**

```javascript
// Тот же клиент парсит другой аккаунт
const event = {
  "username_or_id": "adidas",
  "requester_telegram_id": "987654321",  // Тот же telegram_id
  "max_users": 50
}

// Результат:
// ✅ Используется существующий проект (ID: 123)
// ✅ Новые данные добавляются к существующим
// ✅ Клиент видит накопленную историю
```

### **Сценарий 3: Разные боты - разные проекты**

```javascript
// Клиент использует другого бота
const event = {
  "username_or_id": "puma",
  "requester_telegram_id": "987654321",  // Тот же telegram_id
  "bot_name": "analytics_pro_bot",       // Другой бот!
  "max_users": 75
}

// Результат:
// ✅ Создается НОВЫЙ проект для этого бота (ID: 124)
// ✅ Данные изолированы от другого бота
// ✅ У клиента теперь 2 проекта
```

---

## 📊 Преимущества автоматических проектов

1. **🎯 Простота для клиентов**
   - Не нужно помнить project_id
   - Не нужно создавать проект вручную
   - Система сама все организует

2. **🔐 Изоляция данных**
   - Каждый пользователь имеет свой проект
   - Данные не смешиваются
   - Легко управлять доступом

3. **📈 История и аналитика**
   - Все парсинги сохраняются в одном проекте
   - Можно анализировать историю
   - Легко строить отчеты

4. **🤖 Мультибот поддержка**
   - Разные боты = разные проекты
   - Изоляция данных между ботами
   - Гибкое управление

---

## 🛠️ API ProjectManager

### **getOrCreateProject()**
```typescript
const project = await projectManager.getOrCreateProject({
  telegram_id: "123456789",
  telegram_username: "john_doe",
  bot_name: "neuro_blogger_bot",
  project_name: "Custom Project Name", // Опционально
  description: "Project for competitor analysis" // Опционально
});

// Возвращает:
{
  id: 42,
  name: "@john_doe's Project",
  telegram_id: "123456789",
  telegram_username: "john_doe",
  bot_name: "neuro_blogger_bot",
  is_active: true,
  created_at: Date,
  metadata: {}
}
```

### **getUserProjects()**
```typescript
// Получить все проекты пользователя
const projects = await projectManager.getUserProjects("123456789");

// Возвращает массив проектов пользователя
```

### **validateOrCreateProject()**
```typescript
// Умная функция: проверяет project_id, если не найден - создает новый
const { project, created } = await projectManager.validateOrCreateProject(
  providedProjectId, // может быть undefined
  telegramId,
  telegramUsername,
  botName
);
```

---

## ⚙️ Переменные окружения

```env
# База данных (обязательно)
SUPABASE_URL=postgresql://user:pass@host:port/database

# Instagram API (обязательно)
RAPIDAPI_INSTAGRAM_KEY=your_api_key

# Telegram боты
BOT_TOKEN_NEURO_BLOGGER=bot_token_here
```

---

## 📝 Примеры для тестирования

### **Тест 1: Без project_id (автосоздание)**
```bash
# Через Inngest Dashboard
{
  "data": {
    "username_or_id": "cristiano",
    "requester_telegram_id": "123456789",
    "telegram_username": "test_user",
    "max_users": 10,
    "scrape_reels": false
  }
}
```

### **Тест 2: С существующим project_id**
```bash
{
  "data": {
    "username_or_id": "messi",
    "project_id": 37,
    "max_users": 5
  }
}
```

### **Тест 3: Полный набор параметров**
```bash
{
  "data": {
    "username_or_id": "nike",
    "requester_telegram_id": "987654321",
    "telegram_username": "marketing_manager",
    "bot_name": "analytics_bot",
    "max_users": 50,
    "scrape_reels": true,
    "max_reels_per_user": 10,
    "language": "ru"
  }
}
```

---

## ✅ Итог

Теперь клиенты могут использовать Instagram парсинг **без необходимости вручную создавать проекты**!

- 🎯 **Автоматическое создание** проектов по telegram_id
- 🔄 **Переиспользование** существующих проектов
- 🔐 **Изоляция данных** между пользователями и ботами
- 📊 **Накопление истории** для аналитики
- ⚡ **Полная обратная совместимость** с ручным project_id

Система стала **проще для клиентов** и **умнее в управлении данными**!
