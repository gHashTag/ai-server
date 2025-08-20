# 🚀 Kie.ai API Integration Guide

## 📋 Обзор

Данное руководство описывает, как использовать интеграцию Kie.ai в нашем AI-сервере для генерации видео, изображений и музыки.

## 🔧 Настройка

### Переменные окружения

Добавьте в `.env` файл:

```bash
KIE_AI_API_KEY=your_kie_ai_api_key_here
```

### Получение API ключа

1. Зарегистрируйтесь на [Kie.ai](https://kie.ai)
2. Пополните баланс (минимум $5)
3. Получите API ключ в разделе API

## 🎬 Генерация видео

### Доступные модели

| Модель | ID | Описание | Цена/сек | Экономия vs Google |
|--------|----|---------|---------:|-------------------:|
| Veo 3 Fast | `veo-3-fast` | Быстрая генерация ТОЛЬКО 8 сек | $0.05 | 83% |
| Veo 3 Quality | `veo-3` | Премиум качество | $0.25 | 37% |
| Runway Aleph | `runway-aleph` | Продвинутое редактирование | $0.30 | 25% |

### API Endpoint

```typescript
POST /api/video/generate
```

### Параметры запроса

```typescript
interface VideoGenerationRequest {
  model: 'veo-3-fast' | 'veo-3' | 'runway-aleph'
  prompt: string
  duration: number // 8 секунд для veo-3-fast, 2-10 для остальных
  aspectRatio?: '16:9' | '9:16' | '1:1'
  imageUrl?: string // для image-to-video
  userId?: string
  projectId?: number
}
```

### Пример запроса

⚠️ **ВАЖНО: Veo 3 Fast поддерживает ТОЛЬКО 8-секундные видео!** Любой другой duration будет автоматически изменен на 8.

```bash
curl -X POST http://localhost:4000/api/video/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "model": "veo-3-fast",
    "prompt": "Beautiful sunset over mountains, cinematic",
    "duration": 8,
    "aspectRatio": "16:9"
  }'
```

### Ответ

```typescript
interface VideoGenerationResponse {
  success: boolean
  data?: {
    videoUrl: string
    duration: number
    taskId?: string
  }
  cost: {
    usd: number
    stars: number
  }
  provider: 'Kie.ai'
  model: string
  processingTime?: number
  error?: string
}
```

## 🖼️ Генерация изображений

### Доступные модели

| Модель | ID | Описание | Цена |
|--------|----|---------|---------:|
| GPT-4o Image | `gpt-4o-image` | Точный рендеринг текста | $0.10 |
| Midjourney v7 | `midjourney-v7` | Художественные стили | $0.15 |
| FLUX.1 Kontext | `flux-1-kontext` | Консистентные персонажи | $0.08 |

### API Endpoint

```typescript
POST /api/image/generate
```

### Параметры запроса

```typescript
interface ImageGenerationRequest {
  model: 'gpt-4o-image' | 'midjourney-v7' | 'flux-1-kontext'
  prompt: string
  width?: number
  height?: number
  numImages?: number // 1-4
  style?: string
  imageUrl?: string // для img2img
  userId?: string
  projectId?: number
}
```

### Пример запроса

```bash
curl -X POST http://localhost:4000/api/image/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "model": "midjourney-v7",
    "prompt": "Cyberpunk city at night, neon lights, 4k",
    "width": 1024,
    "height": 1024
  }'
```

## 🎵 Генерация музыки

### Доступные модели

| Модель | ID | Описание | Цена | Макс. длительность |
|--------|----|---------|---------:|-------------------:|
| Suno v3.5 | `suno-v3.5` | Базовая генерация | $0.20 | 3 мин |
| Suno v4 | `suno-v4` | Улучшенное качество | $0.25 | 4 мин |
| Suno v4.5 | `suno-v4.5` | Умные промпты | $0.30 | 5 мин |
| Suno v4.5+ | `suno-v4.5-plus` | Премиум качество | $0.40 | 8 мин |

### API Endpoint

```typescript
POST /api/music/generate
```

### Параметры запроса

```typescript
interface MusicGenerationRequest {
  model: 'suno-v3.5' | 'suno-v4' | 'suno-v4.5' | 'suno-v4.5-plus'
  prompt: string
  duration?: number // 30-480 секунд
  genre?: string
  lyrics?: string
  instrumental?: boolean
  userId?: string
  projectId?: number
}
```

### Пример запроса

```bash
curl -X POST http://localhost:4000/api/music/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "model": "suno-v4.5",
    "prompt": "Epic orchestral music, cinematic, adventure",
    "duration": 120,
    "genre": "orchestral",
    "instrumental": true
  }'
```

## 💰 Система ценообразования

### Конфигурация

Все цены настраиваются в файлах:
- `src/config/models.config.ts` - видео модели
- `src/config/music.config.ts` - музыкальные модели  
- `src/helpers/IMAGES_MODELS.ts` - модели изображений
- `src/config/pricing.config.ts` - централизованная система ценообразования

### Расчет стоимости

```typescript
import { PricingCalculator } from '@/config/pricing.config'

// Конвертация USD в звезды с наценкой
const stars = PricingCalculator.usdToStars(0.25) // $0.25 -> звезды

// Конвертация звезд в рубли
const rubles = PricingCalculator.starsToRub(100) // 100 звезд -> рубли

// Конвертация USD в рубли
const rubles2 = PricingCalculator.usdToRub(5.0) // $5 -> рубли
```

### Наценки

- **Базовая наценка**: 150% (коэффициент 1.5)
- **Курс рубля**: динамический, обновляется каждые 5 минут через Bybit API
- **Резервный курс**: 85₽/$1

## 🔄 Универсальный менеджер провайдеров

### Использование

```typescript
import { providerManager } from '@/services/UniversalProviderManager'

// Автоматический выбор провайдера по модели
const result = await providerManager.generateVideo('veo-3-fast', {
  prompt: 'Beautiful landscape',
  duration: 5
})

// Получить все доступные модели
const models = providerManager.getAllModels()

// Получить провайдер для конкретной модели
const provider = providerManager.getProviderForModel('veo-3-fast')
```

### Архитектура

```
UniversalProviderManager
├── KieAiProvider (видео, изображения, музыка)
├── ReplicateProvider (резерв)
├── VertexAiProvider (резерв)
└── OpenAIProvider (резерв)
```

## 🧪 Тестирование

### Скрипты тестирования

```bash
# Простой тест API с проверкой баланса и ценами
node scripts/test-kieai-simple.js

# Полный тест с таблицами цен и калькулятором прибыли
node scripts/test-kieai-full.js

# Показать все доступные модели
node scripts/show-all-kieai-models.js

# Тест генерации видео
node scripts/test-kieai-video.js
```

### Проверка баланса

```typescript
import { KieAiProvider } from '@/services/video-providers/KieAiProvider'

const provider = new KieAiProvider()
const balance = await provider.getAccountBalance()
console.log(`Credits: ${balance.credits}`)
```

## 🚨 Обработка ошибок

### Типичные ошибки

| Код | Описание | Решение |
|-----|----------|---------|
| 401 | Неверный API ключ | Проверить KIE_AI_API_KEY |
| 429 | Превышен лимит запросов | Подождать или увеличить план |
| 400 | Неверные параметры | Проверить параметры запроса |
| 402 | Недостаточно кредитов | Пополнить баланс |

### Retry логика

API автоматически повторяет запросы при временных ошибках:
- Максимум 3 попытки
- Экспоненциальная задержка: 1с, 2с, 4с
- Тайм-аут: 5 минут для генерации

## 📊 Мониторинг

### Логирование

Все операции логируются в Winston:

```typescript
import { logger } from '@/utils/logger'

logger.info({
  message: '🎬 Video generation started',
  model: 'veo-3-fast',
  duration: 5,
  cost: { usd: 0.25, stars: 25 }
})
```

### Метрики

- Время генерации
- Стоимость операций
- Количество запросов
- Ошибки и их типы

## 🔐 Безопасность

### API ключи

- Никогда не коммитьте ключи в репозиторий
- Используйте переменные окружения
- Ротируйте ключи регулярно

### Валидация

Все входящие данные валидируются через:
- class-validator для DTO
- Joi/Zod схемы для дополнительной проверки

## 🚀 Deployment

### Production настройки

```bash
# .env.production
KIE_AI_API_KEY=prod_key_here
NODE_ENV=production
LOG_LEVEL=info
```

### Health Check

```bash
curl http://localhost:4000/health
```

Проверяет:
- Доступность Kie.ai API
- Баланс аккаунта
- Статус всех провайдеров

## 📈 Масштабирование

### Rate Limiting

По умолчанию:
- 100 запросов/минуту на IP
- 1000 запросов/час на пользователя

### Кэширование

- Redis для кэширования метаданных
- CDN для готовых файлов
- In-memory кэш для конфигураций

## 🛠️ Troubleshooting

### Частые проблемы

1. **"KIE_AI_API_KEY is required"**
   - Убедитесь, что переменная задана в .env

2. **"Insufficient credits"**
   - Пополните баланс на Kie.ai

3. **"Video generation timeout"**
   - Увеличьте timeout в настройках
   - Попробуйте fast модель

4. **"Rate limit exceeded"**
   - Подождите 1 минуту
   - Обновите план на Kie.ai

### Диагностика

```bash
# Проверить соединение
curl -H "Authorization: Bearer $KIE_AI_API_KEY" \
  https://api.kie.ai/api/v1/chat/credit

# Проверить логи
tail -f logs/combined.log | grep -i kie

# Проверить статус сервиса
npm run status
```

## 📚 Дополнительные ресурсы

- [Официальная документация Kie.ai](https://docs.kie.ai)
- [Примеры промптов](https://kie.ai/examples)
- [Playground для тестирования](https://kie.ai/playground)
- [Поддержка](https://kie.ai/support)

---

# 📋 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: Интеграция RILS парсера

## 🎯 ЗАДАЧА
Интегрировать восстановленный RILS парсер (Instagram Apify Scraper) в систему для клиентского использования.

## ✅ ГОТОВАЯ ФУНКЦИОНАЛЬНОСТЬ

### 📍 Расположение
- **Файл:** `src/inngest-functions/instagramApifyScraper.ts`
- **Функция:** `instagramApifyScraper`
- **Событие:** `instagram/apify-scrape`
- **ID:** `instagram-apify-scraper`

### 🔧 API Интерфейс

#### Входные параметры (event.data):
```typescript
{
  username_or_hashtag: string     // Instagram username или hashtag
  project_id: number             // ID проекта в БД
  source_type: 'competitor' | 'hashtag'  // Тип источника
  max_reels: number              // Макс количество reels (1-500, по умолчанию 50)
  min_views?: number             // Минимальное количество просмотров
  max_age_days?: number          // Максимальный возраст контента в днях (1-365)
  requester_telegram_id?: string // Telegram ID пользователя
  bot_name?: string              // Имя бота для логирования
}
```

#### Пример вызова:
```javascript
const result = await inngest.send({
  name: 'instagram/apify-scrape',
  data: {
    username_or_hashtag: 'yacheslav_nekludov',
    project_id: 1,
    source_type: 'competitor',
    max_reels: 10,
    min_views: 1000,
    max_age_days: 30,
    requester_telegram_id: '144022504',
    bot_name: 'kie-ai-bot'
  }
})
```

### 🛠️ Функциональность
1. **Валидация входных данных** с помощью Zod
2. **Парсинг Instagram reels** через Apify API
3. **Сохранение в PostgreSQL/Supabase** (таблицы: reels, reel_metrics, hashtags)
4. **Создание архива** с результатами (Excel + медиафайлы)
5. **Telegram уведомления** о результатах
6. **Обработка ошибок** и логирование

## 🔗 ИНТЕГРАЦИЯ

### 1. Переменные окружения
Добавить в `.env`:
```bash
# Apify интеграция
APIFY_TOKEN=your_apify_token_here

# База данных (уже настроено)
NEON_DATABASE_URL=postgresql://...

# Telegram (уже настроено)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

### 2. Проверка готовности системы

#### ✅ Уже выполнено:
- [x] Функция восстановлена из коммита `e5f4550`
- [x] Добавлена в `src/inngest-functions/index.ts`
- [x] Сборка проходит успешно (286 файлов)
- [x] Тест отправки события работает
- [x] Inngest клиент настроен

#### ⚠️ Требуется для продакшена:
- [ ] Настроить `APIFY_TOKEN` в production окружении
- [ ] Проверить таблицы БД (reels, reel_metrics, hashtags)
- [ ] Настроить лимиты Apify API
- [ ] Добавить мониторинг и алерты

### 3. Telegram Bot интеграция

#### Команда для парсинга:
```javascript
// В Telegram боте добавить обработчик
bot.command('parse_reels', async (ctx) => {
  const username = ctx.message.text.split(' ')[1]
  
  if (!username) {
    return ctx.reply('❌ Укажите username: /parse_reels username')
  }
  
  // Отправляем событие в Inngest
  const result = await inngest.send({
    name: 'instagram/apify-scrape',
    data: {
      username_or_hashtag: username,
      project_id: ctx.from.id, // Используем Telegram ID как project_id
      source_type: 'competitor',
      max_reels: 20,
      min_views: 500,
      max_age_days: 30,
      requester_telegram_id: ctx.from.id.toString(),
      bot_name: 'kie-ai-bot'
    }
  })
  
  ctx.reply(`✅ Парсинг запущен! ID: ${result.ids[0]}`)
})
```

## 🚀 ПЛАН ИНТЕГРАЦИИ

### Этап 1: Базовая интеграция (1-2 часа)
1. **Получить Apify токен** и добавить в `.env`
2. **Создать простую команду** в Telegram боте для тестирования
3. **Протестировать** на небольшом аккаунте (5-10 reels)
4. **Проверить сохранение** результатов в БД

### Этап 2: Продвинутая интеграция (2-3 часа)
1. **Добавить UI элементы** для настройки параметров
2. **Интегрировать с биллингом** (списание звезд/токенов)
3. **Добавить прогресс-бар** и статус парсинга
4. **Настроить уведомления** о завершении

### Этап 3: Production готовность (1-2 часа)
1. **Настроить лимиты** и rate limiting
2. **Добавить мониторинг** ошибок и производительности
3. **Создать админ панель** для управления
4. **Документировать API** для пользователей

## 💰 БИЛЛИНГ И ЛИМИТЫ

### Рекомендуемые цены:
- **10 reels** = 50 Telegram Stars (базовый пакет)
- **50 reels** = 200 Telegram Stars (стандартный)
- **100 reels** = 350 Telegram Stars (премиум)

### Лимиты:
- Максимум 500 reels за запрос
- Максимум 5 запросов в час на пользователя
- Кэширование результатов на 24 часа

## 🔍 ТЕСТИРОВАНИЕ

### Готовый тест:
```bash
# Файл создан: test-rils-parser.js
node test-rils-parser.js
```

### Результат теста:
✅ Событие отправляется успешно  
✅ ID события генерируется  
⚠️ Нужен APIFY_TOKEN для полного тестирования

## 📞 ПОДДЕРЖКА

### При проблемах проверить:
1. **Apify токен** действителен
2. **База данных** доступна
3. **Inngest сервис** запущен
4. **Таблицы БД** созданы

### Логи для отладки:
- Inngest Dashboard: `http://localhost:8288`
- Сервер логи: `pm2 logs ai-server-main`
- БД запросы: проверить в Supabase/Neon консоли

---

**🎯 ИТОГ:** RILS парсер готов к интеграции. Нужен только APIFY_TOKEN для запуска в production.

---

*Последнее обновление: 19 августа 2025*