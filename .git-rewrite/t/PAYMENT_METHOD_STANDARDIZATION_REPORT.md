# 🎯 Отчет: Стандартизация payment_method

## 🕉️ Проблема
В коде использовались разные значения для поля `payment_method`, что нарушало консистентность данных в таблице `payments_v2`.

### ❌ Было (хаотично):
- `'Training'` - для тренировки моделей
- `'NeuroPhoto'` - для генерации изображений
- `'TextToImage'` - для text-to-image
- `'ImageToPrompt'` - для image-to-prompt
- `'Robokassa'` - для платежей через Robokassa
- `'Internal'` - для внутренних операций

## ✅ Решение: Единый Стандарт

### 📋 Обновленный PaymentMethod тип:
```typescript
export type PaymentMethod =
  | 'Telegram'      // Оплата через Telegram Stars
  | 'Robokassa'     // Оплата через Robokassa (рубли)
  | 'Internal'      // Внутренние операции (списание за сервисы)
  | 'System'        // Системные операции (бонусы, возвраты)
  | 'Manual'        // Ручные операции администратора
  | 'Unknown'       // Неизвестный метод (для старых записей)
```

### 🔄 Правила Использования:

| Тип операции | payment_method | Описание |
|--------------|----------------|----------|
| Списание за сервисы | `'Internal'` | Model Training, NeuroPhoto, Text-to-Image, Image-to-Prompt |
| Пополнение через Robokassa | `'Robokassa'` | Платежи в рублях |
| Пополнение через Telegram | `'Telegram'` | Платежи в Telegram Stars |
| Бонусы, возвраты | `'System'` | Системные начисления |
| Ручные операции | `'Manual'` | Администраторские операции |

## 📊 Исправленные Файлы

### 1. Интерфейсы
- ✅ `src/interfaces/payments.interface.ts` - Обновлен тип `PaymentMethod`

### 2. Сервисы (все используют `'Internal'`)
- ✅ `src/services/generateModelTraining.ts`
- ✅ `src/services/generateNeuroImage.ts` 
- ✅ `src/services/generateImageToPrompt.ts`
- ✅ `src/services/generateTextToImage.ts`

### 3. Inngest функции (все используют `'Internal'`)
- ✅ `src/inngest-functions/generateModelTraining.ts`
- ✅ `src/inngest-functions/modelTrainingV2.ts`
- ✅ `src/inngest-functions/neuroImageGeneration.ts`

### 4. Core функции
- ✅ `src/core/supabase/updateUserBalance.ts` - Обновлены defaults

### 5. Тесты
- ✅ `scripts/test-fixed-updateUserBalance.js` - Обновлены тестовые данные

## 🎯 Результат

### ✅ Теперь в БД:
```sql
-- Все внутренние операции (списания за сервисы)
payment_method = 'Internal'

-- Пополнения через Robokassa
payment_method = 'Robokassa'

-- Пополнения через Telegram
payment_method = 'Telegram'

-- Системные операции (бонусы, возвраты)
payment_method = 'System'
```

### 📈 Преимущества:
1. **Консистентность данных** - единый стандарт для всех операций
2. **Простота аналитики** - легко группировать по типам платежей
3. **Понятность** - четкое разделение по источникам платежей
4. **Масштабируемость** - легко добавлять новые методы

### 🔍 Примеры в БД:
```sql
-- Тренировка модели
payment_method = 'Internal', service_type = 'DIGITAL_AVATAR_BODY'

-- Генерация изображений  
payment_method = 'Internal', service_type = 'NEURO_PHOTO'

-- Пополнение баланса
payment_method = 'Robokassa', service_type = NULL

-- Возврат средств
payment_method = 'System', service_type = NULL
```

## 🎉 Итог
✅ **Порядок наведен!** Все операции теперь используют стандартизированные значения `payment_method`, что обеспечивает консистентность данных и упрощает аналитику.

---
**Дата:** 26 мая 2025  
**Статус:** ✅ ЗАВЕРШЕНО  
**Проверено:** Типы ✅, Тесты ✅, Консистентность ✅ 