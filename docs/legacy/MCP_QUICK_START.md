# 🚀 MCP Quick Start - Памятка для Гуру

## ✅ РЕШЕНИЕ НАЙДЕНО! Зеленый свет работает!

### 🔥 После перезапуска Cursor:

#### 1. Быстрая проверка (30 сек):
```bash
cd /Users/playra/ai-server
bash scripts/check-mcp-health.sh
```

#### 2. Проверить статус в Cursor:
- Settings → Features → Model Context Protocol
- Статус `ai-server-neurophoto` должен быть **🟢 зеленый**

#### 3. Протестировать в чате:
```
Создай нейрофото девушки с промптом "beautiful woman" и telegram_id "123456789"
```

---

## 🔧 При проблемах:

### Красный статус "Failed to create client":
```bash
# 1. Пересобрать проект
bun run build

# 2. Полностью перезапустить Cursor (Cmd+Q)

# 3. Проверить конфигурацию
cat .cursor/mcp.json
```

### Желтый статус "No tools available":
```bash
# Проверить MCP сервер
node scripts/test-mcp-tools.js
```

---

## 📁 Рабочие файлы:

- **Конфигурация:** `.cursor/mcp.json` ✅
- **Скрипт запуска:** `scripts/start-mcp-for-cursor.js` ✅  
- **Проверка системы:** `scripts/check-mcp-health.sh` ✅
- **Тестирование:** `scripts/test-mcp-tools.js` ✅

---

## 🎯 Инструмент create_neurophoto:

**Параметры:**
- `prompt` (string): Описание для генерации
- `gender` ("male" | "female"): Пол
- `telegram_id` (string): ID пользователя

**Пример:**
```
Создай нейрофото мужчины с промптом "handsome businessman" и telegram_id "987654321"
```

---

## 🔮 Альтернативная конфигурация:

Если основная не работает, используй:
- `.cursor/mcp-wrapper.json` (bash wrapper)

---

**🎉 ГОТОВО! MCP работает стабильно с зеленым статусом!** 🟢 