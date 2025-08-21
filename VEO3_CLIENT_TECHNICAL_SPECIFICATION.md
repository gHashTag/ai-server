# 📋 VEO3 Video Generation - Техническое задание для клиентской разработки

## 🎯 **Общая постановка задачи**

**Цель:** Интегрировать VEO3 API генерации видео в клиентское приложение с поддержкой всех популярных форматов (9:16, 16:9, 1:1).

**Приоритет:** 🚨 **КРИТИЧЕСКИЙ** - вертикальный формат 9:16 должен работать обязательно (TikTok, Instagram Stories)

**Статус API:** ✅ **ГОТОВ** - протестирован и работает в production

---

## 🏗️ **Архитектурные требования**

### **Backend Integration (уже реализовано):**

#### ✅ **Inngest функция:** `generateVeo3Video`
- **Путь:** `src/inngest-functions/generateVeo3Video.ts`
- **Событие:** `veo3/video.generate` 
- **Статус:** Готова к использованию

#### ✅ **API Endpoints:**
```
POST /api/inngest - отправка события в Inngest
POST /generate/veo3-video - прямой вызов (fallback)
POST /generate/text-to-video - совместимость с legacy
```

#### ✅ **Сервисы:**
- **KieAiService** - основной провайдер (экономия 87%)
- **VertexVeoService** - fallback провайдер
- **processVideoGeneration** - обработчик запросов

---

## 📱 **Frontend Requirements**

### **🎯 Основные функции для реализации:**

#### **1. Video Generator Component**
```typescript
interface VideoGeneratorProps {
  onVideoGenerated: (result: VideoResult) => void;
  onError: (error: Error) => void;
  defaultFormat?: '9:16' | '16:9' | '1:1';
  userId: string;
  botName?: string;
}

interface VideoGenerationRequest {
  prompt: string;                    // ОБЯЗАТЕЛЬНО
  model: 'veo3_fast' | 'veo3';      // ОБЯЗАТЕЛЬНО  
  aspectRatio: '9:16' | '16:9' | '1:1'; // ОБЯЗАТЕЛЬНО
  duration: number;                  // 2-10 секунд
  telegram_id: string;              // ОБЯЗАТЕЛЬНО
  username: string;                 // ОБЯЗАТЕЛЬНО
  is_ru: boolean;                   // язык интерфейса
  bot_name: string;                 // имя бота
  imageUrl?: string;               // для image-to-video
  style?: string;                  // стиль видео
  cameraMovement?: string;         // движение камеры
}
```

#### **2. Format Selector Component**
```typescript
interface FormatSelectorProps {
  value: '9:16' | '16:9' | '1:1';
  onChange: (format: string) => void;
  disabled?: boolean;
}

// Обязательные опции:
const FORMATS = [
  { 
    id: '9:16', 
    name: '📱 Vertical (TikTok)', 
    priority: 'CRITICAL',
    useCases: ['TikTok', 'Instagram Stories', 'YouTube Shorts']
  },
  { 
    id: '16:9', 
    name: '📺 Horizontal (YouTube)', 
    priority: 'HIGH',
    useCases: ['YouTube', 'TV', 'Desktop'] 
  },
  { 
    id: '1:1', 
    name: '🟩 Square (Instagram)', 
    priority: 'MEDIUM',
    useCases: ['Instagram Feed', 'Facebook', 'Twitter']
  }
];
```

#### **3. Model Selector Component**
```typescript
interface ModelSelectorProps {
  value: 'veo3_fast' | 'veo3';
  onChange: (model: string) => void;
  showCostEstimation?: boolean;
}

const MODELS = [
  {
    id: 'veo3_fast',
    name: '⚡ VEO3 Fast',
    description: 'Быстрая генерация, экономия 87%',
    costPerSecond: 0.05,
    recommended: true
  },
  {
    id: 'veo3',
    name: '💎 VEO3 Quality', 
    description: 'Премиум качество, экономия 37%',
    costPerSecond: 0.25,
    recommended: false
  }
];
```

