#!/bin/bash

# 🔧 Скрипт автоматического обновления ngrok URLs
# Обновляет все документы с новым ngrok URL

echo "🔧 Обновление ngrok URLs в документации..."

# Получаем актуальный ngrok URL
NEW_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ -z "$NEW_URL" ] || [ "$NEW_URL" = "null" ]; then
    echo "❌ Не удалось получить ngrok URL. Проверьте что ngrok запущен."
    exit 1
fi

echo "✅ Актуальный ngrok URL: $NEW_URL"

# Список старых URLs для замены (добавляйте сюда предыдущие URLs)
OLD_URLS=(
    "https://1c8705573b80.ngrok.app"
    "https://c156b0d97b4a.ngrok.app"
    "https://02bcd79606b5.ngrok.app"
    "https://4719685c0b5b.ngrok.app"
)

# Список файлов для обновления
FILES=(
    "MORPHING_FRONTEND_EXAMPLES.md"
    "MORPHING_API_STATUS_REPORT.md"
    "MORPHING_NGROK_UPDATE.md"
)

# Функция замены URL в файле
update_file() {
    local file=$1
    local old_url=$2
    local new_url=$3
    
    if [ -f "$file" ]; then
        # Проверяем содержит ли файл старый URL
        if grep -q "$old_url" "$file"; then
            echo "📝 Обновляю $file: $old_url -> $new_url"
            sed -i '' "s|$old_url|$new_url|g" "$file"
        fi
    fi
}

# Обновляем все файлы
for file in "${FILES[@]}"; do
    echo "🔍 Проверяю файл: $file"
    
    for old_url in "${OLD_URLS[@]}"; do
        update_file "$file" "$old_url" "$NEW_URL"
    done
done

echo ""
echo "✅ Обновление завершено!"
echo "📋 Новый URL: $NEW_URL"
echo "🧪 Проверьте работу: curl $NEW_URL/health" 