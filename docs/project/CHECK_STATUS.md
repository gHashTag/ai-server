# 🔍 Проверка статуса генерации Veo3

## 📍 Где искать результаты

**Основная папка:**

```bash
/Users/playra/ai-server/src/uploads/
```

**Ваше видео появится в:**

```bash
/Users/playra/ai-server/src/uploads/test_user/veo3-videos/[timestamp].mp4
```

## 📊 Команды для мониторинга

### 1. Проверка API:

```bash
curl http://localhost:4000/health
```

### 2. Мониторинг папки uploads:

```bash
# Простой способ:
ls -la /Users/playra/ai-server/src/uploads/

# С автообновлением каждые 2 секунды:
watch -n 2 "ls -la /Users/playra/ai-server/src/uploads/"
```

### 3. Поиск новых MP4 файлов:

```bash
# Поиск всех MP4 файлов за последние 10 минут:
find /Users/playra/ai-server/src/uploads -name "*.mp4" -newermt "10 minutes ago"

# Поиск конкретно test_user:
find /Users/playra/ai-server/src/uploads -path "*test_user*" -name "*.mp4"
```

### 4. Проверка процесса генерации:

```bash
# Проверка активности сервера:
ps aux | grep "node.*server"

# Активность процессора (генерация нагружает систему):
top -l 1 | grep "node"
```

### 5. Быстрый скрипт для ожидания результата:

```bash
#!/bin/bash
echo "Ожидание результата для test_user..."
while [ ! -d "/Users/playra/ai-server/src/uploads/test_user" ]; do
  echo "⏳ $(date '+%H:%M:%S'): Пока нет папки test_user..."
  sleep 10
done

echo "🎉 Папка test_user создана!"
ls -la /Users/playra/ai-server/src/uploads/test_user/

# Ожидание появления видео
while [ -z "$(find /Users/playra/ai-server/src/uploads/test_user -name '*.mp4' 2>/dev/null)" ]; do
  echo "⏳ $(date '+%H:%M:%S'): Ожидание MP4 файла..."
  sleep 10
done

echo "🎬 ВИДЕО ГОТОВО!"
find /Users/playra/ai-server/src/uploads/test_user -name "*.mp4" -exec ls -la {} \;
```

## 🚨 Возможные проблемы

### Если генерация долго не завершается:

1. **Проверить настройки KIE_AI_API_KEY:**

   ```bash
   # В .env должно быть:
   KIE_AI_API_KEY=kie_your_api_key_here
   ```

2. **Проверить ошибки в логах:**

   ```bash
   # Если есть systemd:
   journalctl -u your_service_name -f

   # Или через PM2:
   pm2 logs
   ```

3. **Перезапустить генерацию с другой моделью:**
   ```bash
   curl -X POST http://localhost:4000/generate/text-to-video \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Beautiful sunset, vertical shot",
       "videoModel": "haiper-video-2",
       "duration": 3,
       "telegram_id": "test_user_backup",
       "username": "test_user_backup",
       "is_ru": false,
       "bot_name": "test_bot"
     }'
   ```

## 🎯 Ожидаемое время генерации

- **Haiper-video-2**: 1-2 минуты
- **Veo3-fast**: 2-5 минут
- **Veo3 Standard**: 5-10 минут

## 📱 Telegram уведомления

Если настроен Telegram бот, видео также будет отправлено в чат с ботом.

---

_Создано: 21.08.2025_