### **🎨 UI/UX Requirements:**

#### **Основной интерфейс:**
1. **Prompt Input** - текстовое поле для описания видео
2. **Format Selector** - выбор соотношения сторон (9:16 по умолчанию)
3. **Model Selector** - выбор модели (veo3_fast по умолчанию)
4. **Duration Slider** - длительность от 2 до 10 секунд
5. **Generate Button** - кнопка запуска генерации
6. **Progress Indicator** - индикатор процесса
7. **Result Display** - отображение готового видео

#### **Дополнительные элементы:**
- **Cost Calculator** - расчет стоимости генерации
- **Format Preview** - превью соотношения сторон
- **Error Handling** - обработка и отображение ошибок
- **History** - история сгенерированных видео

### **📡 API Integration:**

#### **Основной метод генерации:**
```javascript
async function generateVeo3Video(params) {
  const response = await fetch('/api/inngest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'veo3/video.generate',
      data: {
        prompt: params.prompt,
        model: params.model,
        aspectRatio: params.aspectRatio,
        duration: params.duration,
        telegram_id: params.userId,
        username: params.username,
        is_ru: params.isRussian,
        bot_name: params.botName || 'veo3_client'
      }
    })
  });
  
  return await response.json();
}
```

#### **Получение результатов:**
Реализовать **один из способов**:

1. **WebSocket подключение** (рекомендуется)
2. **Webhook endpoint** для получения готовых видео
3. **Polling** - периодическая проверка статуса

---

## 🔧 **Технические детали**

### **⚡ Performance Requirements:**

- **Время ответа API:** < 500ms для начала генерации  
- **Время генерации:** 30-120 секунд в зависимости от модели
- **Поддержка concurrent requests:** до 10 одновременных запросов
- **Fallback время:** < 5 секунд переключение на Vertex AI

### **💾 Data Handling:**

```typescript
interface VideoResult {
  success: boolean;
  videoUrl?: string;
  provider: 'kie.ai' | 'vertex-ai';
  model: string;
  aspectRatio: string;
  duration: number;
  cost: number;
  processingTime?: number;
  error?: string;
}
```

### **🛡️ Error Handling:**

#### **Обязательные обработчики ошибок:**
```typescript
enum VEO3ErrorType {
  API_KEY_INVALID = 'API_KEY_INVALID',
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS', 
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  GENERATION_FAILED = 'GENERATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT'
}

interface VEO3Error {
  type: VEO3ErrorType;
  message: string;
  retryable: boolean;
  fallbackAvailable: boolean;
}
```

#### **Стратегии обработки:**
- **API недоступен** → автоматический fallback на Vertex AI
- **Превышен лимит** → показ сообщения + предложение повторить через минуту  
- **Ошибка генерации** → предложение изменить промпт
- **Сетевая ошибка** → кнопка повтора запроса

---

## 🎨 **Design Requirements**

### **🎯 Главные принципы:**
1. **Mobile-first** - приоритет мобильного интерфейса
2. **9:16 prominence** - вертикальный формат на первом месте
3. **Visual feedback** - четкая индикация процесса генерации
4. **Error resilience** - изящная обработка всех ошибок

### **📱 Responsive Design:**

#### **Desktop (1024px+):**
```
[Prompt Input                    ] [Format Selector]
[Duration Slider] [Model Select  ] [Cost Display  ]
[           Generate Button                       ]
[                Progress Bar                     ]
[          Video Preview Area                     ]
```

#### **Mobile (< 768px):**
```
[     Prompt Input          ]
[ Format ]  [ Model ]  [ Duration ]
[    Cost Estimate         ]
[    Generate Button       ]
[     Progress Bar         ]
[   Video Preview Area     ]
```

### **🎨 Visual Specifications:**

#### **Color Scheme:**
- **Primary:** #4CAF50 (Generate button, success states)
- **Warning:** #FF9800 (Cost indicators, processing states)  
- **Error:** #F44336 (Error messages, failed states)
- **Info:** #2196F3 (Format indicators, help text)

