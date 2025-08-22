# ROADMAP: Миграция в паттерн "План А (Inngest) + План Б (Direct Services)"

## 🎯 Цель
Реализовать единый паттерн для всей бизнес-логики сервера:
- **План А**: Inngest функции (асинхронная обработка через очереди)
- **План Б**: Прямые сервисы (синхронная обработка, fallback)

## 📊 Текущее состояние

### ✅ УЖЕ РЕАЛИЗОВАНО (План А + План Б)
1. **generateTextToImage** - ✅ Полностью покрыто
2. **generateSpeech** - ✅ Полностью покрыто
3. **createVoiceAvatar** - ✅ Полностью покрыто
4. **generateTextToVideo** - ✅ Полностью покрыто
5. **generateImageToVideo** - ✅ Полностью покрыто

### ❌ ТРЕБУЕТ МИГРАЦИИ (только План Б)
#### В GenerationController
1. **generateImageToPrompt** - 🔴 Только прямой сервис
2. **generateNeuroImage** - 🔴 Только прямой сервис
3. **generateNeuroImageV2** - 🔴 Только прямой сервис
4. **generateLipSync** - 🔴 Только прямой сервис
5. **generateModelTrainingV2** - 🔴 Только прямой сервис

#### В других контроллерах
1. **PaymentService** (paymentSuccess.controller.ts) - 🔴 Критичная бизнес-логика
2. **BroadcastService** (broadcast.controller.ts) - 🔴 Массовые уведомления
3. **GameService** (game.controller.ts) - 🔴 Игровая логика
4. **CreateTasksService** (create-tasks.controller.ts) - 🔴 Создание задач
5. **VideoService** (video.controller.ts) - 🔴 Обработка видео
6. **RoomService** (roomController.ts) - 🔴 Управление комнатами
7. **AiAssistantService** (aiAssistant.controller.ts) - 🔴 AI ассистент
8. **NotificationService** (notification.service.ts) - 🔴 Уведомления

## 🚀 ROADMAP РЕАЛИЗАЦИИ

### Фаза 1: Завершение GenerationController (1-2 дня)
**Приоритет: ВЫСОКИЙ**

1. **generateImageToPrompt** → Inngest
   - Создать `generateImageToPromptInngest`
   - Добавить обработчик событий
   - Обновить контроллер

2. **generateNeuroImage** → Inngest
   - Создать `generateNeuroImageInngest`
   - Добавить обработчик событий
   - Обновить контроллер

3. **generateNeuroImageV2** → Inngest
   - Создать `generateNeuroImageV2Inngest`
   - Добавить обработчик событий
   - Обновить контроллер

4. **generateLipSync** → Inngest
   - Создать `generateLipSyncInngest`
   - Добавить обработчик событий
   - Обновить контроллер

5. **generateModelTrainingV2** → Inngest
   - Создать `generateModelTrainingV2Inngest`
   - Добавить обработчик событий
   - Обновить контроллер

### Фаза 2: Критичные бизнес-процессы (2-3 дня)
**Приоритет: ВЫСОКИЙ**

1. **PaymentService** → Inngest
   - Создать `processPaymentInngest`
   - Обеспечить надежность платежей
   - Добавить retry логику

2. **BroadcastService** → Inngest
   - Создать `broadcastMessageInngest`
   - Оптимизировать массовые рассылки
   - Добавить rate limiting

3. **NotificationService** → Inngest
   - Создать `sendNotificationInngest`
   - Централизовать уведомления
   - Добавить приоритизацию

### Фаза 3: Игровая и пользовательская логика (1-2 дня)
**Приоритет: СРЕДНИЙ**

1. **GameService** → Inngest
   - Создать `processGameActionInngest`
   - Обеспечить консистентность игрового состояния

2. **RoomService** → Inngest
   - Создать `manageRoomInngest`
   - Оптимизировать управление комнатами

3. **AiAssistantService** → Inngest
   - Создать `processAiRequestInngest`
   - Добавить очереди для AI запросов

### Фаза 4: Вспомогательные сервисы (1 день)
**Приоритет: НИЗКИЙ**

1. **CreateTasksService** → Inngest
2. **VideoService** → Inngest
3. **UploadService** → Inngest

### Фаза 5: Тестирование и оптимизация (2-3 дня)
**Приоритет: КРИТИЧНЫЙ**

1. **Создание тестов для всех Inngest функций**
   - Unit тесты для каждой Inngest функции
   - Integration тесты для паттерна План А/Б
   - E2E тесты для критичных флоу

2. **Мониторинг и метрики**
   - Добавить метрики производительности
   - Настроить алерты для fallback на План Б
   - Логирование переключений между планами

## 📝 Шаблон реализации

### Структура Inngest функции:
```typescript
// src/core/inngest-client/helpers/serviceName.ts
import { inngest } from '../clients'
import { originalService } from '@/services/originalService'

export const serviceNameInngest = inngest.createFunction(
  { id: 'service-name' },
  { event: 'service/action.start' },
  async ({ event, step }) => {
    return await step.run('process-service', async () => {
      return await originalService(event.data.params)
    })
  }
)
```

### Обновление контроллера:
```typescript
if (shouldUseInngest()) {
  // План А - Inngest
  await inngest.send({
    name: 'service/action.start',
    data: { params }
  })
} else {
  // План Б - Прямой сервис
  await originalService(params)
}
```

## 🎯 Критерии успеха
1. **100% покрытие** всех бизнес-процессов паттерном План А/Б
2. **90%+ тестовое покрытие** всех Inngest функций
3. **Seamless fallback** между планами без потери данных
4. **Мониторинг** и алерты для всех критичных процессов
5. **Документация** по использованию каждого сервиса

## ⚡ Быстрый старт
1. Создать недостающие Inngest функции для GenerationController
2. Покрыть их тестами
3. Обновить контроллеры для использования паттерна
4. Протестировать переключение между планами
5. Переходить к следующей фазе

## 📊 Метрики отслеживания
- Количество сервисов с паттерном План А/Б: **5/13 (38%)**
- Покрытие тестами Inngest функций: **0%**
- Время отклика План А vs План Б
- Частота fallback на План Б
- Количество ошибок в очередях Inngest