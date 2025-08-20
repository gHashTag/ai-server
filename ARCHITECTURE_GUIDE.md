# AI Server Architecture Guide - План А и План Б

## Обзор

Новая архитектура ветки v2 реализует систему с двумя планами выполнения:
- **План А (Inngest)** - Асинхронная обработка через очереди событий с расширенной обработкой ошибок
- **План Б (Fallback)** - Синхронная обработка с базовой функциональностью для критических случаев

## Структура проекта

```
src/
├── inngest/                    # План А - Inngest функции
│   ├── client.ts              # Inngest клиент
│   ├── functions/             # Функции обработки событий
│   │   ├── generateImage.ts   # Генерация изображений
│   │   ├── generateVideo.ts   # Генерация видео
│   │   ├── generateSpeech.ts  # Генерация речи
│   │   └── index.ts          # Экспорт всех функций
│   └── index.ts              # Главный экспорт
├── services/
│   ├── fallback/              # План Б - Fallback функции
│   │   ├── imageGeneration.ts # Упрощенная генерация изображений
│   │   ├── videoGeneration.ts # Упрощенная генерация видео
│   │   ├── speechGeneration.ts# Упрощенная генерация речи
│   │   └── index.ts          # Экспорт fallback функций
│   └── [существующие сервисы]
├── controllers/
│   └── generation.controller.ts # Выбор плана А/Б
└── config/
    └── index.ts              # Конфигурация переключения
```

## Конфигурация

### Переменные окружения

```env
# Управление планами выполнения
USE_INNGEST=true          # false - отключает план А
FALLBACK_MODE=false       # true - принудительно использует план Б

# Inngest настройки
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key
```

### Логика переключения

```typescript
// В config/index.ts
export function shouldUseInngest(): boolean {
  return EXECUTION_PLAN.USE_INNGEST && !EXECUTION_PLAN.FALLBACK_MODE
}
```

## План А - Inngest (Рекомендуемый)

### Особенности:
- ✅ Асинхронная обработка через очереди
- ✅ Надежная обработка ошибок с retry
- ✅ Step-by-step выполнение с возможностью восстановления
- ✅ Идемпотентность операций
- ✅ Мониторинг и логирование
- ✅ Контроль concurrency

### Поддерживаемые функции:
1. **Генерация изображений**
   - Событие: `image/generate.start`
   - Функция: `generateImageInngest`

2. **Генерация видео**
   - Text-to-Video: `video/text-to-video.start`
   - Image-to-Video: `video/image-to-video.start`

3. **Генерация речи**
   - Text-to-Speech: `speech/text-to-speech.start`
   - Voice Avatar: `speech/voice-avatar.start`

4. **Обучение модели**
   - Событие: `model/training.start`
   - Функция: `generateModelTraining`

### Пример использования:

```typescript
// В контроллере
if (shouldUseInngest()) {
  await inngest.send({
    name: 'image/generate.start',
    data: {
      prompt,
      model_type: model,
      num_images,
      telegram_id,
      username,
      is_ru,
      bot_name,
    },
  })
}
```

## План Б - Fallback

### Особенности:
- ⚡ Быстрое выполнение
- 🔧 Упрощенная логика
- 🚀 Минимальные зависимости
- ⚠️ Базовая обработка ошибок
- 🔄 Синхронное выполнение

### Когда использовать План Б:
- Inngest недоступен
- Критические ситуации
- Тестирование
- Отладка
- Упрощенная обработка

### Поддерживаемые функции:
1. `generateImageFallback`
2. `generateTextToVideoFallback` 
3. `generateImageToVideoFallback`
4. `generateSpeechFallback`
5. `createVoiceAvatarFallback`

## Переключение между планами

### Автоматическое переключение

Контроллер автоматически выбирает план основываясь на конфигурации:

```typescript
if (shouldUseInngest()) {
  // План А - Inngest
  logger.info('Использование плана А (Inngest)')
  await inngest.send(event)
} else {
  // План Б - Fallback
  logger.info('Использование плана Б (Fallback)')
  await fallbackFunction(params)
}
```

### Ручное переключение

```bash
# Переключить на План Б
export FALLBACK_MODE=true

# Отключить Inngest полностью
export USE_INNGEST=false

# Вернуться к Плану А
export USE_INNGEST=true
export FALLBACK_MODE=false
```

## События Inngest

### Схема событий

```typescript
// Генерация изображений
interface ImageGenerationData {
  prompt: string
  model_type: string  
  num_images: number
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// Генерация видео
interface TextToVideoData {
  prompt: string
  videoModel: string
  telegram_id: string
  username: string
  is_ru: boolean
  bot_name: string
}

// И так далее...
```

## Мониторинг и логирование

### Логи планов

```typescript
// План А
logger.info({
  message: 'Использование плана А (Inngest)',
  telegram_id,
  eventType: 'image/generate.start'
})

// План Б  
logger.info({
  message: 'Использование плана Б (Fallback)',
  telegram_id,
  function: 'generateImageFallback'
})
```

### Ошибки

```typescript
// План А - обработка в step functions
catch (error) {
  logger.error({
    message: 'Ошибка Inngest функции',
    error: error.message,
    step: 'generate-image'
  })
  throw error // Inngest обработает retry
}

// План Б - простая обработка
catch (error) {
  logger.error('Ошибка fallback функции:', error)
  await sendErrorNotification(telegram_id, error.message)
  throw error
}
```

## Деплой и настройка

### 1. Настройка Inngest

```bash
# Установка переменных
export INNGEST_EVENT_KEY="your_event_key"
export INNGEST_SIGNING_KEY="your_signing_key"

# Запуск с Inngest
npm run dev
```

### 2. Настройка только fallback

```bash  
# Отключение Inngest
export USE_INNGEST=false

# Запуск без Inngest
npm run dev
```

### 3. Тестирование переключения

```bash
# Тест плана А
curl -X POST /api/generation/text-to-image \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"test","model":"flux","num_images":1,...}'

# Переключение на план Б  
export FALLBACK_MODE=true

# Повторный тест
curl -X POST /api/generation/text-to-image \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"test","model":"flux","num_images":1,...}'
```

## Будущие улучшения

- [ ] Автоматическое переключение при ошибках Inngest
- [ ] Метрики производительности для каждого плана
- [ ] Настройка retry политик
- [ ] Дополнительные fallback функции
- [ ] A/B тестирование планов
- [ ] Dashboard для мониторинга планов

## Заключение

Новая архитектура обеспечивает:
1. **Надежность** - всегда есть план Б
2. **Гибкость** - легкое переключение между планами  
3. **Масштабируемость** - асинхронная обработка в плане А
4. **Простоту** - понятная структура и конфигурация

Рекомендуется использовать План А (Inngest) для продакшена и План Б для разработки/отладки.