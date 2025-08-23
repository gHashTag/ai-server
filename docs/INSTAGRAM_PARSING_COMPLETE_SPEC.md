# 🎬 Техническое задание: Полная система парсинга Instagram и автоматической доставки рилсов

## 📋 Текущее состояние системы

### ✅ Что уже реализовано:

1. **Instagram Apify Scraper** (`instagramApifyScraper.ts`)

   - ✅ Парсинг рилсов через Apify API
   - ✅ Сохранение в PostgreSQL `instagram_apify_reels`
   - ✅ Монетизация: 0.144 ⭐ за рилс
   - ✅ Уведомления пользователей и админов
   - ✅ Расширенная фильтрация видео контента

2. **Competitor Auto Parser** (`competitorAutoParser.ts`)

   - ✅ Cron запуск каждые 24 часа (08:00 UTC)
   - ✅ Автоматический парсинг всех активных подписок
   - ✅ Группировка по конкурентам для оптимизации

3. **Competitor Delivery** (`competitorDelivery.ts`)

   - ✅ Доставка результатов подписчикам
   - ✅ Форматы: дайджест, индивидуальные рилсы, архив
   - ✅ Фильтрация по просмотрам и возрасту

4. **База данных**
   - ✅ `instagram_apify_reels` - хранение рилсов
   - ✅ `competitor_subscriptions` - подписки пользователей
   - ✅ `competitor_delivery_history` - история доставок

## 🚀 Что нужно доработать

### 1. **Автоматический запуск доставки после парсинга**

**Проблема**: После завершения парсинга в `instagramApifyScraper` не происходит автоматического запуска доставки рилсов подписчикам.

**Решение**: Добавить триггер в конце `instagramApifyScraper` для запуска `competitorDelivery`.

### 2. **Ежедневная отправка новых рилсов всем подписчикам**

**Требование**: Раз в 24 часа каждый подписчик должен получать новые рилсы от конкурентов, на которых он подписан.

**Текущая схема работы**:

```
08:00 UTC: competitorAutoParser запускается → парсит всех конкурентов
08:15 UTC: Каждый парсинг должен запускать competitorDelivery
08:30 UTC: Все подписчики получают новые рилсы
```

### 3. **Недостающие триггеры и связи**

- [ ] Автоматический запуск доставки после парсинга
- [ ] Проверка работы Inngest в продакшне
- [ ] Мониторинг выполнения функций
- [ ] Обработка ошибок доставки

## 🔧 Техническая реализация

### Шаг 1: Обновление `instagramApifyScraper.ts`

Добавить в конец функции триггер доставки:

```typescript
// В конце instagramApifyScraper перед return result
if (
  processedReels.length > 0 &&
  validatedData.requester_telegram_id === 'auto-system'
) {
  await step.run('trigger-delivery', async () => {
    try {
      // Запускаем доставку для этого конкурента
      const deliveryResult = await inngest.send({
        name: 'competitor/delivery-reels',
        data: {
          competitor_username: validatedData.username_or_hashtag,
          project_id: validatedData.project_id,
          triggered_by: 'auto-parser',
        },
      })

      log.info('📬 Доставка запущена:', deliveryResult.ids[0])
    } catch (error: any) {
      log.error('❌ Ошибка запуска доставки:', error.message)
    }
  })
}
```

### Шаг 2: Создание системы мониторинга

Новая функция `systemMonitor.ts`:

```typescript
export const systemMonitor = inngest.createFunction(
  {
    id: 'system-monitor',
    name: '📊 System Monitor',
  },
  { cron: '0 9 * * *' }, // Каждый день в 09:00 UTC (через час после парсинга)
  async ({ event, step }) => {
    // Проверяем что все парсинги и доставки выполнились
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)

    // Проверяем количество парсингов
    const parsedToday = await step.run('check-parsing', async () => {
      const client = await dbPool.connect()
      try {
        const result = await client.query(
          `
          SELECT COUNT(*) as count 
          FROM instagram_apify_reels 
          WHERE scraped_at >= $1
        `,
          [yesterday]
        )
        return result.rows[0].count
      } finally {
        client.release()
      }
    })

    // Проверяем количество доставок
    const deliveriesCount = await step.run('check-deliveries', async () => {
      const client = await dbPool.connect()
      try {
        const result = await client.query(
          `
          SELECT COUNT(*) as count 
          FROM competitor_delivery_history 
          WHERE created_at >= $1
        `,
          [yesterday]
        )
        return result.rows[0].count
      } finally {
        client.release()
      }
    })

    // Отправляем отчет админу
    await step.run('send-daily-report', async () => {
      if (process.env.ADMIN_CHAT_ID) {
        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName('neuro_blogger_bot')

        const report = `
📊 Ежедневный отчёт системы парсинга

