# Instagram Apify Integration

## Изменения

✅ **ВЫПОЛНЕНО**: Полностью удалена логика RapidAPI из Instagram скрапера
✅ **ВЫПОЛНЕНО**: Интегрирована Apify для парсинга Instagram
✅ **ВЫПОЛНЕНО**: Обновлены переменные окружения

## Что изменилось

### 1. Удалены RapidAPI компоненты
- ❌ Класс `InstagramAPI` с RapidAPI логикой
- ❌ Переменные `RAPIDAPI_INSTAGRAM_KEY` и `RAPIDAPI_INSTAGRAM_HOST`
- ❌ Методы `getSimilarUsers()` и `getUserReels()` с RapidAPI
- ❌ Импорт `axios` (больше не нужен)
- ❌ Файл `src/core/instagram/api.ts`

### 2. Добавлена Apify интеграция
- ✅ Класс `InstagramApifyClient` 
- ✅ Интеграция с существующей функцией `instagramApifyScraper`
- ✅ Переменная окружения `APIFY_TOKEN`
- ✅ Асинхронная обработка данных через Apify

## Новая архитектура

```
instagramScraper-v2.ts (основная функция)
    ↓
InstagramApifyClient.getSimilarUsers()
    ↓ 
triggerApifyInstagramScraping() (из instagramApifyScraper.ts)
    ↓
Apify актор instagram-scraper
    ↓
Данные сохраняются в базу асинхронно
```

## Переменные окружения

### Обязательные:
```bash
APIFY_TOKEN=your-apify-token-here
SUPABASE_URL=your-supabase-connection-string
```

### Удалены:
```bash
# Больше НЕ НУЖНЫ:
# RAPIDAPI_INSTAGRAM_KEY=...
# RAPIDAPI_INSTAGRAM_HOST=...
```

## Особенности новой реализации

### Асинхронность
- Основная функция `instagramScraper-v2` теперь **запускает** Apify парсинг
- Данные обрабатываются **асинхронно** через Apify актор
- Результат: `status: 'processing'` вместо немедленных данных

### Что парсит Apify
- ✅ Пользователи Instagram  
- ✅ Рилсы автоматически
- ✅ Метаданные (лайки, комментарии, просмотры)
- ✅ Сохранение в базу данных

### Монетизация
- Списание происходит в Apify скрапере
- Используется `requester_telegram_id: 'auto-system'` чтобы избежать двойного списания

## Тестирование

Функция работает следующим образом:
1. Проверяет `APIFY_TOKEN`
2. Создает/валидирует проект
3. **Запускает Apify парсинг** (асинхронно)
4. Возвращает статус: "processing"
5. Apify обрабатывает данные в фоне
6. Результаты сохраняются в БД автоматически

## Статус

🎉 **ГОТОВО**: RapidAPI полностью удален, Apify интеграция активна!

## Следующие шаги

1. ✅ Установить `APIFY_TOKEN` в продакшене  
2. ✅ Удалить `RAPIDAPI_*` переменные из продакшена
3. ✅ Протестировать новую функцию
4. ✅ Проверить работу асинхронного парсинга