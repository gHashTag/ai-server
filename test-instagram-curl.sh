#!/bin/bash

echo "🎯 ТЕСТИРОВАНИЕ INSTAGRAM APIFY SCRAPER"
echo "======================================"

echo ""
echo "1️⃣ Тест через API мониторинга конкурентов:"
echo ""

curl -X POST http://localhost:4000/api/competitor-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "username": "cristiano",
    "user_telegram_id": "test_user_123",
    "bot_name": "neuro_blogger_bot",
    "max_reels": 5,
    "delivery_format": "individual"
  }' \
  -v

echo ""
echo ""
echo "2️⃣ Альтернативный тест через создание подписки:"
echo ""

curl -X POST http://localhost:4000/api/competitor-subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_username": "selenagomez",
    "user_telegram_id": "test_user_123", 
    "bot_name": "neuro_blogger_bot",
    "max_reels": 3,
    "min_views": 1000,
    "delivery_format": "digest",
    "is_active": true
  }' \
  -v

echo ""
echo ""
echo "3️⃣ Проверка статуса подписок:"
echo ""

curl -X GET "http://localhost:4000/api/competitor-subscriptions?user_telegram_id=test_user_123" \
  -H "Content-Type: application/json" \
  -v

echo ""
echo ""
echo "✅ ГОТОВО! Проверьте логи сервера для результатов"
echo "📊 Inngest Dashboard: http://localhost:8288"
echo "🔗 Функции: http://localhost:8288/functions" 
echo "⚡ События: http://localhost:8288/events"