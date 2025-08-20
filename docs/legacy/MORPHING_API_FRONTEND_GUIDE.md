# 🧬 Morphing API - Frontend Integration Guide

## ✅ **STATUS: FULLY WORKING** 
- API Endpoint: **ACTIVE** ✅
- Error 401 Unauthorized: **FIXED** ✅  
- Inngest Processing: **OPERATIONAL** ✅
- Telegram Notifications: **WORKING** ✅

---

## 🎯 **API Endpoint**

```
POST https://d8dc81a4a0aa.ngrok.app/generate/morph-images
```

---

## 🤖 **ВАЖНО: Выбор рабочего бота**

После диагностики токенов выявлено:

| Bot Name | Status | Token Status | Recommendation |
|----------|---------|--------------|----------------|
| `ai_koshey_bot` | ❌ | Token Invalid (401) | **НЕ ИСПОЛЬЗОВАТЬ** |
| `clip_maker_neuro_bot` | ✅ | Working | **РЕКОМЕНДУЕТСЯ** |

**⚠️ Для фронтенда используйте: `bot_name: "clip_maker_neuro_bot"`**

---

## 📋 **Required Parameters**

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `type` | string | ✅ | Must be "morphing" | `"morphing"` |
| `telegram_id` | string | ✅ | User's Telegram ID | `"144022504"` |
| `username` | string | ✅ | User identifier | `"frontend_user"` |
| `image_count` | string | ✅ | Number of images (2-10) | `"3"` |
| `morphing_type` | string | ✅ | Type of morphing | `"seamless"` or `"loop"` |
| `model` | string | ✅ | AI model to use | `"kling-v1.6-pro"` |
| `is_ru` | string | ✅ | Russian language flag | `"true"` or `"false"` |
| `bot_name` | string | ✅ | **USE: "clip_maker_neuro_bot"** | `"clip_maker_neuro_bot"` |
| `images_zip` | File | ✅ | ZIP archive with images | Binary file |

---

## 🔥 **Working JavaScript Example**

```javascript
async function createMorphingVideo(imageFiles, options = {}) {
  // Create ZIP archive from images
  const zip = new JSZip();
  
  imageFiles.forEach((file, index) => {
    const extension = file.name.split('.').pop();
    zip.file(`image_${index + 1}.${extension}`, file);
  });
  
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Prepare form data
  const formData = new FormData();
  formData.append('type', 'morphing');
  formData.append('telegram_id', options.telegram_id || '144022504');
  formData.append('username', options.username || 'frontend_user');
  formData.append('image_count', imageFiles.length.toString());
  formData.append('morphing_type', options.morphing_type || 'seamless');
  formData.append('model', 'kling-v1.6-pro');
  formData.append('is_ru', options.is_ru ? 'true' : 'false');
  formData.append('bot_name', 'clip_maker_neuro_bot'); // ✅ ИСПОЛЬЗУЕМ РАБОЧИЙ БОТ
  formData.append('images_zip', zipBlob, 'morphing_images.zip');
  
  try {
    const response = await fetch('https://d8dc81a4a0aa.ngrok.app/generate/morph-images', {
      method: 'POST',
      headers: {
        'x-secret-key': 'your-secret-key' // Optional, for additional security
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Morphing started:', result);
    
    return {
      success: true,
      job_id: result.job_id,
      message: result.message,
      estimated_time: result.estimated_time
    };
    
  } catch (error) {
    console.error('❌ Morphing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Usage example
const handleMorphingSubmit = async (imageFiles) => {
  if (imageFiles.length < 2 || imageFiles.length > 10) {
    alert('Please select 2-10 images');
    return;
  }
  
  const result = await createMorphingVideo(imageFiles, {
    telegram_id: '144022504',
    username: 'test_user',
    morphing_type: 'seamless',
    is_ru: true,
    bot_name: 'clip_maker_neuro_bot' // ✅ ОБЯЗАТЕЛЬНО ИСПОЛЬЗУЕМ ЭТОТ БОТ
  });
  
  if (result.success) {
    alert(`✅ Morphing started! Job ID: ${result.job_id}`);
    // Show processing status to user
    showProcessingStatus(result.job_id, result.estimated_time);
  } else {
    alert(`❌ Error: ${result.error}`);
  }
};
```

