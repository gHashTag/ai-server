# Тестирование Instagram-AI-Scraper функций через Inngest Dashboard

## 🎯 Готовые функции для тестирования

### 1. **findCompetitors** (Job 1)
**Событие:** `instagram/scraper-v2`
```json
{
  "name": "instagram/scraper-v2",
  "data": {
    "username": "test_user",
    "similar_users_count": 10,
    "min_followers": 1000,
    "project_id": 123,
    "bot_name": "ai_koshey_bot",
    "telegram_id": "144022504"
  }
}
```

### 2. **analyzeCompetitorReels** (Job 2)
**Событие:** `instagram/analyze-reels`
```json
{
  "name": "instagram/analyze-reels",
  "data": {
    "comp_username": "test_competitor",
    "project_id": 123,
    "days_limit": 14,
    "min_views": 1000,
    "bot_name": "ai_koshey_bot",
    "telegram_id": "144022504"
  }
}
```

### 3. **extractTopContent** (Job 3)
**Событие:** `instagram/extract-top`
```json
{
  "name": "instagram/extract-top",
  "data": {
    "comp_username": "test_competitor",
    "project_id": 123,
    "days_limit": 14,
    "limit": 10
  }
}
```

### 4. **generateContentScripts** (Job 4)
**Событие:** `instagram/generate-scripts`
```json
{
  "name": "instagram/generate-scripts",
  "data": {
    "reel_id": "test_reel_123",
    "project_id": 123,
    "openai_api_key": "test-key-placeholder"
  }
}
```

## 📊 Статус тестирования

- ✅ **findCompetitors** - Тесты пройдены
- ✅ **analyzeCompetitorReels** - Тесты пройдены (8/8)
- ✅ **extractTopContent** - Тесты пройдены (6/6)
- ✅ **generateContentScripts** - Тесты пройдены (10/10)

## 🔧 Подготовка к тестированию

### 1. Подготовь тестовые данные в БД
```sql
-- Для extractTopContent и generateContentScripts
INSERT INTO reels_analysis (
  comp_username, reel_id, ig_reel_url, caption,
  views_count, likes_count, comments_count,
  created_at_instagram, project_id
) VALUES (
  'test_competitor', 'test_reel_123',
  'https://www.instagram.com/reel/test_reel_123/',
  'Тестовый рилс для проверки функций',
  10000, 500, 50,
  NOW() - INTERVAL '7 days', 123
);
```

### 2. Переменные окружения
```bash
# Instagram API
RAPIDAPI_INSTAGRAM_KEY=your-rapidapi-key
RAPIDAPI_INSTAGRAM_HOST=real-time-instagram-scraper-api1.p.rapidapi.com

# OpenAI (для generateContentScripts)
OPENAI_API_KEY=your-openai-key

# Database
NEON_DATABASE_URL=postgresql://your-db-user:your-password@your-host/your-db?sslmode=require
```

## 📋 Следующие шаги

1. **Протестируй функции в Inngest Dashboard**
2. **Создай Telegram бота** по техническому заданию
3. **Интегрируй бота с Inngest функциями**
4. **Протестируй полный workflow**

## 🎯 Ожидаемые результаты

- **Job 1:** Список конкурентов в таблице `competitors`
- **Job 2:** Данные рилсов в таблице `reels_analysis`
- **Job 3:** Отформатированный отчет с ТОП-10 рилсов
- **Job 4:** 3 альтернативных сценария в таблице `content_scripts` 