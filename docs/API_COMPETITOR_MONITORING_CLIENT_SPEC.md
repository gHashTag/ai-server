# 📋 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: API МОНИТОРИНГА КОНКУРЕНТОВ

## 🎯 Описание системы

Система автоматического мониторинга Instagram конкурентов с парсингом через Apify и доставкой через Telegram ботов.

### Ключевые функции:
- ✅ Подписка на конкурентов Instagram
- ✅ Автоматический парсинг рилсов каждые 24 часа
- ✅ Фильтрация по просмотрам, возрасту контента
- ✅ Доставка в Telegram (дайджест, индивидуально, архив)
- ✅ Отправка **последнего рилса** для подтверждения активной подписки

---

## 🌐 БАЗОВЫЕ URL

### Локальная разработка:
```
http://localhost:3000
```

### Продакшн:
```
https://your-production-domain.com
```

---

## 🔧 API ENDPOINTS

### 1. Подписка на конкурента

**POST** `/api/competitor-monitoring`

Создает подписку на конкурента и запускает первоначальный парсинг.

#### Параметры запроса:
```json
{
  "username": "natgeo",                    // Обязательно: username без @
  "user_telegram_id": "144022504",         // Обязательно: ID пользователя Telegram
  "bot_name": "neuro_blogger_bot",         // Обязательно: имя бота из системы
  "max_reels": 10,                         // Опционально: макс кол-во рилсов (1-50, по умолчанию 10)
  "min_views": 1000,                       // Опционально: мин просмотры (по умолчанию 1000)
  "max_age_days": 7,                       // Опционально: макс возраст в днях (1-30, по умолчанию 7)
  "delivery_format": "digest",             // Опционально: digest|individual|archive (по умолчанию digest)
  "project_id": 123                        // Опционально: ID проекта (по умолчанию автогенерация)
}
```

#### Успешный ответ:
```json
{
  "success": true,
  "message": "Monitoring for @natgeo started successfully",
  "event_id": "01J6X8Q2...",
  "competitor_username": "natgeo",
  "expected_reels": 10,
  "monitoring_enabled": true,
  "next_check": "Daily at 08:00 UTC",
  "delivery_format": "digest"
}
```

#### Ошибки:
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "path": ["username"],
      "message": "Required"
    }
  ]
}
```

### 2. Проверка статуса мониторинга

**GET** `/api/competitor-monitoring/status/:username?user_telegram_id=XXX&bot_name=XXX`

Проверяет статус подписки и показывает последние рилсы.

#### Параметры:
- `username` - username конкурента (в URL)
- `user_telegram_id` - ID пользователя (query параметр)
- `bot_name` - имя бота (query параметр)

#### Пример запроса:
```
GET /api/competitor-monitoring/status/natgeo?user_telegram_id=144022504&bot_name=neuro_blogger_bot
```

#### Успешный ответ:
```json
{
  "success": true,
  "monitoring": true,
  "subscription": {
    "id": "uuid-here",
    "competitor_username": "natgeo",
    "display_name": "National Geographic",
    "max_reels": 10,
    "min_views": 1000,
    "max_age_days": 7,
    "delivery_format": "digest",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "last_delivery": "2024-01-02T08:00:00Z",
    "last_delivery_reels_count": 5
  },
  "reels_in_database": 25,
  "latest_reels": [
    {
      "url": "https://instagram.com/p/XXX",
      "views_count": 500000,
      "likes_count": 15000,
      "published_at": "2024-01-02T12:00:00Z"
    }
  ],
  "monitoring": {
    "enabled": true,
    "check_interval": "24 hours",
    "next_check": "Daily at 08:00 UTC"
  }
}
```

### 3. Ручной запуск доставки

**POST** `/api/competitor-monitoring/trigger-delivery/:username`

Запускает доставку вручную (для тестирования).

#### Параметры запроса:
```json
{
  "project_id": 999  // Опционально, по умолчанию 999 для авто-подписок
}
```

#### Пример запроса:
```
POST /api/competitor-monitoring/trigger-delivery/natgeo
```

#### Успешный ответ:
```json
{
  "success": true,
  "message": "Delivery triggered for @natgeo",
  "event_id": "01J6X8Q2..."
}
```

---

## 🔄 ПРОЦЕСС РАБОТЫ СИСТЕМЫ

### 1. При подписке (`POST /api/competitor-monitoring`):
1. **Валидация данных** - проверка входных параметров
2. **Создание подписки** - сохранение в Supabase
3. **Запуск парсинга** - Apify парсит последние рилсы
4. **Ожидание результата** - система ждет завершения парсинга
5. **Подготовка результата** - обработка и фильтрация рилсов
6. **Отправка в Telegram** - доставка **последнего рилса** пользователю
7. **Запись истории** - логирование результата
8. **Настройка авто-мониторинга** - подготовка к регулярным проверкам

### 2. Автоматический мониторинг (каждые 24 часа в 08:00 UTC):
1. **Поиск активных подписок** - получение всех активных подписок
2. **Группировка по конкурентам** - оптимизация парсинга
3. **Запуск парсинга для каждого** - Apify парсинг новых рилсов
4. **Доставка подписчикам** - отправка результатов в Telegram
5. **Обновление времени** - планирование следующего запуска

### 3. Доставка результатов:
1. **Получение подписчиков** - кто подписан на конкурента
2. **Получение свежих рилсов** - рилсы за последние 24 часа
3. **Фильтрация по критериям** - views, age, количество
4. **Доставка в выбранном формате**:
   - **digest** - сводка с топ-рилсом
   - **individual** - каждый рилс отдельно
   - **archive** - Excel файл со всеми рилсами

---

## 📱 ФОРМАТЫ ДОСТАВКИ В TELEGRAM

### Digest (дайджест):
```
🎬 Дайджест рилсов @natgeo

