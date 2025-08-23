# 📊 Instagram Парсинг - Полный поток данных

## 🎯 Что происходит после запуска парсинга

### 1️⃣ **Инициация парсинга**
```
Inngest Cloud Dashboard / API Event
    ↓
Event: instagram-scraper-v2/scrape.requested
```

**Входные данные:**
```json
{
  "username_or_id": "neuro_coder",     // Целевой аккаунт
  "project_id": 37,                    // ID проекта в БД
  "max_users": 50,                     // Макс. конкурентов
  "scrape_reels": true,                // Парсить рилсы
  "max_reels_per_user": 5,             // Макс. рилсов на пользователя
  "requester_telegram_id": "123456789", // ID в Telegram для отправки результатов
  "bot_name": "neuro_blogger_bot",     // Имя бота для доставки
  "language": "ru"                     // Язык отчетов
}
```

---

### 2️⃣ **Обработка функцией `instagramScraperV2`**

#### **Step 1: Валидация входных данных**
- Проверка наличия API ключей (RAPIDAPI_INSTAGRAM_KEY)
- Проверка подключения к БД (SUPABASE_URL)
- Валидация через Zod схемы

#### **Step 2: Проверка project_id**
- Запрос к БД: проверка существования проекта
- Таблица: `projects`
- Получение имени проекта

#### **Step 3: Вызов Instagram API**
```
API: real-time-instagram-scraper-api1.p.rapidapi.com
Endpoint: /v1/similar_users_v2
```
- Получение списка похожих пользователей
- Retry логика при rate limiting (429)
- Валидация ответа через Zod

---

### 3️⃣ **Сохранение данных в PostgreSQL (Supabase)**

#### **Таблица: `instagram_similar_users`**
```sql
CREATE TABLE instagram_similar_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_username VARCHAR(255),          -- Исходный аккаунт поиска
  user_pk VARCHAR(255),                 -- Instagram PK пользователя
  username VARCHAR(255),                -- Username конкурента
  full_name VARCHAR(255),               -- Полное имя
  is_private BOOLEAN,                   -- Приватный аккаунт
  is_verified BOOLEAN,                  -- Верифицирован
  profile_pic_url TEXT,                 -- URL аватара
  profile_url TEXT,                     -- Ссылка на профиль
  profile_chaining_secondary_label VARCHAR(255),
  social_context VARCHAR(255),          -- Социальный контекст
  project_id INTEGER,                   -- ID проекта
  scraped_at TIMESTAMP,                 -- Время парсинга
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Данные сохраняются:**
- С дедупликацией по `(search_username, user_pk)`
- С привязкой к `project_id`
- С временными метками

---

### 4️⃣ **Парсинг Reels (если включен)**

#### **Step 4-N: Получение рилсов для каждого пользователя**
```
API: real-time-instagram-scraper-api1.p.rapidapi.com
Endpoint: /media/get_v2_user_reels
```

#### **Таблица: `instagram_user_reels`**
```sql
CREATE TABLE instagram_user_reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id VARCHAR(255),                 -- ID рилса
  shortcode VARCHAR(255),               -- Короткий код
  display_url TEXT,                     -- URL превью
  video_url TEXT,                       -- URL видео
  caption TEXT,                         -- Описание
  like_count INTEGER,                   -- Количество лайков
  comment_count INTEGER,                -- Количество комментариев
  play_count INTEGER,                   -- Количество просмотров
  taken_at_timestamp BIGINT,            -- Время публикации
  owner_id VARCHAR(255),                -- ID владельца
  owner_username VARCHAR(255),          -- Username владельца
  scraped_for_user_pk VARCHAR(255),     -- Для какого пользователя собран
  project_id INTEGER,                   -- ID проекта
  scraped_at TIMESTAMP,
  created_at TIMESTAMP
)
```

**Особенности:**
- Задержка 3 сек между запросами (rate limiting)
- Дедупликация по `(reel_id, project_id)`
- Сортировка по популярности (like_count)

---

### 5️⃣ **Генерация отчетов**

#### **Создаваемые файлы:**
1. **HTML отчет** (`output/instagram_analysis_[username]_[timestamp].html`)
   - Красивая визуализация данных
   - Таблицы с сортировкой
   - Графики и статистика
   - Топ конкуренты по метрикам

2. **Excel файл** (`output/instagram_data_[username]_[timestamp].xlsx`)
   - Лист "Competitors" - список конкурентов
   - Лист "Reels" - данные рилсов
   - Лист "Statistics" - сводная статистика

3. **ZIP архив** (`output/instagram_[username]_[timestamp].zip`)
   - Содержит HTML и Excel файлы
   - README.txt с инструкциями
   - Размер: обычно 100-500 KB

---

### 6️⃣ **Доставка результатов в Telegram**

#### **Процесс доставки:**
1. Получение экземпляра бота по `bot_name`
2. Формирование сообщения на выбранном языке
3. Создание ссылки для скачивания:
   ```
   https://[server]/download/instagram-archive/[filename].zip
   ```
4. Отправка сообщения с результатами и ссылкой

#### **Пример сообщения:**
```
🎯 Анализ Instagram конкурентов завершен!

