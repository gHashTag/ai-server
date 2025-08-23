# 📱 ТЕХНИЧЕСКОЕ ЗАДАНИЕ: Интеграция расширенного Kie.ai API на клиенте

## 📋 Обзор обновления

Серверная часть была расширена для поддержки всех доступных полей Kie.ai API согласно [официальной документации](https://docs.kie.ai/veo3-api/generate-veo-3-video). Теперь клиент может использовать расширенные возможности генерации видео.

## 🆕 Новые возможности API

### Доступные поля для генерации видео

| Поле             | Тип        | Описание                       | Обязательное | Новое |
| ---------------- | ---------- | ------------------------------ | ------------ | ----- |
| `model`          | `string`   | Модель генерации               | ✅           |       |
| `prompt`         | `string`   | Текстовое описание             | ✅           |       |
| `duration`       | `number`   | Длительность (2-10 сек)        | ❌           |       |
| `aspectRatio`    | `string`   | Формат (`16:9`, `9:16`, `1:1`) | ❌           |       |
| `imageUrls`      | `string[]` | Массив изображений для video   | ❌           | ✅    |
| `watermark`      | `string`   | Водяной знак на видео          | ❌           | ✅    |
| `callBackUrl`    | `string`   | URL для webhook уведомлений    | ❌           | ✅    |
| `seeds`          | `number`   | Seed для воспроизводимости     | ❌           | ✅    |
| `enableFallback` | `boolean`  | Автоматический fallback        | ❌           | ✅    |

### Доступные модели

```typescript
type VideoModel = 'veo3_fast' | 'veo3' | 'runway-aleph'
```

| Модель         | Описание                   | Цена/сек | Экономия |
| -------------- | -------------------------- | -------- | -------- |
| `veo3_fast`    | Быстрая генерация          | $0.05    | 87%      |
| `veo3`         | Премиум качество           | $0.25    | 37%      |
| `runway-aleph` | Продвинутое редактирование | $0.30    | 25%      |

## 🔌 API Endpoints

### Основной endpoint для генерации видео

```
POST /api/video/generate
```

### Типы запроса и ответа

```typescript
// Запрос
interface VideoGenerationRequest {
  // Обязательные поля
  model: 'veo3_fast' | 'veo3' | 'runway-aleph'
  prompt: string

  // Опциональные поля
  duration?: number // 2-10 секунд
  aspectRatio?: '16:9' | '9:16' | '1:1'

  // НОВЫЕ опциональные поля
  imageUrls?: string[] // Массив URL изображений
  watermark?: string // Текст водяного знака
  callBackUrl?: string // URL для webhook callback
  seeds?: number // Seed для воспроизводимости
  enableFallback?: boolean // Включить fallback на другие модели

  // Метаданные
  userId?: string
  projectId?: number
}

// Ответ
interface VideoGenerationResponse {
  success: boolean
  data?: {
    videoUrl: string // URL видео (может быть временным)
    taskId: string // ID задачи для отслеживания
    status: string // 'processing' | 'completed' | 'failed'
    duration: number
  }
  cost: {
    usd: number // Стоимость в USD
    stars: number // Стоимость в звездах
  }
  provider: string // 'Kie.ai'
  model: string
  processingTime?: number
  error?: string
}
```

## 💻 Примеры интеграции на клиенте

### 1. Базовая генерация видео

```javascript
// JavaScript/React
async function generateVideo() {
  const response = await fetch('/api/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      model: 'veo3_fast',
      prompt: 'A beautiful sunset over mountains, cinematic shot',
      duration: 5,
      aspectRatio: '16:9',
    }),
  })

  const result = await response.json()

  if (result.success) {
    console.log('Task ID:', result.data.taskId)
    console.log('Status:', result.data.status)
    console.log('Cost:', result.cost.usd, 'USD')

    // Видео генерируется асинхронно
    // Нужно дождаться webhook или периодически проверять статус
  }
}
```

### 2. Генерация с массивом изображений

```typescript
// TypeScript
interface VideoGenerationParams {
  model: string
  prompt: string
  imageUrls?: string[]
  watermark?: string
  // ... остальные поля
}

async function generateVideoWithImages(params: VideoGenerationParams) {
  const requestBody = {
    model: 'veo3',
    prompt: 'Smooth transition between images with cinematic effects',
    imageUrls: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg',
    ],
    aspectRatio: '9:16',
    duration: 8,
  }

  try {
    const response = await fetch('/api/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(requestBody),
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Video generation failed:', error)
    throw error
  }
}
```

### 3. Полная конфигурация с webhook

```javascript
// Пример с callback URL для получения результата
async function generateVideoWithCallback() {
  const callbackUrl = 'https://your-app.com/api/video-callback'

  const response = await fetch('/api/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      model: 'veo3',
      prompt: 'Epic cinematic scene with special effects',
      duration: 10,
      aspectRatio: '16:9',

      // Новые поля
      imageUrls: ['https://example.com/reference.jpg'],
      watermark: 'YourBrand © 2024',
      callBackUrl: callbackUrl,
      seeds: 12345, // Для воспроизводимого результата
      enableFallback: true, // Автоматически переключиться на другую модель при ошибке

      // Метаданные
      userId: currentUser.id,
      projectId: currentProject.id,
    }),
  })

  const result = await response.json()

  if (result.success) {
    // Сохраняем taskId для отслеживания
    localStorage.setItem('videoTaskId', result.data.taskId)

    // Показываем пользователю статус
    showNotification(`Video generation started. Task ID: ${result.data.taskId}`)

    // Результат придет на callbackUrl когда видео будет готово
  }
}
```

### 4. React компонент с UI

```jsx
// React компонент для генерации видео
import React, { useState } from 'react'

function VideoGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [taskId, setTaskId] = useState(null)
  const [formData, setFormData] = useState({
    model: 'veo3_fast',
    prompt: '',
    duration: 5,
    aspectRatio: '16:9',
    imageUrls: [],
    watermark: '',
    seeds: null,
    enableFallback: false,
  })

  const handleSubmit = async e => {
    e.preventDefault()
    setIsGenerating(true)

    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...formData,
          // Фильтруем пустые значения
          imageUrls:
            formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
          watermark: formData.watermark || undefined,
          seeds: formData.seeds || undefined,
          callBackUrl: `${window.location.origin}/api/video-webhook`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setTaskId(result.data.taskId)
        // Начинаем проверку статуса
        startStatusPolling(result.data.taskId)
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Generation failed:', error)
      alert('Failed to generate video')
    } finally {
      setIsGenerating(false)
    }
  }

  const startStatusPolling = taskId => {
    // Проверяем статус каждые 5 секунд
    const interval = setInterval(async () => {
      const status = await checkVideoStatus(taskId)
      if (status.status === 'completed') {
        clearInterval(interval)
        // Показываем видео пользователю
        displayVideo(status.videoUrl)
      } else if (status.status === 'failed') {
        clearInterval(interval)
        alert('Video generation failed')
      }
    }, 5000)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Model:</label>
        <select
          value={formData.model}
          onChange={e => setFormData({ ...formData, model: e.target.value })}
        >
          <option value="veo3_fast">Veo 3 Fast ($0.05/sec)</option>
          <option value="veo3">Veo 3 Quality ($0.25/sec)</option>
          <option value="runway-aleph">Runway Aleph ($0.30/sec)</option>
        </select>
      </div>

      <div>
        <label>Prompt:</label>
        <textarea
          value={formData.prompt}
          onChange={e => setFormData({ ...formData, prompt: e.target.value })}
          required
          rows={4}
          placeholder="Describe the video you want to generate..."
        />
      </div>

      <div>
        <label>Duration (seconds):</label>
        <input
          type="number"
          min="2"
          max="10"
          value={formData.duration}
          onChange={e =>
            setFormData({ ...formData, duration: parseInt(e.target.value) })
          }
        />
      </div>

      <div>
        <label>Aspect Ratio:</label>
        <select
          value={formData.aspectRatio}
          onChange={e =>
            setFormData({ ...formData, aspectRatio: e.target.value })
          }
        >
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
          <option value="1:1">1:1 (Square)</option>
        </select>
      </div>

      <div>
        <label>Watermark (optional):</label>
        <input
          type="text"
          value={formData.watermark}
          onChange={e =>
            setFormData({ ...formData, watermark: e.target.value })
          }
          placeholder="Your brand name"
        />
      </div>

      <div>
        <label>Seed (optional, for reproducibility):</label>
        <input
          type="number"
          value={formData.seeds || ''}
          onChange={e =>
            setFormData({
              ...formData,
              seeds: e.target.value ? parseInt(e.target.value) : null,
            })
          }
          placeholder="12345"
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.enableFallback}
            onChange={e =>
              setFormData({ ...formData, enableFallback: e.target.checked })
            }
          />
          Enable automatic fallback to other models
        </label>
      </div>

      <button type="submit" disabled={isGenerating || !formData.prompt}>
        {isGenerating ? 'Generating...' : 'Generate Video'}
      </button>

      {taskId && (
        <div>
          <p>Task ID: {taskId}</p>
          <p>Video is being generated... This may take 1-3 minutes.</p>
        </div>
      )}
    </form>
  )
}
```

## 🔄 Обработка асинхронной генерации

### Важно понимать

1. **Видео генерируется асинхронно** - процесс занимает 1-3 минуты
2. **Сразу возвращается Task ID** - используйте его для отслеживания
3. **Два способа получить результат**:
   - Webhook callback (рекомендуется)
   - Периодическая проверка статуса (polling)

### Вариант 1: Webhook Callback

```javascript
// На сервере клиента нужно создать endpoint для приема webhook
app.post('/api/video-webhook', (req, res) => {
  const { taskId, status, videoUrl, error } = req.body

  if (status === 'completed' && videoUrl) {
    // Сохраняем URL видео в базе данных
    saveVideoResult(taskId, videoUrl)

    // Уведомляем пользователя через WebSocket/SSE
    notifyUser(taskId, { status: 'completed', videoUrl })
  } else if (status === 'failed') {
    // Обрабатываем ошибку
    handleVideoError(taskId, error)
  }

  res.status(200).json({ received: true })
})
```

### Вариант 2: Polling (проверка статуса)

```javascript
// Функция для проверки статуса
async function checkVideoStatus(taskId) {
  const response = await fetch(`/api/video/status/${taskId}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  const result = await response.json()
  return result
}

