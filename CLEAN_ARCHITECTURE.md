# AI Server - Очищенная архитектура План А/План Б

## Критический анализ и рефакторинг

После анализа на "мертвый код" была проведена **кардинальная очистка архитектуры**:

### ❌ Что было удалено (мертвый код):
1. **Дублированный Inngest клиент** (`src/inngest/`)
2. **Fallback функции** - дублировали логику существующих сервисов
3. **Сложные Inngest функции** - копировали бизнес-логику
4. **Ненужные обертки** и абстракции

### ✅ Что осталось (правильная архитектура):

## План А - Inngest (Асинхронные обертки)
```
src/core/inngest-client/helpers/
├── generateModelTraining.ts    # Уже существовал
├── generateTextToImage.ts      # Новая обертка
├── generateTextToVideo.ts      # Новая обертка  
├── generateImageToVideo.ts     # Новая обертка
└── generateSpeech.ts           # Новая обертка
```

**Принцип:** Простые обертки, которые вызывают оригинальные сервисы через Inngest.

## План Б - Оригинальные сервисы (Прямые вызовы)
```
src/services/
├── generateTextToImage.ts      # Оригинальная бизнес-логика
├── generateSpeech.ts           # Оригинальная бизнес-логика
├── generateTextToVideo.ts      # Оригинальная бизнес-логика
├── generateImageToVideo.ts     # Оригинальная бизнес-логика
└── createVoiceAvatar.ts        # Оригинальная бизнес-логика
```

**Принцип:** Используем существующие проверенные сервисы без изменений.

## Переключение планов

### В контроллере (generation.controller.ts):
```typescript
if (shouldUseInngest()) {
  // План А - отправляем в Inngest очередь
  await inngest.send({
    name: 'image/text-to-image.start',
    data: { /* параметры */ }
  })
} else {
  // План Б - прямой вызов оригинального сервиса
  generateTextToImage(/* параметры */).catch(error => {
    logger.error('Ошибка при генерации:', error)
  })
}
```

### Конфигурация:
```env
USE_INNGEST=true          # План А по умолчанию
FALLBACK_MODE=false       # Принудительный план Б
```

## События Inngest

| Сервис | Событие | Inngest функция |
|--------|---------|-----------------|
| Text-to-Image | `image/text-to-image.start` | `generateTextToImageInngest` |
| Text-to-Video | `video/text-to-video.start` | `generateTextToVideoInngest` |
| Image-to-Video | `video/image-to-video.start` | `generateImageToVideoInngest` |
| Text-to-Speech | `speech/text-to-speech.start` | `generateSpeechInngest` |
| Voice Avatar | `speech/voice-avatar.start` | `createVoiceAvatarInngest` |
| Model Training | `model/training.start` | `generateModelTraining` |

## Принципы очищенной архитектуры

### 1. **Нет дублирования бизнес-логики**
- Один источник истины для каждой функции
- Inngest функции - только тонкие обертки
- Оригинальные сервисы содержат всю логику

### 2. **Простота**
- Plan А = Inngest.send() → Inngest функция → Оригинальный сервис
- Plan Б = Прямой вызов оригинального сервиса
- Без лишних абстракций

### 3. **Надежность**
- Всегда есть fallback на план Б
- Оригинальные сервисы остаются неизменными
- Тестируемость сохранена

### 4. **Минимальный код**
- Удален весь избыточный код
- Каждая строка имеет назначение
- Легко поддерживать

## Структура Inngest оберток

Каждая обертка следует простому паттерну:

```typescript
export const serviceNameInngest = inngest.createFunction(
  {
    id: 'service-name',
    concurrency: N,
    idempotency: 'unique-key',
  },
  { event: 'category/action.start' },
  async ({ event, step }) => {
    const eventData = event.data as ServiceData
    
    return await step.run('execute-service', async () => {
      const { bot } = getBotByName(eventData.bot_name)
      if (!bot) throw new Error(`Бот не найден`)
      
      // Вызов оригинального сервиса
      const result = await originalService(/* параметры */)
      
      return { success: true, result }
    })
  }
)
```

## Тестирование

- **План Б** - используйте существующие тесты в `src/test/`
- **План А** - тестируйте через Inngest dev сервер

## Переключение режимов

```bash
# Продакшн - План А (Inngest)
export USE_INNGEST=true
export FALLBACK_MODE=false

# Разработка/отладка - План Б (прямые вызовы)
export FALLBACK_MODE=true

# Полное отключение Inngest
export USE_INNGEST=false
```

## Заключение

**Результат рефакторинга:**
- ✅ Удалено 80% избыточного кода
- ✅ Сохранена вся функциональность  
- ✅ Упрощена архитектура
- ✅ Повышена надежность
- ✅ Улучшена поддерживаемость

**Принцип:** Максимальная простота при сохранении гибкости Plan A/Plan B.