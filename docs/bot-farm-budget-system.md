# Система управления бюджетом фермы ботов 🤖💰

Это руководство описывает систему управления расходами фермы ботов, интегрированную с существующей таблицей `payments_v2`.

## 📋 Оглавление

1. [Архитектура системы](#архитектура-системы)
2. [Типы и категории расходов](#типы-и-категории-расходов)
3. [Добавление расходов](#добавление-расходов)
4. [Получение отчетов](#получение-отчетов)
5. [Скрипты](#скрипты)
6. [Примеры использования](#примеры-использования)

## 🏗️ Архитектура системы

Система бюджета фермы ботов использует существующую таблицу `payments_v2` для хранения всех финансовых операций, включая системные расходы.

### Ключевые особенности:

- **Интеграция с существующей системой**: Использует таблицу `payments_v2`
- **Специальный telegram_id**: `SYSTEM_BOT_FARM` для идентификации расходов фермы
- **Автоматическая категоризация**: Расходы автоматически классифицируются по типам и категориям
- **Метаданные**: Дополнительная информация хранится в поле `metadata`
- **Отчетность**: Подробные отчеты и статистика по расходам

### Структура данных в payments_v2:

```sql
-- Пример записи расхода фермы ботов
{
  "id": "uuid",
  "inv_id": "farm_expense_1672531200000_abc123",
  "telegram_id": "SYSTEM_BOT_FARM",
  "bot_name": "bot_farm_manager",
  "amount": 309.13,
  "stars": 0,
  "currency": "THB",
  "status": "COMPLETED",
  "type": "MONEY_OUTCOME",
  "payment_method": "System",
  "description": "CLOUDCONVERT: Конвертация файлов",
  "metadata": {
    "expense_category": "INFRASTRUCTURE",
    "expense_type": "CLOUDCONVERT",
    "purpose": "Используется для преобразования файлов...",
    "original_name": "CLOUDCONVERT",
    "url": "CloudConvert",
    "is_bot_farm_expense": true,
    "processed_at": "2024-05-01T10:00:00.000Z"
  },
  "subscription_type": null,
  "service_type": null,
  "payment_date": "2024-05-01T00:00:00.000Z"
}
```

## 🏷️ Типы и категории расходов

### Категории расходов (ExpenseCategory):

- **PERSONAL** - Личные расходы
- **SHARED** - Общие расходы проекта
- **INFRASTRUCTURE** - Инфраструктура (хостинг, БД, хранилище)
- **AI_SERVICES** - AI сервисы (OpenAI, ElevenLabs, Replicate)
- **DEVELOPMENT** - Инструменты разработки (Cursor, IDE)
- **HOSTING** - Хостинг и серверы
- **OTHER** - Прочие расходы

### Типы расходов (ExpenseType):

- **CLOUDCONVERT** - Конвертация файлов
- **HOSTING** - Хостинг сервисы
- **AI_API** - AI API (OpenAI, GPT)
- **DEVELOPMENT_TOOLS** - Инструменты разработки
- **VOICE_GENERATION** - Генерация голоса
- **IMAGE_GENERATION** - Генерация изображений
- **VIDEO_GENERATION** - Генерация видео
- **MUSIC_GENERATION** - Генерация музыки
- **DATABASE** - Базы данных
- **STORAGE** - Облачное хранилище
- **TUNNELING** - Туннелирование (ngrok)
- **RESEARCH** - Исследования
- **OTHER** - Прочие

## ➕ Добавление расходов

### Основная функция: `addBotFarmExpense`

```typescript
import { addBotFarmExpense } from '@/core/supabase/addBotFarmExpense'

const expense = {
  date: '01/05',
  name: 'OPENAI',
  amount: 17282.83,
  currency: 'THB',
  description: 'AI API / ChatGPT',
  purpose: 'Генерация текстов и взаимодействие с пользователями.',
  url: 'OpenAI',
}

const success = await addBotFarmExpense(expense)
```

### Массовое добавление: `addMultipleBotFarmExpenses`

```typescript
import { addMultipleBotFarmExpenses } from '@/core/supabase/addBotFarmExpense'

const expenses = [
  { date: '01/05', name: 'OPENAI', amount: 100.00, currency: 'THB', ... },
  { date: '02/05', name: 'CURSOR', amount: 50.00, currency: 'THB', ... }
]

const result = await addMultipleBotFarmExpenses(expenses)
console.log(`Успешно: ${result.success}, Ошибок: ${result.failed}`)
```

## 📊 Получение отчетов

### Все расходы за период

```typescript
import { getBotFarmExpenses } from '@/core/supabase/getBotFarmExpenseReports'

// Все расходы за май 2024
const expenses = await getBotFarmExpenses('2024-05-01', '2024-05-31')
```

### Статистика по расходам

```typescript
import { getBotFarmExpenseStats } from '@/core/supabase/getBotFarmExpenseReports'

const stats = await getBotFarmExpenseStats('2024-05-01', '2024-05-31')
console.log(`Общая сумма: ${stats.totalAmount} ${stats.currency}`)
console.log(`Транзакций: ${stats.totalCount}`)
console.log(`Категорий: ${stats.categorySummaries.length}`)
```

### Расходы по категории

```typescript
import {
  getBotFarmExpensesByCategory,
  ExpenseCategory,
} from '@/core/supabase/getBotFarmExpenseReports'

// Только AI сервисы
const aiExpenses = await getBotFarmExpensesByCategory(
  ExpenseCategory.AI_SERVICES,
  '2024-05-01',
  '2024-05-31'
)
```

### Месячная статистика

```typescript
import { getMonthlyExpenseStats } from '@/core/supabase/getBotFarmExpenseReports'

const monthlyStats = await getMonthlyExpenseStats(2024)
monthlyStats.forEach(month => {
  console.log(`${month.month}: ${month.totalAmount} ${month.currency}`)
})
```

## 🛠️ Скрипты

### Добавление расходов за май

```bash
bun run scripts/add-may-expenses.ts
```

Этот скрипт добавляет все расходы за май 2024 из предоставленной таблицы.

### Тестирование отчетов

```bash
bun run scripts/test-expense-reports.ts
```

Этот скрипт тестирует все функции отчетности и выводит статистику.

## 💡 Примеры использования

### 1. Анализ крупнейших расходов

```typescript
const stats = await getBotFarmExpenseStats('2024-05-01', '2024-05-31')

console.log('Топ-5 крупнейших расходов:')
stats.topExpenses.slice(0, 5).forEach((expense, index) => {
  console.log(
    `${index + 1}. ${expense.name}: ${expense.amount} ${expense.currency}`
  )
})
```

### 2. Анализ расходов по категориям

```typescript
const stats = await getBotFarmExpenseStats('2024-05-01', '2024-05-31')

console.log('Распределение по категориям:')
stats.categorySummaries.forEach(category => {
  const percentage = ((category.totalAmount / stats.totalAmount) * 100).toFixed(
    1
  )
  console.log(
    `${category.category}: ${percentage}% (${category.totalAmount} ${category.currency})`
  )
})
```

### 3. Сравнение месячных расходов

```typescript
const monthlyStats = await getMonthlyExpenseStats(2024)

console.log('Динамика расходов по месяцам:')
monthlyStats.forEach(month => {
  console.log(
    `${month.month}: ${month.totalAmount.toFixed(2)} ${month.currency} (${
      month.count
    } операций)`
  )
})
```

### 4. Фильтрация по типу сервиса

```typescript
const allExpenses = await getBotFarmExpenses('2024-05-01', '2024-05-31')

// Только расходы на OpenAI
const openaiExpenses = allExpenses.filter(expense =>
  expense.name.toUpperCase().includes('OPENAI')
)

const openaiTotal = openaiExpenses.reduce(
  (sum, expense) => sum + expense.amount,
  0
)
console.log(`Всего потрачено на OpenAI: ${openaiTotal} THB`)
```

## 🔍 SQL-запросы для ручного анализа

### Общая статистика по расходам фермы ботов

```sql
SELECT
  COUNT(*) as total_transactions,
  SUM(amount) as total_amount,
  currency,
  MIN(payment_date) as earliest_expense,
  MAX(payment_date) as latest_expense
FROM payments_v2
WHERE telegram_id = 'SYSTEM_BOT_FARM'
  AND type = 'MONEY_OUTCOME';
```

### Расходы по категориям

```sql
SELECT
  metadata->>'expense_category' as category,
  COUNT(*) as transactions,
  SUM(amount) as total_amount,
  currency
FROM payments_v2
WHERE telegram_id = 'SYSTEM_BOT_FARM'
  AND type = 'MONEY_OUTCOME'
  AND payment_date >= '2024-05-01'
  AND payment_date < '2024-06-01'
GROUP BY metadata->>'expense_category', currency
ORDER BY total_amount DESC;
```

### Топ расходов по сумме

```sql
SELECT
  metadata->>'original_name' as service_name,
  amount,
  currency,
  payment_date,
  metadata->>'expense_category' as category,
  description
FROM payments_v2
WHERE telegram_id = 'SYSTEM_BOT_FARM'
  AND type = 'MONEY_OUTCOME'
ORDER BY amount DESC
LIMIT 10;
```

## ⚠️ Важные замечания

1. **Валюта**: Все суммы в майских расходах указаны в тайских батах (THB)

2. **Автоматическая категоризация**: Система автоматически определяет категорию и тип расхода на основе названия сервиса

3. **Уникальность**: Каждый расход получает уникальный `inv_id` для предотвращения дублирования

4. **Метаданные**: Дополнительная информация (URL, назначение) сохраняется в поле `metadata`

5. **Совместимость**: Система полностью совместима с существующей логикой платежей и не влияет на пользовательские балансы

6. **Логирование**: Все операции логируются для отладки и мониторинга

7. **Валидация**: Система проверяет корректность данных перед добавлением в БД

## 🔮 Планы развития

- Добавление поддержки конвертации валют
- Автоматические уведомления при превышении бюджета
- Интеграция с внешними системами учета
- Веб-интерфейс для управления расходами
- Автоматический импорт расходов из банковских выписок
- Прогнозирование расходов на основе исторических данных
