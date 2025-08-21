#!/bin/bash

# 📊 Мониторинг генерации Veo3 в реальном времени
# Следит за появлением папки test_user и новых видео

UPLOAD_PATH="/Users/playra/ai-server/src/uploads"
API_URL="http://localhost:4000"

echo "🔍 Мониторинг генерации Veo3 для test_user"
echo "======================================================"
echo "📁 Отслеживаемая папка: $UPLOAD_PATH"
echo "🌐 API: $API_URL"
echo "👤 Пользователь: test_user"
echo ""

while true; do
  echo "⏰ $(date '+%H:%M:%S') - Проверка..."
  
  # 1. Проверка API
  API_STATUS=$(curl -s "$API_URL/health" 2>/dev/null | jq -r '.status // "ERROR"' 2>/dev/null || echo "OFFLINE")
  echo "   🌐 API: $API_STATUS"
  
  # 2. Проверка общего количества пользователей
  USER_COUNT=$(ls -1 "$UPLOAD_PATH" 2>/dev/null | wc -l | xargs)
  echo "   👥 Всего пользователей: $USER_COUNT"
  
  # 3. Проверка конкретно test_user
  if [ -d "$UPLOAD_PATH/test_user" ]; then
    echo "   🎉 test_user НАЙДЕН!"
    
    # Показать содержимое папки test_user
    echo "   📁 Содержимое test_user:"
    ls -la "$UPLOAD_PATH/test_user/" | while read line; do
      echo "      $line"
    done
    
    # Поиск MP4 файлов
    MP4_FILES=$(find "$UPLOAD_PATH/test_user" -name "*.mp4" 2>/dev/null)
    if [ -n "$MP4_FILES" ]; then
      echo "   🎬 ВИДЕО НАЙДЕНЫ:"
      echo "$MP4_FILES" | while read file; do
        SIZE=$(ls -lh "$file" | awk '{print $5}')
        MODIFIED=$(ls -l "$file" | awk '{print $6, $7, $8}')
        echo "      📹 $(basename "$file") ($SIZE, $MODIFIED)"
      done
      echo ""
      echo "🎊 ГЕНЕРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!"
      echo "🔗 Файлы доступны в: $UPLOAD_PATH/test_user/"
      break
    else
      echo "   ⏳ Папка создана, но видео еще нет..."
    fi
  else
    echo "   ⏳ test_user пока не найден (генерация в процессе)"
  fi
  
  # 4. Показать последние 3 папки (активность)
  echo "   📊 Последняя активность:"
  ls -lt "$UPLOAD_PATH" | head -4 | tail -3 | while read line; do
    echo "      $(echo $line | awk '{print $9, $6, $7, $8}')"
  done
  
  echo "   ----------------------------------------"
  sleep 5
done