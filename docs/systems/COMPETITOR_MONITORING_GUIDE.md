# 🔍 Competitor Monitoring - Руководство по использованию

## Обзор

Функция мониторинга конкурентов позволяет:
- **Подписаться** на Instagram конкурента по username
- **Спарсить** и сохранить в БД его рилзы (по умолчанию 10)
- **Получить** 1 лучший рилз сразу пользователю
- **Настроить** автоматический мониторинг новых рилзов

## 🎯 Как это работает

```mermaid
graph TD
    A[Пользователь] -->|@username| B[competitorMonitoring]
    B --> C[Создание подписки в БД]
    C --> D[Запуск парсинга Apify]
    D --> E[Сохранение 10 рилзов в БД]
    E --> F[Возврат 1 лучшего рилза]
    F --> G[Настройка мониторинга]
    G --> H[Автопарсинг каждые 24ч]
    H --> I[Доставка новых рилзов]
```

## 🚀 Использование

### 1. Через API

```bash
curl -X POST http://localhost:3000/api/competitor-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "username": "natgeo",
    "user_telegram_id": "144022504",
    "bot_name": "neuro_blogger_bot",
    "max_reels": 10,
    "min_views": 1000,
    "delivery_format": "digest"
  }'
```

### 2. Через тестовый файл

```bash
node test-competitor-monitoring.js
```

### 3. Прямо через Inngest

```javascript
await inngest.send({
  name: 'competitor/monitor',
  data: {
    username: 'natgeo',
    user_telegram_id: '144022504',
    bot_name: 'neuro_blogger_bot',
    max_reels: 10
  }
})
```

## 📊 Параметры

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|-------------|----------|
| `username` | string | - | Instagram username (без @) |
| `user_telegram_id` | string | - | Telegram ID пользователя |
| `bot_name` | string | - | Имя бота для уведомлений |
| `max_reels` | number | 10 | Сколько рилзов сохранить в БД |
| `min_views` | number | 1000 | Минимум просмотров для фильтра |
| `max_age_days` | number | 7 | Максимальный возраст рилзов |
| `delivery_format` | enum | 'digest' | Формат доставки: digest/individual/archive |

## 🔄 Автоматический мониторинг

После создания подписки система автоматически:

1. **Парсит** конкурентов каждые 24 часа в 08:00 UTC
2. **Фильтрует** новые рилзы по критериям пользователя
3. **Доставляет** обновления в зависимости от формата:
   - `digest` - краткий дайджест с топ рилзом
   - `individual` - каждый рилз отдельно (максимум 5)
   - `archive` - Excel файл с полным списком

## 📋 Проверка статуса

```bash
curl "http://localhost:3000/api/competitor-monitoring/status/natgeo?user_telegram_id=144022504&bot_name=neuro_blogger_bot"
```

Ответ:
```json
{
  "success": true,
  "monitoring": true,
  "subscription": {
    "competitor_username": "natgeo",
    "max_reels": 10,
    "is_active": true,
    "last_delivery": "2024-01-15T10:30:00Z"
  },
  "reels_in_database": 8,
  "latest_reels": [...],
  "monitoring": {
    "enabled": true,
    "check_interval": "24 hours"
  }
}
```

## 🗄️ Структура базы данных

### Таблица `competitor_subscriptions`
```sql
- id (UUID)
- user_telegram_id (VARCHAR)
- competitor_username (VARCHAR) 
- max_reels (INTEGER)
- min_views (INTEGER)
- delivery_format (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at
```

### Таблица `instagram_apify_reels`
```sql
- reel_id (VARCHAR)
- url, video_url (TEXT)
- owner_username (VARCHAR)
- views_count, likes_count (INTEGER)
- caption (TEXT)
- published_at (TIMESTAMP)
```

### Таблица `competitor_delivery_history`
```sql
- subscription_id (UUID)
- delivered_at (TIMESTAMP)
- reels_count (INTEGER)
- delivery_status (VARCHAR)
- reels_data (JSONB)
```

## ⚙️ Настройка окружения

Необходимые переменные:
```env
NEON_DATABASE_URL=postgresql://...
APIFY_TOKEN=apify_api_...
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
BOT_TOKEN_1=...
```

## 🧪 Тестирование

1. **Быстрый тест**:
```bash
node test-competitor-monitoring-simple.js
```

2. **Проверка БД**:
```sql
SELECT * FROM competitor_subscriptions WHERE user_telegram_id = '144022504';
SELECT * FROM instagram_apify_reels WHERE owner_username = 'natgeo';
```

3. **Ручная доставка**:
```bash
curl -X POST http://localhost:3000/api/competitor-monitoring/trigger-delivery/natgeo
```

## 📱 Что получает пользователь

### При создании подписки:
- ✅ Подтверждение подписки
- 🎬 Лучший рилз конкурента
- 📊 Статистика (просмотры, лайки)
- 🔗 Ссылка на рилз

### При ежедневных обновлениях:
- 📈 Дайджест новых рилзов
- 🏆 Топ рилз по просмотрам
- 📊 Статистика за сутки
- 🔗 Ссылки на все новые рилзы

## 🛠️ Интеграция с ботом

Добавьте в Telegram бот команду:
```javascript
bot.command('monitor', async (ctx) => {
  const username = ctx.message.text.split(' ')[1]
  
  if (!username) {
    return ctx.reply('Укажите username: /monitor @natgeo')
  }
  
  // Запускаем мониторинг
  await fetch('/api/competitor-monitoring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username,
      user_telegram_id: ctx.from.id.toString(),
      bot_name: 'your_bot_name'
    })
  })
  
  ctx.reply(`🚀 Подписка на ${username} запущена!`)
})
```

## 🔧 Troubleshooting

### Проблема: Рилзы не приходят
1. Проверьте подписку: `SELECT * FROM competitor_subscriptions WHERE user_telegram_id = 'YOUR_ID'`
2. Проверьте парсинг: `SELECT * FROM instagram_apify_reels WHERE owner_username = 'USERNAME'`
3. Проверьте логи Inngest в dashboard

### Проблема: Ошибка Apify
1. Проверьте `APIFY_TOKEN`
2. Проверьте лимиты аккаунта Apify
3. Попробуйте другой username

### Проблема: Уведомления не отправляются
1. Проверьте `BOT_TOKEN` и `user_telegram_id`
2. Убедитесь что пользователь начал диалог с ботом
3. Проверьте имя бота в `getBotByName()`

## 📈 Мониторинг и метрики

Используйте эти запросы для мониторинга:

```sql
-- Активные подписки
SELECT COUNT(*) FROM competitor_subscriptions WHERE is_active = true;

-- Топ конкуренты
SELECT competitor_username, COUNT(*) as subscribers 
FROM competitor_subscriptions 
GROUP BY competitor_username 
ORDER BY subscribers DESC;

-- Статистика доставок
SELECT delivery_status, COUNT(*) 
FROM competitor_delivery_history 
GROUP BY delivery_status;
```

## 🎯 Преимущества системы

1. **Автоматизация** - настроил раз, работает постоянно
2. **Персонализация** - каждый пользователь настраивает свои фильтры
3. **Масштабируемость** - один парсинг для всех подписчиков конкурента
4. **Аналитика** - полная история доставок и статистика
5. **Гибкость** - разные форматы доставки и настройки

---

Готово! Теперь у вас есть полноценная система мониторинга конкурентов в Instagram! 🚀