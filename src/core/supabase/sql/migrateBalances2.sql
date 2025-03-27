-- Прямой SQL-запрос для миграции балансов (без использования функций)
-- Этот скрипт создает записи income в таблице payments для всех пользователей
-- с положительным балансом, который отличается от текущего рассчитанного баланса

WITH calculated_balance AS (
  SELECT 
    p.telegram_id,
    COALESCE(SUM(CASE WHEN p.type = 'income' AND p.status = 'COMPLETED' THEN p.stars ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN p.type = 'outcome' AND p.status = 'COMPLETED' THEN p.stars ELSE 0 END), 0) AS calc_balance
  FROM payments p
  GROUP BY p.telegram_id
),
users_to_migrate AS (
  SELECT 
    u.telegram_id,
    u.username,
    u.balance AS old_balance,
    COALESCE(c.calc_balance, 0) AS calculated_balance,
    u.balance - COALESCE(c.calc_balance, 0) AS difference,
    ROUND(u.balance - COALESCE(c.calc_balance, 0)) AS stars_to_add
  FROM users u
  LEFT JOIN calculated_balance c ON u.telegram_id = c.telegram_id
  WHERE u.balance > 0 AND (u.balance - COALESCE(c.calc_balance, 0)) > 0
)

-- Вставляем записи для миграции
INSERT INTO payments (
  telegram_id,
  stars,
  amount,
  type,
  status,
  description,
  payment_method,
  bot_name,
  language,
  currency,
  payment_date,
  metadata
)
SELECT 
  telegram_id,
  stars_to_add,
  0, -- Не применимо для миграции
  'income',
  'COMPLETED',
  'Миграция баланса пользователя из таблицы users (' || old_balance || ')',
  'system_migration',
  'leela',
  'ru',
  'RUB',
  NOW(),
  jsonb_build_object(
    'migration', true,
    'old_balance', old_balance,
    'calculated_balance', calculated_balance,
    'difference', difference
  )
FROM users_to_migrate
WHERE stars_to_add > 0
RETURNING 
  payment_id,
  telegram_id,
  stars,
  payment_method,
  description; 