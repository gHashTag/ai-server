-- 📊 Таблица подписок пользователей на Instagram аккаунты
CREATE TABLE IF NOT EXISTS instagram_subscriptions (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  telegram_id VARCHAR(255) NOT NULL,
  telegram_username VARCHAR(255),
  bot_name VARCHAR(255) DEFAULT 'neuro_blogger_bot',
  
  -- Подписка на конкретный Instagram аккаунт
  instagram_user_id VARCHAR(255) NOT NULL,
  instagram_username VARCHAR(255) NOT NULL,
  
  -- Настройки подписки
  is_active BOOLEAN DEFAULT true,
  notify_reels BOOLEAN DEFAULT true,
  notify_posts BOOLEAN DEFAULT false,
  notify_stories BOOLEAN DEFAULT false,
  
  -- Частота проверки (в часах)
  check_interval_hours INTEGER DEFAULT 4,
  last_check_at TIMESTAMP,
  next_check_at TIMESTAMP DEFAULT NOW(),
  
  -- Стоимость в звездах
  cost_per_check INTEGER DEFAULT 5, -- Стоимость одного уведомления в звездах
  max_reels INTEGER DEFAULT 10, -- Максимум рилсов в одном уведомлении
  min_views INTEGER DEFAULT 1000, -- Минимальное количество просмотров
  language VARCHAR(10) DEFAULT 'ru', -- Язык уведомлений
  
  -- Деактивация
  deactivation_reason VARCHAR(50), -- insufficient_funds, user_request, etc
  deactivated_at TIMESTAMP,
  
  -- Статистика
  notifications_sent INTEGER DEFAULT 0,
  total_stars_spent INTEGER DEFAULT 0, -- Всего потрачено звезд
  last_notification_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Уникальный индекс для предотвращения дублей
  UNIQUE(telegram_id, instagram_user_id, bot_name)
);

-- 📝 История отправленных уведомлений о рилсах
CREATE TABLE IF NOT EXISTS reels_notifications_history (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES instagram_subscriptions(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Данные рилса
  reel_id VARCHAR(255) NOT NULL,
  reel_code VARCHAR(255),
  instagram_user_id VARCHAR(255) NOT NULL,
  instagram_username VARCHAR(255) NOT NULL,
  
  -- Контент уведомления
  caption TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  view_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  
  -- Статус отправки
  sent_to_telegram BOOLEAN DEFAULT false,
  telegram_message_id VARCHAR(255),
  sent_at TIMESTAMP,
  error_message TEXT,
  
  -- Время публикации рилса
  reel_created_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Предотвращаем отправку одного рилса дважды
  UNIQUE(subscription_id, reel_id)
);

-- 🔴 Удалена таблица subscription_plans - используем баланс звезд вместо тарифов
-- CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(100),
  
  -- Лимиты
  max_accounts INTEGER NOT NULL,
  check_interval_hours INTEGER NOT NULL,
  
  -- Функции
  notify_reels BOOLEAN DEFAULT true,
  notify_posts BOOLEAN DEFAULT false,
  notify_stories BOOLEAN DEFAULT false,
  advanced_analytics BOOLEAN DEFAULT false,
  competitor_insights BOOLEAN DEFAULT false,
  
  -- Цены
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'USD',
  
  -- Метаданные
  description TEXT,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 📊 Таблица использования (для статистики)
CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  telegram_id VARCHAR(255) NOT NULL,
  
  -- Метрики использования
  api_calls_count INTEGER DEFAULT 0,
  reels_checked_count INTEGER DEFAULT 0,
  notifications_sent_count INTEGER DEFAULT 0,
  data_transferred_mb DECIMAL(10,2) DEFAULT 0,
  
  -- Период
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  
  -- Биллинг
  billed BOOLEAN DEFAULT false,
  billed_amount DECIMAL(10,2),
  billed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Один отчет на пользователя за период
  UNIQUE(telegram_id, period_start, period_end)
);

-- 🎯 Индексы для оптимизации
CREATE INDEX idx_subscriptions_telegram_id ON instagram_subscriptions(telegram_id);
CREATE INDEX idx_subscriptions_instagram_user ON instagram_subscriptions(instagram_user_id);
CREATE INDEX idx_subscriptions_next_check ON instagram_subscriptions(next_check_at) WHERE is_active = true;
CREATE INDEX idx_notifications_subscription ON reels_notifications_history(subscription_id);
CREATE INDEX idx_notifications_reel ON reels_notifications_history(reel_id);
CREATE INDEX idx_usage_telegram_period ON usage_tracking(telegram_id, period_start, period_end);

-- 🎁 Тарифные планы удалены - используем систему баланса звезд
-- INSERT INTO subscription_plans...

-- 📝 Комментарии к таблицам
COMMENT ON TABLE instagram_subscriptions IS 'Подписки пользователей на отслеживание Instagram аккаунтов';
COMMENT ON TABLE reels_notifications_history IS 'История отправленных уведомлений о новых рилсах';
COMMENT ON TABLE subscription_plans IS 'Тарифные планы для монетизации сервиса';
COMMENT ON TABLE usage_tracking IS 'Отслеживание использования для биллинга';
