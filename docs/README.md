# Instagram Apify Scraper - Документация

Документация по функции парсинга Instagram Reels через Apify API.

## 📄 Основной документ

**[INSTAGRAM_APIFY_SCRAPER.md](../INSTAGRAM_APIFY_SCRAPER.md)** - полное описание функции, параметров и использования.

## 📁 Что добавлено в проект

### Основной код
- `src/inngest-functions/instagramApifyScraper.ts` - функция парсинга Instagram через Apify

### Тестирование  
- `test-scripts/instagram/` - тесты функции Instagram Apify парсинга

## 🎯 Назначение

Функция предназначена для:
- Парсинга Instagram Reels через Apify API
- Фильтрации контента по просмотрам, дате, типу
- Сохранения данных в Supabase
- Отправки уведомлений в Telegram

## 🚀 Быстрый старт

1. Настройте переменные окружения (`APIFY_TOKEN`, `SUPABASE_URL`)
2. Отправьте событие `instagram/apify-scrape` через Inngest
3. Получите результаты в Supabase таблице `instagram_apify_reels`

Подробности см. в основном документе.