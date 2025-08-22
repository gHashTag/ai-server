# Техническое задание: Telegram Bot для Instagram-AI-Scraper & Content Agent

## 📊 Обзор проекта

**Цель:** Разработать Telegram бота для управления Instagram-анализом и генерации контента через Inngest функции.

**Принцип Jobs to be Done:** Каждая команда решает конкретную задачу пользователя.

## 🎯 Задачи пользователя (Jobs to be Done)

### Job 1: "Мне нужно найти похожих авторов в моей нише"
**Команда:** `/find <количество> @<username>`
**Результат:** Список конкурентов с метриками

### Job 2: "Мне нужно понять, какой контент популярен у конкурентов"
**Команда:** `/analyze @<username>`
**Результат:** Собранные рилсы с метриками

### Job 3: "Мне нужно получить инсайты о трендах" 
**Команда:** `/topreels @<username>`
**Результат:** ТОП-10 рилсов за 14 дней

### Job 4: "Мне нужно создать похожий контент"
**Команда:** `/script <reel_id>`
**Результат:** 3 альтернативных сценария

## 🤖 Команды бота

### 1. `/find` - Поиск конкурентов
```
/find 10 @neuro_blogger
```

**Параметры:**
- `количество` (число): Количество конкурентов для поиска (1-50)
- `@username` (строка): Instagram username для анализа

**Inngest событие:** `instagram/scraper-v2`
**Данные:**
```typescript
{
  username: string,           // без @
  similar_users_count: number, // количество
  min_followers: number,      // 1000 (по умолчанию)
  project_id: number,         // ID проекта пользователя
  bot_name: string,           // имя текущего бота
  telegram_id: string         // ID пользователя в Telegram
}
```

**Ответ бота:**
```
🔍 Ищу 10 похожих авторов на @neuro_blogger...
⏳ Это займет 2-3 минуты. Я сообщу, когда будет готово.
```

### 2. `/analyze` - Анализ рилсов конкурента
```
/analyze @competitor_username
```

**Параметры:**
- `@username` (строка): Instagram username конкурента

**Inngest событие:** `instagram/analyze-reels`
**Данные:**
```typescript
{
  comp_username: string,      // без @
  project_id: number,         // ID проекта пользователя
  days_limit: number,         // 14 (по умолчанию)
  min_views: number,          // 1000 (по умолчанию)
  bot_name: string,           // имя текущего бота
  telegram_id: string         // ID пользователя в Telegram
}
```

**Ответ бота:**
```
📊 Анализирую рилсы @competitor_username за последние 14 дней...
⏳ Собираю данные о просмотрах, лайках и комментариях...
```

### 3. `/topreels` - Топ контент
```
/topreels @competitor_username
```

**Параметры:**
- `@username` (строка): Instagram username конкурента

**Inngest событие:** `instagram/extract-top`
**Данные:**
```typescript
{
  comp_username: string,      // без @
  project_id: number,         // ID проекта пользователя
  days_limit: number,         // 14 (по умолчанию)
  limit: number               // 10 (по умолчанию)
}
```

**Ответ бота:**
```
📊 ТОП-10 РИЛСОВ competitor_username

1. 🎬 Заголовок рилса...
   👀 15,000 просмотров
   ❤️ 750 лайков
   💬 120 комментариев
   📊 5.8% engagement
   🔗 https://instagram.com/reel/ABC123

2. 🎬 Следующий рилс...
   ...
```

### 4. `/script` - Генерация сценариев
```
/script reel_123
```

**Параметры:**
- `reel_id` (строка): ID рилса для генерации сценариев

**Inngest событие:** `instagram/generate-scripts`
**Данные:**
```typescript
{
  reel_id: string,            // ID рилса
  project_id: number,         // ID проекта пользователя
  openai_api_key?: string     // Опционально, если не в env
}
```

**Ответ бота:**
```
🎨 Создаю 3 альтернативных сценария для рилса...
🤖 Использую OpenAI для анализа и генерации...

📝 СЦЕНАРИЙ 1 (Эмоциональный):
[Сгенерированный текст]

📝 СЦЕНАРИЙ 2 (Образовательный):
[Сгенерированный текст]

📝 СЦЕНАРИЙ 3 (Развлекательный):
[Сгенерированный текст]
```

## 🔧 Вспомогательные команды

### `/start` - Приветствие
```
👋 Привет! Я помогу анализировать Instagram и создавать контент.

📋 Доступные команды:
/find 10 @username - Найти похожих авторов
/analyze @username - Проанализировать рилсы
/topreels @username - Показать топ контент
/script reel_id - Создать сценарии
/help - Показать справку
```

### `/help` - Справка
Детальное описание всех команд с примерами.

### `/status` - Статус проекта
```
📊 Ваш проект: #123
📈 Найдено конкурентов: 25
🎬 Проанализировано рилсов: 150
📝 Создано сценариев: 12
```

## 🗄️ Интеграция с базой данных

### Получение project_id
```sql
SELECT project_id FROM users WHERE telegram_id = ?
```

### Сохранение истории команд
```sql
INSERT INTO telegram_memory (user_id, message_text, message_type, context_data)
VALUES (?, ?, 'user', ?)
```

### Ограничение памяти
- Хранить только последние 10 сообщений на пользователя
- Автоматически удалять старые записи

## 🔄 Обработка Inngest ответов

### Webhook для получения результатов
```typescript
// Эндпоинт для получения результатов от Inngest
app.post('/webhook/inngest-results', async (req, res) => {
  const { event, data, user_id } = req.body
  
  // Отправить результат пользователю в Telegram
  await bot.telegram.sendMessage(user_id, formatResult(event, data))
})
```

