# 🎬 VEO3 Video Generation API - Руководство для фронт-энда

## ✅ **API ГОТОВ К ИСПОЛЬЗОВАНИЮ!**

Эндпоинты:
- `POST /api/inngest` (для Inngest событий) 
- `POST /generate/veo3-video` (прямой вызов)
- `POST /generate/text-to-video` (с поддержкой VEO3)

Статус: **🟢 Работает и протестирован**

## 🎯 **Ключевые особенности VEO3**

### ✅ Поддерживаемые форматы:
- **📱 9:16** - Вертикальное (TikTok, Instagram Stories) - **КРИТИЧЕСКИ ВАЖНО**
- **📺 16:9** - Горизонтальное (YouTube, TV)
- **🟩 1:1** - Квадратное (Instagram Feed)

### ✅ Доступные модели:
- **veo3_fast** - Быстрая генерация (87% экономия против Vertex AI)
- **veo3** - Премиум качество (37% экономия)
- **runway-aleph** - Продвинутое редактирование

### ✅ Технические параметры:
- **Длительность:** 2-10 секунд
- **Провайдеры:** Kie.ai (основной) + Vertex AI (fallback)
- **Стоимость:** от $0.05/сек (Kie.ai) до $0.40/сек (Vertex AI)

---

## 🌐 **АКТУАЛЬНЫЙ SERVER URL**

**Локальная разработка:** `http://localhost:4000`  
**Production:** `https://your-domain.com`

**Проверить доступность API:**
```bash
curl http://localhost:4000/health
```

---

## 🎯 **JavaScript / React примеры**

### 1. 📱 **Генерация вертикального видео 9:16 (TikTok)**

```javascript
async function generateVerticalVideo(prompt, options = {}) {
  const requestData = {
    // Обязательные параметры
    prompt: prompt,
    model: options.model || 'veo3_fast',
    aspectRatio: '9:16', // КРИТИЧЕСКИ ВАЖНО для мобильного контента
    duration: options.duration || 3,
    
    // Пользовательские данные
    telegram_id: options.telegram_id || 'frontend_user_001',
    username: options.username || 'mobile_creator',
    is_ru: options.is_ru || false,
    bot_name: options.bot_name || 'veo3_bot',
    
    // Дополнительные параметры
    style: options.style || 'cinematic',
    cameraMovement: options.cameraMovement || 'smooth',
    imageUrl: options.imageUrl // для image-to-video (опционально)
  };

  try {
    const response = await fetch('http://localhost:4000/api/inngest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'veo3/video.generate',
        data: requestData
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Вертикальное видео запущено:', result);
    
    return {
      success: true,
      message: 'Генерация видео запущена',
      format: '9:16',
      estimatedTime: '30-60 секунд'
    };
    
  } catch (error) {
    console.error('❌ Ошибка генерации вертикального видео:', error);
    throw error;
  }
}

// Использование:
generateVerticalVideo('Beautiful sunset over ocean waves, vertical cinematic shot', {
  duration: 3,
  model: 'veo3_fast',
  telegram_id: 'your_user_id'
});
```

### 2. 📺 **Генерация горизонтального видео 16:9 (YouTube)**

```javascript
async function generateHorizontalVideo(prompt, options = {}) {
  const requestData = {
    prompt: prompt,
    model: options.model || 'veo3_fast',
    aspectRatio: '16:9', // Горизонтальный формат
    duration: options.duration || 5,
    telegram_id: options.telegram_id || 'frontend_user_002',
    username: options.username || 'youtube_creator',
    is_ru: options.is_ru || false,
    bot_name: options.bot_name || 'veo3_bot'
  };

  try {
    const response = await fetch('http://localhost:4000/api/inngest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'veo3/video.generate',
        data: requestData
      })
    });

    const result = await response.json();
    console.log('✅ Горизонтальное видео запущено:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка генерации горизонтального видео:', error);
    throw error;
  }
}
```

