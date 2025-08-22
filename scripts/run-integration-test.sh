#!/bin/bash

# Скрипт для запуска интеграционного теста Instagram Scraper
# Автоматически проверяет зависимости и запускает тест

set -e

echo "🚀 Запуск интеграционного теста Instagram Scraper"
echo "=================================================="

# Проверка переменных окружения
echo "🔍 Проверка переменных окружения..."

if [ -z "$SUPABASE_URL" ]; then
    echo "❌ SUPABASE_URL не установлена"
    exit 1
fi

if [ -z "$RAPIDAPI_INSTAGRAM_KEY" ]; then
    echo "❌ RAPIDAPI_INSTAGRAM_KEY не установлена"
    exit 1
fi

if [ -z "$RAPIDAPI_INSTAGRAM_HOST" ]; then
    echo "❌ RAPIDAPI_INSTAGRAM_HOST не установлена"
    exit 1
fi

echo "✅ Переменные окружения настроены"

# Проверка, что порт 8288 свободен
echo "🔍 Проверка порта 8288..."
if lsof -i :8288 >/dev/null 2>&1; then
    echo "⚠️ Порт 8288 занят, попытка освободить..."
    # Убиваем процессы на порту 8288
    lsof -ti :8288 | xargs -r kill -9
    sleep 2
    
    if lsof -i :8288 >/dev/null 2>&1; then
        echo "❌ Не удалось освободить порт 8288"
        exit 1
    fi
fi

echo "✅ Порт 8288 свободен"

# Проверка зависимостей
echo "🔍 Проверка зависимостей..."

if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js не установлен"
    exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
    echo "❌ npx не установлен"
    exit 1
fi

# Проверка inngest-cli
if ! npm list -g inngest-cli >/dev/null 2>&1; then
    echo "⚠️ inngest-cli не установлен глобально, пробуем установить..."
    npm install -g inngest-cli
fi

echo "✅ Зависимости проверены"

# Проверка TypeScript компиляции
echo "🔍 Проверка TypeScript..."
if ! npx tsc --noEmit; then
    echo "❌ Ошибки TypeScript, исправьте их перед запуском теста"
    exit 1
fi

echo "✅ TypeScript проверен"

# Создание резервной копии лога
LOG_FILE="integration-test-$(date +%Y%m%d_%H%M%S).log"
echo "📝 Лог будет сохранен в: $LOG_FILE"

# Запуск теста
echo ""
echo "🏁 Запуск интеграционного теста..."
echo "=================================================="

# Запускаем тест с логированием
if npx tsx test-events/inngest-integration-test.ts 2>&1 | tee "$LOG_FILE"; then
    echo ""
    echo "🎉 ИНТЕГРАЦИОННЫЙ ТЕСТ ЗАВЕРШЕН УСПЕШНО!"
    echo "📋 Лог сохранен в: $LOG_FILE"
    exit 0
else
    echo ""
    echo "❌ ИНТЕГРАЦИОННЫЙ ТЕСТ ПРОВАЛЕН"
    echo "📋 Лог сохранен в: $LOG_FILE"
    echo "🔍 Проверьте лог для диагностики проблем"
    exit 1
fi 