// Polling с экспоненциальной задержкой
async function pollVideoStatus(taskId, maxAttempts = 60) {
  let attempts = 0
  let delay = 2000 // Начинаем с 2 секунд

  while (attempts < maxAttempts) {
    const status = await checkVideoStatus(taskId)

    if (status.status === 'completed') {
      return { success: true, videoUrl: status.videoUrl }
    } else if (status.status === 'failed') {
      return { success: false, error: status.error }
    }

    // Ждем перед следующей проверкой
    await new Promise(resolve => setTimeout(resolve, delay))

    // Увеличиваем задержку (max 10 секунд)
    delay = Math.min(delay * 1.5, 10000)
    attempts++
  }

  return { success: false, error: 'Timeout' }
}
```

## 📊 Расчет стоимости на клиенте

```javascript
// Утилита для расчета стоимости
const VIDEO_PRICING = {
  veo3_fast: { pricePerSecond: 0.05, name: 'Veo 3 Fast' },
  veo3: { pricePerSecond: 0.25, name: 'Veo 3 Quality' },
  'runway-aleph': { pricePerSecond: 0.3, name: 'Runway Aleph' },
}

function calculateVideoCost(model, duration) {
  const modelPricing = VIDEO_PRICING[model]
  if (!modelPricing) return 0

  const costUSD = duration * modelPricing.pricePerSecond
  const costStars = Math.floor((costUSD / 0.016) * 1.5) // С наценкой 50%

  return {
    usd: costUSD,
    stars: costStars,
    formatted: {
      usd: `$${costUSD.toFixed(3)}`,
      stars: `${costStars} ⭐`,
    },
  }
}

