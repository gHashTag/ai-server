# 🧬 Морфинг API - Руководство по использованию

## 📖 Обзор

Морфинг API позволяет создавать плавные видео переходы между изображениями с использованием модели Kling-v1.6. API принимает ZIP архив с изображениями и возвращает готовое MP4 видео.

## 🚀 Быстрый старт

### 1. Подготовка изображений

Создайте ZIP архив с изображениями в правильном порядке:

```
morphing_images.zip
├── morphing_frame_1.jpg
├── morphing_frame_2.jpg
├── morphing_frame_3.jpg
└── morphing_frame_4.jpg
```

**Требования к изображениям:**

- Форматы: `.jpg`, `.jpeg`, `.png`, `.webp`
- Количество: от 2 до 100 изображений
- Размер ZIP архива: до 50 МБ
- Имена файлов должны содержать номера для правильной сортировки

### 2. Отправка запроса

```bash
curl -X POST https://your-server.com/generate/morph-images \
  -H "x-secret-key: YOUR_SECRET_KEY" \
  -F "type=morphing" \
  -F "telegram_id=144022504" \
  -F "images_zip=@morphing_images.zip" \
  -F "image_count=4" \
  -F "morphing_type=seamless" \
  -F "model=kling-v1.6-pro" \
  -F "is_ru=true" \
  -F "bot_name=ai_koshey_bot" \
  -F "username=test_user"
```

### 3. Получение ответа

**Успешный ответ (200 OK):**

```json
{
  "message": "Морфинг отправлен на обработку",
  "job_id": "morph_144022504_1735901234567",
  "status": "processing",
  "estimated_time": "5-10 минут"
}
```

**Ошибка (400 Bad Request):**

```json
{
  "message": "Ошибка валидации",
  "error": "image_count is required and must be a valid number",
  "status": "error"
}
```

## 📋 Параметры API

### Обязательные параметры

| Параметр        | Тип    | Описание                  | Пример                    |
| --------------- | ------ | ------------------------- | ------------------------- |
| `type`          | string | Тип операции              | `"morphing"`              |
| `telegram_id`   | string | ID пользователя Telegram  | `"144022504"`             |
| `images_zip`    | File   | ZIP архив с изображениями | `morphing_images.zip`     |
| `image_count`   | string | Количество изображений    | `"4"`                     |
| `morphing_type` | string | Тип морфинга              | `"seamless"` или `"loop"` |
| `model`         | string | Модель для обработки      | `"kling-v1.6-pro"`        |
| `is_ru`         | string | Язык ответов              | `"true"` или `"false"`    |
| `bot_name`      | string | Имя бота                  | `"ai_koshey_bot"`         |
| `username`      | string | Имя пользователя          | `"test_user"`             |

### Заголовки

| Заголовок      | Описание                    | Пример                |
| -------------- | --------------------------- | --------------------- |
| `x-secret-key` | API ключ для аутентификации | `your-secret-key`     |
| `Content-Type` | Тип контента                | `multipart/form-data` |

## 🎬 Типы морфинга

### Seamless (Плавные переходы)

- Создает плавные переходы между изображениями
- Подходит для создания анимации изменений
- Рекомендуется для последовательных кадров

### Loop (Зацикленное видео)

- Создает зацикленное видео
- Последний кадр плавно переходит в первый
- Подходит для создания бесконечных анимаций

## 💻 Примеры кода

### JavaScript (Node.js)

```javascript
const FormData = require('form-data')
const fs = require('fs')
const axios = require('axios')

async function createMorphingVideo() {
  const form = new FormData()

  // Добавляем параметры
  form.append('type', 'morphing')
  form.append('telegram_id', '144022504')
  form.append('image_count', '3')
  form.append('morphing_type', 'seamless')
  form.append('model', 'kling-v1.6-pro')
  form.append('is_ru', 'true')
  form.append('bot_name', 'ai_koshey_bot')
  form.append('username', 'test_user')

  // Добавляем ZIP файл
  form.append('images_zip', fs.createReadStream('./morphing_images.zip'))

  try {
    const response = await axios.post(
      'https://your-server.com/generate/morph-images',
      form,
      {
        headers: {
          'x-secret-key': 'YOUR_SECRET_KEY',
          ...form.getHeaders(),
        },
      }
    )

    console.log('Морфинг запущен:', response.data)
  } catch (error) {
    console.error('Ошибка:', error.response?.data || error.message)
  }
}

createMorphingVideo()
```