📊 За последние 24 часа:
• Новых рилсов: 5
• Общие просмотры: 2,500,000
• Средние просмотры: 500,000

🏆 Топ рилс (1,200,000 просмотров):
Amazing wildlife footage from Africa...

🔗 https://instagram.com/p/XXX

📋 Еще 4 рилсов в списке
```

### Individual (индивидуально):
```
🎬 Новый рилс от конкурента

👀 Просмотров: 500,000
❤️ Лайков: 15,000
💬 Комментариев: 1,200

Amazing wildlife footage...

🔗 https://instagram.com/p/XXX
```

### Archive (архив):
Отправляется Excel файл с колонками:
- URL
- Просмотры
- Лайки
- Комментарии
- Дата публикации
- Описание

---

## 🔑 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### Обязательные для работы:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Apify (для парсинга Instagram)
APIFY_TOKEN=apify_api_xxxxx
APIFY_INSTAGRAM_ACTOR_ID=apify/instagram-reel-scraper

# Inngest (для обработки событий)
INNGEST_EVENT_KEY=evt_xxxxx
INNGEST_SIGNING_KEY=signkey_xxxxx

# Telegram боты (минимум один)
BOT_TOKEN_1=7654321098:AAFxxxxx  # neuro_blogger_bot
BOT_TOKEN_2=1234567890:AAGxxxxx  # MetaMuse_Manifest_bot
# ... остальные боты

# Опционально для админ уведомлений
ADMIN_CHAT_ID=-1001234567890

# Сервер
PORT=3000
NODE_ENV=production  # или development
```

---

## 🚀 ЛОКАЛЬНАЯ УСТАНОВКА И ЗАПУСК

### 1. Клонирование и установка:
```bash
git clone https://github.com/your-repo/ai-server.git
cd ai-server
npm install
```

### 2. Настройка переменных окружения:
```bash
cp .env.example .env
# Отредактируйте .env файл с вашими токенами
```

### 3. Запуск в режиме разработки:
```bash
npm run dev
```

Сервер будет доступен по адресу: `http://localhost:3000`

### 4. Проверка работы API:
```bash
# Тест подписки
curl -X POST http://localhost:3000/api/competitor-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "username": "natgeo",
    "user_telegram_id": "144022504",
    "bot_name": "neuro_blogger_bot",
    "max_reels": 5
  }'

# Проверка статуса
curl "http://localhost:3000/api/competitor-monitoring/status/natgeo?user_telegram_id=144022504&bot_name=neuro_blogger_bot"
```

---

## 🌍 РАЗВЕРТЫВАНИЕ В ПРОДАКШН

