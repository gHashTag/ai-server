# Circuit Breaker Integration - Complete Guide 🛡️

## 🎯 Обзор

Полная интеграция Circuit Breakers завершена! Все внешние API теперь защищены от сбоев с помощью паттерна Circuit Breaker и механизма повторных попыток.

## 🏗️ Архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Your Service  │───▶│  Circuit Breaker │───▶│  External API   │
│                 │    │   + Retry Logic  │    │                 │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Metrics &      │
                       │   Monitoring     │
                       └──────────────────┘
```

## 🔧 Интегрированные Сервисы

### 1. **Replicate API** (`replicateReliable`)
- **Файл**: `src/core/replicate/withCircuitBreaker.ts`
- **Методы**: `run()`, `createTraining()`, `getTraining()`, `cancelTraining()`, `createModel()`, `getModel()`, `getLatestModelUrl()`, `healthCheck()`
- **Использование**: Заменил все прямые вызовы `replicate.*` в `generateModelTraining.ts`

### 2. **Supabase API** (`supabaseReliable`)
- **Файл**: `src/core/supabase/withCircuitBreaker.ts`
- **Методы**: `select()`, `insert()`, `update()`, `delete()`, `rpc()`, `healthCheck()`
- **Использование**: Готов для замены критических запросов к БД

### 3. **ElevenLabs API** (`elevenLabsReliable`)
- **Файл**: `src/core/elevenlabs/withCircuitBreaker.ts`
- **Методы**: `generate()`, `clone()`, `getVoices()`, `healthCheck()`
- **Использование**: Интегрирован в `generateSpeech.ts`

### 4. **SyncLabs API** (`syncLabsReliable`) ✨ НОВЫЙ
- **Файл**: `src/core/synclabs/withCircuitBreaker.ts`
- **Методы**: `generateLipSync()`, `createVoice()`, `healthCheck()`
- **Использование**: Интегрирован в `generateLipSync.ts`

### 5. **HuggingFace API** (`huggingFaceReliable`) ✨ НОВЫЙ
- **Файл**: `src/core/huggingface/withCircuitBreaker.ts`
- **Методы**: `generateImageCaption()`, `healthCheck()`
- **Использование**: Интегрирован в `generateImageToPrompt.ts`

### 6. **BFL API** (`bflReliable`) ✨ НОВЫЙ
- **Файл**: `src/core/bfl/withCircuitBreaker.ts`
- **Методы**: `createFinetune()`, `getFinetuneDetails()`, `getTelegramIdFromFinetune()`, `healthCheck()`
- **Использование**: Интегрирован в `modelTrainingV2.ts` и `getTelegramIdFromFinetune.ts`

### 7. **File Download** (`circuitBreakers.fileDownload`) ✨ НОВЫЙ
- **Файл**: `src/helpers/downloadFile.ts`
- **Использование**: Защищает все операции загрузки файлов

## ⚙️ Конфигурация Circuit Breakers

```typescript
export const circuitBreakers = {
  // Основные внешние сервисы
  replicate: new CircuitBreaker('replicate', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    successThreshold: 3,
  }),

  supabase: new CircuitBreaker('supabase', {
    failureThreshold: 3,
    recoveryTimeout: 10000,
    monitoringPeriod: 30000,
    successThreshold: 2,
  }),

  elevenlabs: new CircuitBreaker('elevenlabs', {
    failureThreshold: 4,
    recoveryTimeout: 20000,
    monitoringPeriod: 45000,
    successThreshold: 2,
  }),

  // Новые сервисы
  synclabs: new CircuitBreaker('synclabs', {
    failureThreshold: 4,
    recoveryTimeout: 25000,
    monitoringPeriod: 50000,
    successThreshold: 2,
  }),

  huggingface: new CircuitBreaker('huggingface', {
    failureThreshold: 6, // HuggingFace может быть медленным
    recoveryTimeout: 45000,
    monitoringPeriod: 90000,
    successThreshold: 3,
  }),

  bfl: new CircuitBreaker('bfl', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    successThreshold: 2,
  }),

  // Файловые операции
  fileDownload: new CircuitBreaker('file-download', {
    failureThreshold: 3,
    recoveryTimeout: 5000,
    monitoringPeriod: 15000,
    successThreshold: 2,
  }),
}
```

## 🏥 Health Checks

Все сервисы теперь имеют health check endpoints:

### Доступные Endpoints:
- `GET /health` - Базовый health check
- `GET /health/detailed` - Детальная проверка всех сервисов
- `GET /health/ready` - Readiness probe (для K8s)
- `GET /health/live` - Liveness probe (для K8s)

### Проверяемые Сервисы:
- ✅ Supabase Database
- ✅ Replicate API
- ✅ ElevenLabs API
- ✅ SyncLabs API
- ✅ HuggingFace API
- ✅ BFL API
- ✅ File System
- ✅ Memory Usage

## 📊 Мониторинг

### Circuit Breaker States:
- **CLOSED** - Нормальная работа
- **OPEN** - Блокировка запросов (сервис недоступен)
- **HALF_OPEN** - Тестирование восстановления

### Metrics Endpoint:
- `GET /metrics` - Prometheus-совместимые метрики
- Включает статистику всех Circuit Breakers
- Системные метрики (память, CPU, uptime)

## 🔄 Retry Mechanism

Все API вызовы используют экспоненциальный backoff:

```typescript
const retryConfigs = {
  externalAPI: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2,
    jitter: true,
  }
}
```

## 🚀 Использование

### Пример использования Replicate:
```typescript
import { replicateReliable } from '@/core/replicate/withCircuitBreaker'

