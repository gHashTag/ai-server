# 🛡️ Руководство по Надежности AI Server

## 📋 Обзор

Данное руководство описывает комплексную систему надежности AI Server, включающую мониторинг, circuit breakers, retry mechanisms и health checks.

## 🏗️ Архитектура Надежности

### 1. 📊 Health Checks

#### Endpoints:
- **`/health`** - Базовый health check (для Docker/K8s)
- **`/health/detailed`** - Детальная проверка всех компонентов
- **`/health/ready`** - Проверка готовности к работе
- **`/health/live`** - Проверка живости процесса

#### Проверяемые компоненты:
- ✅ Supabase подключение
- ✅ Replicate API доступность
- ✅ Файловая система
- ✅ Использование памяти
- ✅ Критические функции

### 2. 📈 Metrics и Мониторинг

#### Endpoints:
- **`/metrics`** - Prometheus-совместимые метрики
- **`/metrics/json`** - JSON метрики для дашбордов
- **`/metrics/circuit-breakers`** - Статистика circuit breakers

#### Собираемые метрики:
- 🔢 Количество запросов и ошибок
- 💾 Использование памяти и CPU
- ⚡ Состояние circuit breakers
- 🗄️ Время ответа базы данных
- ⏱️ Uptime системы

### 3. ⚡ Circuit Breakers

Защита от каскадных сбоев внешних сервисов.

#### Предконфигурированные Circuit Breakers:

```typescript
// Replicate API
replicate: {
  failureThreshold: 5,      // 5 ошибок подряд
  recoveryTimeout: 30000,   // 30 секунд
  successThreshold: 2,      // 2 успеха для восстановления
}

// Supabase
supabase: {
  failureThreshold: 3,      // 3 ошибки подряд
  recoveryTimeout: 10000,   // 10 секунд
  successThreshold: 1,      // 1 успех для восстановления
}

// ElevenLabs
elevenlabs: {
  failureThreshold: 5,      // 5 ошибок подряд
  recoveryTimeout: 60000,   // 1 минута
  successThreshold: 2,      // 2 успеха для восстановления
}

// BFL API
bfl: {
  failureThreshold: 3,      // 3 ошибки подряд
  recoveryTimeout: 20000,   // 20 секунд
  successThreshold: 1,      // 1 успех для восстановления
}
```

#### Состояния Circuit Breaker:
- **CLOSED** - Нормальная работа
- **OPEN** - Блокировка запросов (сервис недоступен)
- **HALF_OPEN** - Тестирование восстановления

### 4. 🔄 Retry Mechanism

Автоматические повторы с exponential backoff.

#### Предконфигурированные стратегии:

```typescript
// Внешние API
externalAPI: {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2,
  jitter: true
}

// База данных
database: {
  maxAttempts: 2,
  baseDelay: 500,
  maxDelay: 2000,
  exponentialBase: 2,
  jitter: false
}

// Критические операции
critical: {
  maxAttempts: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  exponentialBase: 1.5,
  jitter: true
}
```

## 🚀 Использование

### Circuit Breakers

```typescript
import { circuitBreakers } from '@/utils/circuitBreaker'

// Использование с Replicate API
const result = await circuitBreakers.replicate.execute(async () => {
  return await replicate.models.list()
})
```

### Retry Mechanism

```typescript
import { retryExternalAPI, retryCritical } from '@/utils/retryMechanism'

// Retry для внешнего API
const data = await retryExternalAPI(
  () => fetch('https://api.example.com/data'),
  'fetch-user-data'
)

// Retry для критической операции
const result = await retryCritical(
  () => processPayment(userId, amount),
  'process-payment'
)
```

### Health Checks

```bash
# Базовая проверка
curl http://localhost:3000/health

# Детальная проверка
curl http://localhost:3000/health/detailed

# Проверка готовности
curl http://localhost:3000/health/ready
```

### Metrics