### 3. 🟩 **Генерация квадратного видео 1:1 (Instagram Feed)**

```javascript
async function generateSquareVideo(prompt, options = {}) {
  const requestData = {
    prompt: prompt,
    model: options.model || 'veo3_fast',
    aspectRatio: '1:1', // Квадратный формат
    duration: options.duration || 4,
    telegram_id: options.telegram_id || 'frontend_user_003',
    username: options.username || 'instagram_creator',
    is_ru: options.is_ru || false,
    bot_name: options.bot_name || 'veo3_bot'
  };

  try {
    const response = await fetch('http://localhost:4000/api/inngest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'veo3/video.generate',
        data: requestData
      })
    });

    const result = await response.json();
    console.log('✅ Квадратное видео запущено:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Ошибка генерации квадратного видео:', error);
    throw error;
  }
}
```

---

## 🎨 **React компоненты**

### **VEO3VideoGenerator.jsx**

```jsx
import React, { useState } from 'react';

const VEO3VideoGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState('9:16');
  const [model, setModel] = useState('veo3_fast');
  const [duration, setDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const generateVideo = async () => {
    setLoading(true);
    
    try {
      const requestData = {
        prompt: prompt,
        model: model,
        aspectRatio: format,
        duration: duration,
        telegram_id: `react_user_${Date.now()}`,
        username: 'react_frontend',
        is_ru: false,
        bot_name: 'veo3_react_bot'
      };

      const response = await fetch('http://localhost:4000/api/inngest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'veo3/video.generate',
          data: requestData
        })
      });

      if (response.ok) {
        setResult({
          success: true,
          message: 'Генерация запущена успешно!',
          format: format,
          estimatedTime: '30-60 секунд'
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="veo3-generator">
      <h2>🎬 VEO3 Video Generator</h2>
      
      <div className="form-group">
        <label>Описание видео:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Beautiful sunset over ocean waves, cinematic shot"
          rows={3}
          style={{ width: '100%', padding: '10px' }}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Формат:</label>
          <select 
            value={format} 
            onChange={(e) => setFormat(e.target.value)}
            style={{ padding: '8px' }}
          >
            <option value="9:16">📱 9:16 - TikTok/Stories</option>
            <option value="16:9">📺 16:9 - YouTube/TV</option>
            <option value="1:1">🟩 1:1 - Instagram Feed</option>
          </select>
        </div>

        <div className="form-group">
          <label>Модель:</label>
          <select 
            value={model} 
            onChange={(e) => setModel(e.target.value)}
            style={{ padding: '8px' }}
          >
            <option value="veo3_fast">⚡ VEO3 Fast (экономия 87%)</option>
            <option value="veo3">💎 VEO3 Quality</option>
            <option value="runway-aleph">🚀 Runway Aleph</option>
          </select>
        </div>

        <div className="form-group">
          <label>Длительность (сек):</label>
          <input
            type="number"
            min="2"
            max="10"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            style={{ padding: '8px', width: '80px' }}
          />
        </div>
      </div>

      <button 
        onClick={generateVideo} 
        disabled={loading || !prompt}
        style={{
          backgroundColor: loading ? '#ccc' : '#4CAF50',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginTop: '20px'
        }}
      >
        {loading ? '🔄 Генерирую...' : '🎬 Создать видео'}
      </button>

      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <div>
              <h3>✅ {result.message}</h3>
              <p><strong>Формат:</strong> {result.format}</p>
              <p><strong>Ожидаемое время:</strong> {result.estimatedTime}</p>
              <p><em>Видео будет отправлено через бот или webhook</em></p>
            </div>
          ) : (
            <div>
              <h3>❌ Ошибка генерации</h3>
              <p>{result.error}</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .veo3-generator {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: Arial, sans-serif;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-row {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
        }
        .result.success {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
        }
        .result.error {
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
        }
      `}</style>
    </div>
  );
};

