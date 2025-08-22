# 📁 Project Organization Index

> **Навигация по документам и скриптам проекта**

## 📚 Documentation Structure

### 🚀 Features & Components
📍 `docs/features/`
- `APIFY_INSTAGRAM_INTEGRATION.md` - Миграция с RapidAPI на Apify
- `BOT_VALIDATION_FIX.md` - Исправление ошибок валидации ботов  
- `INSTAGRAM_PARSING_DATA_FLOW.md` - Поток данных Instagram парсинга
- `INSTAGRAM_SCRAPER_V2_DOCS.md` - Документация Instagram скрапера v2
- `REELS_MONITORING_IMPROVEMENTS.md` - Улучшения мониторинга рилсов
- `REELS_MONITORING_STARS_MODEL.md` - Модель оплаты звездами

### 🔧 API Documentation  
📍 `docs/api/`
- `COMPETITOR_API_DOCUMENTATION.md` - API документация для конкурентов

### 📖 Guides & Tutorials
📍 `docs/guides/`
- `PROJECT_AUTO_CREATION_GUIDE.md` - Гайд по автоматическому созданию проектов
- `VEO3_INTEGRATION_GUIDE.md` - Интеграция VEO3
- `DEV_COMMANDS.md` - Команды для разработки
- `DEV_START.md` - Быстрый старт для разработчиков

### 🏢 Project Management
📍 `docs/project/`
- `ТЕХНИЧЕСКОЕ_ЗАДАНИЕ_КЛИЕНТУ.md` - Техническое задание клиенту
- `CHECK_STATUS.md` - Статус проверки проекта
- `CLIENT_SYNC_REPORT.md` - Отчет синхронизации с клиентом
- `ORGANIZATION.md` - Организация проекта
- `PROJECT_STRUCTURE.md` - Структура проекта
- `SECURITY_INCIDENT_RESOLVED.md` - Отчет о безопасности

### 🚀 Deployment
📍 `docs/deployment/`
- `RAILWAY_DEPLOYMENT_DIAGNOSIS.md` - Диагностика развертывания Railway
- `DEPLOYMENT_SUCCESS.md` - Успешное развертывание
- `DOCKERFILE_FIX_SUCCESS.md` - Исправления Dockerfile
- `RAILWAY_SETUP_COMPLETE.md` - Полная настройка Railway
- `TWO_SERVICES_READY.md` - Готовность двух сервисов

### 📦 Legacy Documentation
📍 `docs/legacy/`
- Архивная документация предыдущих версий
- Старые отчеты и руководства
- Исторические записи изменений

## ⚙️ Scripts Structure

### 🧪 Testing Scripts
📍 `scripts/testing/`
- `test-competitor-endpoints.js` - Тестирование API конкурентов
- `test-competitor-service-direct.js` - Прямое тестирование сервисов
- `test-server-minimal.js` - Минимальное тестирование сервера
- `test-production-instagram-parsing.js` - Тестирование парсинга в продакшене
- `test-inngest-production.js` - Тестирование Inngest в продакшене
- `test-inngest-clean.js` - Чистое тестирование Inngest

### 🛠️ Maintenance Scripts  
📍 `scripts/maintenance/`
- `check-all-railway-urls.js` - Проверка всех Railway URL
- `check-correct-railway-server.js` - Проверка корректного Railway сервера
- `check-server-status.js` - Проверка статуса сервера

### 👨‍💻 Development Scripts
📍 `scripts/development/`
- `explore-working-server.js` - Исследование рабочего сервера

### 🔧 Utility Scripts  
📍 `scripts/utils/`
- Вспомогательные скрипты
- Инструменты для разработки
- Автоматизация задач

### 🔍 Debug Scripts
📍 `scripts/debug/`
- Скрипты для отладки
- Диагностические инструменты

### ✅ Check Scripts
📍 `scripts/checks/`
- Скрипты проверки системы
- Валидация конфигурации

## 🔐 Security Cleanup

✅ **ВЫПОЛНЕНО**: Очистка токенов и секретов
- Заменены реальные bot токены в `docker-compose.production.yml`
- Заменены токены в `docs/TESTING_PRODUCTION_READY.md`  
- Удалены спаленные ключи из документации

## 🗂️ File Organization Rules

### ✅ What's Organized:
- 📚 **Documentation**: Structured by category in `docs/`
- ⚙️ **Scripts**: Categorized by purpose in `scripts/`
- 🔐 **Security**: Sensitive data removed/sanitized
- 📂 **Legacy**: Old files moved to `docs/legacy/`

### 📋 Categories:
- **features/** - Feature documentation
- **api/** - API documentation  
- **guides/** - Tutorials and guides
- **project/** - Project management docs
- **deployment/** - Deployment related docs
- **legacy/** - Archived documentation

### 🎯 Next Steps:
1. Review `docs/legacy/` for outdated content
2. Consider consolidating duplicate documentation
3. Update README.md to reference this index
4. Set up automated organization checks

---
📅 **Last Updated**: $(date)  
🤖 **Generated by**: Claude Code Organization