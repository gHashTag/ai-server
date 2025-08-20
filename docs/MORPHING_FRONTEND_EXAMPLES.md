# 🧬 Морфинг API - Примеры для фронт-энда

## ✅ **API ГОТОВ К ИСПОЛЬЗОВАНИЮ!**

Эндпоинт: `POST /generate/morph-images`  
Статус: **🟢 Работает и протестирован**

## 🌐 **АКТУАЛЬНЫЙ NGROK URL**

**⚠️ ВАЖНО: Ngrok URL периодически меняется!**

**Текущий URL:** `https://4719685c0b5b.ngrok.app`

**Получить актуальный URL:**
```bash
node get-ngrok-url.js
```

**Полный эндпоинт для морфинга:**
```
https://4719685c0b5b.ngrok.app/generate/morph-images
```

---

## 🎯 **JavaScript / React пример**

```javascript
async function submitMorphingRequest(imageFiles, options = {}) {
  const formData = new FormData();
  
  // Обязательные параметры
  formData.append('type', 'morphing');
  formData.append('telegram_id', options.telegram_id || '144022504');
  formData.append('image_count', imageFiles.length.toString());
  formData.append('morphing_type', options.morphing_type || 'seamless'); // 'seamless' или 'loop'
  formData.append('model', 'kling-v1.6-pro');
  formData.append('is_ru', options.is_ru ? 'true' : 'false');
  formData.append('bot_name', options.bot_name || 'ai_koshey_bot');
  formData.append('username', options.username || 'frontend_user');

  // Создаем ZIP архив из файлов
  const zip = new JSZip();
  imageFiles.forEach((file, index) => {
    const filename = `${String(index + 1).padStart(2, '0')}_image.${file.name.split('.').pop()}`;
    zip.file(filename, file);
  });
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  formData.append('images_zip', zipBlob, 'images.zip');

  try {
    const response = await fetch('https://c156b0d97b4a.ngrok.app/generate/morph-images', {
      method: 'POST',
      headers: {
        'x-secret-key': process.env.REACT_APP_SECRET_KEY || 'test-secret-key'
      },
      body: formData
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Морфинг запущен:', result);
      return {
        success: true,
        job_id: result.job_id,
        status: result.status,
        estimated_time: result.estimated_time
      };
    } else {
      console.error('❌ Ошибка:', result);
      return {
        success: false,
        error: result.message || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('❌ Сетевая ошибка:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Использование:
const imageFiles = [file1, file2, file3]; // FileList из input[type="file"]
const result = await submitMorphingRequest(imageFiles, {
  telegram_id: '144022504',
  morphing_type: 'seamless',
  is_ru: true,
  bot_name: 'ai_koshey_bot',
  username: 'frontend_user'
});
```

---

## 🎨 **React Hook пример**

```jsx
import { useState } from 'react';
import JSZip from 'jszip';

function useMorphing() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const startMorphing = async (files, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      
      // Базовые параметры
      formData.append('type', 'morphing');
      formData.append('telegram_id', options.telegram_id || '144022504');
      formData.append('image_count', files.length.toString());
      formData.append('morphing_type', options.morphing_type || 'seamless');
      formData.append('model', 'kling-v1.6-pro');
      formData.append('is_ru', options.is_ru ? 'true' : 'false');
      formData.append('bot_name', options.bot_name || 'ai_koshey_bot');
      formData.append('username', options.username || 'user');

      // Создаем ZIP
      const zip = new JSZip();
      Array.from(files).forEach((file, index) => {
        const extension = file.name.split('.').pop();
        const filename = `${String(index + 1).padStart(2, '0')}_image.${extension}`;
        zip.file(filename, file);
      });
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      formData.append('images_zip', zipBlob, 'morphing_images.zip');

      const response = await fetch('https://c156b0d97b4a.ngrok.app/generate/morph-images', {
        method: 'POST',
        headers: {
          'x-secret-key': process.env.REACT_APP_SECRET_KEY || 'test-secret-key'
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        return data;
      } else {
        throw new Error(data.message || 'Request failed');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { startMorphing, isLoading, result, error };
}

// Компонент
function MorphingUploader() {
  const { startMorphing, isLoading, result, error } = useMorphing();
  const [files, setFiles] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length < 2) {
      alert('Выберите минимум 2 изображения');
      return;
    }

    try {
      const response = await startMorphing(files, {
        telegram_id: '144022504',
        morphing_type: 'seamless',
        is_ru: true,
        username: 'web_user'
      });
      
      console.log('Морфинг запущен:', response);
    } catch (err) {
      console.error('Ошибка:', err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setFiles(Array.from(e.target.files))}
      />
      
      <select onChange={(e) => setMorphingType(e.target.value)}>
        <option value="seamless">Плавные переходы</option>
        <option value="loop">Зацикленное видео</option>
      </select>
      
      <button type="submit" disabled={isLoading || files.length < 2}>
        {isLoading ? 'Обработка...' : 'Создать морфинг'}
      </button>
      
      {result && (
        <div className="success">
          ✅ Задание {result.job_id} запущено!
          Ожидаемое время: {result.estimated_time}
        </div>
      )}
      
      {error && (
        <div className="error">❌ Ошибка: {error}</div>
      )}
    </form>
  );
}
```

