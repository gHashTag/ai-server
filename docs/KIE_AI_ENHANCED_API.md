# 🚀 Расширенная интеграция Kie.ai API

## 📋 Обновления

Интеграция с Kie.ai была расширена для поддержки всех доступных полей API согласно [официальной документации](https://docs.kie.ai/veo3-api/generate-veo-3-video).

## 🆕 Новые возможности

### Поддерживаемые поля

| Поле             | Тип      | Описание                                               | Обязательное |
| ---------------- | -------- | ------------------------------------------------------ | ------------ |
| `model`          | string   | Модель генерации (`veo3_fast`, `veo3`, `runway-aleph`) | ✅           |
| `prompt`         | string   | Текстовое описание для генерации видео                 | ✅           |
| `duration`       | number   | Длительность видео в секундах (2-10)                   | ❌           |
| `aspectRatio`    | string   | Соотношение сторон (`16:9`, `9:16`, `1:1`)             | ❌           |
| `imageUrls`      | string[] | **НОВОЕ**: Массив URL изображений для image-to-video   | ❌           |
| `watermark`      | string   | **НОВОЕ**: Текст водяного знака на видео               | ❌           |
| `callBackUrl`    | string   | **НОВОЕ**: URL для webhook уведомлений                 | ❌           |
| `seeds`          | number   | **НОВОЕ**: Seed для воспроизводимой генерации          | ❌           |
| `enableFallback` | boolean  | **НОВОЕ**: Автоматический fallback на другие модели    | ❌           |

## 📝 Примеры использования

### Базовая генерация

```typescript
import { KieAiService } from '@/services/kieAiService'

const kieAi = new KieAiService()

const result = await kieAi.generateVideo({
  model: 'veo3_fast',
  prompt: 'A beautiful sunset over mountains',
  duration: 5,
  aspectRatio: '16:9',
})
```

### Генерация с массивом изображений

```typescript
const result = await kieAi.generateVideo({
  model: 'veo3',
  prompt: 'Smooth transition between images',
  imageUrls: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ],
  duration: 8,
  aspectRatio: '9:16',
})
```

### Полная конфигурация с webhook

```typescript
const result = await kieAi.generateVideo({
  model: 'veo3',
  prompt: 'Epic cinematic scene',
  duration: 10,
  aspectRatio: '16:9',
  imageUrls: ['https://example.com/reference.jpg'],
  watermark: 'MyBrand',
  callBackUrl: 'https://your-server.com/webhook/kie-ai',
  seeds: 12345,
  enableFallback: true,
  userId: 'user-123',
  projectId: 1,
  botName: 'ai-bot',
  isRu: false,
})
```

## 🔔 Webhook интеграция

### Настройка webhook URL

При генерации видео можно указать `callBackUrl` для получения уведомлений о статусе:

```typescript
const result = await kieAi.generateVideo({
  // ... другие параметры
  callBackUrl: 'https://your-server.com/webhook/kie-ai',
})
```

### Обработка webhook

Webhook обрабатывается универсальным контроллером:

```typescript
// Автоматически обрабатывается в UniversalWebhookController
// Endpoint: POST /webhook/kie-ai или /webhook/universal
```

### Структура webhook payload

```json
{
  "taskId": "task_123456",
  "status": "completed",
  "videoUrl": "https://cdn.kie.ai/videos/output.mp4",
  "result": {
    "videoUrl": "https://cdn.kie.ai/videos/output.mp4",
    "metadata": {
      "duration": 10,
      "resolution": "1920x1080",
      "watermark": "MyBrand"
    }
  }
}
```

## 💾 База данных

### Таблица video_tasks

Все задачи сохраняются в таблице `video_tasks` со следующей структурой:

```sql
CREATE TABLE video_tasks (
  id SERIAL PRIMARY KEY,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  telegram_id VARCHAR(255),
  bot_name VARCHAR(100),
  model VARCHAR(100),
  prompt TEXT,
  status VARCHAR(50) DEFAULT 'processing',
  video_url TEXT,
  error_message TEXT,
  is_ru BOOLEAN DEFAULT false,
  metadata JSONB, -- Хранит все дополнительные параметры
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Метаданные

В поле `metadata` сохраняются:

- `duration` - длительность видео
- `aspectRatio` - соотношение сторон
- `cost` - стоимость генерации
- `watermark` - водяной знак
- `seeds` - seed генерации
- `enableFallback` - флаг fallback
- `imageCount` - количество изображений
- `callBackUrl` - URL для callback

## 🧪 Тестирование

### Запуск тестов

```bash
# Компиляция TypeScript
npm run build

# Запуск тестов
node dist/tests/test-kie-ai-enhanced.js

# Или напрямую через ts-node
npx ts-node tests/test-kie-ai-enhanced.ts
```

### Проверка webhook

```bash
# Тест webhook endpoint
curl -X POST http://localhost:4000/webhook/kie-ai \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test_123",
    "status": "completed",
    "videoUrl": "https://example.com/video.mp4"
  }'
```

## 📊 Мониторинг

### Логирование

Все операции логируются с подробной информацией:

```typescript
logger.info('📹 Kie.ai webhook received', {
  taskId,
  status,
  videoUrl: videoUrl ? 'present' : 'absent',
  result: result ? 'present' : 'absent',
  metadata: metadata || null,
})
```

### Проверка статуса задачи

```typescript
const status = await kieAi.checkVideoStatus('task_123456')
console.log(status)
// { status: 'completed', videoUrl: '...', error: null }
```

## 🔒 Безопасность

### Валидация URL

Все callback URL валидируются перед отправкой:

```typescript
if (callBackUrl) {
  try {
    new URL(callBackUrl)
  } catch (error) {
    throw new Error(`Invalid callback URL: ${callBackUrl}`)
  }
}
```

### Обработка ошибок

Все ошибки обрабатываются с соответствующими HTTP кодами:

- `401` - Неверный API ключ
- `402` - Недостаточно кредитов
- `429` - Превышен лимит запросов

## 🚀 Развертывание

### Переменные окружения

```bash
# .env
KIE_AI_API_KEY=your_api_key_here
WEBHOOK_BASE_URL=https://your-server.com
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

## 📚 Дополнительные ресурсы

- [Официальная документация Kie.ai](https://docs.kie.ai)
- [API Reference](https://docs.kie.ai/veo3-api/generate-veo-3-video)
- [Примеры промптов](https://kie.ai/examples)
- [Поддержка](https://kie.ai/support)

## ⚠️ Важные замечания

1. **Асинхронная генерация**: Видео генерируется асинхронно, результат приходит через webhook
2. **Лимиты**: Максимальная длительность видео - 10 секунд
3. **Обратная совместимость**: Поле `imageUrl` (single) поддерживается для обратной совместимости, но рекомендуется использовать `imageUrls` (array)
4. **Webhook timeout**: Webhook должен ответить в течение 30 секунд

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи: `tail -f logs/combined.log | grep -i kie`
2. Убедитесь в наличии API ключа: `echo $KIE_AI_API_KEY`
3. Проверьте баланс: `curl -H "Authorization: Bearer $KIE_AI_API_KEY" https://api.kie.ai/api/v1/chat/credit`
4. Обратитесь в поддержку Kie.ai с task_id
