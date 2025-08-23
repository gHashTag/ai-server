# Instagram User Creation Function

## 🕉️ Обзор

Функция `createInstagramUser` позволяет создавать записи пользователей Instagram в таблице `instagram_similar_users` без необходимости скрапинга через API. Это полезно для ручного добавления пользователей в проекты.

## 🔧 Архитектура

### Компоненты

1. **Inngest Function**: `createInstagramUser`

   - ID: `create-instagram-user`
   - Event: `instagram/create-user`
   - Concurrency: 5

2. **Database Class**: `InstagramDatabase.createSingleUser()`

   - Валидация проекта
   - Проверка дубликатов
   - Создание записи

3. **Zod Schemas**: Строгая валидация данных
   - `CreateInstagramUserEventSchema`
   - `CreateUserResultSchema`

## 📝 Использование

### 1. Базовое использование

```typescript
import { triggerCreateInstagramUser } from '../src/inngest-functions/instagramScraper-v2'

const userData = {
  pk: '1234567890', // Instagram PK (обязательно)
  username: 'my_username', // Username (обязательно)
  full_name: 'My Full Name', // Полное имя (опционально)
  is_private: false, // Приватный аккаунт (опционально)
  is_verified: true, // Верифицирован (опционально)
  profile_pic_url: 'https://...', // URL аватара (опционально)
  profile_chaining_secondary_label: 'Label', // Дополнительное описание (опционально)
  social_context: 'Some context', // Контекст (опционально)
  project_id: 1, // ID проекта (обязательно)
  requester_telegram_id: '123456', // ID инициатора (опционально)
  metadata: {
    // Метаданные (опционально)
    source: 'manual',
    created_by: 'admin',
  },
}

const result = await triggerCreateInstagramUser(userData)
console.log('Event ID:', result.eventId)
```

### 2. Через тестовый скрипт

```bash
# Создание одного пользователя
node scripts/test-create-instagram-user.js

# Создание нескольких пользователей
node scripts/test-create-instagram-user.js --multiple
```

## 🔍 Схема данных

### Входные данные (CreateInstagramUserEvent)

| Поле                               | Тип     | Обязательно | Описание                           |
| ---------------------------------- | ------- | ----------- | ---------------------------------- |
| `pk`                               | string  | ✅          | Instagram PK (уникальный ID)       |
| `username`                         | string  | ✅          | Username пользователя              |
| `full_name`                        | string  | ❌          | Полное имя                         |
| `is_private`                       | boolean | ❌          | Приватный аккаунт (default: false) |
| `is_verified`                      | boolean | ❌          | Верифицирован (default: false)     |
| `profile_pic_url`                  | string  | ❌          | URL аватара                        |
| `profile_chaining_secondary_label` | string  | ❌          | Дополнительное описание            |
| `social_context`                   | string  | ❌          | Контекст                           |
| `project_id`                       | number  | ✅          | ID проекта (должен существовать)   |
| `requester_telegram_id`            | string  | ❌          | ID инициатора                      |
| `metadata`                         | object  | ❌          | Дополнительные метаданные          |

### Результат (CreateUserResult)

```typescript
{
  success: boolean,        // Успешность операции
  created: boolean,        // Создан ли новый пользователь
  alreadyExists: boolean,  // Существовал ли уже
  user?: ValidatedInstagramUser, // Данные пользователя
  error?: string          // Ошибка (если есть)
}
```

## 🗄️ База данных

### Таблица: `instagram_similar_users`

Функция создаёт записи в таблице со следующими полями:

- `search_username`: `manual_{username}` (префикс для ручного создания)
- `user_pk`: Instagram PK
- `username`: Username пользователя
- `full_name`: Полное имя
- `is_private`: Приватный аккаунт
- `is_verified`: Верифицирован
- `profile_pic_url`: URL аватара
- `profile_url`: Генерируется автоматически (`https://instagram.com/{username}`)
- `profile_chaining_secondary_label`: Дополнительное описание
- `social_context`: Контекст
- `project_id`: ID проекта
- `scraped_at`: Время создания
- `created_at`: Время создания
- `updated_at`: Время обновления

### Уникальность

Записи уникальны по комбинации `(user_pk, project_id)`.

## 🔄 Workflow

1. **Валидация входных данных** (Zod)
2. **Проверка соединения с БД**
3. **Валидация project_id** (существует ли проект)
4. **Создание пользователя в БД**:
   - Проверка дубликатов
   - Вставка новой записи
   - Возврат результата

## 🚨 Обработка ошибок

### Возможные ошибки

1. **Валидация данных**: Неверные входные данные
2. **Проект не найден**: project_id не существует
3. **Дубликат**: Пользователь уже существует
4. **БД ошибка**: Проблемы с подключением к БД

### Логирование

Все операции логируются с соответствующими эмодзи:

- 🚀 Старт функции
- ✅ Успешные операции
- 👤 Пользователь уже существует
- ❌ Ошибки
- 🎉 Завершение

## 📊 Мониторинг

### Inngest Dashboard

Отслеживайте выполнение функций:

- Local: http://localhost:8288
- Cloud: Inngest Dashboard

### Метрики

- Количество созданных пользователей
- Количество дубликатов
- Время выполнения
- Ошибки валидации

## 🔧 Настройка

### Переменные окружения

```env
NEON_DATABASE_URL=postgresql://...  # Подключение к PostgreSQL
```

### Требования

1. **Таблица `projects`** с активными проектами
2. **Таблица `instagram_similar_users`** (создаётся автоматически)
3. **Inngest server** запущен
4. **Валидные данные** для создания пользователей

## 💡 Примеры использования

### Создание тестового пользователя

```javascript
const testUser = {
  pk: Date.now().toString(),
  username: `test_user_${Date.now()}`,
  full_name: 'Test User',
  project_id: 1,
  requester_telegram_id: '144022504',
}

const result = await triggerCreateInstagramUser(testUser)
```

### Создание верифицированного пользователя

```javascript
const verifiedUser = {
  pk: '9876543210',
  username: 'verified_user',
  full_name: 'Verified User',
  is_verified: true,
  profile_pic_url: 'https://example.com/avatar.jpg',
  project_id: 1,
}

const result = await triggerCreateInstagramUser(verifiedUser)
```

### Создание приватного пользователя

```javascript
const privateUser = {
  pk: '1111111111',
  username: 'private_user',
  full_name: 'Private User',
  is_private: true,
  social_context: 'Private account user',
  project_id: 1,
}

const result = await triggerCreateInstagramUser(privateUser)
```

---

## 🕉️ Мудрость

_"Как семя, посаженное в плодородную почву, даёт плоды, так и правильно структурированные данные порождают мудрость."_

Функция создания пользователей следует принципам:

- **Валидация** данных через Zod
- **Идемпотентность** (повторные запросы безопасны)
- **Логирование** всех операций
- **Обработка ошибок** на всех уровнях
- **Типобезопасность** TypeScript
