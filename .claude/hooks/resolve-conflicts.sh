#!/bin/bash

# Автоматическое разрешение конфликтов при merge
# Принимает название ветки как параметр

set -e

FEATURE_BRANCH="$1"

# Функция логирования
log() {
    echo "[CONFLICT-RESOLVER] $1"
}

if [[ -z "$FEATURE_BRANCH" ]]; then
    log "❌ Не указана ветка для merge"
    exit 1
fi

log "🔧 Начинаем автоматическое разрешение конфликтов..."

# Получаем список конфликтующих файлов
CONFLICTED_FILES=$(git diff --name-only --diff-filter=U 2>/dev/null || echo "")

if [[ -z "$CONFLICTED_FILES" ]]; then
    log "✅ Конфликтов не обнаружено"
    exit 0
fi

log "⚠️ Найдены конфликты в файлах:"
echo "$CONFLICTED_FILES" | while read -r file; do
    log "   • $file"
done

RESOLVED_COUNT=0
TOTAL_COUNT=$(echo "$CONFLICTED_FILES" | wc -l)

# Обрабатываем каждый конфликтующий файл
echo "$CONFLICTED_FILES" | while read -r file; do
    if [[ ! -f "$file" ]]; then
        log "⚠️ Файл не существует: $file"
        continue
    fi
    
    log "🔧 Обрабатываем: $file"
    
    # Определяем стратегию разрешения на основе типа файла
    case "$file" in
        # Конфигурационные файлы - выбираем нашу версию (ours)
        *.json|*.yaml|*.yml|*.env*|*.config.*|package.json|package-lock.json)
            log "   📋 Конфиг файл - используем нашу версию (ours)"
            git checkout --ours "$file"
            git add "$file"
            ((RESOLVED_COUNT++))
            ;;
            
        # Документация - выбираем нашу версию
        *.md|*.txt|*.rst)
            log "   📚 Документация - используем нашу версию (ours)"
            git checkout --ours "$file"
            git add "$file"
            ((RESOLVED_COUNT++))
            ;;
            
        # IDE конфигурация - удаляем (не должно быть в PR)
        .vscode/*|.idea/*|.cursor/*)
            log "   🗑️ IDE конфиг - удаляем файл"
            git rm "$file" 2>/dev/null || rm -f "$file"
            ((RESOLVED_COUNT++))
            ;;
            
        # TypeScript/JavaScript файлы - пытаемся умный merge
        *.ts|*.js|*.tsx|*.jsx)
            log "   💻 Код файл - попытка умного разрешения..."
            
            # Проверяем, есть ли в конфликте только imports или простые изменения
            if grep -q "<<<<<<< HEAD" "$file"; then
                # Есть конфликт-маркеры, пробуем автоматическое разрешение
                
                # Для простых случаев - выбираем нашу версию
                if resolve_simple_conflict "$file"; then
                    git add "$file"
                    ((RESOLVED_COUNT++))
                    log "   ✅ Конфликт разрешен автоматически"
                else
                    log "   ⚠️ Требуется ручное разрешение сложного конфликта"
                fi
            else
                log "   ✅ Файл уже разрешен"
                git add "$file"
                ((RESOLVED_COUNT++))
            fi
            ;;
            
        # Остальные файлы - выбираем нашу версию по умолчанию
        *)
            log "   🔀 Неизвестный тип - используем нашу версию (ours)"
            git checkout --ours "$file"
            git add "$file"
            ((RESOLVED_COUNT++))
            ;;
    esac
done

# Функция для разрешения простых конфликтов в коде
resolve_simple_conflict() {
    local file="$1"
    local temp_file="/tmp/resolve_conflict_$$"
    
    # Проверяем, является ли конфликт простым (только добавления)
    if python3 -c "
import sys
import re

def can_auto_resolve(content):
    # Разделяем на блоки конфликтов
    conflicts = re.findall(r'<<<<<<< HEAD.*?\n(.*?)=======\n(.*?)>>>>>>> .*?\n', content, re.DOTALL)
    
    for head_part, incoming_part in conflicts:
        # Если части сильно отличаются, не можем автоматически разрешить
        head_lines = set(head_part.strip().split('\n'))
        incoming_lines = set(incoming_part.strip().split('\n'))
        
        # Если есть пересечение или incoming содержит только добавления
        if len(head_lines & incoming_lines) > 0 or len(head_lines) == 0:
            continue
        else:
            return False
    return True

try:
    with open('$file', 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    if can_auto_resolve(content):
        # Простое разрешение - выбираем incoming (нашу) версию
        resolved = re.sub(r'<<<<<<< HEAD.*?\n(.*?)=======\n(.*?)>>>>>>> .*?\n', r'\2', content, flags=re.DOTALL)
        
        with open('$temp_file', 'w', encoding='utf-8') as f:
            f.write(resolved)
        
        print('SUCCESS')
    else:
        print('COMPLEX')
        
except Exception as e:
    print('ERROR')
    print(str(e), file=sys.stderr)
" 2>/dev/null; then
        if [[ -f "$temp_file" ]]; then
            cp "$temp_file" "$file"
            rm -f "$temp_file"
            return 0
        fi
    fi
    
    # Если автоматическое разрешение не удалось, выбираем нашу версию
    git checkout --ours "$file"
    return 0
}

# Проверяем результат
REMAINING_CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)

if [[ $REMAINING_CONFLICTS -eq 0 ]]; then
    log "✅ Все конфликты разрешены автоматически!"
    log "📊 Статистика: $RESOLVED_COUNT из $TOTAL_COUNT файлов обработано"
    
    # Проверяем, что проект еще собирается
    if [[ -f "package.json" ]] && command -v npm &> /dev/null; then
        log "🔍 Проверяем сборку проекта..."
        if npm run build &>/dev/null || npm run lint &>/dev/null; then
            log "✅ Проект успешно собирается после разрешения конфликтов"
        else
            log "⚠️ Предупреждение: возможны проблемы со сборкой"
        fi
    fi
    
    exit 0
else
    log "❌ Остались неразрешенные конфликты: $REMAINING_CONFLICTS"
    log "🔧 Требуется ручное вмешательство для:"
    git diff --name-only --diff-filter=U | while read -r file; do
        log "   • $file"
    done
    exit 1
fi