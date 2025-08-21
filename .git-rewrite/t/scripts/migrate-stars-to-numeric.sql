-- Миграция: Изменение типа поля stars с integer на numeric(10,2)
-- Цель: Поддержка дробных значений звезд (например, 7.5⭐)
-- Дата: 2025-01-15

-- Проверяем текущий тип поля
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'payments_v2' AND column_name = 'stars';

-- Изменяем тип поля stars с integer на numeric(10,2)
-- numeric(10,2) позволяет хранить до 10 цифр с 2 знаками после запятой
-- Примеры: 7.5, 13.13, 999999.99
ALTER TABLE payments_v2 
ALTER COLUMN stars TYPE numeric(10,2);

-- Проверяем результат миграции
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'payments_v2' AND column_name = 'stars';

-- Тестируем вставку дробного значения
INSERT INTO payments_v2 (
  telegram_id,
  inv_id,
  currency,
  amount,
  status,
  stars,
  type,
  description,
  payment_method,
  bot_name,
  language,
  payment_date
) VALUES (
  '999999999',
  '999999999999999999',
  'STARS',
  7.5,
  'COMPLETED',
  7.5, -- Дробное значение
  'MONEY_OUTCOME',
  'Тест дробных звезд',
  'Internal',
  'test_bot',
  'ru',
  NOW()
);

-- Проверяем, что дробное значение сохранилось корректно
SELECT stars, description FROM payments_v2 
WHERE telegram_id = '999999999' AND description = 'Тест дробных звезд';

-- Удаляем тестовую запись
DELETE FROM payments_v2 
WHERE telegram_id = '999999999' AND description = 'Тест дробных звезд';

-- Проверяем существующие записи с дробными значениями
SELECT telegram_id, stars, description, created_at 
FROM payments_v2 
WHERE stars != FLOOR(stars) 
ORDER BY created_at DESC 
LIMIT 10; 