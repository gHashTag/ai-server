# Circuit Breaker Integration Guide 🛡️

## Обзор

Circuit Breakers интегрированы во все критически важные внешние API для повышения надежности системы. Эта документация описывает, как использовать защищенные версии API.

## Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Service  │───▶│  Circuit Breaker │───▶│  External API   │
│                 │    │   + Retry Logic  │    │  (Replicate,    │
│                 │    │                  │    │   Supabase,     │
│                 │    │                  │    │   ElevenLabs)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Доступные Обертки

### 1. Replicate API (`replicateReliable`)

```typescript
import { replicateReliable } from '@/core/replicate/withCircuitBreaker'

// Запуск модели с защитой
const result = await replicateReliable.run(
  'stability-ai/stable-diffusion:model-id',
  { input: { prompt: 'A beautiful sunset' } },
  'image-generation' // operation name для логирования
)

// Получение списка моделей
const models = await replicateReliable.listModels('list-models-operation')

// Получение предсказания
const prediction = await replicateReliable.getPrediction(
  'prediction-id',
  'get-prediction-operation'
)

// Создание предсказания
const newPrediction = await replicateReliable.createPrediction(
  'model-owner/model-name',
  { prompt: 'test' },
  'create-prediction-operation'
)
```

### 2. Supabase API (`supabaseReliable`)

```typescript
import { supabaseReliable } from '@/core/supabase/withCircuitBreaker'

// SELECT запрос
const users = await supabaseReliable.select(
  'users',
  'id, telegram_id, level',
  'get-users-operation'
)

// INSERT запрос
const newUser = await supabaseReliable.insert(
  'users',
  { telegram_id: '123', level: 1 },
  'create-user-operation'
)

// UPDATE запрос
const updatedUser = await supabaseReliable.update(
  'users',
  { level: 2 },
  'telegram_id.eq.123',
  'update-user-level-operation'
)

// DELETE запрос
await supabaseReliable.delete(
  'old_table',
  'created_at.lt.2023-01-01',
  'cleanup-old-data-operation'
)

// RPC вызов
const balance = await supabaseReliable.rpc(
  'get_user_balance',
  { user_telegram_id: '123' },
  'get-balance-operation'
)

// Health check
const isHealthy = await supabaseReliable.healthCheck('health-check-operation')
```

### 3. ElevenLabs API (`elevenLabsReliable`)

```typescript
import { elevenLabsReliable } from '@/core/elevenlabs/withCircuitBreaker'

// Генерация речи
const audioStream = await elevenLabsReliable.generate({
  voice: 'voice-id',
  model_id: 'eleven_turbo_v2_5',
  text: 'Hello world'
}, 'text-to-speech-operation')

// Получение списка голосов
const voices = await elevenLabsReliable.getVoices('get-voices-operation')

// Клонирование голоса
const clonedVoice = await elevenLabsReliable.cloneVoice(
  'New Voice',
  'Description',
  [audioFile1, audioFile2],
  'clone-voice-operation'
)

// Health check
const isHealthy = await elevenLabsReliable.healthCheck('health-check-operation')
```

## Конфигурация Circuit Breakers

Circuit Breakers автоматически создаются с оптимальными настройками:

```typescript
// Настройки по умолчанию
const defaultConfig = {
  failureThreshold: 5,      // 5 ошибок для открытия
  recoveryTimeout: 30000,   // 30 секунд до попытки восстановления
  monitoringPeriod: 60000,  // 60 секунд период мониторинга
  successThreshold: 3,      // 3 успеха для закрытия
}
```

### Специфичные настройки для сервисов:

- **Replicate**: `failureThreshold: 3` (более чувствительный)
- **Supabase**: `recoveryTimeout: 15000` (быстрое восстановление)
- **ElevenLabs**: стандартные настройки

## Retry Механизм

Все обертки используют экспоненциальный backoff:

```typescript
const retryConfig = {
  maxAttempts: 3,           // Максимум 3 попытки
  baseDelay: 1000,          // Базовая задержка 1 секунда
  maxDelay: 30000,          // Максимальная задержка 30 секунд
  exponentialBase: 2,       // Экспоненциальный рост x2
  jitter: true,             // Случайность для избежания thundering herd
}
```

## Мониторинг

### Получение статистики Circuit Breakers

```typescript
import { getAllCircuitBreakerStats } from '@/utils/circuitBreaker'

const stats = getAllCircuitBreakerStats()
console.log(stats.replicate.state) // CLOSED | HALF_OPEN | OPEN
console.log(stats.replicate.totalRequests)
console.log(stats.replicate.totalFailures)
```

### Health Check Endpoints

- `GET /health` - Базовая проверка здоровья
- `GET /health/detailed` - Детальная проверка с Circuit Breaker статистикой
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Metrics Endpoints

- `GET /metrics` - JSON метрики
- `GET /metrics/prometheus` - Prometheus формат

## Примеры Интеграции

### Замена прямых вызовов API

**До:**
```typescript
import { replicate } from '@/core/replicate'

const result = await replicate.run(model, options)
```

**После:**
```typescript
import { replicateReliable } from '@/core/replicate/withCircuitBreaker'

const result = await replicateReliable.run(model, options, 'operation-name')
```

### Обработка ошибок Circuit Breaker

```typescript
try {
  const result = await replicateReliable.run(model, options, 'image-gen')
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Circuit breaker открыт - сервис недоступен
    await bot.telegram.sendMessage(
      telegram_id,
      'Сервис временно недоступен. Попробуйте позже.'
    )
  } else {
    // Другая ошибка
    throw error
  }
}
```

## Логирование

Circuit Breakers автоматически логируют:

- Изменения состояния (CLOSED → OPEN → HALF_OPEN → CLOSED)
- Статистику ошибок и успехов
- Время восстановления
- Детали операций

Пример логов:
```
🔴 Circuit breaker OPEN: replicate (failures: 5, threshold: 3)
🟡 Circuit breaker testing recovery: replicate
🟢 Circuit breaker CLOSED: replicate (successes: 3)
```

## Тестирование

Запуск тестов Circuit Breaker:
```bash
npm test -- --testPathPattern="circuitBreaker.test.ts"
```

Проверка надежности системы:
```bash
bash scripts/reliability-check.sh
```

## Best Practices

1. **Всегда используйте защищенные версии API** вместо прямых вызовов
2. **Указывайте осмысленные имена операций** для лучшего логирования
3. **Обрабатывайте ошибки Circuit Breaker** в пользовательском интерфейсе
4. **Мониторьте метрики** через `/metrics` endpoints
5. **Настраивайте алерты** на основе состояния Circuit Breakers

## Troubleshooting

### Circuit Breaker постоянно открыт

1. Проверьте логи на наличие ошибок API
2. Убедитесь в доступности внешнего сервиса
3. Проверьте настройки `failureThreshold`
4. Принудительно сбросьте Circuit Breaker через `/metrics`

### Медленные ответы

1. Проверьте метрики `responseTime` в `/health/detailed`
2. Настройте `recoveryTimeout` для быстрого восстановления
3. Проверьте сетевое соединение

### Высокое потребление ресурсов

1. Мониторьте метрики памяти через `/metrics`
2. Проверьте количество активных retry операций
3. Настройте `maxDelay` для ограничения задержек

## Расширение

Для добавления нового сервиса:

1. Создайте обертку в `src/core/[service]/withCircuitBreaker.ts`
2. Добавьте Circuit Breaker в `circuitBreakers` registry
3. Обновите health checks и metrics
4. Добавьте тесты
5. Обновите документацию 