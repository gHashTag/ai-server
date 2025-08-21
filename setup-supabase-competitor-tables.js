/**
 * Скрипт для создания таблиц мониторинга конкурентов в Supabase
 * Создает все необходимые таблицы, если их еще нет
 */

const { createClient } = require('@supabase/supabase-js')

async function setupCompetitorTables() {
  console.log('🚀 Настройка таблиц мониторинга конкурентов в Supabase...')

  // Проверяем переменные окружения
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ SUPABASE_URL и SUPABASE_SERVICE_KEY должны быть настроены')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    console.log('📝 Создание таблиц...')

    // SQL для создания таблиц
    const createTablesSQL = `
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
          delivery_format VARCHAR(50) DEFAULT 'digest',
          
          -- Статус подписки
          is_active BOOLEAN DEFAULT true,
          last_parsed_at TIMESTAMP,
          next_parse_at TIMESTAMP,
          
          -- Метаданные
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          
          -- Уникальное ограничение
          UNIQUE(user_telegram_id, competitor_username, bot_name)
      );

      -- Таблица истории доставок
      CREATE TABLE IF NOT EXISTS competitor_delivery_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          subscription_id UUID REFERENCES competitor_subscriptions(id) ON DELETE CASCADE,
          
          -- Информация о доставке
          delivered_at TIMESTAMP DEFAULT NOW(),
          reels_count INTEGER NOT NULL,
          delivery_status VARCHAR(50) DEFAULT 'sent',
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

      -- Таблица для хранения рилзов (если еще нет)
      CREATE TABLE IF NOT EXISTS instagram_apify_reels (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reel_id VARCHAR(255) UNIQUE,
          url TEXT NOT NULL,
          video_url TEXT,
          thumbnail_url TEXT,
          caption TEXT,
          hashtags JSONB,
          owner_username VARCHAR(255),
          owner_id VARCHAR(255),
          views_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          comments_count INTEGER DEFAULT 0,
          duration FLOAT,
          published_at TIMESTAMP,
          music_artist VARCHAR(255),
          music_title VARCHAR(255),
          project_id INTEGER,
          scraped_at TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW()
      );

      -- Создание индексов для производительности
      CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON competitor_subscriptions(is_active, next_parse_at);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON competitor_subscriptions(user_telegram_id, bot_name);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_competitor ON competitor_subscriptions(competitor_username);
      CREATE INDEX IF NOT EXISTS idx_delivery_history_subscription ON competitor_delivery_history(subscription_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_history_date ON competitor_delivery_history(delivered_at);
      CREATE INDEX IF NOT EXISTS idx_profiles_username ON competitor_profiles(username);
      CREATE INDEX IF NOT EXISTS idx_reels_owner ON instagram_apify_reels(owner_username);
      CREATE INDEX IF NOT EXISTS idx_reels_project ON instagram_apify_reels(project_id);
      CREATE INDEX IF NOT EXISTS idx_reels_scraped ON instagram_apify_reels(scraped_at);

      -- Функция для обновления updated_at
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      -- Триггеры для автоматического обновления updated_at
      DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON competitor_subscriptions;
      CREATE TRIGGER update_subscriptions_updated_at 
          BEFORE UPDATE ON competitor_subscriptions 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_profiles_updated_at ON competitor_profiles;
      CREATE TRIGGER update_profiles_updated_at 
          BEFORE UPDATE ON competitor_profiles 
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `

    // Выполняем SQL
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL })

    if (error) {
      console.error('❌ Ошибка создания таблиц:', error)
      
      // Пробуем создать таблицы по отдельности
      console.log('🔄 Пробуем создать таблицы через Supabase API...')
      
      // Проверяем существующие таблицы
      const tables = [
        'competitor_subscriptions',
        'competitor_delivery_history', 
        'competitor_profiles',
        'instagram_apify_reels'
      ]

      for (const tableName of tables) {
        try {
          const { data, error: checkError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .limit(1)
          
          if (checkError && checkError.code === 'PGRST116') {
            console.log(`⚠️ Таблица ${tableName} не существует`)
          } else {
            console.log(`✅ Таблица ${tableName} существует`)
          }
        } catch (e) {
          console.log(`⚠️ Не удается проверить таблицу ${tableName}:`, e.message)
        }
      }
    } else {
      console.log('✅ Таблицы созданы успешно!')
    }

    // Проверяем подключение
    console.log('\n🔍 Проверка подключения к таблицам...')
    
    const { data: subscriptions, error: subsError } = await supabase
      .from('competitor_subscriptions')
      .select('*', { count: 'exact', head: true })
    
    if (subsError) {
      console.error('❌ Ошибка доступа к competitor_subscriptions:', subsError.message)
    } else {
      console.log('✅ Таблица competitor_subscriptions доступна')
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('competitor_profiles')
      .select('*', { count: 'exact', head: true })
    
    if (profilesError) {
      console.error('❌ Ошибка доступа к competitor_profiles:', profilesError.message)
    } else {
      console.log('✅ Таблица competitor_profiles доступна')
    }

    const { data: reels, error: reelsError } = await supabase
      .from('instagram_apify_reels')
      .select('*', { count: 'exact', head: true })
    
    if (reelsError) {
      console.error('❌ Ошибка доступа к instagram_apify_reels:', reelsError.message)
    } else {
      console.log('✅ Таблица instagram_apify_reels доступна')
    }

    console.log('\n🎉 Настройка завершена!')
    console.log(`
📋 Созданы таблицы:
• competitor_subscriptions - подписки пользователей
• competitor_profiles - профили конкурентов
• competitor_delivery_history - история доставок
• instagram_apify_reels - рилзы Instagram

🚀 Теперь можно тестировать мониторинг конкурентов:
node test-competitor-monitoring-simple.js
`)

  } catch (error) {
    console.error('❌ Общая ошибка:', error)
  }
}

// Запуск скрипта
setupCompetitorTables()
  .then(() => {
    console.log('✅ Скрипт завершен')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Ошибка выполнения:', error)
    process.exit(1)
  })