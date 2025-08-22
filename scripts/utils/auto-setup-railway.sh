#!/bin/bash

# 🤖 Автоматическая настройка Railway Environment Variables
# Читает переменные из .env файла и устанавливает их в Railway

set -e

echo "🚄 Автоматическая настройка Railway..."

# Путь к .env файлу
ENV_FILE="/Users/playra/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Файл $ENV_FILE не найден!"
    exit 1
fi

echo "✅ Найден файл: $ENV_FILE"

# Функция для установки переменных окружения в Railway
set_railway_var() {
    local key="$1"
    local value="$2"
    local environment="$3"
    
    echo "🔧 Устанавливаем $key в окружении $environment..."
    
    if railway variables --set "$key=$value" --environment "$environment"; then
        echo "✅ $key установлена успешно"
    else
        echo "⚠️ Ошибка при установке $key"
    fi
}

# Функция для настройки окружения
setup_environment() {
    local env_name="$1"
    local app_env_value="$2"
    
    echo ""
    echo "🏗️ Настройка окружения: $env_name"
    echo "========================================"
    
    # Переключаемся на нужное окружение
    railway environment "$env_name"
    
    # Устанавливаем основные переменные приложения
    set_railway_var "NODE_ENV" "production" "$env_name"
    set_railway_var "APP_ENV" "$app_env_value" "$env_name"
    
    # Читаем .env файл и устанавливаем переменные
    while IFS='=' read -r key value; do
        # Пропускаем комментарии и пустые строки
        if [[ $key =~ ^#.*$ ]] || [[ -z "$key" ]] || [[ -z "$value" ]]; then
            continue
        fi
        
        # Убираем пробелы
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Устанавливаем переменную
        set_railway_var "$key" "$value" "$env_name"
        
    done < "$ENV_FILE"
    
    # Дополнительные переменные для Railway
    local base_url
    if [ "$env_name" = "staging" ]; then
        base_url="https://ai-server-production-production-8e2d.up.railway.app"
    else
        base_url="https://ai-server-production-production-8e2d.up.railway.app"  
    fi
    
    set_railway_var "BASE_URL" "$base_url" "$env_name"
    set_railway_var "ORIGIN" "$base_url" "$env_name"
    set_railway_var "API_URL" "$base_url" "$env_name"
    set_railway_var "INNGEST_WEBHOOK_URL" "$base_url/api/inngest" "$env_name"
    set_railway_var "RESULT_URL2" "$base_url/payment/result" "$env_name"
    
    # Настройки для Nexrender
    set_railway_var "NEXRENDER_PORT" "4001" "$env_name"
    set_railway_var "NEXRENDER_SECRET" "myapisecret" "$env_name"  
    set_railway_var "AERENDER_PATH" "/usr/local/bin/aerender" "$env_name"
    
    # Настройки логирования
    if [ "$env_name" = "staging" ]; then
        set_railway_var "LOG_LEVEL" "debug" "$env_name"
    else
        set_railway_var "LOG_LEVEL" "info" "$env_name"
    fi
    
    set_railway_var "ENABLE_LOGGING" "true" "$env_name"
    
    echo "✅ Окружение $env_name настроено!"
}

# Проверяем, что мы в правильной директории
if [ ! -f "railway.toml" ]; then
    echo "❌ Файл railway.toml не найден. Убедитесь, что вы в корне проекта."
    exit 1
fi

# Проверяем статус Railway
echo "📊 Статус Railway:"
railway status

echo ""
echo "🚀 Начинаем настройку переменных окружения..."

# Настраиваем staging окружение
setup_environment "staging" "staging"

echo ""
echo "=========================================="

# Настраиваем production окружение  
setup_environment "production" "production"

echo ""
echo "🎉 Настройка завершена!"
echo ""
echo "📋 Проверить переменные:"
echo "  railway environment staging"
echo "  railway variables"
echo ""  
echo "  railway environment production"
echo "  railway variables"
echo ""
echo "🚀 Для деплоя:"
echo "  git push origin main      # для staging"
echo "  git push origin production # для production"