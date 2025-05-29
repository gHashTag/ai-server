#!/bin/bash

# 🛡️ Reliability Check Script
# Комплексная проверка надежности AI Server

echo "🛡️ AI Server Reliability Check"
echo "================================"
echo "Дата: $(date)"
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Счетчики
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Функция для проверки
check_service() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "🔍 Проверка $name... "
    
    if command -v curl >/dev/null 2>&1; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
        if [ "$response" = "$expected_status" ]; then
            echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (HTTP $response, expected $expected_status)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ SKIP${NC} (curl not available)"
        return 2
    fi
}

# Функция для проверки JSON ответа
check_json_service() {
    local name="$1"
    local url="$2"
    local json_key="$3"
    local expected_value="$4"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "🔍 Проверка $name... "
    
    if command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
        response=$(curl -s "$url" 2>/dev/null)
        if [ $? -eq 0 ]; then
            actual_value=$(echo "$response" | jq -r ".$json_key" 2>/dev/null)
            if [ "$actual_value" = "$expected_value" ]; then
                echo -e "${GREEN}✅ OK${NC} ($json_key: $actual_value)"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
                return 0
            else
                echo -e "${RED}❌ FAIL${NC} ($json_key: $actual_value, expected $expected_value)"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                return 1
            fi
        else
            echo -e "${RED}❌ FAIL${NC} (No response)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ SKIP${NC} (curl or jq not available)"
        return 2
    fi
}

# Определяем базовый URL
if [ -n "$1" ]; then
    BASE_URL="$1"
else
    BASE_URL="http://localhost:3000"
fi

echo "🌐 Базовый URL: $BASE_URL"
echo ""

# 1. Основные health checks
echo -e "${BLUE}📊 1. Основные Health Checks${NC}"
echo "─────────────────────────────"

# Базовые endpoints (существующие)
check_service "Основной health check" "$BASE_URL/health" "200"

# Новые endpoints (могут не работать если сервер не перезапущен)
echo -n "🔍 Проверка новых health endpoints... "
if curl -s "$BASE_URL/health/detailed" >/dev/null 2>&1; then
    check_service "Детальный health check" "$BASE_URL/health/detailed" "200"
    check_service "Readiness check" "$BASE_URL/health/ready" "200"
    check_service "Liveness check" "$BASE_URL/health/live" "200"
else
    echo -e "${YELLOW}⚠️ SKIP${NC} (новые endpoints не развернуты)"
fi

echo ""

# 2. Metrics endpoints
echo -e "${BLUE}📈 2. Metrics Endpoints${NC}"
echo "─────────────────────────"

echo -n "🔍 Проверка metrics endpoints... "
if curl -s "$BASE_URL/metrics" >/dev/null 2>&1; then
    check_service "Prometheus metrics" "$BASE_URL/metrics" "200"
    check_service "JSON metrics" "$BASE_URL/metrics/json" "200"
    check_service "Circuit breaker metrics" "$BASE_URL/metrics/circuit-breakers" "200"
else
    echo -e "${YELLOW}⚠️ SKIP${NC} (metrics endpoints не развернуты)"
fi

echo ""

# 3. API endpoints
echo -e "${BLUE}🔌 3. API Endpoints${NC}"
echo "─────────────────────"

check_service "Root endpoint" "$BASE_URL/" "200"
check_service "API test endpoint" "$BASE_URL/api/test" "200"

echo ""

# 4. Проверка JSON структуры
echo -e "${BLUE}🧪 4. JSON Structure Checks${NC}"
echo "──────────────────────────"

# Убираем проверку root endpoint как JSON, так как он возвращает HTML
# check_json_service "Root status" "$BASE_URL/" "status" "success"

# Убираем проверку health как JSON, так как он тоже возвращает HTML
echo -n "🔍 Проверка JSON endpoints... "
if curl -s "$BASE_URL/health/detailed" >/dev/null 2>&1; then
    check_json_service "Health status" "$BASE_URL/health/detailed" "status" "OK"
else
    echo -e "${YELLOW}⚠️ SKIP${NC} (JSON endpoints не развернуты)"
fi

echo ""

# 5. Проверка TypeScript типов
echo -e "${BLUE}🔧 5. TypeScript Type Check${NC}"
echo "─────────────────────────"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "🔍 Проверка типов TypeScript... "

if command -v bun >/dev/null 2>&1; then
    if bun exec tsc --noEmit >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Ошибки типов найдены. Запустите: bun exec tsc --noEmit"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo -e "${YELLOW}⚠️ SKIP${NC} (bun not available)"
fi

echo ""

# 6. Проверка тестов надежности
echo -e "${BLUE}🧪 6. Reliability Tests${NC}"
echo "─────────────────────"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "🔍 Запуск тестов Circuit Breaker... "

if command -v npm >/dev/null 2>&1; then
    if npm test -- --testPathPattern="circuitBreaker.test.ts" --silent >/dev/null 2>&1; then
        echo -e "${GREEN}✅ OK${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Тесты не прошли. Запустите: npm test circuitBreaker.test.ts"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo -e "${YELLOW}⚠️ SKIP${NC} (npm not available)"
fi

echo ""

# 7. Проверка логов
echo -e "${BLUE}📝 7. Log Files Check${NC}"
echo "───────────────────"

TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo -n "🔍 Проверка доступности логов... "

if [ -d "logs" ]; then
    echo -e "${GREEN}✅ OK${NC} (директория logs существует)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # Проверяем размер логов
    log_size=$(du -sh logs 2>/dev/null | cut -f1)
    echo "   📁 Размер логов: $log_size"
else
    echo -e "${YELLOW}⚠️ WARNING${NC} (директория logs не найдена)"
fi

echo ""

# 8. Проверка памяти и ресурсов
echo -e "${BLUE}💾 8. Resource Usage Check${NC}"
echo "─────────────────────────"

if command -v ps >/dev/null 2>&1; then
    node_processes=$(ps aux | grep -c "[n]ode")
    echo "🔍 Активных Node.js процессов: $node_processes"
    
    if [ "$node_processes" -gt 5 ]; then
        echo -e "   ${YELLOW}⚠️ WARNING${NC}: Много Node.js процессов"
    else
        echo -e "   ${GREEN}✅ OK${NC}: Нормальное количество процессов"
    fi
fi

echo ""

# Итоговая статистика
echo -e "${BLUE}📊 ИТОГОВАЯ СТАТИСТИКА${NC}"
echo "═══════════════════════"
echo "Всего проверок: $TOTAL_CHECKS"
echo -e "Успешно: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Неудачно: ${RED}$FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!${NC}"
    echo -e "${GREEN}🛡️ Система надежна и готова к работе${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️ ОБНАРУЖЕНЫ ПРОБЛЕМЫ НАДЕЖНОСТИ${NC}"
    echo -e "${RED}🔧 Требуется внимание к неудачным проверкам${NC}"
    exit 1
fi 