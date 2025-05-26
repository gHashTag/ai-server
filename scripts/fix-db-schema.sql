-- Скрипт для исправления схемы базы данных
-- Добавляет foreign key связь между model_trainings и users

-- 1. Сначала проверим типы данных в обеих таблицах
SELECT 
  'model_trainings' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'model_trainings' 
  AND column_name = 'telegram_id'
  AND table_schema = 'public'

UNION ALL

SELECT 
  'users' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'telegram_id'
  AND table_schema = 'public';

-- 2. Проверим существующие данные для понимания связи
SELECT 
  mt.telegram_id as mt_telegram_id,
  u.telegram_id as u_telegram_id,
  mt.model_name,
  u.bot_name
FROM model_trainings mt
LEFT JOIN users u ON mt.telegram_id::text = u.telegram_id::text
LIMIT 5;

-- 3. Если типы данных не совпадают, нужно их привести к одному типу
-- В model_trainings telegram_id имеет тип bigint
-- В users telegram_id имеет тип uuid (но содержит числовые значения)

-- Вариант 1: Изменить тип telegram_id в users с uuid на bigint
-- (ОСТОРОЖНО! Это может сломать существующие данные)

-- Вариант 2: Создать функцию для JOIN через приведение типов
-- Это безопаснее и не требует изменения схемы

-- Создаем функцию для безопасного приведения типов
CREATE OR REPLACE FUNCTION safe_bigint_to_text(input_bigint bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT input_bigint::text;
$$;

-- Создаем функцию для безопасного приведения uuid к тексту
CREATE OR REPLACE FUNCTION safe_uuid_to_text(input_uuid uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT input_uuid::text;
$$;

-- Проверяем, можем ли мы создать связь через текстовое представление
SELECT 
  mt.id,
  mt.telegram_id,
  mt.model_name,
  u.bot_name,
  u.language_code
FROM model_trainings mt
LEFT JOIN users u ON mt.telegram_id::text = u.telegram_id::text
WHERE mt.replicate_training_id = 'czx5g9e7bxrme0cq1d48v6zcmg';

-- 4. Альтернативное решение: создать view для упрощения JOIN запросов
CREATE OR REPLACE VIEW model_trainings_with_users AS
SELECT 
  mt.*,
  u.bot_name as user_bot_name,
  u.language_code as user_language_code,
  u.gender as user_gender
FROM model_trainings mt
LEFT JOIN users u ON mt.telegram_id::text = u.telegram_id::text;

-- Проверяем работу view
SELECT * FROM model_trainings_with_users 
WHERE replicate_training_id = 'czx5g9e7bxrme0cq1d48v6zcmg';

-- 5. Комментарии для понимания проблемы:
-- Основная проблема: несовместимые типы данных между таблицами
-- model_trainings.telegram_id: bigint
-- users.telegram_id: uuid (но содержит числовые значения как строки)
-- 
-- Решения:
-- 1. Использовать приведение типов в запросах: mt.telegram_id::text = u.telegram_id::text
-- 2. Создать view для упрощения запросов
-- 3. Изменить тип данных в одной из таблиц (рискованно) 