export default VEO3VideoGenerator;
```

---

## 🔄 **Обработка статуса и результатов**

### **Webhook для получения результатов:**

```javascript
// Настройка webhook endpoint для получения готовых видео
app.post('/webhook/veo3-result', (req, res) => {
  const { telegram_id, videoUrl, format, model, success, error } = req.body;
  
  if (success) {
    console.log('✅ Видео готово:', {
      user: telegram_id,
      video: videoUrl,
      format: format,
      model: model
    });
    
    // Уведомить пользователя через WebSocket или другой способ
    notifyUser(telegram_id, {
      type: 'video_ready',
      videoUrl: videoUrl,
      format: format
    });
  } else {
    console.error('❌ Ошибка генерации видео:', error);
    notifyUser(telegram_id, {
      type: 'video_error',
      error: error
    });
  }
  
  res.status(200).json({ received: true });
});
```

### **Polling для проверки статуса (альтернативный способ):**

```javascript
async function pollVideoStatus(requestId, maxAttempts = 20) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`http://localhost:4000/api/video-status/${requestId}`);
      const status = await response.json();
      
      if (status.completed) {
        return {
          success: true,
          videoUrl: status.videoUrl,
          format: status.format
        };
      } else if (status.failed) {
        return {
          success: false,
          error: status.error
        };
      }
      
      // Ждем 15 секунд перед следующей проверкой
      await new Promise(resolve => setTimeout(resolve, 15000));
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
    }
  }
  
  return {
    success: false,
    error: 'Timeout: video generation took too long'
  };
}
```

---

## 💡 **Best Practices**

### 🎯 **Рекомендации по промптам:**

#### ✅ Хорошие промпты:
```javascript
// Для вертикального 9:16
"Beautiful woman walking down sunny street, vertical cinematic shot, smartphone aspect ratio"

// Для горизонтального 16:9  
"Epic mountain landscape at golden hour, wide cinematic shot, professional film look"

// Для квадратного 1:1
"Close-up of coffee being poured into white cup, Instagram-style shot, aesthetic lighting"
```

#### ❌ Избегайте:
```javascript
// Слишком сложные промпты
"A woman walking while simultaneously juggling fire while riding a unicorn in space during a thunderstorm"

// Неопределенные описания
"Some video with stuff happening"

// Упоминание конкретных людей или брендов
"Video of Elon Musk driving Tesla Model S"
```

### 📱 **Оптимизация по форматам:**

```javascript
const FORMAT_RECOMMENDATIONS = {
  '9:16': {
    name: 'Vertical Mobile',
    useCases: ['TikTok', 'Instagram Stories', 'YouTube Shorts'],
    tips: [
      'Фокус на центральном объекте',
      'Минимум горизонтального движения',
      'Читаемый текст в верхней части'
    ],
    maxDuration: 5 // секунд для лучшего результата
  },
  
  '16:9': {
    name: 'Horizontal Desktop', 
    useCases: ['YouTube', 'TV', 'Desktop'],
    tips: [
      'Можно использовать широкие панорамы',
      'Горизонтальное движение камеры',
      'Детализированные сцены'
    ],
    maxDuration: 10
  },
  
  '1:1': {
    name: 'Square Social',
    useCases: ['Instagram Feed', 'Facebook', 'Twitter'],
    tips: [
      'Центрированная композиция',
      'Сбалансированные пропорции',
      'Подходит для статичных сцен'
    ],
    maxDuration: 6
  }
};
```

### 💰 **Управление стоимостью:**

```javascript
function calculateCost(model, duration) {
  const RATES = {
    'veo3_fast': 0.05, // $0.05/сек - самый экономичный
    'veo3': 0.25,      // $0.25/сек - баланс качества/цены  
    'runway-aleph': 0.30 // $0.30/сек - премиум
  };
  
  const baseCost = RATES[model] * duration;
  const markup = baseCost * 0.5; // 50% наценка
  
  return {
    baseCost,
    markup,
    totalCost: baseCost + markup,
    savings: model === 'veo3_fast' ? '87%' : model === 'veo3' ? '37%' : '0%'
  };
}

