# ✅ Как сгенерировать видео через Veo API

## 🚀 Быстрый старт с URL-запросом (cURL)

### 1. Настройка окружения

```bash
# 1. Авторизуйтесь в Google Cloud
gcloud auth login

# 2. Установите ваш проект
gcloud config set project neuroblogger

# 3. Обновите токен доступа (делается автоматически)
gcloud auth application-default login

# 4. Установите зависимости
cd /Users/playra/ai-server
npm install

# 5. Запустите сервер
npm run dev
```

### 2. URL-запрос для генерации видео

Откройте терминал и выполните следующий cURL запрос:

```bash
curl -X POST http://localhost:4000/generate/text-to-video \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A black cat in a wizard hat casting a spell",
    "videoModel": "veo-3",
    "telegram_id": "123456789",
    "username": "test_user",
    "is_ru": false,
    "bot_name": "your_test_bot"
  }'
```

## 📊 Что происходит в этом запросе

1.  **`POST http://localhost:4000/generate/text-to-video`**
    - Отправляем запрос на ваш локальный сервер

2.  **`"videoModel": "veo-3"`**
    - Указываем, что хотим использовать Google Veo 3

3.  **`"prompt": "..."`**
    - Ваш промпт для генерации видео

## ⚙️ Как это работает внутри

1.  **Ваш сервер** получает запрос.
2.  **`generateTextToVideo.ts`** видит `videoModel: 'veo-3'`.
3.  Вызывается **`VertexVeoService`**.
4.  **`VertexVeoService`**:
    - ✅ Получает токен доступа через **`gcloud auth`**
    - ✅ Отправляет запрос в **Vertex AI API**
    - ✅ Ждёт завершения операции (~45 секунд)
    - ✅ Скачивает видео из **Google Cloud Storage**
    - ✅ Отправляет видео пользователю в Telegram

## 💰 Стоимость генерации

- **Себестоимость:** 8 секунд * $0.40 = **$3.20**
- **Цена в звёздах:** (3.20 / 0.016) * 1.5 = **300 звёзд**

## 📝 Параметры для URL-запроса

### Обязательные:

| Параметр | Тип | Описание |
|----------|-------|----------|
| `prompt` | string | Текст для генерации видео |
| `videoModel` | string | `veo-3` или `veo-2` |
| `telegram_id` | string | ID пользователя в Telegram |
| `username` | string | Имя пользователя |
| `bot_name` | string | Имя вашего бота |

### Опциональные:

| Параметр | Тип | По умолчанию | Описание |
|----------|---------|--------------|----------|
| `is_ru` | boolean | `false` | Язык ответа |

## 🚀 Проверка работоспособности

1.  **Запустите тестовый скрипт:**
    ```bash
    node scripts/checks/test-vertex-veo.js
    ```
    *Ожидаемый результат: ✅ Видео успешно сгенерировано!* 

2.  **Отправьте URL-запрос (cURL):**
    - Вы должны получить ответ от сервера `{"message":"Processing started"}`
    - В течение минуты бот должен прислать вам видео

## 🐛 Возможные проблемы

-   **Ошибка 403 (Forbidden)**
    - **Решение:** `gcloud auth application-default login`

-   **Видео не приходит**
    - **Решение:** Проверьте логи сервера (`pm2 logs`)
    - Убедитесь, что gcloud настроен правильно

-   **Недостаточно звёзд**
    - **Решение:** Убедитесь, что у пользователя > 300 звёзд

## 📚 Документация

- **Vertex AI Veo:** [Ссылка на Google Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/veo-video-generation)
- **Ваш сервис:** `src/services/vertexVeoService.ts`
- **Конфигурация:** `src/config/models.config.ts`

---

**Готово! Теперь вы можете генерировать видео через Veo с помощью простого URL-запроса.**
