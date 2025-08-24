#!/bin/bash

echo "🔗 TESTING WEBHOOK FROM EXTERNAL"

# Test with proper JSON structure  
curl -X POST https://ai-server-production-production-8e2d.up.railway.app/api/kie-ai/callback \
  -H "Content-Type: application/json" \
  -H "User-Agent: Kie.ai-Webhook/1.0" \
  -d '{
    "taskId": "test_external_callback_'$(date +%s)'",
    "status": "completed",
    "videoUrl": "https://test-video-url.com/test.mp4", 
    "duration": 8,
    "cost": 0.40,
    "telegram_id": "144022504",
    "bot_name": "neuro_blogger_bot"
  }' \
  --connect-timeout 10 \
  --max-time 30 \
  -w "\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n"