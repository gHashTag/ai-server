# 🤖 Claude Auto-Finish Task Rules

## Правила автоматического завершения задач

Добавьте эти правила в основные инструкции для Claude:

---

## 🎯 АВТОМАТИЧЕСКОЕ ЗАВЕРШЕНИЕ ЗАДАЧ

### **Когда автоматически завершать задачу:**

1. ✅ **Задача выполнена полностью** - все TodoWrite items имеют status "completed"
2. ✅ **Создано/изменено 3+ файлов** - значительная работа проделана
3. ✅ **Пользователь явно просит завершить** - фразы типа "завершай", "заканчивай", "делай commit"
4. ✅ **Создана документация/спецификация** - финальные deliverables готовы
5. ✅ **Написан значительный код** - новые функции/модули реализованы

### **Когда НЕ завершать автоматически:**

❌ **Исследовательские задачи** - только изучение кода без изменений  
❌ **Промежуточные вопросы** - пользователь просто уточняет детали  
❌ **Небольшие правки** - изменение 1-2 строк кода  
❌ **Пользователь не просил коммит** - только показывает результат  

---

## 🔄 АЛГОРИТМ АВТОМАТИЧЕСКОГО ЗАВЕРШЕНИЯ

### **1. Проверка готовности:**
```markdown
Задача завершена, если:
- Все TodoWrite tasks = "completed" 
- Создано/изменено 3+ значимых файлов
- Решена поставленная проблема
- Созданы финальные deliverables
```

### **2. Генерация commit message:**
```markdown
Используй формат:
feat: [Краткое описание задачи]

[Подробное описание изменений]
- Список ключевых изменений
- Созданные файлы/функции  
- Решенные проблемы

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **3. Выполнение скрипта:**
```bash
# Автоматически запустить:
/Users/playra/ai-server/worktrees/parsing-2/scripts/auto-finish-task.sh "commit_message"
```

---

## 📋 ШАБЛОНЫ COMMIT MESSAGES

### **Создание новой функциональности:**
```
feat: Implement Instagram parsing system

- Add universal Instagram scraper with Zod validation
- Create competitor subscription management API
- Add automatic HTML/Excel report generation
- Implement real-time parsing status updates
- Add comprehensive error handling and retry logic

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **Создание документации:**
```
docs: Add comprehensive frontend technical specification

- Create universal parsing system documentation  
- Add detailed API endpoints specification
- Include UI/UX component examples
- Add real-time WebSocket integration guide
- Provide error handling and security guidelines

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **Исправление багов:**
```
fix: Resolve Instagram API rate limiting issues

- Add exponential backoff retry mechanism
- Implement proper error handling for 429 responses  
- Update API timeout configuration
- Add connection pooling for database operations
- Fix memory leaks in long-running processes

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### **Рефакторинг:**
```
refactor: Optimize parsing system architecture

- Separate API layer from business logic
- Add dependency injection for better testability
- Extract common validation schemas to shared module
- Implement factory patterns for parser creation
- Reduce code duplication across components

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🎯 ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ В ДИАЛОГЕ

### **Сценарий 1: Завершение большой задачи**
```
Пользователь: "Создай систему парсинга Instagram для фронтенда"

[Claude работает с кодом, создает файлы, обновляет TodoWrite]

Claude: "✅ Система парсинга Instagram создана и готова!

Создал:
- InstagramParser.ts - основной парсер
- API endpoints для фронтенда  
- Техническую документацию
- Схемы валидации Zod

Автоматически завершаю задачу и делаю commit..."

[Выполняется auto-finish-task.sh]
```

### **Сценарий 2: Исследовательская задача (НЕ завершать)**
```
Пользователь: "Покажи как работает парсинг Instagram"

Claude: "Вот как работает система парсинга:
[показывает код и объясняет]

Нужно ли внести изменения или создать что-то новое?"

[НЕ запускает auto-finish-task.sh до прямой просьбы]
```

---

## ⚙️ КОНФИГУРАЦИЯ СКРИПТА

### **Расположение скрипта:**
```
/Users/playra/ai-server/worktrees/parsing-2/scripts/auto-finish-task.sh
```

### **Параметры:**
```bash
# Использование с кастомным сообщением
./auto-finish-task.sh "feat: Custom commit message"

# Использование с автогенерированным сообщением  
./auto-finish-task.sh
```

### **Что делает скрипт:**
1. 🔍 Анализирует текущую ветку и статус
2. 📝 Коммитит изменения в рабочей ветке
3. 🔄 Переключается в main worktree
4. 📦 Коммитит изменения в main (если есть)
5. 🍒 Cherry-pick из рабочей ветки в main
6. 🚀 Пушит все изменения в origin/main
7. ✅ Возвращается в исходную директорию

---

## 🛡️ БЕЗОПАСНОСТЬ И ПРОВЕРКИ

### **Перед автозавершением ВСЕГДА проверяй:**
- [ ] Код компилируется без ошибок
- [ ] Созданы все необходимые файлы
- [ ] TodoWrite содержит только "completed" статусы
- [ ] Нет критических TODO или FIXME комментариев
- [ ] Commit message соответствует изменениям

### **НЕ завершай автоматически если:**
- ⚠️ В коде есть syntax ошибки
- ⚠️ Тесты падают (если есть)
- ⚠️ Пользователь не подтвердил результат
- ⚠️ Задача только частично выполнена

---

## 🔄 ИНТЕГРАЦИЯ В WORKFLOW

### **В конце КАЖДОЙ значимой задачи:**

1. **Проверь условия автозавершения**
2. **Сгенерируй подходящий commit message**
3. **Запусти auto-finish-task.sh**
4. **Подтверди успешное выполнение**

### **Пример интеграции:**
```markdown
Claude: "✅ Все задачи завершены успешно!

Создано:
- UNIVERSAL_PARSING_FRONTEND_SPEC.md
- Instagram API integration
- WebSocket real-time updates

Автоматически завершаю задачу..."

[Выполняется скрипт]

Claude: "🎉 Изменения успешно запушены в main! 
Задача полностью завершена и готова к использованию."
```

---

## 📞 ОТЛАДКА СКРИПТА

### **Если скрипт не работает:**
```bash
# Проверить права доступа
ls -la /Users/playra/ai-server/worktrees/parsing-2/scripts/auto-finish-task.sh

# Запустить в режиме отладки
bash -x /Users/playra/ai-server/worktrees/parsing-2/scripts/auto-finish-task.sh

# Проверить git статус
git status
git worktree list
```

### **Логи скрипта показывают:**
- 📂 Текущая директория и ветка
- 📝 Статус коммитов  
- 🔄 Результат cherry-pick
- 🚀 Статус push в origin

---

**Эти правила обеспечат автоматическое и правильное завершение задач с сохранением в Git!** 🎯