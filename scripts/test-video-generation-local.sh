#!/bin/bash

# 🧪 Local Video Generation Test Script
# Тестирование видео генерации для пользователя 144022504

echo "🚀 Local Video Generation Integration Test"
echo "👤 Testing user: 144022504"
echo ""

# Проверяем переменную окружения для mock режима
if [ "$MOCK_VIDEO_GENERATION" = "false" ]; then
    echo "⚠️  REAL MODE ENABLED - This will spend money!"
    echo "💰 Kie.ai charges will apply for actual video generation"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Test cancelled"
        exit 1
    fi
else
    echo "🎭 MOCK MODE ENABLED - No charges will apply"
    export MOCK_VIDEO_GENERATION=true
fi

echo ""
echo "📋 Test configuration:"
echo "  • User: 144022504"
echo "  • Mock mode: $MOCK_VIDEO_GENERATION"
echo "  • Bot: neuro_blogger_bot" 
echo "  • Language: Russian"
echo ""

# Запуск теста
echo "🔄 Starting integration test..."
cd "$(dirname "$0")/.." || exit 1

# Устанавливаем переменные окружения для теста
export NODE_ENV=development
export TEST_MODE=true

# Запускаем тест
node tests/integration/test-local-video-generation-144022504.js

echo ""
echo "🏁 Test completed!"

# Показываем итоги
if [ "$MOCK_VIDEO_GENERATION" = "true" ]; then
    echo "💡 This was a mock test - no real API calls were made"
    echo "   To test with real API, run: MOCK_VIDEO_GENERATION=false $0"
else
    echo "💰 Real API calls were made - check your Kie.ai balance"
    echo "📊 Check server logs for detailed request/response data"
fi