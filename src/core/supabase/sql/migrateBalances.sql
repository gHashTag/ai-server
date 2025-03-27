-- Удаляем существующие функции перед пересозданием
DROP FUNCTION IF EXISTS run_balance_migration();
DROP FUNCTION IF EXISTS migrate_user_balances();

-- Функция для миграции балансов пользователей из таблицы users в таблицу payments
CREATE OR REPLACE FUNCTION migrate_user_balances()
RETURNS TABLE (
  user_telegram_id BIGINT,
  user_username TEXT,
  user_old_balance REAL,
  user_calculated_balance INTEGER,
  user_difference REAL,
  user_stars_added INTEGER,
  migration_status TEXT
) AS $$
DECLARE
  user_record RECORD;
  inserted_record RECORD;
  migration_date TIMESTAMP;
  stars_to_add INTEGER;
  insert_error TEXT;
BEGIN
  -- Текущая дата для всех записей миграции
  migration_date := NOW();
  
  -- Получаем всех пользователей с положительным балансом
  FOR user_record IN 
    WITH calculated_balance AS (
      SELECT 
        p.telegram_id,
        COALESCE(SUM(CASE WHEN p.type = 'income' AND p.status = 'COMPLETED' THEN p.stars ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN p.type = 'outcome' AND p.status = 'COMPLETED' THEN p.stars ELSE 0 END), 0) AS calc_balance
      FROM payments p
      GROUP BY p.telegram_id
    )
    SELECT 
      u.telegram_id,
      u.username,
      u.balance AS old_balance,
      COALESCE(c.calc_balance, 0) AS calculated_balance,
      u.balance - COALESCE(c.calc_balance, 0) AS difference
    FROM users u
    LEFT JOIN calculated_balance c ON u.telegram_id = c.telegram_id
    WHERE u.balance > 0 AND (u.balance - COALESCE(c.calc_balance, 0)) > 0
    ORDER BY difference DESC
  LOOP
    BEGIN
      -- Округляем разницу до целого числа звезд
      stars_to_add := ROUND(user_record.difference);
      
      -- Если есть что добавлять
      IF stars_to_add > 0 THEN
        -- Создаем запись income в таблице payments
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
        VALUES (
          user_record.telegram_id,
          stars_to_add,
          0, -- Не применимо для миграции
          'income',
          'COMPLETED',
          'Миграция баланса пользователя из таблицы users (' || user_record.old_balance || ')',
          'migration',
          'leela',
          'ru',
          'RUB',
          migration_date,
          jsonb_build_object(
            'migration', true,
            'old_balance', user_record.old_balance,
            'calculated_balance', user_record.calculated_balance,
            'difference', user_record.difference
          )
        )
        RETURNING payment_id INTO inserted_record;
        
        -- Возвращаем информацию об успешной миграции
        user_telegram_id := user_record.telegram_id;
        user_username := user_record.username;
        user_old_balance := user_record.old_balance;
        user_calculated_balance := user_record.calculated_balance;
        user_difference := user_record.difference;
        user_stars_added := stars_to_add;
        migration_status := 'SUCCESS';
        RETURN NEXT;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- В случае ошибки возвращаем информацию об ошибке
      user_telegram_id := user_record.telegram_id;
      user_username := user_record.username;
      user_old_balance := user_record.old_balance;
      user_calculated_balance := user_record.calculated_balance;
      user_difference := user_record.difference;
      user_stars_added := 0;
      migration_status := 'ERROR: ' || SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Функция для выполнения миграции и возврата сводной статистики
CREATE OR REPLACE FUNCTION run_balance_migration()
RETURNS TABLE (
  total_users INTEGER,
  successful_migrations INTEGER,
  failed_migrations INTEGER,
  total_stars_migrated INTEGER
) AS $$
DECLARE
  migration_results RECORD;
  total_users_count INTEGER := 0;
  successful_count INTEGER := 0;
  failed_count INTEGER := 0;
  stars_migrated INTEGER := 0;
BEGIN
  -- Выполняем миграцию и подсчитываем результаты
  FOR migration_results IN SELECT * FROM migrate_user_balances() LOOP
    total_users_count := total_users_count + 1;
    
    IF migration_results.migration_status = 'SUCCESS' THEN
      successful_count := successful_count + 1;
      stars_migrated := stars_migrated + migration_results.user_stars_added;
    ELSE
      failed_count := failed_count + 1;
    END IF;
  END LOOP;
  
  -- Возвращаем сводную статистику
  total_users := total_users_count;
  successful_migrations := successful_count;
  failed_migrations := failed_count;
  total_stars_migrated := stars_migrated;
  
  RETURN NEXT;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Вызов этой функции выполнит миграцию и вернет статистику:
-- SELECT * FROM run_balance_migration();

-- Для проверки списка пользователей перед миграцией:
/*
WITH calculated_balance AS (
  SELECT 
    p.telegram_id,
    COALESCE(SUM(CASE WHEN p.type = 'income' AND p.status = 'COMPLETED' THEN p.stars ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN p.type = 'outcome' AND p.status = 'COMPLETED' THEN p.stars ELSE 0 END), 0) AS calc_balance
  FROM payments p
  GROUP BY p.telegram_id
)

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
ORDER BY difference DESC
LIMIT 30;
*/ 

SELECT * FROM run_balance_migration(); 