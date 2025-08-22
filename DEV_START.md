# 🚀 AI Server Development - Simple Start

Простой способ запуска без PM2 для лучшего контроля и отладки.

## 🎯 Быстрый старт

### 1. Основной сервер (обязательно)
```bash
npm run dev
```
✅ Автоперезагрузка при изменениях  
✅ Подробные логи в терминале  
✅ Доступен на http://localhost:4000  

### 2. Inngest сервер (опционально)
```bash
# В отдельном терминале
npm run dev:inngest
```
✅ Inngest функции и воркеры  
✅ Dashboard на http://localhost:8289  
✅ Чистые логи без шума  

### 3. MCP сервер (опционально)
```bash
# В отдельном терминале  
npm run dev:mcp
```
✅ Интеграция с Claude Code  
✅ Инструменты для ИИ  

## 📋 Полезные команды

### Проверка сервисов
```bash
# Проверить статус всех сервисов
bash scripts/check-services.sh

# Показать доступные команды
bash scripts/start-dev.sh
```

### Логи и отладка
```bash
npm run logs:clean    # Только важные логи
npm run logs:errors   # Только ошибки  
npm run logs:api      # HTTP запросы
npm run logs:help     # Все опции
```

## 🔧 Рекомендуемая настройка

### Способ 1: Минимальный (только основной сервер)
```bash
npm run dev
```

### Способ 2: Полный стек (3 терминала)
```bash
# Терминал 1
npm run dev

# Терминал 2  
npm run dev:inngest

# Терминал 3
npm run dev:mcp
```

## ✅ Преимущества нового подхода

- 🎯 **Простота**: Каждый сервис в отдельном окне
- 🔍 **Видимость**: Все логи сразу видны
- 🚀 **Скорость**: Быстрый запуск и остановка
- 🛠 **Отладка**: Легко найти проблемы
- 🔄 **Контроль**: Полный контроль над каждым сервисом

## 🔗 Ссылки

- **Main API**: http://localhost:4000
- **Health Check**: http://localhost:4000/health  
- **Inngest Dashboard**: http://localhost:8289
- **API Docs**: http://localhost:4000/api-docs

## 🆘 Troubleshooting

### Сервер не запускается
```bash
# Проверить порты
lsof -i :4000

# Пересобрать
npm run build

# Проверить логи
npm run logs:errors
```

### Inngest не работает
```bash
# Проверить порт
lsof -i :8289

# Перезапустить
# Ctrl+C и снова npm run dev:inngest
```

---

**💡 Tip**: Используйте разные вкладки терминала для каждого сервиса - так удобнее следить за логами!