---

## 🎬 **Expected Response**

### ✅ Success Response (200 OK)
```json
{
  "message": "Морфинг отправлен на обработку",
  "job_id": "morph_144022504_1753689096544",
  "status": "processing", 
  "estimated_time": "5-10 минут"
}
```

### ❌ Error Responses
```json
// Missing parameters
{
  "message": "User validation failed: Missing required parameters: username",
  "status": "error"
}

// Invalid file format
{
  "message": "type must be \"morphing\"",
  "status": "error"
}
```

---

## 🔄 **Processing Flow**

1. **Upload** → ZIP archive created from images
2. **API Call** → Request sent to morphing endpoint  
3. **Validation** → Parameters and files validated
4. **Queue** → Job added to Inngest processing queue
5. **AI Processing** → Kling API creates morphing video (5-10 min)
6. **Delivery** → Video sent via **clip_maker_neuro_bot** Telegram bot
7. **Notification** → User receives video in Telegram

---

## 🎨 **Morphing Algorithm (AI-Based)**

Our system uses **modern AI-powered morphing** through Kling API:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   ZIP Archive   │───▶│   Extract Images │───▶│   Validate &    │
│ (User Upload)   │    │   (Node.js)      │    │   Sequence      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Telegram Bot    │◀───│   Kling API      │◀───│   Send to AI    │
│  (Delivery)     │    │  (Morphing)      │    │   (JSON + Files)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**AI Advantages:**
- ✅ Works with any images (no keypoints needed)
- ✅ Understands semantics (faces, objects, backgrounds)  
- ✅ High-quality transitions with automatic lighting correction
- ✅ Preserves details and textures
- ✅ Supports different compositions and layouts

---

## 🛠️ **Testing & Debugging**

### Manual Testing
```bash
# Test with curl (WORKING BOT)
curl -X POST https://d8dc81a4a0aa.ngrok.app/generate/morph-images \
  -F "type=morphing" \
  -F "telegram_id=144022504" \
  -F "username=test_user" \
  -F "image_count=3" \
  -F "morphing_type=seamless" \
  -F "model=kling-v1.6-pro" \
  -F "is_ru=true" \
  -F "bot_name=clip_maker_neuro_bot" \
  -F "images_zip=@your_test_images.zip"
```

### Token Diagnostics
```bash
# Check bot tokens validity
node debug-bot-tokens.js
```

### Common Issues
- **401 Unauthorized:** ✅ FIXED - Use `clip_maker_neuro_bot` instead of `ai_koshey_bot`
- **404 Not Found:** Check ngrok URL is active  
- **File size limits:** Keep ZIP under 10MB
- **Image formats:** Use JPG, PNG, WebP
- **Image count:** 2-10 images supported

---

## 📊 **Performance Specs**

- **Processing Time:** 5-10 minutes
- **Max Images:** 10 per request
- **Max File Size:** ~10MB ZIP archive  
- **Output Format:** MP4 video
- **Resolution:** Original image resolution maintained
- **Frame Rate:** 24-30 FPS
- **Duration:** 5-10 seconds (seamless) or custom loop

---

## 🎯 **Implementation Checklist**

- [ ] Image selection UI (2-10 images)
- [ ] ZIP creation from selected images  
- [ ] Form data preparation with all required parameters
- [ ] **Set bot_name to "clip_maker_neuro_bot"** ⚠️
- [ ] API call with proper error handling
- [ ] Processing status indicator
- [ ] Success/error feedback to user
- [ ] Integration with Telegram bot for delivery

---

## 📞 **Support**

### Bot Token Issues:
- ❌ `ai_koshey_bot` - Token invalid (401: Unauthorized)
- ✅ `clip_maker_neuro_bot` - Working correctly

### Troubleshooting:
1. Always use `bot_name: "clip_maker_neuro_bot"`
2. Check the browser console for errors
3. Verify all required parameters are included
4. Test with the provided curl command first
5. Contact backend team with job_id for investigation

**Status:** All systems operational ✅ Last tested: 2025-01-28  
**Working Bot:** clip_maker_neuro_bot ✅ 