```bash
# Prometheus метрики
curl http://localhost:3000/metrics

# JSON метрики
curl http://localhost:3000/metrics/json

# Circuit breaker статистика
curl http://localhost:3000/metrics/circuit-breakers
```

## 🔧 Мониторинг и Алерты

### Prometheus Integration

Система экспортирует метрики в формате Prometheus:

```prometheus
# Uptime
nodejs_uptime_seconds

# Память
nodejs_memory_rss_bytes
nodejs_memory_heap_used_bytes

# HTTP запросы
http_requests_total
http_request_errors_total

# Circuit Breakers
circuit_breaker_state{name="replicate"}
circuit_breaker_failures_total{name="replicate"}

# База данных
database_response_time_ms
```

### Рекомендуемые алерты:

```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(http_request_errors_total[5m]) / rate(http_requests_total[5m]) > 0.1
  for: 2m

# Circuit breaker open
- alert: CircuitBreakerOpen
  expr: circuit_breaker_state > 1
  for: 1m

# High memory usage
- alert: HighMemoryUsage
  expr: nodejs_memory_rss_bytes > 1073741824  # 1GB
  for: 5m

# Database slow response
- alert: DatabaseSlowResponse
  expr: database_response_time_ms > 1000
  for: 2m
```

## 🧪 Тестирование Надежности

### Автоматическая проверка

```bash
# Запуск скрипта проверки надежности
./scripts/reliability-check.sh

# Для удаленного сервера
./scripts/reliability-check.sh https://your-server.com
```

### Ручное тестирование

```bash
# Тесты Circuit Breaker
npm test -- --testPathPattern="circuitBreaker.test.ts"

# Проверка типов
bun exec tsc --noEmit

# Проверка health endpoints
curl -f http://localhost:3000/health/detailed || echo "Health check failed"
```

## 📊 Дашборды

### Grafana Dashboard

Рекомендуемые панели:

1. **System Overview**
   - Uptime
   - Memory usage
   - Request rate
   - Error rate

2. **Circuit Breakers**
   - States по сервисам
   - Failure rates
   - Recovery times

3. **Database**
   - Response times
   - Connection status
   - Query rates

4. **External APIs**
   - Response times по сервисам
   - Success rates
   - Rate limiting

## 🚨 Troubleshooting

### Circuit Breaker открыт

```bash
# Проверить статус
curl http://localhost:3000/metrics/circuit-breakers

# Принудительно закрыть (только для разработки)
# В коде: circuitBreakers.replicate.forceClose()
```

### Высокий error rate

```bash
# Проверить логи
tail -f logs/app.log | grep ERROR

# Проверить health check
curl http://localhost:3000/health/detailed
```

### Медленная база данных

```bash
# Проверить время ответа
curl http://localhost:3000/health/detailed | jq '.checks[] | select(.service=="supabase")'

# Проверить метрики
curl http://localhost:3000/metrics | grep database_response_time_ms
```

## 🔄 Обновления и Maintenance

### Graceful Shutdown

```typescript
// В app.ts уже реализован graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Server gracefully shut down')
    process.exit(0)
  })
})
```

### Rolling Updates

1. Проверить health checks перед обновлением
2. Обновить одну инстанцию
3. Дождаться прохождения health checks
4. Продолжить с остальными инстанциями

### Backup и Recovery

- Circuit breakers автоматически восстанавливаются
- Метрики сбрасываются при перезапуске
- Health checks работают сразу после старта

## 📚 Дополнительные Ресурсы

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Prometheus Metrics](https://prometheus.io/docs/concepts/metric_types/)
- [Health Check Patterns](https://microservices.io/patterns/observability/health-check-api.html)
- [Retry Patterns](https://docs.microsoft.com/en-us/azure/architecture/patterns/retry)

---

**Автор:** НейроКодер  
**Дата:** 2025-01-27  
**Версия:** 1.0.0 