### Опция 1: Railway (рекомендуется)
```bash
# Установка Railway CLI
npm install -g @railway/cli

# Логин в Railway
railway login

# Создание проекта
railway new

# Настройка переменных окружения
railway variables set SUPABASE_URL=https://xxxxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI...
# ... остальные переменные

# Деплой
railway deploy
```

### Опция 2: Docker
```bash
# Сборка образа
docker build -t ai-server .

# Запуск с переменными окружения
docker run -d \
  --name ai-server \
  -p 3000:3000 \
  -e SUPABASE_URL=https://xxxxx.supabase.co \
  -e SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI... \
  -e BOT_TOKEN_1=7654321098:AAFxxxxx \
  ai-server
```

### Опция 3: PM2 (VPS)
```bash
# Установка PM2
npm install -g pm2

# Запуск приложения
pm2 start npm --name "ai-server" -- start

# Сохранение конфигурации
pm2 save
pm2 startup
```

---

## 🧪 ТЕСТИРОВАНИЕ СИСТЕМЫ

### 1. Простой тест API:
```javascript
// test-api.js
const response = await fetch('http://localhost:3000/api/competitor-monitoring', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'natgeo',
    user_telegram_id: '144022504',
    bot_name: 'neuro_blogger_bot',
    max_reels: 3
  })
})

const result = await response.json()
console.log('Подписка создана:', result)
```

### 2. Полный цикл тестирования:
```bash
node test-competitor-monitoring-simple.js
```

Этот скрипт проверяет:
- ✅ Импорт всех функций
- ✅ Конфигурацию Supabase
- ✅ Схемы валидации
- ✅ Интеграцию с Apify
- ✅ Процесс выполнения (8 шагов)

---

## 📊 СТРУКТУРА БАЗЫ ДАННЫХ (Supabase)

### Основные таблицы:

#### `competitor_subscriptions`
- `id` - UUID подписки
- `competitor_username` - username конкурента
- `user_telegram_id` - ID пользователя Telegram
- `bot_name` - имя бота
- `max_reels` - максимум рилсов
- `min_views` - минимум просмотров
- `max_age_days` - максимум дней
- `delivery_format` - формат доставки
- `is_active` - активна ли подписка
- `created_at` - дата создания
- `last_parsed_at` - последний парсинг
- `next_parse_at` - следующий парсинг

#### `instagram_apify_reels`
- `id` - UUID рилса
- `reel_id` - ID рилса Instagram
- `url` - ссылка на рилс
- `owner_username` - владелец рилса
- `views_count` - количество просмотров
- `likes_count` - количество лайков
- `caption` - описание рилса
- `published_at` - дата публикации
- `scraped_at` - дата парсинга

#### `competitor_delivery_history`
- `id` - UUID записи
- `subscription_id` - связь с подпиской
- `delivery_status` - статус доставки
- `reels_count` - количество рилсов
- `delivered_at` - дата доставки

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. Лимиты и ограничения:
- **Максимум рилсов за раз:** 50
- **Частота автопарсинга:** каждые 24 часа
- **Максимальный возраст контента:** 30 дней
- **Лимит Apify:** зависит от тарифа

### 2. Особенности логики:
- ✅ Отправляется **последний рилс** (не лучший) для показа активности подписки
- ✅ Автоматическая деликатность между запросами к Apify
- ✅ Обработка дубликатов рилсов
- ✅ Автоматические повторы при ошибках

### 3. Мониторинг:
- Логи всех операций в консоль
- Уведомления админам при ошибках
- История всех доставок в БД

---

## 📞 ПОДДЕРЖКА

### Для отладки и логов:
1. Проверьте логи Inngest Dashboard
2. Проверьте таблицы в Supabase
3. Проверьте статус подписок через API

### Типичные проблемы:
1. **"Supabase error"** - проверьте переменные окружения
2. **"Apify timeout"** - проверьте токен Apify и лимиты
3. **"Bot not found"** - проверьте токены ботов
4. **"No reels found"** - аккаунт может быть приватным

---

## 🔄 ОБНОВЛЕНИЯ И МИГРАЦИИ

При обновлении системы:
1. Остановите все процессы
2. Обновите код
3. Проверьте миграции БД
4. Перезапустите систему
5. Проверьте статус через API

---

*Документация обновлена: 2024-12-21*
*Версия API: 1.0*
*Статус: Готово к продакшну*