#### **Typography:**
- **Headers:** 18-24px, Semi-bold
- **Body:** 14-16px, Regular
- **Buttons:** 16px, Medium
- **Captions:** 12-14px, Regular

#### **Format Indicators:**
```css
.format-9-16 { border-left: 4px solid #E91E63; } /* Mobile Pink */
.format-16-9 { border-left: 4px solid #2196F3; } /* Desktop Blue */
.format-1-1  { border-left: 4px solid #4CAF50; } /* Square Green */
```

---

## 🧪 **Testing Requirements**

### **⚡ Unit Tests:**

```typescript
describe('VEO3VideoGenerator', () => {
  test('should generate 9:16 video successfully', async () => {
    const params = {
      prompt: 'Test vertical video',
      aspectRatio: '9:16',
      model: 'veo3_fast',
      duration: 3
    };
    
    const result = await generateVeo3Video(params);
    expect(result.success).toBe(true);
    expect(result.aspectRatio).toBe('9:16');
  });
  
  test('should handle API errors gracefully', async () => {
    // Mock API error
    mockApiError('RATE_LIMIT_EXCEEDED');
    
    const result = await generateVeo3Video(validParams);
    expect(result.error).toBeDefined();
    expect(result.retryable).toBe(true);
  });
  
  test('should fallback to Vertex AI when Kie.ai fails', async () => {
    mockKieAiFailure();
    
    const result = await generateVeo3Video(validParams);
    expect(result.provider).toBe('vertex-ai');
    expect(result.success).toBe(true);
  });
});
```

### **🔄 Integration Tests:**

```typescript
describe('VEO3Integration', () => {
  test('should test all supported formats', async () => {
    const formats = ['9:16', '16:9', '1:1'];
    
    for (const format of formats) {
      const result = await testVideoGeneration({ 
        aspectRatio: format 
      });
      
      expect(result.success).toBe(true);
      expect(result.aspectRatio).toBe(format);
    }
  });
  
  test('should handle concurrent requests', async () => {
    const requests = Array(5).fill(null).map(() => 
      generateVeo3Video(testParams)
    );
    
    const results = await Promise.all(requests);
    results.forEach(result => {
      expect(result.success).toBe(true);
    });
  });
});
```

### **🎯 E2E Tests:**

- **Критический путь:** генерация вертикального видео 9:16
- **Полный цикл:** от ввода промпта до получения готового видео
- **Обработка ошибок:** проверка всех сценариев ошибок
- **Производительность:** время загрузки и отклика интерфейса

---

## 📊 **Metrics & Analytics**

### **📈 Ключевые метрики для отслеживания:**

#### **Функциональные метрики:**
- **Success Rate по форматам:** % успешных генераций для 9:16, 16:9, 1:1
- **Provider Usage:** % использования Kie.ai vs Vertex AI
- **Generation Time:** среднее время генерации по моделям
- **Error Rate:** % ошибок по типам

#### **Пользовательские метрики:**
- **Format Preferences:** какие форматы выбирают чаще
- **Model Preferences:** veo3_fast vs veo3 usage
- **Duration Preferences:** средняя длительность запросов
- **Retry Rate:** % повторных попыток после ошибок

#### **Бизнес метрики:**
- **Cost per Generation:** средняя стоимость генерации
- **Savings vs Vertex AI:** фактическая экономия через Kie.ai
- **Daily Active Generations:** количество генераций в день
- **User Retention:** % пользователей возвращающихся к генерации

### **📊 Logging Requirements:**

```typescript
// Обязательные события для аналитики
interface VEO3AnalyticsEvent {
  event: 'veo3_generation_started' | 'veo3_generation_completed' | 'veo3_generation_failed';
  userId: string;
  sessionId: string;
  timestamp: Date;
  params: {
    format: string;
    model: string;
    duration: number;
    provider: string;
    cost: number;
    processingTime?: number;
    errorType?: string;
  };
}
```

