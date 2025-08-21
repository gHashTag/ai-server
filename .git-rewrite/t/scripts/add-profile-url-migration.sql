-- Миграция: Добавление поля profile_url в таблицу instagram_similar_users
-- Дата: 2025-06-26
-- Описание: Добавляет поле profile_url для прямого перехода к профилю пользователя Instagram

-- Добавляем новое поле profile_url
ALTER TABLE instagram_similar_users 
ADD COLUMN IF NOT EXISTS profile_url TEXT;

-- Обновляем существующие записи, генерируя URL на основе username
UPDATE instagram_similar_users 
SET profile_url = 'https://instagram.com/' || username 
WHERE profile_url IS NULL AND username IS NOT NULL;

-- Добавляем комментарий к полю
COMMENT ON COLUMN instagram_similar_users.profile_url IS 'URL профиля Instagram для прямого перехода';

-- Проверяем результат
SELECT COUNT(*) as total_records, 
       COUNT(profile_url) as records_with_url,
       COUNT(*) - COUNT(profile_url) as records_without_url
FROM instagram_similar_users; 