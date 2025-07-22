# 🚨 ДИАГНОСТИКА ПРОБЛЕМЫ: Inngest функции отсутствуют в Production

## 🔍 **ПРОБЛЕМА:**
Функции работают локально, но **НЕ СИНХРОНИЗИРУЮТСЯ с production Inngest**.

## 🕵️ **НАЙДЕННЫЕ ПРИЧИНЫ:**

### 1. **❌ Отсутствуют Environment Variables для Inngest в Production**

В `src/routes/inngest.route.ts` используется:
```typescript
export const inngestRouter = serve({
  client: inngest,
  functions: functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,  // ❌ НЕ НАСТРОЕНО в production!
})
```

### 2. **❌ В Docker Compose НЕТ Inngest переменных**

`docker-compose.yml`:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  # ❌ ОТСУТСТВУЮТ:
  # - INNGEST_SIGNING_KEY=${INNGEST_SIGNING_KEY}
  # - INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY}
```

### 3. **❌ Production сервер НЕ регистрирует функции в Inngest Cloud**

Без `INNGEST_SIGNING_KEY` функции не синхронизируются с Inngest Cloud.

---

## ✅ **РЕШЕНИЕ:**

### **Шаг 1: Добавить Inngest Environment Variables**

Обновить `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - PORT=3000
      # ✅ ДОБАВИТЬ ЭТИ СТРОКИ:
      - INNGEST_SIGNING_KEY=${INNGEST_SIGNING_KEY}
      - INNGEST_EVENT_KEY=${INNGEST_EVENT_KEY}
      - INNGEST_APP_URL=${INNGEST_APP_URL}
```

### **Шаг 2: Создать Production Inngest App**

1. **Зайти в Inngest Dashboard:** https://app.inngest.com
2. **Создать новое приложение** для production
3. **Получить ключи:**
   - `INNGEST_SIGNING_KEY` (для secure communication)
   - `INNGEST_EVENT_KEY` (для отправки событий)

### **Шаг 3: Обновить .env файл для production**

Создать `.env.production`:
```bash
# Inngest Production Keys
INNGEST_SIGNING_KEY=signkey_prod_xxxxxxxxxxxxx
INNGEST_EVENT_KEY=eventkey_prod_xxxxxxxxxxxxx
INNGEST_APP_URL=https://ai-server-u14194.vm.elestio.app

# Existing variables...
NODE_ENV=production
ORIGIN=https://ai-server-u14194.vm.elestio.app
# ... остальные переменные
```

### **Шаг 4: Обновить Inngest serve конфигурацию**

Обновить `src/routes/inngest.route.ts`:

```typescript
export const inngestRouter = serve({
  client: inngest,
  functions: functions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // ✅ ДОБАВИТЬ для production:
  serveHost: process.env.INNGEST_APP_URL || process.env.ORIGIN,
  servePath: '/api/inngest',
})
```

### **Шаг 5: Обновить клиент Inngest**

Обновить `src/core/inngest/clients.ts`:

```typescript
export const inngest = new Inngest({
  id: 'ai-training-server',
  eventKey: process.env.INNGEST_EVENT_KEY, // ✅ ДОБАВИТЬ для production
})
```

---

## 🧪 **ДИАГНОСТИКА ТЕКУЩЕГО СОСТОЯНИЯ:**

### **Проверить Environment Variables:**

```bash
# На production сервере выполнить:
echo "INNGEST_SIGNING_KEY: $INNGEST_SIGNING_KEY"
echo "INNGEST_EVENT_KEY: $INNGEST_EVENT_KEY"
echo "ORIGIN: $ORIGIN"
```

### **Проверить Inngest serve endpoint:**

```bash
# Проверить GET запрос к serve endpoint:
curl https://ai-server-u14194.vm.elestio.app/api/inngest

# Должен вернуть информацию о функциях:
# {"message": "Inngest endpoint configured correctly.", "functionsFound": 14}
```

### **Проверить логи на сервере:**

```bash
# Проверить логи при запуске:
docker logs ai-server | grep -i inngest

# Должно быть:
# "🚦 Настройка Inngest маршрутов (v3). Обнаружено функций: 14"
# "✅ Inngest v3 маршруты настроены!"
```

---

## 🚀 **БЫСТРОЕ ИСПРАВЛЕНИЕ:**

### **1. Создать файл fix-production-inngest.sh:**

```bash
#!/bin/bash
echo "🔧 Исправление Inngest в Production..."

# Получить ключи из Inngest Dashboard (нужно сделать вручную)
read -p "Введите INNGEST_SIGNING_KEY: " SIGNING_KEY
read -p "Введите INNGEST_EVENT_KEY: " EVENT_KEY

# Обновить .env файл
echo "INNGEST_SIGNING_KEY=$SIGNING_KEY" >> .env
echo "INNGEST_EVENT_KEY=$EVENT_KEY" >> .env
echo "INNGEST_APP_URL=https://ai-server-u14194.vm.elestio.app" >> .env

# Перезапустить Docker
docker-compose down
docker-compose up -d

echo "✅ Inngest настроен для production!"
```

### **2. Выполнить на сервере:**

```bash
# 1. Зайти на сервер
ssh user@ai-server-u14194.vm.elestio.app

# 2. Перейти в папку проекта
cd /path/to/project

# 3. Запустить исправление
chmod +x fix-production-inngest.sh
./fix-production-inngest.sh
```

---

## 📊 **ПРОВЕРКА ПОСЛЕ ИСПРАВЛЕНИЯ:**

### **1. Функции должны появиться в Inngest Dashboard:**
- Открыть: https://app.inngest.com
- Перейти в ваше production приложение
- Увидеть 14 функций, включая `instagramScraperV2`

### **2. Тест подключения:**

```bash
# Тест регистрации функций:
curl -X PUT https://ai-server-u14194.vm.elestio.app/api/inngest

# Тест отправки события:
curl -X POST https://ai-server-u14194.vm.elestio.app/api/inngest \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "instagram/scraper-v2",
    "data": {
      "username_or_id": "test_user",
      "project_id": 37,
      "max_users": 3,
      "scrape_reels": false,
      "requester_telegram_id": "144022504"
    }
  }'
```

---

## 🎯 **ИТОГ:**

**Проблема была в отсутствии конфигурации Inngest для production!**

После исправления:
- ✅ Функции будут синхронизироваться с Inngest Cloud
- ✅ События будут обрабатываться в production  
- ✅ Telegram бот сможет подключиться к production серверу

**🔥 Нужно настроить environment variables для Inngest в production!** 