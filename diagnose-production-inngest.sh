#!/bin/bash

echo "🔍 ДИАГНОСТИКА INNGEST В PRODUCTION"
echo "==================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PRODUCTION_URL="https://ai-server-u14194.vm.elestio.app"
API_ENDPOINT="$PRODUCTION_URL/api/inngest"

echo ""
echo -e "${BLUE}📋 Проверяемые компоненты:${NC}"
echo "• Environment Variables"
echo "• Inngest Serve Endpoint"
echo "• Function Registration" 
echo "• Event Processing"
echo ""

# 1. Проверка Environment Variables
echo -e "${BLUE}1. 🔧 Environment Variables:${NC}"

if [ -z "$INNGEST_SIGNING_KEY" ]; then
    echo -e "   ${RED}❌ INNGEST_SIGNING_KEY не установлен${NC}"
else
    echo -e "   ${GREEN}✅ INNGEST_SIGNING_KEY: ${INNGEST_SIGNING_KEY:0:20}...${NC}"
fi

if [ -z "$INNGEST_EVENT_KEY" ]; then
    echo -e "   ${RED}❌ INNGEST_EVENT_KEY не установлен${NC}"
else
    echo -e "   ${GREEN}✅ INNGEST_EVENT_KEY: ${INNGEST_EVENT_KEY:0:20}...${NC}"
fi

# 2. Проверка Inngest Serve Endpoint
echo ""
echo -e "${BLUE}2. 🌐 Inngest Serve Endpoint:${NC}"

