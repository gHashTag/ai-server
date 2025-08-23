#!/bin/bash

# Автоматический merge в production с разрешением конфликтов
# Запускается после успешного завершения задачи в feature branch

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CURRENT_DIR="$(pwd)"
PRODUCTION_WORKTREE="/Users/playra/ai-server/worktrees/competitors"

# Функция логирования
log() {
    echo "[AUTO-MERGE] $1"
}

# Функция для возврата в исходную директорию при ошибке
cleanup() {
    cd "$CURRENT_DIR"
}
trap cleanup EXIT

echo "🚀 Запуск автоматического merge в production..."

# Проверяем, что мы в git репозитории
if [[ ! -d .git ]] && [[ ! -f .git ]]; then
    log "⚠️ Не git репозиторий, пропускаем merge"
    exit 0
fi

# Проверяем наличие production worktree
if [[ ! -d "$PRODUCTION_WORKTREE" ]]; then
    log "⚠️ Production worktree не найден: $PRODUCTION_WORKTREE"
    exit 1
fi

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [[ -z "$CURRENT_BRANCH" ]]; then
    log "⚠️ Не удалось определить текущую ветку"
    exit 1
fi

# Пропускаем merge для main/production веток
if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "production" ]]; then
    log "ℹ️ Пропускаем merge для основной ветки: $CURRENT_BRANCH"
    exit 0
fi

# Проверяем, есть ли незакоммиченные изменения
if [[ -n "$(git status --porcelain)" ]]; then
    log "⚠️ Есть незакоммиченные изменения, пропускаем merge"
    exit 1
fi

log "📋 Текущая ветка: $CURRENT_BRANCH"
log "🎯 Начинаем merge в production..."

# Переходим в production worktree
cd "$PRODUCTION_WORKTREE"
log "📁 Перешли в production worktree: $(pwd)"

# Проверяем статус production ветки
log "📊 Проверяем статус production ветки..."
git status

# Пуллим latest изменения из origin
log "⬇️ Пуллим latest изменения из origin/production..."
if git pull origin production 2>/dev/null; then
    log "✅ Production обновлен успешно"
else
    log "⚠️ Не удалось обновить production (возможно нет изменений)"
fi

# Пуллим изменения из feature ветки
log "⬇️ Пуллим изменения из origin/$CURRENT_BRANCH..."
git fetch origin "$CURRENT_BRANCH" 2>/dev/null || {
    log "❌ Не удалось получить изменения из ветки $CURRENT_BRANCH"
    exit 1
}

# Начинаем merge
log "🔀 Начинаем merge $CURRENT_BRANCH в production..."
if git merge "origin/$CURRENT_BRANCH" --no-edit -m "chore: Merge $CURRENT_BRANCH into production

Автоматический merge из ветки $CURRENT_BRANCH в production.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>" 2>/dev/null; then
    
    log "✅ Merge выполнен успешно без конфликтов!"
    
    # Пушим изменения в production
    log "📤 Пушим изменения в origin/production..."
    if git push origin production 2>/dev/null; then
        log "✅ Изменения успешно запушены в production!"
        
        # Получаем хеш коммита для логирования
        MERGE_COMMIT=$(git rev-parse HEAD)
        log "📝 Commit hash: $MERGE_COMMIT"
        
    else
        log "❌ Не удалось запушить изменения в production"
        exit 1
    fi
    
else
    # Есть конфликты, пытаемся разрешить автоматически
    log "⚠️ Обнаружены конфликты, запускаем автоматическое разрешение..."
    
    # Вызываем скрипт разрешения конфликтов
    if "$PROJECT_DIR/.claude/hooks/resolve-conflicts.sh" "$CURRENT_BRANCH"; then
        log "✅ Конфликты разрешены автоматически"
        
        # Коммитим результат merge
        git commit -m "chore: Merge $CURRENT_BRANCH into production with conflict resolution

Автоматический merge из ветки $CURRENT_BRANCH в production 
с автоматическим разрешением конфликтов.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        
        # Пушим изменения
        log "📤 Пушим разрешенные изменения в origin/production..."
        if git push origin production; then
            log "✅ Merge с разрешением конфликтов завершен успешно!"
        else
            log "❌ Не удалось запушить разрешенные изменения"
            exit 1
        fi
        
    else
        log "❌ Не удалось автоматически разрешить конфликты"
        log "🔧 Требуется ручное вмешательство:"
        log "   cd $PRODUCTION_WORKTREE"
        log "   git status"
        log "   # разрешите конфликты вручную"
        log "   git add ."
        log "   git commit"
        log "   git push origin production"
        exit 1
    fi
fi

# Показываем финальный статус
log "📊 Финальный статус production:"
git log --oneline -3

echo ""
log "🎉 Автоматический merge в production завершен успешно!"
log "🌐 Production обновлен с изменениями из ветки: $CURRENT_BRANCH"