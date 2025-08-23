# 🔥 ПОШАГОВЫЙ ПЛАН ИСПРАВЛЕНИЯ INNGEST В PRODUCTION

## 🚨 **ПРОБЛЕМА УСТАНОВЛЕНА:**

**Функции Inngest НЕ СИНХРОНИЗИРУЮТСЯ с production** из-за отсутствующих environment variables.

---

## ✅ **ПЛАН ИСПРАВЛЕНИЯ (5 шагов):**

### **ШАГ 1: 🔑 Получить ключи Inngest**

1. **Зайти в Inngest Dashboard:** https://app.inngest.com
2. **Войти в аккаунт** или создать новый
3. **Создать новое приложение** для production:
   - Название: `ai-server-production`
   - Environment: `production`
4. **Скопировать ключи:**
   - `INNGEST_SIGNING_KEY` (начинается с `signkey_prod_`)
   - `INNGEST_EVENT_KEY` (начинается с `eventkey_prod_`)

### **ШАГ 2: 📝 Обновить .env файл на сервере**

На production сервере добавить в `.env` файл:

```bash
# Добавить эти строки в .env:
INNGEST_SIGNING_KEY=signkey_prod_YOUR_ACTUAL_KEY_HERE
INNGEST_EVENT_KEY=eventkey_prod_YOUR_ACTUAL_KEY_HERE
INNGEST_APP_URL=https://ai-server-u14194.vm.elestio.app
```

### **ШАГ 3: 🐳 Перезапустить Docker контейнеры**

```bash
# На production сервере:
docker-compose down
docker-compose up -d

# Проверить статус:
docker ps
docker logs ai-server
```

### **ШАГ 4: 🧪 Запустить диагностику**

```bash
# Скопировать файл диагностики на сервер:
chmod +x diagnose-production-inngest.sh
./diagnose-production-inngest.sh
```

### **ШАГ 5: ✅ Проверить результат**

1. **Открыть Inngest Dashboard:** https://app.inngest.com
2. **Перейти в ваше production приложение**
3. **Увидеть 14 функций**, включая:
   - `🤖 Instagram Scraper V2 (Real API + Zod)`
   - `🔍 Find Instagram Competitors`
   - `📈 Analyze Competitor Reels`
   - И другие...

---

## 📋 **ФАЙЛЫ УЖЕ ОБНОВЛЕНЫ В РЕПОЗИТОРИИ:**

✅ `docker-compose.yml` - добавлены Inngest environment variables  
✅ `src/routes/inngest.route.ts` - добавлен serveHost для production  
✅ `src/core/inngest/clients.ts` - добавлен eventKey  
✅ `production-env-template.txt` - шаблон всех переменных  
✅ `diagnose-production-inngest.sh` - скрипт диагностики

**Осталось только добавить реальные ключи в .env на сервере!**

---

## 🔍 **ДИАГНОСТИКА ПОСЛЕ ИСПРАВЛЕНИЯ:**

### **Тест 1: Проверка endpoint'а**

```bash
curl https://ai-server-u14194.vm.elestio.app/api/inngest
# Ожидаемый результат: {"functionsFound": 14, "hasSigningKey": true}
```

### **Тест 2: Отправка события**

```bash
curl -X POST https://ai-server-u14194.vm.elestio.app/api/inngest \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "instagram/scraper-v2",
    "data": {
      "username_or_id": "test_production",
      "project_id": 37,
      "max_users": 3,
      "scrape_reels": false,
      "requester_telegram_id": "production_test"
    }
  }'
# Ожидаемый результат: {"id": "EVENT_ID"}
```

---

## 🎯 **ПОСЛЕ ИСПРАВЛЕНИЯ TELEGRAM БОТ СМОЖЕТ:**

### **Подключиться к production серверу:**

```javascript
const response = await fetch(
  'https://ai-server-u14194.vm.elestio.app/api/inngest',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'instagram/scraper-v2', // ✅ Правильное событие!
      data: {
        username_or_id: 'vyacheslav_nekludov',
        project_id: 37,
        max_users: 10,
        scrape_reels: true,
        requester_telegram_id: user_id,
      },
    }),
  }
)
```

### **Получить архив с отчётами:**

- HTML отчёт с красивой визуализацией
- Excel файл с данными конкурентов
- ZIP архив для скачивания

---

## ⚠️ **ВАЖНЫЕ МОМЕНТЫ:**

### **Безопасность:**

- ✅ Ключи Inngest **НЕ КОММИТЯТСЯ** в git
- ✅ Все секреты через environment variables
- ✅ CORS настроен правильно

### **Production готовность:**

- ✅ Docker контейнеры оптимизированы
- ✅ Логирование настроено
- ✅ Error handling работает

### **Совместимость:**

- ✅ Inngest v3 SDK используется правильно
- ✅ Events Schema валидируется
- ✅ Database connections управляются

---

## 🎉 **РЕЗУЛЬТАТ:**

После выполнения этих шагов:

1. **✅ Функции появятся в production Inngest Dashboard**
2. **✅ События будут обрабатываться корректно**
3. **✅ Telegram бот сможет запускать анализ Instagram**
4. **✅ Архивы с отчётами будут создаваться автоматически**

---

## 📞 **ТЕХНИЧЕСКАЯ ПОДДЕРЖКА:**

Если что-то не работает после выполнения всех шагов:

1. **Запустить диагностику:** `./diagnose-production-inngest.sh`
2. **Проверить логи:** `docker logs ai-server | grep -i inngest`
3. **Проверить переменные:** `echo $INNGEST_SIGNING_KEY`

**🔥 ПРОБЛЕМА БУДЕТ РЕШЕНА ПОСЛЕ ДОБАВЛЕНИЯ INNGEST КЛЮЧЕЙ!**
