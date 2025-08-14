# 🎬 Интеграция Google Veo 3 Fast

## 📋 Описание

Google Veo 3 Fast - это быстрая модель генерации видео от Google с поддержкой аудио. Стоимость: **$0.40 за секунду видео**.

## 🚀 Быстрый старт

### 1. Получение API ключа

1. Перейдите в [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Создайте новый проект или выберите существующий
3. Получите API ключ
4. Добавьте ключ в `.env` файл:

```env
GOOGLE_AI_API_KEY=your_api_key_here
```

### 2. Установка зависимостей

```bash
npm install @google/generative-ai
# или
yarn add @google/generative-ai
```

## 📡 API Endpoints

### 1. Генерация видео через Veo 3 Fast

**Endpoint:** `POST /generate/veo3-video`

**Тело запроса:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "duration": 5,  // секунды (1-10, по умолчанию 5)
  "telegram_id": "123456789",
  "username": "user123",
  "is_ru": false,
  "bot_name": "your_bot",
  "style": "cinematic",  // опционально
  "cameraMovement": "smooth pan",  // опционально
  "imageUrl": "https://..."  // опционально, для image-to-video
}
```

**Ответ:**
```json
{
  "message": "Processing Veo 3 video generation"
}
```

### 2. Использование через существующий endpoint text-to-video

**Endpoint:** `POST /generate/text-to-video`

**Тело запроса:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "videoModel": "veo3-fast",  // ← используйте эту модель
  "telegram_id": "123456789",
  "username": "user123",
  "is_ru": false,
  "bot_name": "your_bot"
}
```

## 💰 Стоимость и расчеты

### Базовая стоимость
- **$0.40** за секунду видео
- Конвертация в звезды: **1 звезда ≈ $0.16**
- За 5 секунд: **$2.00 = ~13 звезд**

### Пример расчета
```javascript
const duration = 5; // секунды
const costInDollars = duration * 0.40; // $2.00
const costInStars = Math.ceil(costInDollars * 2.5); // 5 звезд
```

## 🎨 Параметры генерации

### Поддерживаемые параметры:

| Параметр | Значения | Описание |
|----------|----------|----------|
| `duration` | 1-10 секунд | Длительность видео |
| `aspectRatio` | '16:9', '9:16', '1:1' | Соотношение сторон |
| `resolution` | 'SD', 'HD', '720p', '1080p' | Разрешение видео |
| `fps` | 24, 30, 60 | Частота кадров |
| `style` | string | Стиль видео (cinematic, anime, etc.) |
| `cameraMovement` | string | Движение камеры (pan, zoom, static) |

## 🔧 Конфигурация

### Файл конфигурации моделей

В файле `src/config/models.config.ts` добавлена конфигурация:

```typescript
'veo3-fast': {
  id: 'veo3-fast',
  title: 'Google Veo 3 Fast',
  inputType: ['text', 'image'],
  description: '🔥 Google Veo 3 - Быстрая генерация с аудио, $0.40/сек',
  basePrice: 2.0, // За 5 секунд
  api: {
    model: 'google/veo-3-fast',
    input: {
      duration: 5,
      resolution: '720p',
      fps: 24,
      use_audio: true,
    },
  },
  requirements: {
    minBalance: 5,
    maxDuration: 10,
  },
}
```

## 🏗️ Архитектура

### Основные компоненты:

1. **GoogleVeo3Service** (`src/services/googleVeo3Service.ts`)
   - Основной сервис для работы с Veo 3 API
   - Генерация видео
   - Загрузка изображений
   - Расчет стоимости

2. **GenerationController** (`src/controllers/generation.controller.ts`)
   - Endpoint для Veo 3
   - Валидация параметров
   - Обработка запросов

3. **generateTextToVideo** (`src/services/generateTextToVideo.ts`)
   - Интеграция с существующей системой
   - Обработка баланса
   - Сохранение результатов

## 📝 Примеры использования

### JavaScript/TypeScript
```javascript
const response = await fetch('https://your-api.com/generate/veo3-video', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prompt: 'A serene beach with waves',
    duration: 5,
    telegram_id: '123456789',
    username: 'user123',
    is_ru: false,
    bot_name: 'your_bot',
    style: 'photorealistic',
    cameraMovement: 'slow zoom in'
  })
});

const result = await response.json();
console.log(result);
```

### cURL
```bash
curl -X POST https://your-api.com/generate/veo3-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene beach with waves",
    "duration": 5,
    "telegram_id": "123456789",
    "username": "user123",
    "is_ru": false,
    "bot_name": "your_bot"
  }'
```

## ⚠️ Ограничения

1. **Максимальная длительность:** 10 секунд
2. **Минимальный баланс:** 5 звезд
3. **Поддерживаемые форматы изображений:** JPEG, PNG
4. **Максимальный размер изображения:** 20MB

## 🐛 Отладка

### Проверка конфигурации
```bash
# Проверьте наличие API ключа
echo $GOOGLE_AI_API_KEY

# Проверьте установку пакета
npm list @google/generative-ai
```

### Логирование
Сервис автоматически логирует:
- Начало генерации
- Ошибки API
- Результаты генерации
- Стоимость операции

## 📊 Мониторинг

### Метрики для отслеживания:
- Количество запросов
- Средняя длительность видео
- Общая стоимость
- Успешность генерации
- Время ответа API

## 🔐 Безопасность

1. **Храните API ключ в секрете**
2. **Используйте rate limiting**
3. **Валидируйте входные данные**
4. **Проверяйте баланс пользователя перед генерацией**

## 📚 Дополнительные ресурсы

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing Calculator](https://cloud.google.com/vertex-ai/pricing)

## 💡 FAQ

**Q: Как увеличить лимит запросов?**
A: Обратитесь в Google Cloud Support для увеличения квот.

**Q: Поддерживается ли batch обработка?**
A: В текущей версии - нет, но можно реализовать очередь.

**Q: Можно ли сохранить аудио отдельно?**
A: Да, видео включает аудио дорожку, которую можно извлечь с помощью ffmpeg.

## 🤝 Поддержка

При возникновении проблем:
1. Проверьте логи сервера
2. Убедитесь в корректности API ключа
3. Проверьте баланс и лимиты
4. Создайте issue в репозитории проекта
