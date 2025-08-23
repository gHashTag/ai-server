#!/bin/bash

# Автоматическая очистка избыточной документации
# Запускается после создания MD файлов

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

echo "📚 Запуск очистки документации..."

# Функция логирования
log() {
    echo "[DOCS-CLEANUP] $1"
}

# Счетчик удаленных файлов
DELETED_COUNT=0

# Проверяем количество MD файлов в docs/
if [[ -d "docs" ]]; then
    TOTAL_DOCS=$(find docs/ -name "*.md" | wc -l)
    
    if [[ $TOTAL_DOCS -gt 30 ]]; then
        log "⚠️ Обнаружено слишком много документов: $TOTAL_DOCS"
        log "🧹 Начинаю очистку избыточной документации..."
        
        # Удаляем дублирующиеся отчеты
        if [[ -d "docs/legacy" ]]; then
            # Удаляем старые SUCCESS отчеты, оставляя только FINAL
            find docs/legacy -name "*SUCCESS*.md" -not -name "*FINAL*" -delete 2>/dev/null || true
            ((DELETED_COUNT += $(find docs/legacy -name "*SUCCESS*.md" -not -name "*FINAL*" 2>/dev/null | wc -l)))
            
            # Удаляем промежуточные REPORT файлы
            find docs/legacy -name "*REPORT*.md" -not -name "*FINAL*" -not -name "*COMPLETE*" -delete 2>/dev/null || true
            ((DELETED_COUNT += $(find docs/legacy -name "*REPORT*.md" -not -name "*FINAL*" -not -name "*COMPLETE*" 2>/dev/null | wc -l)))
            
            # Удаляем старые GUIDE файлы, кроме важных
            find docs/legacy -name "*GUIDE*.md" -not -name "*API*" -not -name "*INTEGRATION*" -not -name "*DEPLOYMENT*" -delete 2>/dev/null || true
            
            # Удаляем дублирующиеся SPEC файлы
            find docs/legacy -name "*SPEC*.md" -not -name "*COMPLETE*" -delete 2>/dev/null || true
        fi
        
        # Проверяем корневую папку docs на дубли
        find docs/ -maxdepth 1 -name "*_REPORT*.md" -delete 2>/dev/null || true
        find docs/ -maxdepth 1 -name "*_SUCCESS*.md" -delete 2>/dev/null || true
        find docs/ -maxdepth 1 -name "TEST_*.md" -delete 2>/dev/null || true
        
        FINAL_DOCS=$(find docs/ -name "*.md" | wc -l)
        REMOVED=$(($TOTAL_DOCS - $FINAL_DOCS))
        
        if [[ $REMOVED -gt 0 ]]; then
            log "✅ Удалено избыточных документов: $REMOVED"
            log "📊 Осталось документов: $FINAL_DOCS"
        else
            log "✨ Все документы актуальны"
        fi
    else
        log "✅ Количество документов в норме: $TOTAL_DOCS"
    fi
fi

# Проверяем корень проекта на избыточные MD файлы
ROOT_MD_COUNT=$(find . -maxdepth 1 -name "*.md" | grep -v README.md | wc -l)
if [[ $ROOT_MD_COUNT -gt 5 ]]; then
    log "⚠️ Слишком много MD файлов в корне: $ROOT_MD_COUNT"
    log "💡 Рекомендация: переместите документы в папку docs/"
fi

echo "📚 Очистка документации завершена!"