ENDPOINT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_ENDPOINT")
HTTP_STATUS=$(echo $ENDPOINT_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
RESPONSE_BODY=$(echo $ENDPOINT_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "   ${GREEN}✅ Endpoint доступен: $API_ENDPOINT${NC}"
    
    # Проверяем количество функций
    FUNCTIONS_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"functionsFound":[0-9]*' | cut -d':' -f2)
    if [ "$FUNCTIONS_COUNT" -gt 0 ]; then
        echo -e "   ${GREEN}✅ Найдено функций: $FUNCTIONS_COUNT${NC}"
    else
        echo -e "   ${RED}❌ Функции не найдены${NC}"
    fi
    
    # Проверяем signing key
    HAS_SIGNING_KEY=$(echo "$RESPONSE_BODY" | grep -o '"hasSigningKey":[a-z]*' | cut -d':' -f2)
    if [ "$HAS_SIGNING_KEY" = "true" ]; then
        echo -e "   ${GREEN}✅ Signing Key настроен${NC}"
    else
        echo -e "   ${RED}❌ Signing Key НЕ настроен${NC}"
    fi
    
    # Проверяем event key
    HAS_EVENT_KEY=$(echo "$RESPONSE_BODY" | grep -o '"hasEventKey":[a-z]*' | cut -d':' -f2)
    if [ "$HAS_EVENT_KEY" = "true" ]; then
        echo -e "   ${GREEN}✅ Event Key настроен${NC}"
    else
        echo -e "   ${RED}❌ Event Key НЕ настроен${NC}"
    fi
    
else
    echo -e "   ${RED}❌ Endpoint недоступен (HTTP $HTTP_STATUS)${NC}"
    echo -e "   ${YELLOW}   URL: $API_ENDPOINT${NC}"
    echo -e "   ${YELLOW}   Ответ: $RESPONSE_BODY${NC}"
fi

# 3. Тест отправки события
echo ""
echo -e "${BLUE}3. 📤 Тест отправки события:${NC}"

EVENT_DATA='{
  "name": "instagram/scraper-v2",
  "data": {
    "username_or_id": "test_diagnosis",
    "project_id": 37,
    "max_users": 3,
    "scrape_reels": false,
    "requester_telegram_id": "diagnosis_test"
  }
}'

EVENT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$EVENT_DATA")

EVENT_HTTP_STATUS=$(echo $EVENT_RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
EVENT_RESPONSE_BODY=$(echo $EVENT_RESPONSE | sed -e 's/HTTPSTATUS\:.*//g')

if [ "$EVENT_HTTP_STATUS" -eq 200 ] || [ "$EVENT_HTTP_STATUS" -eq 201 ]; then
    echo -e "   ${GREEN}✅ Событие отправлено успешно${NC}"
    
    # Проверяем Event ID
    EVENT_ID=$(echo "$EVENT_RESPONSE_BODY" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$EVENT_ID" ]; then
        echo -e "   ${GREEN}✅ Event ID: $EVENT_ID${NC}"
    fi
else
    echo -e "   ${RED}❌ Ошибка отправки события (HTTP $EVENT_HTTP_STATUS)${NC}"
    echo -e "   ${YELLOW}   Ответ: $EVENT_RESPONSE_BODY${NC}"
fi

# 4. Проверка Docker состояния
echo ""
echo -e "${BLUE}4. 🐳 Docker Containers (если доступно):${NC}"

if command -v docker &> /dev/null; then
    DOCKER_STATUS=$(docker ps --filter "name=ai-server" --format "table {{.Names}}\t{{.Status}}" 2>/dev/null)
    if [ ! -z "$DOCKER_STATUS" ]; then
        echo -e "   ${GREEN}✅ Docker контейнеры:${NC}"
        echo "$DOCKER_STATUS" | while IFS= read -r line; do
            echo "      $line"
        done
    else
        echo -e "   ${YELLOW}⚠️  AI Server контейнер не найден${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  Docker не доступен в этой среде${NC}"
fi

# 5. Итоговая диагностика
echo ""
echo "==================================="
echo -e "${BLUE}📊 ИТОГОВАЯ ДИАГНОСТИКА:${NC}"

ISSUES_COUNT=0

if [ -z "$INNGEST_SIGNING_KEY" ]; then
    echo -e "${RED}❌ Отсутствует INNGEST_SIGNING_KEY${NC}"
    ((ISSUES_COUNT++))
fi

if [ -z "$INNGEST_EVENT_KEY" ]; then
    echo -e "${RED}❌ Отсутствует INNGEST_EVENT_KEY${NC}"
    ((ISSUES_COUNT++))
fi

if [ "$HTTP_STATUS" -ne 200 ]; then
    echo -e "${RED}❌ Inngest endpoint недоступен${NC}"
    ((ISSUES_COUNT++))
fi

if [ "$FUNCTIONS_COUNT" -eq 0 ] 2>/dev/null; then
    echo -e "${RED}❌ Функции не зарегистрированы${NC}"
    ((ISSUES_COUNT++))
fi

if [ "$EVENT_HTTP_STATUS" -ne 200 ] && [ "$EVENT_HTTP_STATUS" -ne 201 ]; then
    echo -e "${RED}❌ События не обрабатываются${NC}"
    ((ISSUES_COUNT++))
fi

echo ""
if [ "$ISSUES_COUNT" -eq 0 ]; then
    echo -e "${GREEN}🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!${NC}"
    echo -e "${GREEN}   Inngest полностью настроен в production${NC}"
else
    echo -e "${RED}🚨 НАЙДЕНО ПРОБЛЕМ: $ISSUES_COUNT${NC}"
    echo ""
    echo -e "${YELLOW}🔧 РЕШЕНИЕ:${NC}"
    echo "1. Добавьте INNGEST_SIGNING_KEY в .env"
    echo "2. Добавьте INNGEST_EVENT_KEY в .env" 
    echo "3. Обновите docker-compose.yml с Inngest переменными"
    echo "4. Перезапустите контейнеры: docker-compose up -d"
    echo ""
    echo -e "${BLUE}📖 Подробная инструкция: PRODUCTION_INNGEST_DIAGNOSIS.md${NC}"
fi

echo "===================================" 