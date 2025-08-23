# 🎬 ДИНАМИЧЕСКОЕ ЦЕНООБРАЗОВАНИЕ ДЛЯ VEO МОДЕЛЕЙ

## 📊 Система динамических цен

### Новая возможность: выбор длительности видео

Теперь пользователи могут выбирать длительность видео для Veo моделей, и цена будет рассчитываться динамически!

## 💰 Таблица цен по длительностям

### Google Veo 3 (Премиум качество)

**Цена за секунду:** $0.40

| Длительность                | Цена в звёздах | Цена в USD |
| --------------------------- | -------------- | ---------- |
| 2 секунды                   | 75 ⭐          | $0.80      |
| 4 секунды                   | 150 ⭐         | $1.60      |
| 6 секунд                    | 225 ⭐         | $2.40      |
| **8 секунд** (по умолчанию) | **300 ⭐**     | **$3.20**  |

### Google Veo 3 Fast (Быстрая генерация)

**Цена за секунду:** $0.30

| Длительность                 | Цена в звёздах | Цена в USD |
| ---------------------------- | -------------- | ---------- |
| 2 секунды                    | 56 ⭐          | $0.60      |
| **4 секунды** (по умолчанию) | **112 ⭐**     | **$1.20**  |
| 6 секунд                     | 168 ⭐         | $1.80      |
| 8 секунд                     | 225 ⭐         | $2.40      |

### Google Veo 2 (Стабильная версия)

**Цена за секунду:** $0.30

| Длительность                | Цена в звёздах | Цена в USD |
| --------------------------- | -------------- | ---------- |
| 4 секунды                   | 112 ⭐         | $1.20      |
| 6 секунд                    | 168 ⭐         | $1.80      |
| **8 секунд** (по умолчанию) | **225 ⭐**     | **$2.40**  |
| 10 секунд                   | 281 ⭐         | $3.00      |

## 🚀 API запрос с указанием длительности

```json
{
  "prompt": "A magical cat wizard in enchanted forest",
  "videoModel": "veo-3",
  "duration": 6, // ⬅️ НОВЫЙ ПАРАМЕТР
  "telegram_id": "144022504",
  "username": "playra",
  "is_ru": false,
  "bot_name": "neuro_blogger_bot"
}
```

## 📝 Примеры cURL запросов

### Veo 3 - 2 секунды (75 звёзд)

```bash
curl -X POST http://localhost:4000/generate/text-to-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Quick magical sparkle effect",
    "videoModel": "veo-3",
    "duration": 2,
    "telegram_id": "144022504",
    "username": "playra",
    "is_ru": false,
    "bot_name": "neuro_blogger_bot"
  }'
```

### Veo 3 Fast - 6 секунд (168 звёзд)

```bash
curl -X POST http://localhost:4000/generate/text-to-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Dancing robot in neon city",
    "videoModel": "veo-3-fast",
    "duration": 6,
    "telegram_id": "144022504",
    "username": "playra",
    "is_ru": false,
    "bot_name": "neuro_blogger_bot"
  }'
```

### Veo 2 - 10 секунд (281 звезда)

```bash
curl -X POST http://localhost:4000/generate/text-to-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Epic space battle with explosions",
    "videoModel": "veo-2",
    "duration": 10,
    "telegram_id": "144022504",
    "username": "playra",
    "is_ru": false,
    "bot_name": "neuro_blogger_bot"
  }'
```

## 🎯 Рекомендации по выбору

| Длительность | Подходит для      | Примеры использования            |
| ------------ | ----------------- | -------------------------------- |
| **2 сек**    | Короткие эффекты  | Логотипы, переходы, вспышки      |
| **4 сек**    | Быстрые клипы     | Реакции, мемы, короткие действия |
| **6 сек**    | Средние сцены     | Диалоги, демонстрации продукта   |
| **8 сек**    | Полные сцены      | Истории, презентации, реклама    |
| **10 сек**   | Расширенные клипы | Трейлеры, обзоры, туториалы      |

## 💡 Для фронтенда

### Компонент выбора длительности

```typescript
interface VideoModelOption {
  id: string
  name: string
  pricePerSecond?: number
  supportedDurations?: number[]
  defaultDuration?: number
}

// Функция расчёта цены
function calculatePrice(model: VideoModelOption, duration: number): number {
  if (!model.pricePerSecond) {
    return model.basePrice // Фиксированная цена
  }

  const basePrice = duration * model.pricePerSecond
  const priceInStars = basePrice / 0.016 // $0.016 за звезду
  const finalPrice = Math.floor(priceInStars * 1.5) // Наценка 50%

  return finalPrice
}

// Пример UI компонента
const DurationSelector = ({ model, onSelect }) => {
  if (!model.supportedDurations) return null

  return (
    <div className="duration-selector">
      {model.supportedDurations.map(duration => {
        const price = calculatePrice(model, duration)
        const isDefault = duration === model.defaultDuration

        return (
          <button
            key={duration}
            onClick={() => onSelect(duration)}
            className={isDefault ? 'default' : ''}
          >
            {duration} сек - {price} ⭐
            {isDefault && <span className="badge">По умолчанию</span>}
          </button>
        )
      })}
    </div>
  )
}
```

## ⚙️ Технические детали

### Формула расчёта

```
Себестоимость = Длительность × Цена_за_секунду
Цена_в_звёздах = Math.floor((Себестоимость / 0.016) × 1.5)
```

### Валидация

- Если указана неподдерживаемая длительность, используется значение по умолчанию
- Минимальная длительность: 2 секунды
- Максимальная длительность: 10 секунд (только для Veo 2)

## 📊 Сравнение экономии

| Модель     | 2 сек vs 8 сек  | Экономия     |
| ---------- | --------------- | ------------ |
| Veo 3      | 75 ⭐ vs 300 ⭐ | 225 ⭐ (75%) |
| Veo 3 Fast | 56 ⭐ vs 225 ⭐ | 169 ⭐ (75%) |

## ✅ Преимущества динамического ценообразования

1. **Гибкость** - пользователь платит только за нужную длительность
2. **Экономия** - короткие клипы стоят значительно дешевле
3. **Прозрачность** - понятная цена за секунду
4. **Масштабируемость** - легко добавить новые длительности

## 🔄 Обратная совместимость

Если параметр `duration` не указан:

- Используется длительность по умолчанию для модели
- Veo 3: 8 секунд (300 звёзд)
- Veo 3 Fast: 4 секунды (112 звёзд)
- Veo 2: 8 секунд (225 звёзд)

---

**Готово к интеграции на фронтенд!** 🚀
