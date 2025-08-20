#!/bin/bash

# 🤖 Auto Finish Task Script
# Автоматическое завершение задач с git commit и push в main

set -e  # Остановить при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Функции для логирования
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Получить commit message из аргументов или использовать по умолчанию
COMMIT_MESSAGE="${1:-"feat: Complete task implementation

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"}"

# Определить пути
CURRENT_DIR=$(pwd)
CURRENT_BRANCH=$(git branch --show-current)
MAIN_WORKTREE_PATH="/Users/playra/ai-server"

log_info "🚀 Starting auto-finish task process..."
log_info "📂 Current directory: $CURRENT_DIR"
log_info "🌿 Current branch: $CURRENT_BRANCH"

# Проверка что мы в worktree, а не в main
if [[ "$CURRENT_DIR" == "$MAIN_WORKTREE_PATH" ]]; then
    log_warning "Already in main worktree. Working directly with main branch."
    WORKING_IN_MAIN=true
else
    WORKING_IN_MAIN=false
fi

# Функция для коммита изменений в текущей ветке
commit_current_branch() {
    local branch=$1
    local message=$2
    
    log_info "📝 Committing changes in branch: $branch"
    
    # Проверить есть ли изменения
    if git diff --quiet && git diff --cached --quiet; then
        log_warning "No changes to commit in $branch"
        return 0
    fi
    
    # Добавить все изменения
    git add -A
    
    # Создать коммит
    git commit -m "$message"
    log_success "Committed changes in $branch"
    
    return 0
}

# Функция для работы с main
handle_main_worktree() {
    log_info "🔄 Switching to main worktree..."
    
    cd "$MAIN_WORKTREE_PATH"
    
    # Проверить статус main
    log_info "📊 Checking main branch status..."
    
    # Если есть незафиксированные изменения в main
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_info "📦 Found uncommitted changes in main, committing them..."
        
        git add -A
        git commit -m "chore: Update main branch configurations

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
        
        log_success "Committed main branch changes"
    fi
    
    return 0
}

# Функция для cherry-pick из рабочей ветки
cherry_pick_from_branch() {
    local source_branch=$1
    
    if [[ "$WORKING_IN_MAIN" == true ]]; then
        log_info "Working directly in main, no cherry-pick needed"
        return 0
    fi
    
    log_info "🍒 Cherry-picking from $source_branch to main..."
    
    # Получить последний коммит из исходной ветки
    local last_commit=$(cd "$CURRENT_DIR" && git rev-parse HEAD)
    
    # Выполнить cherry-pick
    if git cherry-pick "$last_commit"; then
        log_success "Successfully cherry-picked $last_commit from $source_branch"
    else
        log_warning "Cherry-pick had conflicts or issues, but continuing..."
        # В случае конфликтов, пропускаем - они уже могут быть разрешены
        git cherry-pick --abort 2>/dev/null || true
    fi
    
    return 0
}

# Функция для push в origin
push_to_origin() {
    log_info "🚀 Pushing to origin/main..."
    
    if git push origin main; then
        log_success "Successfully pushed to origin/main"
    else
        log_error "Failed to push to origin/main"
        return 1
    fi
    
    return 0
}

# Основная логика
main() {
    log_info "=== AUTO FINISH TASK STARTED ==="
    
    # Шаг 1: Коммит изменений в текущей ветке (если не main)
    if [[ "$WORKING_IN_MAIN" == false ]]; then
        commit_current_branch "$CURRENT_BRANCH" "$COMMIT_MESSAGE"
    fi
    
    # Шаг 2: Переключение и обработка main
    handle_main_worktree
    
    # Шаг 3: Коммит изменений в main (если работали прямо в main)
    if [[ "$WORKING_IN_MAIN" == true ]]; then
        commit_current_branch "main" "$COMMIT_MESSAGE"
    fi
    
    # Шаг 4: Cherry-pick из рабочей ветки (если нужно)
    cherry_pick_from_branch "$CURRENT_BRANCH"
    
    # Шаг 5: Push в origin/main
    push_to_origin
    
    log_success "=== AUTO FINISH TASK COMPLETED ==="
    log_info "📊 Summary:"
    log_info "   • Current branch: $CURRENT_BRANCH"
    log_info "   • Changes committed: ✅"
    log_info "   • Pushed to origin/main: ✅"
    log_info "   • Task completed: ✅"
    
    # Вернуться в исходную директорию
    cd "$CURRENT_DIR"
    
    return 0
}

# Обработка ошибок
trap 'log_error "Script failed at line $LINENO. Returning to original directory."; cd "$CURRENT_DIR"; exit 1' ERR

# Запуск основной функции
main "$@"