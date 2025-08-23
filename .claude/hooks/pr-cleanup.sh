#!/bin/bash

# Автоматическая очистка PR от вспомогательных файлов
# Запускается после завершения задач, связанных с PR

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

echo "🧹 Запуск автоматической очистки PR от вспомогательных файлов..."

# Функция логирования
log() {
    echo "[PR-CLEANUP] $1"
}

# Счетчик удаленных файлов
DELETED_COUNT=0

# Функция безопасного удаления
safe_remove() {
    local target="$1"
    if [[ -e "$target" ]]; then
        rm -rf "$target" 2>/dev/null || true
        if [[ ! -e "$target" ]]; then
            log "✅ Удалено: $target"
            ((DELETED_COUNT++))
        fi
    fi
}

# 1. Удаление IDE конфигураций
log "🔧 Удаление IDE конфигураций..."
safe_remove ".cursor"
safe_remove ".vscode"
safe_remove ".idea"

# 2. Удаление директорий с выводом/отчетами
log "📊 Удаление директорий с выводом..."
safe_remove "output"
safe_remove "reports"
safe_remove "archive"

# 3. Удаление тестовых изображений и временных файлов
log "🖼️ Удаление тестовых файлов..."
safe_remove "test_images"
safe_remove "tmp"
safe_remove "temp"

# 4. Удаление debug скриптов
log "🐛 Удаление debug скриптов..."
safe_remove "scripts/debug"
find scripts/ -name "*debug*" -type f -delete 2>/dev/null || true

# 5. Удаление debug тестов
log "🧪 Удаление debug тестов..."
if [[ -d "tests/test-events" ]]; then
    find tests/test-events/ -name "debug-*.ts" -delete 2>/dev/null || true
fi

# 6. Очистка логов и временных файлов
log "📝 Удаление логов и временных файлов..."
find . -name "*.log" -type f -delete 2>/dev/null || true
find . -name "*.tmp" -type f -delete 2>/dev/null || true
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# 7. Проверка и очистка избыточной документации
log "📚 Проверка документации..."
if [[ -d "docs/legacy" ]] && [[ $(find docs/legacy -name "*.md" | wc -l) -gt 10 ]]; then
    log "⚠️ Обнаружено слишком много legacy документов ($(find docs/legacy -name "*.md" | wc -l))"
    # Оставляем только важные файлы
    find docs/legacy -name "*REPORT*.md" -not -name "*FINAL*" -delete 2>/dev/null || true
    find docs/legacy -name "*SUCCESS*.md" -not -name "*FINAL*" -delete 2>/dev/null || true
    find docs/legacy -name "*GUIDE*.md" -not -name "*INTEGRATION*" -not -name "*API*" -delete 2>/dev/null || true
fi

# 8. Проверка на git статус и предупреждение о большом количестве изменений
if command -v git &> /dev/null && [[ -d .git ]]; then
    CHANGED_FILES=$(git status --porcelain | wc -l)
    if [[ $CHANGED_FILES -gt 50 ]]; then
        log "⚠️ ВНИМАНИЕ: Обнаружено $CHANGED_FILES изменённых файлов в Git"
        log "   Рекомендуется проверить, все ли изменения нужны для PR"
    fi
fi

# Проверяем, были ли изменения
if [[ $DELETED_COUNT -gt 0 ]]; then
    log "✅ Очистка завершена! Удалено файлов/папок: $DELETED_COUNT"
    log "🔄 Рекомендация: проверьте git status перед созданием PR"
else
    log "✨ Проект уже чистый, ничего не удалено"
fi

echo "🎉 Автоматическая очистка PR завершена!"