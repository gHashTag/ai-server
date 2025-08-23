#!/bin/bash

# 🚀 Скрипт для запуска N8N интеграции с AI Server
# Автоматическая настройка и тестирование

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker и попробуйте снова."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
        exit 1
    fi
    
    success "Все зависимости установлены"
}

# Создание .env файла если его нет
setup_env() {
    if [ ! -f .env ]; then
        log "Создание .env файла..."
        
        cat > .env << EOF
# N8N Configuration
N8N_ADMIN_PASSWORD=admin123
N8N_WEBHOOK_URL=http://n8n:5678

# AI Server Configuration  
NODE_ENV=development
PORT=3000
SECRET_KEY=your-secret-key-here

# Add your other environment variables here
EOF
        
        warning "Создан базовый .env файл. Отредактируйте его перед продолжением."
        warning "Особенно важно установить безопасный N8N_ADMIN_PASSWORD"
    else
        success ".env файл уже существует"
    fi
}

# Сборка и запуск контейнеров
start_containers() {
    log "Запуск Docker контейнеров..."
    
    # Остановим существующие контейнеры
    docker-compose down 2>/dev/null || true
    
    # Запустим новые
    docker-compose up -d
    
    success "Контейнеры запущены"
}

# Ожидание готовности сервисов
wait_for_services() {
    log "Ожидание готовности сервисов..."
    
    # Ждем AI Server
    log "Проверка AI Server (порт 3000)..."
    timeout=60
    while ! curl -s http://localhost:3000/api/n8n/health >/dev/null 2>&1; do
        sleep 2
        timeout=$((timeout-2))
        if [ $timeout -le 0 ]; then
            error "AI Server не запустился в течение 60 секунд"
            return 1
        fi
    done
    success "AI Server готов"
    
    # Ждем N8N
    log "Проверка N8N (порт 5678)..."
    timeout=60
    while ! curl -s -u admin:admin123 http://localhost:5678/api/v1/workflows >/dev/null 2>&1; do
        sleep 2
        timeout=$((timeout-2))
        if [ $timeout -le 0 ]; then
            error "N8N не запустился в течение 60 секунд"
            return 1
        fi
    done
    success "N8N готов"
}

# Запуск тестов интеграции
run_integration_tests() {
    log "Запуск тестов интеграции..."
    
    if [ -f "dist/utils/logger.js" ]; then
        node tests/n8n/test-n8n-integration.js
    else
        warning "Проект не собран. Запускаем сборку..."
        npm run build
        node tests/n8n/test-n8n-integration.js
    fi
}

# Отображение информации о доступных сервисах
show_service_info() {
    echo
    echo "🎉 N8N интеграция успешно запущена!"
    echo
    echo "📊 Доступные сервисы:"
    echo "  • N8N Admin Panel:  http://localhost:5678"
    echo "    └─ Пользователь:   admin"
    echo "    └─ Пароль:         $(grep N8N_ADMIN_PASSWORD .env | cut -d'=' -f2)"
    echo
    echo "  • AI Server API:    http://localhost:3000"
    echo "    └─ Health Check:   http://localhost:3000/api/n8n/health"
    echo "    └─ Workflows:      http://localhost:3000/api/n8n/workflows"
    echo
    echo "🔗 Полезные команды:"
    echo "  • Просмотр логов N8N:     docker-compose logs -f n8n-admin"
    echo "  • Просмотр логов Server:  docker-compose logs -f ai-server"
    echo "  • Остановка сервисов:     docker-compose down"
    echo "  • Перезапуск:             docker-compose restart"
    echo
    echo "📚 Документация:"
    echo "  • Руководство:       N8N_INTEGRATION_GUIDE.md"
    echo "  • Тестовый workflow: n8n/workflows/test-ai-server-integration.json"
    echo
}

# Основная функция
main() {
    echo "🚀 Запуск N8N Workflow Automation для AI Server"
    echo "================================================"
    
    check_dependencies
    setup_env
    
    log "Сборка проекта..."
    npm run build
    
    start_containers
    
    if wait_for_services; then
        success "Все сервисы успешно запущены"
        
        log "Запуск тестов интеграции..."
        if run_integration_tests; then
            success "Тесты интеграции пройдены"
        else
            warning "Некоторые тесты не прошли, но система работает"
        fi
        
        show_service_info
    else
        error "Не удалось запустить все сервисы"
        echo
        echo "🔍 Отладка:"
        echo "  • Проверьте логи: docker-compose logs"
        echo "  • Убедитесь, что порты 3000 и 5678 свободны"
        echo "  • Проверьте .env файл на корректность"
        exit 1
    fi
}

# Обработка аргументов командной строки
case "${1:-}" in
    "test")
        log "Запуск только тестов..."
        run_integration_tests
        ;;
    "stop")
        log "Остановка сервисов..."
        docker-compose down
        success "Сервисы остановлены"
        ;;
    "restart")
        log "Перезапуск сервисов..."
        docker-compose down
        sleep 2
        docker-compose up -d
        success "Сервисы перезапущены"
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "status")
        docker-compose ps
        ;;
    *)
        main
        ;;
esac