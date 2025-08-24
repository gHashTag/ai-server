#!/bin/bash

# 🔗 Test Kie.ai Callback Endpoint Script
# Тестирование callback endpoint для обработки уведомлений от Kie.ai

echo "🔗 Kie.ai Callback Endpoint Test"
echo ""

# Проверяем переменную окружения для сервера
SERVER_URL=${TEST_SERVER_URL:-"http://localhost:3000"}

echo "📋 Test configuration:"
echo "  • Server: $SERVER_URL"
echo "  • Timeout: 10 seconds"
echo "  • Test cases: Health check, GET endpoint, valid callbacks, invalid payloads"
echo ""

# Проверяем доступность сервера
echo "🔍 Checking server availability..."
if curl -s --connect-timeout 5 "$SERVER_URL/health" > /dev/null 2>&1; then
    echo "✅ Server is accessible at $SERVER_URL"
else
    echo "❌ Server is not accessible at $SERVER_URL"
    echo "   Please ensure the server is running:"
    echo "   npm start"
    echo "   or"
    echo "   npm run dev"
    echo ""
    echo "   You can also specify a different server URL:"
    echo "   TEST_SERVER_URL=http://your-server:3000 $0"
    exit 1
fi

echo ""
echo "🔄 Starting callback endpoint tests..."
cd "$(dirname "$0")/.." || exit 1

# Устанавливаем переменные окружения для теста
export NODE_ENV=development
export TEST_MODE=true
export TEST_SERVER_URL="$SERVER_URL"

# Запускаем тест
node tests/integration/test-callback-endpoint.js

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 All callback endpoint tests passed!"
    echo ""
    echo "💡 Ready for production:"
    echo "   • Callback endpoint is working correctly"
    echo "   • Invalid payloads are properly rejected"
    echo "   • Health check endpoint is functional"
    echo "   • API documentation endpoint is available"
    echo ""
    echo "🔗 Callback URL for Kie.ai configuration:"
    echo "   $SERVER_URL/api/kie-ai/callback"
else
    echo "❌ Some callback endpoint tests failed!"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check server logs for errors"
    echo "   • Ensure all dependencies are installed"
    echo "   • Verify database connection (for video_tasks table)"
    echo "   • Check Telegram bot configuration"
fi

exit $TEST_EXIT_CODE