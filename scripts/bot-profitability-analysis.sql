-- Анализ прибыльности ботов за май, июнь, июль 2024
-- Выполнить в Supabase SQL Editor или через psql

WITH monthly_stats AS (
  SELECT 
    bot_name,
    EXTRACT(MONTH FROM payment_date) as month_num,
    CASE 
      WHEN EXTRACT(MONTH FROM payment_date) = 5 THEN 'Май'
      WHEN EXTRACT(MONTH FROM payment_date) = 6 THEN 'Июнь'
      WHEN EXTRACT(MONTH FROM payment_date) = 7 THEN 'Июль'
      ELSE CONCAT('Месяц ', EXTRACT(MONTH FROM payment_date)::text)
    END as month_name,
    currency,
    -- Доходы в рублях
    SUM(CASE WHEN currency = 'RUB' THEN COALESCE(amount, 0) ELSE 0 END) as rub_income,
    -- Доходы в звездах
    SUM(CASE WHEN currency = 'STARS' THEN COALESCE(stars, 0) ELSE 0 END) as stars_income,
    -- Количество транзакций в рублях
    COUNT(CASE WHEN currency = 'RUB' AND amount > 0 THEN 1 END) as rub_transactions,
    -- Количество транзакций в звездах
    COUNT(CASE WHEN currency = 'STARS' AND stars > 0 THEN 1 END) as stars_transactions
  FROM payments_v2 
  WHERE 
    status = 'COMPLETED' 
    AND type = 'MONEY_INCOME'
    AND EXTRACT(YEAR FROM payment_date) = 2024
    AND EXTRACT(MONTH FROM payment_date) IN (5, 6, 7)
    AND bot_name IS NOT NULL
  GROUP BY 
    bot_name, 
    EXTRACT(MONTH FROM payment_date),
    currency
),
bot_totals AS (
  SELECT 
    bot_name,
    month_num,
    month_name,
    SUM(rub_income) as total_rub_income,
    SUM(stars_income) as total_stars_income,
    SUM(rub_transactions) as total_rub_transactions,
    SUM(stars_transactions) as total_stars_transactions
  FROM monthly_stats
  GROUP BY bot_name, month_num, month_name
)

-- Основной запрос с результатами
SELECT 
  '🤖 ' || bot_name as "БОТ",
  month_name as "МЕСЯЦ",
  CASE 
    WHEN total_rub_income > 0 THEN 
      '💰 ' || total_rub_income::text || ' RUB (' || total_rub_transactions::text || ' тр.)'
    ELSE '🚫 Нет доходов в RUB'
  END as "ДОХОДЫ В РУБЛЯХ",
  CASE 
    WHEN total_stars_income > 0 THEN 
      '⭐ ' || total_stars_income::text || ' STARS (' || total_stars_transactions::text || ' тр.)'
    ELSE '🚫 Нет доходов в STARS'
  END as "ДОХОДЫ В ЗВЕЗДАХ"
FROM bot_totals
ORDER BY bot_name, month_num

UNION ALL

-- Разделитель
SELECT 
  '=' as "БОТ",
  '=' as "МЕСЯЦ", 
  '=' as "ДОХОДЫ В РУБЛЯХ",
  '=' as "ДОХОДЫ В ЗВЕЗДАХ"

UNION ALL

-- Общие итоги
SELECT 
  '📊 ОБЩИЙ ИТОГ' as "БОТ",
  'МАЙ-ИЮЛЬ 2024' as "МЕСЯЦ",
  '💰 ' || SUM(total_rub_income)::text || ' RUB' as "ДОХОДЫ В РУБЛЯХ",
  '⭐ ' || SUM(total_stars_income)::text || ' STARS' as "ДОХОДЫ В ЗВЕЗДАХ"
FROM bot_totals

UNION ALL

-- Статистика ботов
SELECT 
  '🤖 Активных ботов' as "БОТ",
  COUNT(DISTINCT bot_name)::text as "МЕСЯЦ",
  'Всего ботов с доходами' as "ДОХОДЫ В РУБЛЯХ",
  'за указанный период' as "ДОХОДЫ В ЗВЕЗДАХ"
FROM bot_totals;

-- Дополнительный запрос: Топ ботов по доходности
SELECT 
  '=== ТОП БОТОВ ПО ОБЩЕЙ ДОХОДНОСТИ ===' as info;

WITH bot_summary AS (
  SELECT 
    bot_name,
    SUM(CASE WHEN currency = 'RUB' THEN COALESCE(amount, 0) ELSE 0 END) as total_rub,
    SUM(CASE WHEN currency = 'STARS' THEN COALESCE(stars, 0) ELSE 0 END) as total_stars,
    COUNT(*) as total_transactions
  FROM payments_v2 
  WHERE 
    status = 'COMPLETED' 
    AND type = 'MONEY_INCOME'
    AND EXTRACT(YEAR FROM payment_date) = 2024
    AND EXTRACT(MONTH FROM payment_date) IN (5, 6, 7)
    AND bot_name IS NOT NULL
  GROUP BY bot_name
)
SELECT 
  ROW_NUMBER() OVER (ORDER BY (total_rub + total_stars * 0.5) DESC) as "МЕСТО",
  '🤖 ' || bot_name as "БОТ",
  total_rub::text || ' RUB' as "РУБЛИ",
  total_stars::text || ' STARS' as "ЗВЕЗДЫ",
  total_transactions::text as "ТРАНЗАКЦИЙ",
  ROUND((total_rub + total_stars * 0.5), 2)::text || ' условных RUB' as "УСЛОВНАЯ ДОХОДНОСТЬ"
FROM bot_summary
ORDER BY (total_rub + total_stars * 0.5) DESC
LIMIT 10;