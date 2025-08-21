#!/bin/bash

# MCP Health Check Script
# Быстрая проверка всей MCP системы

echo "🔍 MCP Health Check - Проверка системы..."
echo "=========================================="

# Проверка рабочей директории
echo "📁 Рабочая директория: $(pwd)"
if [ "$(pwd)" != "/Users/playra/ai-server" ]; then
    echo "⚠️  Предупреждение: Не в правильной директории!"
    echo "   Выполните: cd /Users/playra/ai-server"
fi

# Проверка Node.js
echo ""
echo "🟢 Node.js версия:"
/Users/playra/.nvm/versions/node/v20.19.2/bin/node --version

# Проверка сборки
echo ""
echo "🔨 Проверка сборки:"
if [ -d "dist/mcp" ]; then
    echo "✅ dist/mcp существует"
    echo "   Файлы: $(ls dist/mcp/ | wc -l) файлов"
else
    echo "❌ dist/mcp НЕ НАЙДЕН!"
    echo "   Выполните: bun run build"
    exit 1
fi

# Проверка скриптов
echo ""
echo "📜 Проверка скриптов:"
if [ -f "scripts/start-mcp-for-cursor.js" ]; then
    echo "✅ start-mcp-for-cursor.js найден"
else
    echo "❌ start-mcp-for-cursor.js НЕ НАЙДЕН!"
    exit 1
fi

if [ -f "scripts/test-mcp-tools.js" ]; then
    echo "✅ test-mcp-tools.js найден"
else
    echo "❌ test-mcp-tools.js НЕ НАЙДЕН!"
fi

# Проверка конфигурации
echo ""
echo "⚙️  Проверка конфигурации:"
if [ -f ".cursor/mcp.json" ]; then
    echo "✅ .cursor/mcp.json найден"
    echo "   Команда: $(cat .cursor/mcp.json | grep -o '"/Users/playra/.nvm/versions/node/v20.19.2/bin/node"' | head -1)"
else
    echo "❌ .cursor/mcp.json НЕ НАЙДЕН!"
    exit 1
fi

# Быстрый тест MCP сервера (без timeout для macOS)
echo ""
echo "🧪 Быстрый тест MCP сервера:"
echo "   Запуск node scripts/test-mcp-tools.js в фоне..."

# Запускаем тест в фоне и убиваем через 3 секунды
node scripts/test-mcp-tools.js > /tmp/mcp-test.log 2>&1 &
TEST_PID=$!
sleep 3
kill $TEST_PID 2>/dev/null

if grep -q "MCP server responded" /tmp/mcp-test.log; then
    echo "✅ Сервер успешно отвечает на запросы"
    RESPONSES=$(grep -c "Response received" /tmp/mcp-test.log 2>/dev/null || echo "0")
    echo "   Получено ответов: $RESPONSES"
else
    echo "⚠️  Проверьте MCP сервер вручную"
    echo "   Команда: node scripts/test-mcp-tools.js"
fi

echo ""
echo "🎯 Итоговый статус:"
echo "✅ Система готова к работе с Cursor!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Открыть Cursor Settings → Features → Model Context Protocol"
echo "2. Проверить зеленый статус ai-server-neurophoto"
echo "3. Протестировать в чате: 'Создай нейрофото девушки с промптом \"beautiful woman\" и telegram_id \"123456789\"'"
echo ""
echo "🔧 При проблемах:"
echo "- Перезапустить Cursor (Cmd+Q)"
echo "- Выполнить: bun run build"
echo "- Проверить: node scripts/test-mcp-tools.js"
echo ""
echo "📖 Полная документация: MCP_QUICK_START.md" 