// Пример использования
const cost = calculateVideoCost('veo3', 10)
console.log(`Cost: ${cost.formatted.usd} or ${cost.formatted.stars}`)
```

## 🎨 UI/UX рекомендации

### Отображение прогресса

```javascript
// Компонент прогресса генерации
function VideoGenerationProgress({ taskId, estimatedTime = 120 }) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('processing')

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 100 / estimatedTime, 99))
    }, 1000)

    return () => clearInterval(interval)
  }, [estimatedTime])

  return (
    <div className="video-generation-progress">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p>Generating video... {Math.round(progress)}%</p>
      <p className="task-id">Task ID: {taskId}</p>
      <p className="estimated-time">
        Estimated time: {Math.ceil(((100 - progress) * estimatedTime) / 100)}{' '}
        seconds
      </p>
    </div>
  )
}
```

### Обработка ошибок

```javascript
// Централизованная обработка ошибок
function handleVideoGenerationError(error, context) {
  const errorMessages = {
    401: 'Authentication failed. Please login again.',
    402: 'Insufficient credits. Please top up your balance.',
    429: 'Too many requests. Please wait a moment.',
    500: 'Server error. Please try again later.',
  }

  const message =
    errorMessages[error.status] || error.message || 'Unknown error'

  // Показываем пользователю
  showErrorNotification(message)

  // Логируем для отладки
  console.error('Video generation error:', {
    error,
    context,
    timestamp: new Date().toISOString(),
  })

  // Отправляем в систему аналитики
  trackError('video_generation_failed', {
    error: message,
    model: context.model,
    duration: context.duration,
  })
}
```

## 🔒 Безопасность

### Валидация на клиенте

```javascript
// Валидация перед отправкой
function validateVideoRequest(params) {
  const errors = []

  // Проверка обязательных полей
  if (!params.model) errors.push('Model is required')
  if (!params.prompt) errors.push('Prompt is required')

  // Проверка длины промпта
  if (params.prompt && params.prompt.length > 1000) {
    errors.push('Prompt too long (max 1000 characters)')
  }

  // Проверка duration
  if (params.duration && (params.duration < 2 || params.duration > 10)) {
    errors.push('Duration must be between 2 and 10 seconds')
  }

  // Проверка URL изображений
  if (params.imageUrls) {
    for (const url of params.imageUrls) {
      try {
        new URL(url)
      } catch {
        errors.push(`Invalid image URL: ${url}`)
      }
    }
  }

  // Проверка callback URL
  if (params.callBackUrl) {
    try {
      const url = new URL(params.callBackUrl)
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push('Callback URL must use HTTP or HTTPS')
      }
    } catch {
      errors.push('Invalid callback URL')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

## 📱 Мобильная интеграция

### React Native пример

```javascript
// React Native компонент
import { useState } from 'react'
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native'

export function VideoGeneratorMobile() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const generateVideo = async () => {
    setLoading(true)

    try {
      const response = await fetch(
        'https://api.yourserver.com/api/video/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getAuthToken()}`,
          },
          body: JSON.stringify({
            model: 'veo3_fast',
            prompt: prompt,
            duration: 5,
            aspectRatio: '9:16', // Вертикальное для мобильных
            callBackUrl: 'https://api.yourserver.com/webhook/mobile',
          }),
        }
      )

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // Сохраняем task ID для отслеживания
        AsyncStorage.setItem('currentTaskId', data.data.taskId)

        // Запускаем push уведомление когда видео готово
        schedulePushNotification(data.data.taskId)
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate video')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        placeholder="Describe your video..."
        multiline
      />

      <Button
        title="Generate Video"
        onPress={generateVideo}
        disabled={loading || !prompt}
      />

      {loading && <ActivityIndicator />}

      {result && (
        <Text>
          Task ID: {result.data?.taskId}
          Status: {result.data?.status}
          Cost: ${result.cost?.usd}
        </Text>
      )}
    </View>
  )
}
```

## 🧪 Тестирование

### Пример тестового запроса

```bash
# Тест с cURL
curl -X POST https://your-api.com/api/video/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "veo3_fast",
    "prompt": "Test video generation",
    "duration": 3,
    "aspectRatio": "16:9",
    "watermark": "TestBrand",
    "seeds": 12345,
    "enableFallback": true,
    "callBackUrl": "https://webhook.site/your-unique-url"
  }'