---

## 🔧 **Vanilla JavaScript пример**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Морфинг API Тест</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
</head>
<body>
    <form id="morphingForm">
        <input type="file" id="imageFiles" multiple accept="image/*" required>
        <select id="morphingType">
            <option value="seamless">Плавные переходы</option>
            <option value="loop">Зацикленное видео</option>
        </select>
        <button type="submit">Создать морфинг</button>
    </form>
    
    <div id="result"></div>

    <script>
        document.getElementById('morphingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const files = document.getElementById('imageFiles').files;
            const morphingType = document.getElementById('morphingType').value;
            const resultDiv = document.getElementById('result');
            
            if (files.length < 2) {
                alert('Выберите минимум 2 изображения');
                return;
            }
            
            resultDiv.innerHTML = '⏳ Создание ZIP и отправка...';
            
            try {
                // Создаем ZIP
                const zip = new JSZip();
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const extension = file.name.split('.').pop();
                    const filename = `${String(i + 1).padStart(2, '0')}_image.${extension}`;
                    zip.file(filename, file);
                }
                
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                
                // Создаем FormData
                const formData = new FormData();
                formData.append('type', 'morphing');
                formData.append('telegram_id', '144022504');
                formData.append('images_zip', zipBlob, 'images.zip');
                formData.append('image_count', files.length.toString());
                formData.append('morphing_type', morphingType);
                formData.append('model', 'kling-v1.6-pro');
                formData.append('is_ru', 'true');
                formData.append('bot_name', 'ai_koshey_bot');
                formData.append('username', 'web_user');
                
                // Отправляем запрос
                const response = await fetch('https://c156b0d97b4a.ngrok.app/generate/morph-images', {
                    method: 'POST',
                    headers: {
                        'x-secret-key': 'test-secret-key'
                    },
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = `
                        <div style="color: green;">
                            ✅ Морфинг запущен!<br>
                            Job ID: ${result.job_id}<br>
                            Статус: ${result.status}<br>
                            Время: ${result.estimated_time}
                        </div>
                    `;
                } else {
                    resultDiv.innerHTML = `<div style="color: red;">❌ Ошибка: ${result.message}</div>`;
                }
            } catch (error) {
                resultDiv.innerHTML = `<div style="color: red;">❌ Ошибка: ${error.message}</div>`;
            }
        });
    </script>
</body>
</html>
```

---

## 📋 **Параметры API**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `type` | string | ✅ | Всегда `"morphing"` |
| `telegram_id` | string | ✅ | ID пользователя в Telegram |
| `images_zip` | File | ✅ | ZIP архив с изображениями |
| `image_count` | string | ✅ | Количество изображений (2-100) |
| `morphing_type` | string | ✅ | `"seamless"` или `"loop"` |
| `model` | string | ✅ | `"kling-v1.6-pro"` |
| `is_ru` | string | ✅ | `"true"` или `"false"` |
| `bot_name` | string | ✅ | Имя бота для логирования |
| `username` | string | ✅ | Имя пользователя |

---

## 🎯 **Необходимые зависимости**

```bash
# Для создания ZIP архивов
npm install jszip

# Или через CDN
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
```

---

## 🔧 **Решение проблем с ngrok**

### ❌ **Ошибка 404 / ERR_NGROK_3200**

**Проблема:** Фронт-энд получает ошибку 404 при обращении к ngrok URL.

**Причина:** Ngrok URL изменился (ngrok периодически меняет URLs).

**Решение:**
1. **Получите актуальный URL:**
   ```bash
   node get-ngrok-url.js
   ```

2. **Обновите URL в коде фронт-энда:**
   ```javascript
   // Замените старый URL на новый
   const API_BASE_URL = "https://НОВЫЙ_NGROK_URL.ngrok.app";
   ```

3. **Проверьте что сервер запущен:**
   ```bash
   pm2 status
   # Должен показать ai-server-main как online
   ```

### 🔄 **Автоматическое получение URL**

Для динамического получения URL в коде:

```javascript
async function getCurrentNgrokUrl() {
  try {
    const response = await fetch('http://localhost:4040/api/tunnels');
    const data = await response.json();
    const httpsTunnel = data.tunnels.find(t => t.public_url.startsWith('https://'));
    return httpsTunnel.public_url;
  } catch (error) {
    console.error('Не удалось получить ngrok URL:', error);
    return 'https://4719685c0b5b.ngrok.app'; // fallback
  }
}

// Использование
const apiUrl = await getCurrentNgrokUrl();
const response = await fetch(`${apiUrl}/generate/morph-images`, {...});
```

---

## ✅ **Готово к использованию!**

**API полностью протестирован и готов принимать запросы с фронт-энда!**

**Проверено:**
- ✅ Multipart/form-data запросы
- ✅ ZIP файлы обрабатываются корректно  
- ✅ JSON ответы возвращаются правильно
- ✅ Inngest функция запускается
- ✅ Валидация всех параметров работает 