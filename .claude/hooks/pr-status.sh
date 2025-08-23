#!/bin/bash

# Отображение статуса PR и ссылки в конце задачи
# Запускается после завершения задачи

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# Функция логирования
log() {
    echo "[PR-STATUS] $1"
}

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "🎯 ОТЧЕТ О ВЫПОЛНЕНИИ ЗАДАЧИ"
echo "═══════════════════════════════════════════════════════════════════════════════"

# Проверяем, что мы в git репозитории
if [[ ! -d .git ]] && [[ ! -f .git ]]; then
    log "⚠️ Не git репозиторий"
    exit 0
fi

# Проверяем наличие gh (GitHub CLI)
if ! command -v gh &> /dev/null; then
    log "⚠️ GitHub CLI не установлен"
    exit 0
fi

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [[ -z "$CURRENT_BRANCH" ]]; then
    log "⚠️ Не удалось определить текущую ветку"
    exit 0
fi

# Показываем информацию о ветке
echo "🌿 ТЕКУЩАЯ ВЕТКА: $CURRENT_BRANCH"

# Проверяем статус git
CHANGED_FILES=$(git status --porcelain | wc -l)
UNCOMMITTED_CHANGES=$(git diff --name-only | wc -l)
UNPUSHED_COMMITS=$(git log --oneline @{upstream}..HEAD 2>/dev/null | wc -l || echo "0")

echo "📊 СТАТУС ИЗМЕНЕНИЙ:"
echo "   • Измененных файлов: $CHANGED_FILES"
echo "   • Незакоммиченных изменений: $UNCOMMITTED_CHANGES"
echo "   • Непропушенных коммитов: $UNPUSHED_COMMITS"

# Ищем сохраненную ссылку на PR
PR_URL=""
if [[ -f ".claude/current_pr_url" ]]; then
    PR_URL=$(cat .claude/current_pr_url 2>/dev/null || echo "")
fi

# Если нет сохраненной ссылки, ищем через GitHub CLI
if [[ -z "$PR_URL" ]] && [[ "$CURRENT_BRANCH" != "main" ]] && [[ "$CURRENT_BRANCH" != "master" ]]; then
    PR_INFO=$(gh pr list --head "$CURRENT_BRANCH" --state open --json number,url,title 2>/dev/null || echo "[]")
    if [[ "$PR_INFO" != "[]" ]]; then
        PR_URL=$(echo "$PR_INFO" | jq -r '.[0].url' 2>/dev/null || echo "")
        PR_TITLE=$(echo "$PR_INFO" | jq -r '.[0].title' 2>/dev/null || echo "")
        PR_NUMBER=$(echo "$PR_INFO" | jq -r '.[0].number' 2>/dev/null || echo "")
    fi
fi

# Отображаем информацию о PR
if [[ -n "$PR_URL" ]]; then
    echo ""
    echo "🎉 PULL REQUEST СТАТУС:"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    echo "🔗 ССЫЛКА:     $PR_URL"
    if [[ -n "$PR_TITLE" ]]; then
        echo "📋 ЗАГОЛОВОК:  $PR_TITLE"
    fi
    if [[ -n "$PR_NUMBER" ]]; then
        echo "🔢 НОМЕР:      #$PR_NUMBER"
    fi
    echo "🌿 ВЕТКА:      $CURRENT_BRANCH"
    
    # Проверяем статус PR
    if command -v gh &> /dev/null; then
        PR_STATUS=$(gh pr view "$CURRENT_BRANCH" --json state,mergeable,reviewDecision 2>/dev/null || echo '{}')
        STATE=$(echo "$PR_STATUS" | jq -r '.state // "unknown"')
        MERGEABLE=$(echo "$PR_STATUS" | jq -r '.mergeable // "unknown"')
        REVIEW_DECISION=$(echo "$PR_STATUS" | jq -r '.reviewDecision // "PENDING"')
        
        echo "📊 СОСТОЯНИЕ:  $STATE"
        case "$MERGEABLE" in
            "MERGEABLE")
                echo "✅ ГОТОВ К СЛИЯНИЮ: Да"
                ;;
            "CONFLICTING")
                echo "⚠️ ГОТОВ К СЛИЯНИЮ: Конфликты требуют разрешения"
                ;;
            *)
                echo "⏳ ГОТОВ К СЛИЯНИЮ: Проверяется..."
                ;;
        esac
        
        case "$REVIEW_DECISION" in
            "APPROVED")
                echo "✅ РЕВЬЮ: Одобрено"
                ;;
            "CHANGES_REQUESTED")
                echo "🔄 РЕВЬЮ: Требуются изменения"
                ;;
            "REVIEW_REQUIRED")
                echo "👀 РЕВЬЮ: Требуется проверка"
                ;;
            *)
                echo "⏳ РЕВЬЮ: Ожидает проверки"
                ;;
        esac
    fi
    
    echo ""
    echo "💡 РЕКОМЕНДАЦИИ:"
    if [[ $UNPUSHED_COMMITS -gt 0 ]]; then
        echo "   • Запуште изменения: git push"
    fi
    if [[ $UNCOMMITTED_CHANGES -gt 0 ]]; then
        echo "   • Закоммитьте изменения: git add . && git commit -m \"update\""
    fi
    echo "   • Проверьте PR по ссылке выше"
    echo "   • Убедитесь что все чеки проходят"
    echo "   • Дождитесь ревью или слейте при готовности"
    
else
    echo ""
    echo "ℹ️ PULL REQUEST НЕ НАЙДЕН"
    echo "═══════════════════════════════════════════════════════════════════════════════"
    if [[ "$CURRENT_BRANCH" == "main" ]] || [[ "$CURRENT_BRANCH" == "master" ]]; then
        echo "   • Работа в основной ветке ($CURRENT_BRANCH)"
    elif [[ $UNPUSHED_COMMITS -eq 0 ]]; then
        echo "   • Нет новых коммитов для создания PR"
    else
        echo "   • Создайте PR вручную: gh pr create"
        echo "   • Или воспользуйтесь веб-интерфейсом GitHub"
    fi
fi

# Показываем последние коммиты
echo ""
echo "📝 ПОСЛЕДНИЕ КОММИТЫ:"
git log --oneline -3 2>/dev/null || echo "   (нет коммитов)"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo "✅ ЗАДАЧА ЗАВЕРШЕНА!"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""