# Instagram Reels API Fix - Руководство по использованию

## 🚀 Что было исправлено

Исправлена ошибка валидации данных в функциях для работы с Instagram Reels API, которая приводила к падению функций с `ZodError`.

## 🔧 Технические детали

### Проблема

Instagram API иногда возвращает ошибки в виде строки в поле `data` вместо объекта:

```json
{
  "status": "error",
  "message": "Some error",
  "data": "User not found or profile is private"
}
```

### Решение

1. Обновлена схема валидации для поддержки union типов (`object | string`)
2. Добавлена обработка ошибок API на уровне функций
3. Улучшена типизация возвращаемых значений

## 📋 Затронутые функции

### 1. `analyzeCompetitorReels` - Анализ рилсов конкурентов

```typescript
// Событие для тестирования
await inngest.send({
  name: 'instagram/analyze-reels',
  data: {
    username: 'alexyanovsky',
    max_reels: 10,
    days_back: 14,
    project_id: 1,
    requester_telegram_id: '144022504',
  },
})
```

### 2. `instagramScraperV2` - Скрапинг пользователей с рилсами

```typescript
// Событие для тестирования
await inngest.send({
  name: 'instagram/scrape-similar-users',
  data: {
    username_or_id: 'alexyanovsky',
    project_id: 1,
    max_users: 5,
    max_reels_per_user: 3,
    scrape_reels: true,
    requester_telegram_id: '144022504',
  },
})
```

### 3. `extractTopContent` - Извлечение топового контента

```typescript
// Событие для тестирования
await inngest.send({
  name: 'instagram/extract-top-content',
  data: {
    username: 'alexyanovsky',
    days_back: 14,
    limit: 10,
    project_id: 1,
    requester_telegram_id: '144022504',
  },
})
```

### 4. `generateContentScripts` - Генерация сценариев контента

```typescript
// Событие для тестирования
await inngest.send({
  name: 'instagram/generate-content-scripts',
  data: {
    reel_id: 'test_reel_id',
    ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
    project_id: 1,
    requester_telegram_id: '144022504',
  },
})
```

## 🧪 Тестирование

### Запуск серверов

```bash
# Основной сервер
bun run src/server.ts

# Inngest Dev Server
npm run dev:inngest
```

### Запуск тестов

```bash
# Полный набор тестов (5 функций)
bun run test-events/test-reels-fix.ts

# Быстрый тест (1 функция)
bun run test-events/quick-test.ts
```

### Мониторинг

- **Inngest Dashboard:** http://localhost:8288
- **Основной сервер:** http://localhost:4000
- **Логи:** Смотреть в терминале где запущены серверы

## 📊 Результаты

После исправлений:

- ✅ Функции корректно обрабатывают ошибки API
- ✅ Улучшена типизация и валидация данных
- ✅ Созданы тестовые события для проверки
- ✅ Добавлено подробное логирование

## 🔍 Отладка

Если функции все еще падают:

1. Проверьте переменные окружения (`RAPIDAPI_INSTAGRAM_KEY`, `NEON_DATABASE_URL`)
2. Проверьте логи в Inngest Dashboard
3. Убедитесь, что Instagram API возвращает корректные данные
4. Запустите тестовые события для диагностики

## 🚀 Готово к использованию

Теперь функции Instagram Reels API готовы к интеграции с Telegram ботом согласно техническому заданию.
