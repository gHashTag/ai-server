#!/bin/bash

# 🧪 Скрипт для тестирования полной экосистемы разработки
# Проверяет что все сервисы запущены и работают корректно

set -e

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Тестирование экосистемы разработки${NC}"
echo "=============================================="

# Функция проверки доступности URL
check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Проверяю $name ($url)... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

# Функция проверки процесса
check_process() {
    local process_name=$1
    echo -n "Проверяю процесс $process_name... "
    
    if pgrep -f "$process_name" > /dev/null; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Not found${NC}"
        return 1
    fi
}

echo
echo -e "${YELLOW}📊 Проверка основных сервисов:${NC}"

# Проверка AI Server
check_service "AI Server" "http://localhost:4000"

# Проверка N8N
check_service "N8N Admin Panel" "http://localhost:5678" "401"  # 401 потому что требует аутентификации

# Проверка N8N API через AI Server
check_service "N8N API Integration" "http://localhost:4000/api/n8n/health"

# Проверка Inngest (может быть недоступен сразу)
echo -n "Проверяю Inngest Dashboard... "
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:8289" | grep -q "200\|404"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${YELLOW}⚠️  Starting up${NC}"
fi

echo
echo -e "${YELLOW}⚙️  Проверка процессов:${NC}"

# Проверка N8N процесса
check_process "n8n start"

echo
echo -e "${YELLOW}🔗 Проверка API эндпоинтов:${NC}"

# Проверка N8N workflows endpoint
check_service "N8N Workflows API" "http://localhost:4000/api/n8n/workflows"

echo
echo -e "${YELLOW}⚡ Быстрый тест функционала:${NC}"

# Тест webhook N8N (ожидаем 404, так как тестовый workflow может не существовать)
echo -n "Тест N8N webhook... "
http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:5678/webhook/test" -H "Content-Type: application/json" -d '{"test":"data"}' 2>/dev/null || echo "000")

if [ "$http_code" == "404" ] || [ "$http_code" == "200" ]; then
    echo -e "${GREEN}✅ Webhook endpoint accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Webhook status: $http_code${NC}"
fi

echo
echo "=============================================="
echo -e "${BLUE}📋 Сводка доступных сервисов:${NC}"
echo
echo -e "${GREEN}🌐 AI Server:${NC}        http://localhost:4000"
echo -e "${GREEN}⚡ Inngest Dashboard:${NC} http://localhost:8289"  
echo -e "${GREEN}🎛️  N8N Admin Panel:${NC}  http://localhost:5678"
echo -e "   └─ Логин: ${YELLOW}admin${NC} / Пароль: ${YELLOW}admin123${NC}"
echo -e "${GREEN}🔧 N8N API:${NC}          http://localhost:4000/api/n8n/*"
echo
echo -e "${BLUE}💡 Полезные команды:${NC}"
echo "  • Запуск N8N отдельно:     npm run n8n:standalone"
echo "  • Проверка процессов:      ps aux | grep n8n"
echo "  • Тест интеграции:         npm run n8n:test"
echo
echo -e "${GREEN}🎉 Экосистема разработки готова к работе!${NC}"
echo