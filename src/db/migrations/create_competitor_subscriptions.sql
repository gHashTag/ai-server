-- Создание таблиц для автоматических подписок на конкурентов

-- Таблица подписок пользователей на конкурентов
CREATE TABLE IF NOT EXISTS competitor_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_telegram_id VARCHAR(255) NOT NULL,
    user_chat_id VARCHAR(255),
    bot_name VARCHAR(255) NOT NULL,
    competitor_username VARCHAR(255) NOT NULL,
    competitor_display_name VARCHAR(255),
    
    -- Настройки парсинга
    max_reels INTEGER DEFAULT 10,
    min_views INTEGER DEFAULT 1000,
    max_age_days INTEGER DEFAULT 7,
    
    -- Настройки доставки
    delivery_time TIME DEFAULT '09:00:00',
    delivery_timezone VARCHAR(50) DEFAULT 'UTC',
    delivery_format VARCHAR(50) DEFAULT 'digest', -- digest, individual, archive
    
    -- Статус подписки
    is_active BOOLEAN DEFAULT true,
    last_parsed_at TIMESTAMP,
    next_parse_at TIMESTAMP,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Индексы
    UNIQUE(user_telegram_id, competitor_username, bot_name)
);

-- Таблица истории доставок
CREATE TABLE IF NOT EXISTS competitor_delivery_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES competitor_subscriptions(id) ON DELETE CASCADE,
    
    -- Информация о доставке
    delivered_at TIMESTAMP DEFAULT NOW(),
    reels_count INTEGER NOT NULL,
    delivery_status VARCHAR(50) DEFAULT 'sent', -- sent, failed, skipped
    error_message TEXT,
    
    -- Данные о рилсах
    reels_data JSONB,
    archive_url TEXT,
    
    -- Метаданные
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица для отслеживания конкурентов (кэш)
CREATE TABLE IF NOT EXISTS competitor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    bio TEXT,
    followers_count INTEGER,
    following_count INTEGER,
    posts_count INTEGER,
    is_verified BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT false,
    
    -- Кэш
    last_updated TIMESTAMP DEFAULT NOW(),
    profile_pic_url TEXT,
    
    -- Статистика
    total_subscribers INTEGER DEFAULT 0,
    avg_views INTEGER DEFAULT 0,
    avg_likes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON competitor_subscriptions(is_active, next_parse_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON competitor_subscriptions(user_telegram_id, bot_name);
CREATE INDEX IF NOT EXISTS idx_subscriptions_competitor ON competitor_subscriptions(competitor_username);
CREATE INDEX IF NOT EXISTS idx_delivery_history_subscription ON competitor_delivery_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_delivery_history_date ON competitor_delivery_history(delivered_at);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON competitor_profiles(username);

-- Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON competitor_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON competitor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();