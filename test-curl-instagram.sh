#!/bin/bash

echo "🎯 РАБОЧИЙ ТЕСТ INSTAGRAM APIFY ЧЕРЕЗ cURL"
echo "==========================================="

echo ""
echo "🚀 Отправляем событие напрямую в Inngest..."
echo ""

# Отправляем событие в Inngest Dev Server
curl -X POST "http://localhost:8288/api/v1/events" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "name": "instagram/apify-scrape",
    "data": {
      "username_or_hashtag": "cristiano",
      "project_id": 999,
      "source_type": "competitor",
      "max_reels": 3,
      "requester_telegram_id": "test_user_123",
      "bot_name": "neuro_blogger_bot"
    },
    "user": {},
    "ts": '$(date +%s)'000'
  }' \
  -v

echo ""
echo ""
echo "✅ СОБЫТИЕ ОТПРАВЛЕНО!"
echo ""
echo "📊 Проверь результат:"
echo "   • Dashboard: http://localhost:8288"
echo "   • Functions: http://localhost:8288/functions"
echo "   • Events: http://localhost:8288/events"
echo ""
echo "🎯 Instagram Apify Scraper должен:"
echo "   1. Получить событие"
echo "   2. Валидировать данные"
echo "   3. Подключиться к Apify"
echo "   4. Спарсить @cristiano"
echo "   5. Отфильтровать рилсы"
echo "   6. Сохранить в Supabase"
echo ""
echo "⏱️  Результат через 1-3 минуты в Dashboard"