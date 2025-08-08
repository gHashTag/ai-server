-- Скрипт для добавления расходов фермы ботов за май 2024
-- Выполните этот SQL в Supabase SQL Editor или через MCP

-- Проверим структуру таблицы
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'payments_v2' 
ORDER BY ordinal_position;

-- Проверим существующие записи системы
SELECT COUNT(*) as existing_farm_records 
FROM payments_v2 
WHERE telegram_id = 'SYSTEM_BOT_FARM';

-- Добавляем расходы за май 2024
INSERT INTO payments_v2 (
  inv_id,
  telegram_id,
  bot_name,
  amount,
  stars,
  currency,
  status,
  type,
  payment_method,
  description,
  metadata,
  subscription_type,
  service_type,
  payment_date,
  created_at,
  updated_at
) VALUES 
-- CLOUDCONVERT
(
  'farm_expense_' || extract(epoch from now()) || '_cloudconvert',
  'SYSTEM_BOT_FARM',
  'bot_farm_manager',
  309.13,
  0,
  'THB',
  'COMPLETED',
  'MONEY_OUTCOME',
  'System',
  'CLOUDCONVERT: Конвертация файлов',
  '{"expense_category": "INFRASTRUCTURE", "expense_type": "CLOUDCONVERT", "purpose": "Используется для преобразования файлов в нужные форматы для работы с данными.", "original_name": "CLOUDCONVERT", "url": "CloudConvert", "is_bot_farm_expense": true}',
  NULL,
  NULL,
  '2024-05-01T00:00:00.000Z',
  NOW(),
  NOW()
),
-- ELEST.IO
(
  'farm_expense_' || extract(epoch from now()) || '_elest1',
  'SYSTEM_BOT_FARM',
  'bot_farm_manager',
  1030.43,
  0,
  'THB',
  'COMPLETED',
  'MONEY_OUTCOME',
  'System',
  'ELEST.IO: Хостинг и инструменты',
  '{"expense_category": "HOSTING", "expense_type": "HOSTING", "purpose": "Хостинг и управление проектами для разработки.", "original_name": "ELEST.IO", "url": "Elest", "is_bot_farm_expense": true}',
  NULL,
  NULL,
  '2024-05-01T00:00:00.000Z',
  NOW(),
  NOW()
),
-- OPENAI (самый крупный расход)
(
  'farm_expense_' || extract(epoch from now()) || '_openai1',
  'SYSTEM_BOT_FARM',
  'bot_farm_manager',
  17282.83,
  0,
  'THB',
  'COMPLETED',
  'MONEY_OUTCOME',
  'System',
  'OPENAI: AI API / ChatGPT',
  '{"expense_category": "AI_SERVICES", "expense_type": "AI_API", "purpose": "Генерация текстов и взаимодействие с пользователями.", "original_name": "OPENAI", "url": "OpenAI", "is_bot_farm_expense": true}',
  NULL,
  NULL,
  '2024-05-07T00:00:00.000Z',
  NOW(),
  NOW()
),
-- ELEVENLABS
(
  'farm_expense_' || extract(epoch from now()) || '_elevenlabs1',
  'SYSTEM_BOT_FARM',
  'bot_farm_manager',
  741.22,
  0,
  'THB',
  'COMPLETED',
  'MONEY_OUTCOME',
  'System',
  'ELEVENLABS: Генерация голоса',
  '{"expense_category": "AI_SERVICES", "expense_type": "VOICE_GENERATION", "purpose": "Создание реалистичных голосов для озвучивания контента.", "original_name": "ELEVENLABS", "url": "ElevenLabs", "is_bot_farm_expense": true}',
  NULL,
  NULL,
  '2024-05-08T00:00:00.000Z',
  NOW(),
  NOW()
),
-- REPLICATE
(
  'farm_expense_' || extract(epoch from now()) || '_replicate',
  'SYSTEM_BOT_FARM',
  'bot_farm_manager',
  6088.40,
  0,
  'THB',
  'COMPLETED',
  'MONEY_OUTCOME',
  'System',
  'REPLICATE: Хостинг моделей',
  '{"expense_category": "AI_SERVICES", "expense_type": "IMAGE_GENERATION", "purpose": "Хостинг моделей для генерации изображений и других AI задач.", "original_name": "REPLICATE", "url": "Replicate", "is_bot_farm_expense": true}',
  NULL,
  NULL,
  '2024-05-03T00:00:00.000Z',
  NOW(),
  NOW()
);

-- Проверяем результат
SELECT 
  COUNT(*) as total_records,
  SUM(amount) as total_amount,
  MIN(payment_date) as earliest_date,
  MAX(payment_date) as latest_date
FROM payments_v2 
WHERE telegram_id = 'SYSTEM_BOT_FARM';