📊 Результаты:
• Найдено конкурентов: 47
• Сохранено в базу: 45
• Проанализировано рилсов: 223

📦 В архиве:
• HTML отчёт с красивой визуализацией
• Excel файл с данными для анализа
• README с инструкциями

Целевой аккаунт: @neuro_coder

📥 Скачать архив: [instagram_neuro_coder_1755853141.zip](https://...)

⚠️ Ссылка действительна в течение 24 часов
```

---

### 7️⃣ **Финальный результат функции**

```javascript
{
  success: true,
  searchTarget: "neuro_coder",
  usersScraped: 50,
  usersValid: 47,
  usersSaved: 45,
  duplicatesSkipped: 2,
  
  // Данные по рилсам
  reelsEnabled: true,
  reelsScraped: 223,
  reelsDuplicates: 12,
  
  // Информация об отчетах
  reports: {
    generated: true,
    htmlReport: "/path/to/report.html",
    excelReport: "/path/to/data.xlsx",
    archivePath: "/path/to/archive.zip",
    archiveFileName: "instagram_neuro_coder_1755853141.zip"
  },
  
  // Статус доставки в Telegram
  telegram: {
    sent: true,
    bot_name: "neuro_blogger_bot",
    archive_sent: true,
    telegram_id: "123456789"
  }
}
```

---

## 📍 Где хранятся данные

### **PostgreSQL (Supabase)**
- **База данных:** Supabase PostgreSQL
- **Таблицы:**
  - `instagram_similar_users` - конкуренты
  - `instagram_user_reels` - рилсы
  - `projects` - проекты пользователей
- **Доступ:** через переменную `SUPABASE_URL`

### **Файловая система сервера**
- **Директория:** `/output/`
- **Файлы:** HTML, Excel, ZIP архивы
- **Время жизни:** 24 часа (автоочистка)

### **Inngest Cloud**
- **События:** История всех запусков
- **Логи:** Детальные логи выполнения
- **Метрики:** Статистика по функциям

---

## 🔄 Использование данных

### **1. Аналитика конкурентов**
- Анализ аудитории похожих аккаунтов
- Поиск потенциальных партнеров
- Изучение контент-стратегий

### **2. Контент-планирование**
- Анализ популярных рилсов
- Определение трендов
- Планирование публикаций

### **3. Таргетинг рекламы**
- Сбор данных для Look-alike аудиторий
- Определение интересов целевой аудитории
- Оптимизация рекламных кампаний

### **4. Мониторинг конкурентов**
- Отслеживание новых игроков
- Анализ роста аккаунтов
- Мониторинг активности

---

## 🛡️ Безопасность и лимиты

### **Rate Limiting**
- Задержка 5 сек перед первым запросом
- Задержка 3 сек между запросами рилсов
- Retry при 429 ошибке (экспоненциальная задержка)

### **Лимиты данных**
- Макс. 100 конкурентов за запрос
- Макс. 200 рилсов на пользователя
- Макс. 100 рилсов в отчете

### **Валидация**
- Все данные проходят Zod валидацию
- Проверка project_id в БД
- Дедупликация записей

---

## 📈 Метрики успеха

- **Скорость парсинга:** ~1-2 мин на 50 аккаунтов
- **Успешность:** 95%+ валидных данных
- **Доставка:** 100% доставка отчетов в Telegram
- **Размер отчетов:** 100-500 KB в среднем

---

## 🔧 Переменные окружения

```env
# Instagram API
RAPIDAPI_INSTAGRAM_KEY=your_api_key
RAPIDAPI_INSTAGRAM_HOST=real-time-instagram-scraper-api1.p.rapidapi.com

# Database
SUPABASE_URL=postgresql://user:pass@host:port/db

# Server
ORIGIN=https://your-server.com
API_URL=https://your-api.com

# Telegram Bots
BOT_TOKEN_NEURO_BLOGGER=bot_token_here
```

---

## ✅ Итог

После запуска парсинга Instagram:
1. **Данные сохраняются** в PostgreSQL (Supabase)
2. **Генерируются отчеты** в HTML и Excel форматах
3. **Создается архив** со всеми файлами
4. **Отправляется в Telegram** ссылка для скачивания
5. **Данные доступны** для анализа и использования в других функциях

Весь процесс занимает 1-3 минуты в зависимости от объема данных.