// Пример
const cost = calculateCost('veo3_fast', 3);
console.log(`Стоимость: $${cost.totalCost.toFixed(3)} (экономия ${cost.savings})`);
```

---

## 🧪 **Тестирование**

### **Быстрый тест API:**

```bash
# Тест доступности
curl http://localhost:4000/health

# Тест генерации вертикального видео
curl -X POST http://localhost:4000/api/inngest \
  -H "Content-Type: application/json" \
  -d '{
    "name": "veo3/video.generate",
    "data": {
      "prompt": "Beautiful sunset over ocean waves, vertical cinematic shot",
      "model": "veo3_fast", 
      "aspectRatio": "9:16",
      "duration": 3,
      "telegram_id": "test_user",
      "username": "test_user",
      "is_ru": false,
      "bot_name": "test_bot"
    }
  }'
```

### **JavaScript тесты:**

```javascript
// test-veo3-integration.js
async function testAllFormats() {
  const formats = ['9:16', '16:9', '1:1'];
  
  for (const format of formats) {
    console.log(`🧪 Testing ${format} format...`);
    
    try {
      const result = await generateVideo(`Test video in ${format} format`, {
        aspectRatio: format,
        duration: 3,
        model: 'veo3_fast'
      });
      
      console.log(`✅ ${format} test passed:`, result);
    } catch (error) {
      console.error(`❌ ${format} test failed:`, error);
    }
  }
}

testAllFormats();
```

---

## 🚨 **Обработка ошибок**

### **Типичные ошибки и их решения:**

```javascript
const ERROR_HANDLERS = {
  'API_KEY_INVALID': {
    message: 'Неверный API ключ Kie.ai',
    solution: 'Проверьте переменную KIE_AI_API_KEY',
    fallback: 'Используется Vertex AI'
  },
  
  'INSUFFICIENT_CREDITS': {
    message: 'Недостаточно кредитов в Kie.ai',
    solution: 'Пополните баланс или используйте Vertex AI',
    fallback: 'Автоматический переход на Vertex AI'
  },
  
  'RATE_LIMIT_EXCEEDED': {
    message: 'Превышен лимит запросов',
    solution: 'Подождите 1 минуту перед следующим запросом',
    fallback: 'Повторная попытка через Vertex AI'
  },
  
  'GENERATION_FAILED': {
    message: 'Ошибка генерации видео',
    solution: 'Попробуйте изменить промпт или уменьшить длительность',
    fallback: 'Повторная попытка с другой моделью'
  }
};

function handleVeo3Error(error) {
  const handler = ERROR_HANDLERS[error.code] || {
    message: 'Неизвестная ошибка',
    solution: 'Обратитесь в поддержку',
    fallback: 'Повторите попытку позже'
  };
  
  console.error('VEO3 Error:', {
    code: error.code,
    message: handler.message,
    solution: handler.solution,
    fallback: handler.fallback
  });
  
  return handler;
}
```

---

## 📞 **Поддержка**

**Документация:** См. файлы `VEO3_*` в корне проекта  
**Тесты:** `test-veo3-*.js`  
**Статус API:** `http://localhost:4000/health`

**Приоритет поддержки форматов:**
1. 🚨 **КРИТИЧНО:** 9:16 (вертикальное) - должно работать всегда
2. 🔴 **ВАЖНО:** 16:9 (горизонтальное) - основной формат 
3. 🟡 **ЖЕЛАТЕЛЬНО:** 1:1 (квадратное) - дополнительный формат

---

*Документ обновлен: 21 августа 2025*  
*Статус API: ✅ Готов к продакшену*  
*Протестированные форматы: 9:16 ✅, 16:9 ✅, 1:1 ✅*