# Bot Validation Fix

## Проблема
Ошибка `TypeError: Cannot read properties of undefined (reading 'telegram')` возникала из-за того, что функция `getBotByName()` возвращала `undefined` для бота, а код пытался использовать `bot.telegram` без проверки.

## Исправления

Добавлены проверки бота во всех местах использования `getBotByName()`:

### 1. `src/services/generateTextToVideo.ts:202`
```typescript
const { bot } = getBotByName(bot_name)

// Проверяем что бот найден
if (!bot) {
  throw new Error(`Bot with name '${bot_name}' not found. Please check bot configuration.`)
}
```

### 2. `src/inngest-functions/instagramApifyScraper.ts:450`
```typescript
const { bot } = getBotByName(validatedData.bot_name!)

if (!bot) {
  log.error(`❌ Bot not found: ${validatedData.bot_name}`)
  return
}
```

### 3. `src/inngest-functions/instagramApifyScraper.ts:574` (уведомления админу)
```typescript
const { bot } = getBotByName(validatedData.bot_name)

if (!bot) {
  log.error(`❌ Admin notification failed: Bot not found - ${validatedData.bot_name}`)
  return
}
```

### 4. `src/inngest-functions/competitorDelivery.ts:110`
```typescript
const { bot } = getBotByName(subscriber.bot_name)

if (!bot) {
  log.error(`❌ Bot not found for subscriber: ${subscriber.bot_name}`)
  continue
}
```

### 5. `src/inngest-functions/competitorDelivery.ts:162`
```typescript
const { bot } = getBotByName(subscriber.bot_name)

if (!bot) {
  log.error(`❌ Bot not found for subscriber: ${subscriber.bot_name}`)
  continue
}
```

## Результат

✅ **ИСПРАВЛЕНО**: Все вызовы `bot.telegram` и `bot.api` теперь защищены проверкой
✅ **БЕЗОПАСНОСТЬ**: Понятные сообщения об ошибке вместо краша
✅ **ЛОГИРОВАНИЕ**: Детальная диагностика проблем с ботами

## Причины ошибки

Ошибка возникала когда:
- Бот с указанным именем не найден в конфигурации
- Неверное имя бота передается в функцию
- Проблемы с инициализацией ботов

## Что делать если ошибка повторится

1. Проверить логи на сообщения типа `❌ Bot not found`
2. Убедиться что имя бота правильное
3. Проверить конфигурацию ботов в `@/core/bot`
4. Проверить токены ботов в переменных окружения

🎉 **Готово!** Теперь генерация видео не будет падать с ошибкой `Cannot read properties of undefined`.