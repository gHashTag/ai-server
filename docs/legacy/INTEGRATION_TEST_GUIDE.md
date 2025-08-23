# Руководство по интеграционному тестированию Instagram Scraper

**Цель:** Полное тестирование цепочки Inngest → API → Database для username `vyacheslav_nekludov`

## 🚀 Быстрый запуск

### Вариант 1: Автоматический (рекомендуется)

```bash
# Запуск полного интеграционного теста
bash scripts/run-integration-test.sh
```

### Вариант 2: Ручной запуск

```bash
# Проверка типов
npx tsc --noEmit

# Запуск теста
npx tsx test-events/inngest-integration-test.ts
```

## 🔍 Проверка результатов

### После завершения теста:

```bash
# Проверка сохраненных данных в базе
node scripts/check-database-results.js
```

### Дополнительные проверки:

```bash
# Проверка конкретного API endpoint
node scripts/test-similar-users-api.js

# Быстрая отправка события
npx tsx test-events/test-vyacheslav-corrected.ts
```

## 📋 Что тестирует интеграционный тест

### Шаг 1: Подготовка

- ✅ Запуск Inngest Dev Server на порту 8288
- ✅ Подключение к базе данных Neon
- ✅ Очистка предыдущих тестовых данных

### Шаг 2: Выполнение

- ✅ Отправка события `instagram/scraper-v2`
- ✅ Парсинг пользователей для `vyacheslav_nekludov`
- ✅ Сохранение в таблицу `instagram_similar_users`

### Шаг 3: Валидация

- ✅ Проверка корректности `project_id: 38`
- ✅ Проверка корректности `username: vyacheslav_nekludov`
- ✅ Проверка количества найденных пользователей
- ✅ Генерация детального отчета

## 🔧 Конфигурация

### Тестовые параметры:

```typescript
const TEST_CONFIG = {
  username: 'vyacheslav_nekludov',
  project_id: 38,
  requester_telegram_id: '289259562',
  max_users: 5, // Для быстрого теста
  scrape_reels: false, // Отключены для скорости
  parsing_timeout: 120000, // 2 минуты
}
```

### Необходимые переменные окружения:

```bash
NEON_DATABASE_URL="postgresql://..."
RAPIDAPI_INSTAGRAM_KEY="your-api-key"
RAPIDAPI_INSTAGRAM_HOST="real-time-instagram-scraper-api1.p.rapidapi.com"
```

## 📊 Интерпретация результатов

### ✅ Успешный тест:

```
🎉 ИНТЕГРАЦИОННЫЙ ТЕСТ ПРОЙДЕН УСПЕШНО!
✅ Система готова к работе

📋 ОТЧЕТ О ТЕСТИРОВАНИИ:
{
  "test_status": "SUCCESS",
  "results": {
    "users_found": 5,
    "database_verification": "PASSED",
    "project_id_correct": true,
    "username_correct": true
  }
}
```

### ❌ Возможные проблемы:

1. **Inngest сервер не запустился**

   - Проверьте порт 8288: `lsof -i :8288`
   - Убейте конфликтующие процессы: `pkill -f inngest`

2. **API ошибка "Username is not valid"**

   - Убедитесь, что используется `vyacheslav_nekludov` (с "v")
   - Проверьте API ключ: `node scripts/test-similar-users-api.js`

3. **База данных недоступна**

   - Проверьте `NEON_DATABASE_URL`
   - Протестируйте подключение: `node scripts/check-database-results.js`

4. **Данные не сохранились**
   - Проверьте project_id и username в логах
   - Убедитесь, что функция `instagramScraperV2` активна

## 🎯 Практические советы

### Перед продакшеном:

1. Запустите тест с `max_users: 30` для полной проверки
2. Включите `scrape_reels: true` для тестирования рилсов
3. Проверьте производительность на больших объемах

### Отладка:

- Логи Inngest: http://localhost:8288
- Логи теста: `integration-test-YYYYMMDD_HHMMSS.log`
- База данных: `scripts/check-database-results.js`

### Мониторинг:

- Event ID сохраняется в логах для отслеживания
- Время выполнения измеряется автоматически
- Детальная статистика в финальном отчете

## 🚨 Важные замечания

1. **Тест изменяет данные в базе** - используйте только для тестирования
2. **Очищает предыдущие данные** для `vyacheslav_nekludov` и `project_id: 38`
3. **Запускает реальные API запросы** - считается лимит RapidAPI
4. **Требует свободный порт 8288** для Inngest сервера

## 📞 Поддержка

При возникновении проблем:

1. Проверьте лог файл: `integration-test-*.log`
2. Запустите отдельные компоненты для диагностики
3. Проверьте переменные окружения и зависимости

---

**Готово к использованию!** 🎉