### Python

```python
import requests

def create_morphing_video():
    url = 'https://your-server.com/generate/morph-images'

    headers = {
        'x-secret-key': 'YOUR_SECRET_KEY'
    }

    data = {
        'type': 'morphing',
        'telegram_id': '144022504',
        'image_count': '3',
        'morphing_type': 'seamless',
        'model': 'kling-v1.6-pro',
        'is_ru': 'true',
        'bot_name': 'ai_koshey_bot',
        'username': 'test_user'
    }

    files = {
        'images_zip': open('morphing_images.zip', 'rb')
    }

    try:
        response = requests.post(url, headers=headers, data=data, files=files)
        response.raise_for_status()

        result = response.json()
        print(f"Морфинг запущен: {result}")

    except requests.exceptions.RequestException as e:
        print(f"Ошибка: {e}")
    finally:
        files['images_zip'].close()

create_morphing_video()
```

## 🔄 Процесс обработки

1. **Валидация** - Проверка входных параметров и файлов
2. **Извлечение** - Распаковка ZIP архива и сортировка изображений
3. **Морфинг** - Отправка в Kling-v1.6 API для обработки
4. **Сохранение** - Загрузка готового видео в хранилище
5. **Доставка** - Отправка видео пользователю в Telegram

## ⚠️ Ограничения и требования

### Файлы

- **Максимальный размер ZIP:** 50 МБ
- **Количество изображений:** от 2 до 100
- **Поддерживаемые форматы:** JPG, JPEG, PNG, WebP
- **Именование файлов:** должно содержать числа для сортировки

### Производительность

- **Время обработки:** 5-10 минут в зависимости от количества изображений
- **Таймаут обработки:** 10 минут
- **Качество видео:** высокое (определяется Kling-v1.6)

### Аутентификация

- Требуется валидный `x-secret-key`
- Проверка существования пользователя в системе

## 🚨 Обработка ошибок

### Типичные ошибки

| Код | Ошибка                                    | Решение                                     |
| --- | ----------------------------------------- | ------------------------------------------- |
| 400 | `type is required and must be "morphing"` | Передайте `type=morphing`                   |
| 400 | `images_zip file is required`             | Убедитесь, что ZIP файл прикреплен          |
| 400 | `User validation failed`                  | Проверьте `telegram_id` и `username`        |
| 500 | `ZIP extraction failed`                   | Проверьте корректность ZIP архива           |
| 500 | `Kling processing failed`                 | Попробуйте позже или обратитесь в поддержку |

### Отладка

1. **Проверьте статус сервера:** `GET /`
2. **Валидируйте ZIP архив:** убедитесь, что он содержит изображения
3. **Проверьте логи:** сервер записывает подробные логи процесса
4. **Используйте тестовый скрипт:** `node test-morphing-endpoint.js`

## 🧪 Тестирование

### Запуск тестового скрипта

```bash
# Установите переменную окружения
export SECRET_API_KEY=your-secret-key

# Запустите тест
node test-morphing-endpoint.js
```

### Создание тестового ZIP архива

```bash
# Создайте директорию с изображениями
mkdir test_images
cd test_images

# Добавьте тестовые изображения
cp image1.jpg morphing_frame_1.jpg
cp image2.jpg morphing_frame_2.jpg
cp image3.jpg morphing_frame_3.jpg

# Создайте ZIP архив
zip ../test_morphing_images.zip *.jpg
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи сервера
2. Убедитесь в корректности параметров
3. Протестируйте с минимальным набором данных
4. Обратитесь к разработчикам с подробным описанием ошибки

## 🔄 Changelog

### v1.0.0 (2024-12-XX)

- ✅ Базовая реализация морфинг API
- ✅ Интеграция с Kling-v1.6
- ✅ Поддержка seamless и loop режимов
- ✅ Автоматическая доставка в Telegram
- ✅ Валидация входных данных
- ✅ Обработка ошибок и логирование

---

_Создано командой AI-Server Development Team_