### Форматирование результатов
```typescript
function formatResult(event: string, data: any): string {
  switch (event) {
    case 'instagram/scraper-v2':
      return formatCompetitorsList(data)
    case 'instagram/analyze-reels':
      return formatAnalysisResult(data)
    case 'instagram/extract-top':
      return formatTopReels(data)
    case 'instagram/generate-scripts':
      return formatScripts(data)
  }
}
```

## 🔐 Безопасность и авторизация

### Проверка пользователя
```typescript
const user = await checkUserExists(telegram_id)
if (!user) {
  return ctx.reply('❌ Пользователь не найден. Обратитесь к администратору.')
}
```

### Rate limiting
- Максимум 5 запросов в минуту на пользователя
- Максимум 50 запросов в день на пользователя

### Валидация параметров
```typescript
function validateFindCommand(args: string[]): boolean {
  const count = parseInt(args[0])
  const username = args[1]
  
  return count > 0 && count <= 50 && username.startsWith('@')
}
```

## 📱 Пользовательский интерфейс

### Inline клавиатура для команд
```typescript
const mainKeyboard = {
  inline_keyboard: [
    [{ text: '🔍 Найти конкурентов', callback_data: 'find' }],
    [{ text: '📊 Анализ рилсов', callback_data: 'analyze' }],
    [{ text: '⭐ Топ контент', callback_data: 'topreels' }],
    [{ text: '🎨 Создать сценарий', callback_data: 'script' }]
  ]
}
```

### Статус индикаторы
```typescript
const statusMessages = {
  processing: '⏳ Обрабатываю запрос...',
  success: '✅ Готово!',
  error: '❌ Произошла ошибка',
  waiting: '⏰ Ожидание ответа от сервера...'
}
```

## 🛠️ Техническая реализация

### Стек технологий
- **Framework:** Telegraf.js
- **Database:** PostgreSQL (текущая)
- **API:** Inngest functions
- **Hosting:** Текущий сервер

### Файловая структура
```
src/
├── bot/
│   ├── commands/
│   │   ├── find.ts
│   │   ├── analyze.ts
│   │   ├── topreels.ts
│   │   └── script.ts
│   ├── handlers/
│   │   ├── inngest.ts
│   │   └── errors.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── database.ts
│   └── index.ts
```

### Основные классы
```typescript
class InstagramBot {
  private bot: Telegraf
  private inngestClient: Inngest
  
  constructor() {
    this.bot = new Telegraf(process.env.BOT_TOKEN)
    this.inngestClient = new Inngest({ name: 'instagram-bot' })
  }
  
  setupCommands() {
    this.bot.command('find', this.handleFind)
    this.bot.command('analyze', this.handleAnalyze)
    this.bot.command('topreels', this.handleTopReels)
    this.bot.command('script', this.handleScript)
  }
  
  async handleFind(ctx: Context) {
    // Реализация команды /find
  }
  
  // ... остальные методы
}
```

## 🧪 Тестирование

### Unit тесты
```typescript
describe('InstagramBot', () => {
  test('should validate find command parameters', () => {
    expect(validateFindCommand(['10', '@username'])).toBe(true)
    expect(validateFindCommand(['0', '@username'])).toBe(false)
  })
  
  test('should format competitor results', () => {
    const result = formatCompetitorsList(mockData)
    expect(result).toContain('🔍 Найдено конкурентов')
  })
})
```

### Integration тесты
- Тестирование команд с mock Inngest
- Тестирование webhook обработки
- Тестирование базы данных

## 📊 Мониторинг и логирование

### Логи команд
```typescript
logger.info('Command executed', {
  command: 'find',
  user_id: ctx.from.id,
  username: ctx.from.username,
  parameters: args
})
```

### Метрики
- Количество выполненных команд
- Время ответа Inngest функций
- Ошибки и их частота
- Активность пользователей

## 🚀 Развертывание

### Environment переменные
```bash
# Telegram
BOT_TOKEN=your_telegram_bot_token
BOT_NAME=instagram_analyzer_bot

# Database
DATABASE_URL=postgresql://...
NEON_DATABASE_URL=postgresql://...

# Inngest
INNGEST_WEBHOOK_URL=https://your-domain.com/api/inngest
INNGEST_SIGNING_KEY=your_signing_key

# Instagram API
RAPIDAPI_INSTAGRAM_KEY=your_rapidapi_key
RAPIDAPI_INSTAGRAM_HOST=real-time-instagram-scraper-api1.p.rapidapi.com

# OpenAI
OPENAI_API_KEY=sk-your-openai-key
```

### Запуск
```bash
# Разработка
npm run dev:bot

# Продакшен
npm run start:bot
```

## 📈 Roadmap

### Phase 1 (MVP)
- ✅ Базовые команды (/find, /analyze, /topreels, /script)
- ✅ Интеграция с Inngest
- ✅ Базовая обработка ошибок

### Phase 2 (Улучшения)
- 📝 Inline клавиатуры
- 📝 Расширенные статистики
- 📝 Экспорт результатов

### Phase 3 (Автоматизация)
- 📝 Планировщик задач
- 📝 Уведомления о новых трендах
- 📝 Интеграция с другими соцсетями

## 🎯 Критерии успеха

1. ✅ Команда `/find 10 @user` возвращает 10 конкурентов
2. ✅ Команда `/analyze @user` собирает рилсы в БД
3. ✅ Команда `/topreels @user` показывает ТОП-10
4. ✅ Команда `/script <id>` создает 3 сценария
5. ✅ Бот запоминает контекст последних 10 сообщений
6. ✅ Время ответа < 30 секунд для всех команд
7. ✅ Обработка ошибок без краша бота
8. ✅ Логирование всех действий

---

**Дата создания:** ${new Date().toISOString().split('T')[0]}
**Версия:** 1.0
**Статус:** Готово к разработке 