```

### Unit тесты

```javascript
// Jest тесты
describe('Video Generation API', () => {
  test('should generate video with all parameters', async () => {
    const params = {
      model: 'veo3',
      prompt: 'Test prompt',
      duration: 5,
      imageUrls: ['https://example.com/image.jpg'],
      watermark: 'TestBrand',
      seeds: 12345,
      enableFallback: true,
    }

    const response = await generateVideo(params)

    expect(response.success).toBe(true)
    expect(response.data.taskId).toBeDefined()
    expect(response.cost.usd).toBeGreaterThan(0)
  })

  test('should validate required fields', () => {
    const invalid = validateVideoRequest({})
    expect(invalid.valid).toBe(false)
    expect(invalid.errors).toContain('Model is required')
    expect(invalid.errors).toContain('Prompt is required')
  })

  test('should calculate cost correctly', () => {
    const cost = calculateVideoCost('veo3', 10)
    expect(cost.usd).toBe(2.5) // 10 * 0.25
    expect(cost.stars).toBeGreaterThan(0)
  })
})
```

## 📋 Чеклист интеграции

- [ ] Обновить типы/интерфейсы для новых полей
- [ ] Добавить UI элементы для новых параметров
- [ ] Реализовать валидацию на клиенте
- [ ] Настроить webhook endpoint для приема результатов
- [ ] Добавить функцию расчета стоимости
- [ ] Реализовать отображение прогресса генерации
- [ ] Добавить обработку ошибок
- [ ] Протестировать все сценарии
- [ ] Обновить документацию пользователя
- [ ] Добавить аналитику использования новых функций

## 🆘 Поддержка

При возникновении вопросов:

1. Проверьте статус API: `GET /api/health`
2. Используйте тестовый endpoint: `POST /api/test`
3. Проверьте логи в консоли разработчика
4. Обратитесь в техподдержку с Task ID

## 📚 Дополнительные ресурсы

- [Серверная документация](/docs/KIE_AI_ENHANCED_API.md)
- [API Reference](https://docs.kie.ai/veo3-api)
- [Примеры кода](https://github.com/your-repo/examples)
- [Видео туториал](https://youtube.com/your-tutorial)

---

**Версия**: 1.0.0  
**Дата обновления**: ${new Date().toISOString().split('T')[0]}  
**Автор**: AI Server Team