🎬 Рилсов спаршено: ${parsedToday}
📬 Доставок выполнено: ${deliveriesCount}
⏰ За период: последние 24 часа

${parsedToday > 0 ? '✅' : '❌'} Парсинг работает
${deliveriesCount > 0 ? '✅' : '❌'} Доставка работает

${
  parsedToday === 0 || deliveriesCount === 0
    ? '⚠️ Требуется проверка системы!'
    : '🎯 Система работает нормально'
}
        `

        await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, report)
      }
    })

    return {
      success: true,
      parsed_reels: parsedToday,
      deliveries_count: deliveriesCount,
      status:
        parsedToday > 0 && deliveriesCount > 0 ? 'healthy' : 'needs_attention',
    }
  }
)
```

### Шаг 3: Улучшение `competitorDelivery.ts`

Добавить обработку случая когда нет новых рилсов:

```typescript
// В competitorDelivery.ts - улучшить логику "нет новых рилсов"
if (reelsData.length === 0) {
  log.info('📭 Нет новых рилсов для доставки')

  // Отправляем уведомление только активным подписчикам с настройкой уведомлений
  for (const subscriber of subscribers) {
    try {
      if (subscriber.notify_when_no_reels !== false) {
        // Если не отключено
        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName(subscriber.bot_name)

        await bot.api.sendMessage(
          subscriber.user_telegram_id,
          `📭 @${competitor_username}: нет новых рилсов за последние 24 часа\n\n` +
            `💡 Возможно, конкурент не публиковал контент или настройки фильтрации слишком строгие`
        )
      }
    } catch (error: any) {
      log.error(
        `❌ Ошибка уведомления пользователя ${subscriber.user_telegram_id}:`,
        error.message
      )
    }
  }

  return { success: true, message: 'No new reels to deliver' }
}
```

### Шаг 4: Обновление схемы базы данных

Добавить поля для настроек доставки:

```sql
-- Обновление таблицы competitor_subscriptions
ALTER TABLE competitor_subscriptions
ADD COLUMN IF NOT EXISTS delivery_format VARCHAR(20) DEFAULT 'digest',
ADD COLUMN IF NOT EXISTS notify_when_no_reels BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS preferred_delivery_time TIME DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Обновление таблицы competitor_delivery_history
ALTER TABLE competitor_delivery_history
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'auto',
ADD COLUMN IF NOT EXISTS delivery_trigger VARCHAR(50) DEFAULT 'scheduled';
```

### Шаг 5: Создание функции здоровья системы

Новая функция `healthCheck.ts`:

```typescript
export const healthCheck = inngest.createFunction(
  {
    id: 'health-check',
    name: '🔍 Health Check',
  },
  { cron: '*/30 * * * *' }, // Каждые 30 минут
  async ({ event, step }) => {
    // Проверяем что Inngest функции работают
    const checks = await step.run('run-health-checks', async () => {
      const results = {
        database: false,
        inngest: false,
        apify: false,
        telegram: false,
      }

      // Проверка базы данных
      try {
        const client = await dbPool.connect()
        await client.query('SELECT 1')
        client.release()
        results.database = true
      } catch (error) {
        results.database = false
      }

      // Проверка Inngest (отправляем тестовое событие)
      try {
        await inngest.send({
          name: 'system/health-ping',
          data: { timestamp: Date.now() },
        })
        results.inngest = true
      } catch (error) {
        results.inngest = false
      }

      // Проверка Apify API
      try {
        const response = await fetch('https://api.apify.com/v2/acts', {
          headers: { Authorization: `Bearer ${process.env.APIFY_TOKEN}` },
        })
        results.apify = response.ok
      } catch (error) {
        results.apify = false
      }

      // Проверка Telegram API
      try {
        const { getBotByName } = await import('@/core/bot')
        const { bot } = getBotByName('neuro_blogger_bot')
        await bot.telegram.getMe()
        results.telegram = true
      } catch (error) {
        results.telegram = false
      }

      return results
    })

    // Если что-то не работает - отправляем алерт
    const failedServices = Object.entries(checks)
      .filter(([_, status]) => !status)
      .map(([service, _]) => service)

    if (failedServices.length > 0) {
      await step.run('send-alert', async () => {
        if (process.env.ADMIN_CHAT_ID) {
          const { getBotByName } = await import('@/core/bot')
          const { bot } = getBotByName('neuro_blogger_bot')

          await bot.telegram.sendMessage(
            process.env.ADMIN_CHAT_ID,
            `🚨 АЛЕРТ: Проблемы с системой\n\n` +
              `❌ Не работают сервисы:\n${failedServices
                .map(s => `• ${s}`)
                .join('\n')}\n\n` +
              `⏰ ${new Date().toISOString()}`
          )
        }
      })
    }

    return {
      success: true,
      health_status: checks,
      failed_services: failedServices,
      overall_health: failedServices.length === 0 ? 'healthy' : 'degraded',
    }
  }
)
```

