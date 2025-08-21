#!/bin/bash

# ====================================
# 🚀 AI Server Production Deploy Script
# ====================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_HOST="your-server.com"  # Замените на ваш сервер
SERVER_USER="root"              # Замените на вашего пользователя
SERVER_PATH="/var/www/ai-server"
BRANCH="main"
REMOTE_REPO="origin"

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_message "$BLUE" "📋 Проверка предварительных требований..."
    
    # Check if git is clean
    if [[ -n $(git status -s) ]]; then
        print_message "$YELLOW" "⚠️  Есть незакоммиченные изменения"
        read -p "Продолжить без коммита? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check if on correct branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
        print_message "$YELLOW" "⚠️  Вы не на ветке $BRANCH (текущая: $CURRENT_BRANCH)"
        read -p "Переключиться на $BRANCH? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout $BRANCH
        fi
    fi
    
    print_message "$GREEN" "✅ Предварительные проверки пройдены"
}

# Function to build project locally
build_local() {
    print_message "$BLUE" "🔨 Сборка проекта локально..."
    
    # Install dependencies
    npm ci --production=false
    
    # Build the project
    npm run build
    
    # Run tests
    print_message "$BLUE" "🧪 Запуск тестов..."
    npm test || {
        print_message "$YELLOW" "⚠️  Тесты не прошли"
        read -p "Продолжить деплой? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    }
    
    print_message "$GREEN" "✅ Локальная сборка завершена"
}

# Function to push to repository
push_to_repo() {
    print_message "$BLUE" "📤 Отправка изменений в репозиторий..."
    
    git push $REMOTE_REPO $BRANCH
    
    # Tag the release
    VERSION=$(node -p "require('./package.json').version")
    TAG="v$VERSION-$(date +%Y%m%d-%H%M%S)"
    git tag -a $TAG -m "Deploy to production: $TAG"
    git push $REMOTE_REPO $TAG
    
    print_message "$GREEN" "✅ Код отправлен в репозиторий с тегом: $TAG"
}

# Function to deploy to server
deploy_to_server() {
    print_message "$BLUE" "🌐 Деплой на сервер $SERVER_HOST..."
    
    ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
        set -e
        
        # Navigate to project directory
        cd $SERVER_PATH || {
            echo "Директория $SERVER_PATH не существует. Клонирую репозиторий..."
            git clone $REPO_URL $SERVER_PATH
            cd $SERVER_PATH
        }
        
        # Pull latest changes
        echo "📥 Получение последних изменений..."
        git fetch --all
        git checkout $BRANCH
        git pull origin $BRANCH
        
        # Install dependencies
        echo "📦 Установка зависимостей..."
        npm ci --production
        
        # Build the project
        echo "🔨 Сборка проекта..."
        npm run build
        
        # Stop current services
        echo "🛑 Остановка текущих сервисов..."
        pm2 stop ecosystem.config.js || true
        
        # Copy production environment file
        if [ -f .env.production ]; then
            cp .env.production .env
        fi
        
        # Start services with PM2
        echo "🚀 Запуск сервисов..."
        pm2 start ecosystem.config.js --only prod
        pm2 save
        
        # Setup Inngest in production (if needed)
        if [ "$ENABLE_INNGEST" = "true" ]; then
            echo "🎛️ Настройка Inngest..."
            # For production, you might want to use a managed Inngest instance
            # or run it as a separate service
        fi
        
        # Run database migrations (if any)
        # npm run migrate:prod || true
        
        # Health check
        echo "🏥 Проверка здоровья сервиса..."
        sleep 5
        curl -f http://localhost:3000/health || {
            echo "❌ Health check failed!"
            pm2 logs --lines 50
            exit 1
        }
        
        echo "✅ Деплой завершен успешно!"
ENDSSH
    
    print_message "$GREEN" "✅ Деплой на сервер завершен"
}

# Function to setup monitoring
setup_monitoring() {
    print_message "$BLUE" "📊 Настройка мониторинга..."
    
    ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
        cd $SERVER_PATH
        
        # Ensure log directory exists
        mkdir -p logs
        
        # Setup log rotation
        cat > /etc/logrotate.d/ai-server << EOF
$SERVER_PATH/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
        
        # Setup PM2 monitoring
        pm2 install pm2-logrotate
        pm2 set pm2-logrotate:max_size 100M
        pm2 set pm2-logrotate:retain 7
        
        echo "✅ Мониторинг настроен"
ENDSSH
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    print_message "$BLUE" "📱 Отправка уведомления..."
    
    # Send Telegram notification about deployment
    curl -X POST "http://$SERVER_HOST:3000/api/deploy-notification" \
        -H "Content-Type: application/json" \
        -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}" \
        || print_message "$YELLOW" "⚠️  Не удалось отправить уведомление"
}

# Main deployment flow
main() {
    print_message "$GREEN" "
    ╔══════════════════════════════════════╗
    ║   🚀 AI Server Production Deploy     ║
    ╚══════════════════════════════════════╝
    "
    
    # Check environment
    if [ -z "$SERVER_HOST" ] || [ "$SERVER_HOST" = "your-server.com" ]; then
        print_message "$RED" "❌ Пожалуйста, настройте SERVER_HOST в скрипте"
        exit 1
    fi
    
    # Deployment steps
    check_prerequisites
    build_local
    push_to_repo
    deploy_to_server
    setup_monitoring
    
    # Send success notification
    send_notification "success" "Deployment completed successfully"
    
    print_message "$GREEN" "
    ╔══════════════════════════════════════╗
    ║   ✅ Деплой завершен успешно!       ║
    ╚══════════════════════════════════════╝
    
    📊 Дашборды:
    - PM2: http://$SERVER_HOST:9615
    - API: http://$SERVER_HOST:3000
    - Inngest: http://$SERVER_HOST:8288
    
    📝 Логи:
    ssh $SERVER_USER@$SERVER_HOST 'pm2 logs'
    "
}

# Handle errors
trap 'error_handler' ERR

error_handler() {
    print_message "$RED" "❌ Ошибка во время деплоя!"
    send_notification "error" "Deployment failed at $(date)"
    exit 1
}

# Run main function
main "$@"