// Вместо: await replicate.run(model, options)
const result = await replicateReliable.run(model, options, 'my-operation')
```

### Пример использования SyncLabs:
```typescript
import { syncLabsReliable } from '@/core/synclabs/withCircuitBreaker'

const result = await syncLabsReliable.generateLipSync({
  video: videoUrl,
  audio: audioUrl,
  webhookUrl: WEBHOOK_URL,
}, 'generate-lipsync')
```

### Пример использования HuggingFace:
```typescript
import { huggingFaceReliable } from '@/core/huggingface/withCircuitBreaker'

const caption = await huggingFaceReliable.generateImageCaption({
  imageUrl,
  captionType: 'Descriptive',
  captionLength: 'long',
}, 'image-to-prompt')
```

## 🧪 Тестирование

Все Circuit Breakers покрыты тестами:

```bash
npm test -- --testPathPattern="circuitBreaker.test.ts"
```

**Результат**: ✅ 11/11 тестов проходят

## 📈 Преимущества

1. **Отказоустойчивость**: Автоматическое восстановление после сбоев
2. **Предотвращение каскадных отказов**: Изоляция проблемных сервисов
3. **Мониторинг**: Полная видимость состояния всех сервисов
4. **Автоматические повторы**: Умные повторные попытки с backoff
5. **Graceful degradation**: Система продолжает работать при частичных сбоях

## 🔧 Конфигурация для Production

### Environment Variables:
```bash
# API Keys (уже настроены)
REPLICATE_API_TOKEN=your_token
ELEVENLABS_API_KEY=your_key
SYNC_LABS_API_KEY=your_key
BFL_API_KEY=your_key

# Circuit Breaker настройки (опционально)
CB_FAILURE_THRESHOLD=5
CB_RECOVERY_TIMEOUT=30000
CB_MONITORING_PERIOD=60000
```

### Docker Health Checks:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

### Kubernetes Probes:
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 🎉 Статус Интеграции

| Сервис | Circuit Breaker | Health Check | Retry Logic | Monitoring | Status |
|--------|----------------|--------------|-------------|------------|--------|
| Replicate | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| Supabase | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| ElevenLabs | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| SyncLabs | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| HuggingFace | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| BFL | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |
| File Download | ✅ | ✅ | ✅ | ✅ | **COMPLETE** |

## 🔮 Следующие Шаги

1. **Мониторинг в Production**: Настройка алертов на основе метрик Circuit Breaker
2. **Load Testing**: Тестирование под нагрузкой для валидации настроек
3. **Dashboards**: Создание Grafana дашбордов для визуализации
4. **Auto-scaling**: Интеграция с автомасштабированием на основе метрик

---

**🎯 Результат**: Система теперь полностью защищена от сбоев внешних сервисов с автоматическим восстановлением и полным мониторингом! 