## 📋 План реализации

### Этап 1: Исправление текущих проблем

- [ ] Добавить триггер доставки в `instagramApifyScraper`
- [ ] Протестировать связку парсинг → доставка
- [ ] Проверить работу cron-задач в продакшне

### Этап 2: Мониторинг и здоровье системы

- [ ] Создать `systemMonitor.ts`
- [ ] Создать `healthCheck.ts`
- [ ] Настроить алерты админам

### Этап 3: Улучшение пользовательского опыта

- [ ] Добавить настройки доставки в подписки
- [ ] Улучшить форматы уведомлений
- [ ] Добавить статистику для пользователей

### Этап 4: Оптимизация и масштабирование

- [ ] Оптимизировать производительность
- [ ] Добавить кеширование результатов
- [ ] Улучшить обработку ошибок

## 💰 Экономическая модель

### Текущие расходы:

- **Apify API**: $2.30 за 1000 рилсов
- **Конверсия**: 0.144 ⭐ за рилс
- **Средний конкурент**: 10-20 рилсов в день
- **Средняя подписка**: 3-5 конкурентов

### Ожидаемое потребление:

- **100 активных подписчиков**
- **300 уникальных конкурентов**
- **~3000 рилсов в день** (300 конкурентов × 10 рилсов)
- **Стоимость**: ~$7 в день на Apify
- **Доход**: ~430 ⭐ в день (3000 × 0.144)

## 🔧 Настройка переменных окружения

```bash
# Inngest
INNGEST_BASE_URL=http://localhost:8288
INNGEST_SIGNING_KEY=your-signing-key
INNGEST_EVENT_KEY=your-event-key
INNGEST_DEV=1

# Apify
APIFY_TOKEN=your-apify-token

# База данных
NEON_DATABASE_URL=postgresql://user:pass@host/db

# Telegram
BOT_TOKEN_1=your-bot-token
ADMIN_CHAT_ID=144022504

# Мониторинг
HEALTH_CHECK_ENABLED=true
ALERTS_ENABLED=true
```

## 🧪 Тестирование системы

### Тест полного цикла:

```javascript
// test-full-cycle.js
async function testFullCycle() {
  console.log('🧪 Тестируем полный цикл парсинга и доставки')

  // 1. Создаем тестовую подписку
  const subscription = await createTestSubscription('theaisurfer')

  // 2. Запускаем парсинг
  const parseResult = await triggerApifyInstagramScraping({
    username_or_hashtag: 'theaisurfer',
    project_id: 999,
    source_type: 'competitor',
    max_reels: 5,
    requester_telegram_id: 'auto-system',
    bot_name: 'neuro_blogger_bot',
  })

  console.log('✅ Парсинг запущен:', parseResult.eventId)

  // 3. Ждем завершения и проверяем доставку
  setTimeout(async () => {
    const deliveries = await checkDeliveryHistory(subscription.id)
    console.log('📬 Доставок выполнено:', deliveries.length)
  }, 300000) // 5 минут
}
```

## 📊 Метрики для отслеживания

### Ключевые показатели:

1. **Количество парсингов в день**
2. **Количество найденных рилсов**
3. **Количество успешных доставок**
4. **Время выполнения функций**
5. **Ошибки и их типы**
6. **Активность пользователей**

### Дашборд метрик:

```sql
-- Ежедневная статистика
SELECT
  DATE(scraped_at) as date,
  COUNT(*) as reels_parsed,
  COUNT(DISTINCT owner_username) as unique_competitors
FROM instagram_apify_reels
WHERE scraped_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(scraped_at)
ORDER BY date DESC;

-- Статистика доставок
SELECT
  delivery_status,
  COUNT(*) as count,
  AVG(reels_count) as avg_reels_delivered
FROM competitor_delivery_history
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY delivery_status;
```

## 🎯 Критерии готовности

### Система считается готовой когда:

- [ ] Автоматический парсинг работает 24/7
- [ ] Доставка запускается автоматически после парсинга
- [ ] Все подписчики получают рилсы ежедневно
- [ ] Мониторинг отслеживает состояние системы
- [ ] Алерты приходят при проблемах
- [ ] Экономика сбалансирована (доходы > расходы)

---

## 🚀 Передача задачи агенту

Данное ТЗ содержит все необходимые детали для завершения системы автоматического парсинга и доставки Instagram рилсов.

**Основная задача**: Реализовать недостающие связи между компонентами системы, чтобы обеспечить полный автоматический цикл от парсинга до доставки рилсов подписчикам.

**Приоритет**: Высокий - система должна работать в автономном режиме и приносить доход.
