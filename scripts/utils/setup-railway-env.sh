#!/bin/bash

# 🚄 Railway Environment Setup Script
# Этот скрипт поможет настроить переменные окружения для Railway

echo "🚄 Railway Environment Setup"
echo "=================================="

# Проверяем, установлен ли Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен."
    echo "📦 Установите его: npm install -g @railway/cli"
    echo "🔗 Или: https://docs.railway.com/develop/cli"
    exit 1
fi

echo "✅ Railway CLI найден"

# Функция для установки переменных окружения
set_env_var() {
    local key=$1
    local value=$2
    local environment=$3
    
    if [[ -n "$environment" ]]; then
        echo "🔧 Устанавливаем $key для окружения $environment..."
        railway variables set "$key=$value" --environment "$environment"
    else
        echo "🔧 Устанавливаем $key..."
        railway variables set "$key=$value"
    fi
}

# Функция для запроса переменных
prompt_env_vars() {
    local env_name=$1
    
    echo ""
    echo "⚙️  Настройка переменных для окружения: $env_name"
    echo "=================================================="
    
    # Базовые переменные приложения
    echo "📱 Базовые переменные приложения:"
    set_env_var "NODE_ENV" "production" "$env_name"
    
    if [[ "$env_name" == "staging" ]]; then
        set_env_var "APP_ENV" "staging" "$env_name"
        read -p "🌐 Введите NGROK_URL (для разработки): " ngrok_url
        if [[ -n "$ngrok_url" ]]; then
            set_env_var "NGROK_URL" "$ngrok_url" "$env_name"
        fi
    else
        set_env_var "APP_ENV" "production" "$env_name"
    fi
    
    # Database & Supabase
    echo ""
    echo "🗄️  База данных и Supabase:"
    read -p "🔗 SUPABASE_URL: " supabase_url
    read -p "🔑 SUPABASE_SERVICE_KEY: " supabase_service_key
    read -p "🔑 SUPABASE_SERVICE_ROLE_KEY: " supabase_service_role_key
    
    set_env_var "SUPABASE_URL" "$supabase_url" "$env_name"
    set_env_var "SUPABASE_SERVICE_KEY" "$supabase_service_key" "$env_name"
    set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$supabase_service_role_key" "$env_name"
    
    # Security
    echo ""
    echo "🔐 Безопасность:"
    read -p "🗝️  SECRET_KEY: " secret_key
    read -p "🗝️  SECRET_API_KEY: " secret_api_key
    read -p "🗝️  JWT_SECRET_KEY: " jwt_secret
    
    set_env_var "SECRET_KEY" "$secret_key" "$env_name"
    set_env_var "SECRET_API_KEY" "$secret_api_key" "$env_name"
    set_env_var "JWT_SECRET_KEY" "$jwt_secret" "$env_name"
    
    # External APIs
    echo ""
    echo "🤖 Внешние API:"
    read -p "🧠 OPENAI_API_KEY: " openai_key
    read -p "🎭 REPLICATE_API_TOKEN: " replicate_token
    read -p "🗣️  ELEVENLABS_API_KEY: " elevenlabs_key
    read -p "🎨 BFL_API_KEY: " bfl_key
    read -p "🎬 SYNC_LABS_API_KEY: " sync_labs_key
    read -p "🎯 NEXT_PUBLIC_MANAGEMENT_TOKEN: " management_token
    
    set_env_var "OPENAI_API_KEY" "$openai_key" "$env_name"
    set_env_var "REPLICATE_API_TOKEN" "$replicate_token" "$env_name"
    set_env_var "ELEVENLABS_API_KEY" "$elevenlabs_key" "$env_name"
    set_env_var "BFL_API_KEY" "$bfl_key" "$env_name"
    set_env_var "SYNC_LABS_API_KEY" "$sync_labs_key" "$env_name"
    set_env_var "NEXT_PUBLIC_MANAGEMENT_TOKEN" "$management_token" "$env_name"
    
    # Bot Tokens
    echo ""
    echo "🤖 Telegram боты:"
    
    if [[ "$env_name" == "production" ]]; then
        echo "Настройка продакшн ботов (1-10):"
        for i in {1..10}; do
            read -p "🤖 BOT_TOKEN_$i: " bot_token
            if [[ -n "$bot_token" ]]; then
                set_env_var "BOT_TOKEN_$i" "$bot_token" "$env_name"
            fi
        done
    else
        echo "Настройка тестовых ботов:"
        read -p "🧪 BOT_TOKEN_TEST_1: " bot_token_test_1
        read -p "🧪 BOT_TOKEN_TEST_2: " bot_token_test_2
        
        set_env_var "BOT_TOKEN_TEST_1" "$bot_token_test_1" "$env_name"
        set_env_var "BOT_TOKEN_TEST_2" "$bot_token_test_2" "$env_name"
        
        # Также добавляем продакшн токены для staging
        read -p "Хотите добавить продакшн токены для staging? (y/n): " add_prod_tokens
        if [[ "$add_prod_tokens" == "y" ]]; then
            for i in {1..10}; do
                read -p "🤖 BOT_TOKEN_$i: " bot_token
                if [[ -n "$bot_token" ]]; then
                    set_env_var "BOT_TOKEN_$i" "$bot_token" "$env_name"
                fi
            done
        fi
    fi
    
    # Service URLs
    echo ""
    echo "🌐 URL сервисов:"
    read -p "🔗 BASE_URL (https://your-app-$env_name.railway.app): " base_url
    
    if [[ -n "$base_url" ]]; then
        set_env_var "BASE_URL" "$base_url" "$env_name"
        set_env_var "ORIGIN" "$base_url" "$env_name"
        set_env_var "API_URL" "$base_url" "$env_name"
        set_env_var "INNGEST_WEBHOOK_URL" "$base_url/api/inngest" "$env_name"
        set_env_var "RESULT_URL2" "$base_url/payment/result" "$env_name"
    fi
    
    # Payment
    echo ""
    echo "💰 Платежи (Robokassa):"
    read -p "🏪 MERCHANT_LOGIN: " merchant_login
    read -p "🔐 PASSWORD2: " password2
    
    set_env_var "MERCHANT_LOGIN" "$merchant_login" "$env_name"
    set_env_var "PASSWORD2" "$password2" "$env_name"
    
    # Inngest
    echo ""
    echo "⚡ Inngest:"
    read -p "🔑 INNGEST_EVENT_KEY: " inngest_event_key
    read -p "🔑 INNGEST_SIGNING_KEY: " inngest_signing_key
    
    set_env_var "INNGEST_EVENT_KEY" "$inngest_event_key" "$env_name"
    set_env_var "INNGEST_SIGNING_KEY" "$inngest_signing_key" "$env_name"
    
    # Nexrender
    echo ""
    echo "🎬 Nexrender:"
    set_env_var "NEXRENDER_PORT" "4001" "$env_name"
    set_env_var "NEXRENDER_SECRET" "myapisecret" "$env_name"
    set_env_var "AERENDER_PATH" "/usr/local/bin/aerender" "$env_name"
    
    # Logging
    echo ""
    echo "📝 Логирование:"
    if [[ "$env_name" == "staging" ]]; then
        set_env_var "LOG_LEVEL" "debug" "$env_name"
    else
        set_env_var "LOG_LEVEL" "info" "$env_name"
    fi
    
    set_env_var "LOG_FORMAT" "combined" "$env_name"
    set_env_var "ENABLE_LOGGING" "true" "$env_name"
    set_env_var "CREDENTIALS" "true" "$env_name"
    
    echo ""
    echo "✅ Переменные окружения для $env_name настроены!"
}

# Главное меню
echo ""
echo "Выберите действие:"
echo "1) Настроить staging окружение"
echo "2) Настроить production окружение"  
echo "3) Настроить оба окружения"
echo "4) Показать текущие переменные"
echo "5) Выход"

read -p "Ваш выбор (1-5): " choice

case $choice in
    1)
        prompt_env_vars "staging"
        ;;
    2)
        prompt_env_vars "production"
        ;;
    3)
        prompt_env_vars "staging"
        echo ""
        echo "===================="
        prompt_env_vars "production"
        ;;
    4)
        echo ""
        echo "📋 Текущие переменные окружения:"
        echo "================================"
        railway variables
        ;;
    5)
        echo "👋 До свидания!"
        exit 0
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "🎉 Настройка завершена!"
echo "💡 Проверьте переменные: railway variables"
echo "🚀 Запустите деплой: git push origin main (для staging)"
echo "🚀 Или: git push origin production (для продакшн)"