---

## 🚀 **Deployment & Rollout**

### **🎯 Фазированный релиз:**

#### **Phase 1: MVP (Critical Path)**
- ✅ Поддержка формата 9:16 (вертикальное видео)
- ✅ Базовый UI с промптом и кнопкой генерации  
- ✅ Обработка основных ошибок
- ✅ Integration с существующим Inngest API

#### **Phase 2: Enhancement**  
- ✅ Поддержка всех форматов (16:9, 1:1)
- ✅ Выбор моделей и настройка параметров
- ✅ Cost calculator и время генерации
- ✅ History и сохранение результатов

#### **Phase 3: Advanced Features**
- 🔄 WebSocket real-time updates
- 🔄 Batch generation (несколько видео сразу)
- 🔄 Advanced error recovery
- 🔄 Performance optimizations

### **✅ Definition of Done:**

#### **Функциональные критерии:**
- [ ] **9:16 формат работает** в 95%+ случаев
- [ ] **Fallback на Vertex AI** срабатывает автоматически
- [ ] **UI отзывчивый** на мобильных устройствах
- [ ] **Ошибки обрабатываются** изящно с четкими сообщениями

#### **Технические критерии:**  
- [ ] **Unit tests coverage** > 80%
- [ ] **E2E tests** покрывают критический путь
- [ ] **API response time** < 500ms 
- [ ] **Error handling** для всех типов ошибок

#### **UX критерии:**
- [ ] **Mobile-first design** работает на всех устройствах
- [ ] **Loading states** показывают прогресс генерации
- [ ] **Error messages** помогают пользователю исправить проблему
- [ ] **Success flow** четко показывает результат

---

## 📞 **Support & Documentation**

### **📚 Документация:**
- **API Reference:** `VEO3_CLIENT_FRONTEND_GUIDE.md`
- **Testing Guide:** `test-veo3-*.js` примеры
- **Error Handling:** коды ошибок и их обработка

### **🛠️ Development Tools:**
- **API Testing:** скрипт `test-veo3-all-formats.js`
- **Health Check:** `GET /health` endpoint
- **Debug Logging:** детальные логи в console/file

### **🚨 Support Priority:**
1. **🔴 CRITICAL:** 9:16 формат не работает  
2. **🟡 HIGH:** Другие форматы не работают
3. **🟢 MEDIUM:** UI/UX улучшения
4. **🔵 LOW:** Дополнительные фичи

---

## 📋 **Acceptance Criteria**

### **🎯 Минимально жизнеспособный продукт:**

#### ✅ **ДОЛЖНО работать:**
- [x] Генерация вертикального видео 9:16 через Kie.ai API
- [x] Автоматический fallback на Vertex AI при недоступности Kie.ai  
- [x] Базовый UI с полем промпта и кнопкой генерации
- [x] Отображение процесса генерации и результата
- [x] Обработка основных ошибок с понятными сообщениями

#### 🎯 **ЖЕЛАТЕЛЬНО иметь:**
- [ ] Поддержка всех форматов (16:9, 1:1) 
- [ ] Выбор моделей (veo3_fast, veo3)
- [ ] Расчет и отображение стоимости
- [ ] История сгенерированных видео
- [ ] Расширенные настройки (style, cameraMovement)

#### 🚀 **ХОРОШО бы добавить:**
- [ ] Real-time обновления через WebSocket
- [ ] Batch генерация нескольких видео
- [ ] Интеграция с социальными сетями
- [ ] Продвинутая аналитика и метрики

---

**📅 Дедлайн:** Определяется командой  
**👨‍💻 Ответственные:** Frontend разработчики  
**🧪 Тестирование:** QA команда  
**📊 Аналитика:** Product/Data команда  

---

*Документ создан: 21 августа 2025*  
*Версия API: v1.0 (Production Ready)*  
*Статус: ✅ Готов к разработке*