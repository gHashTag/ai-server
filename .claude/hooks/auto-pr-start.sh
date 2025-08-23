#!/bin/bash

# Автоматическое создание PR в начале задачи
# Запускается при получении пользовательского запроса

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# Функция логирования
log() {
    echo "[AUTO-PR] $1"
}

# Проверяем, что мы в git репозитории
if [[ ! -d .git ]] && [[ ! -f .git ]]; then
    log "⚠️ Не git репозиторий, пропускаем создание PR"
    exit 0
fi

# Проверяем наличие gh (GitHub CLI)
if ! command -v gh &> /dev/null; then
    log "⚠️ GitHub CLI не установлен, пропускаем создание PR"
    exit 0
fi

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [[ -z "$CURRENT_BRANCH" ]]; then
    log "⚠️ Не удалось определить текущую ветку"
    exit 0
fi

# Пропускаем main/master ветки
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]]; then
    log "ℹ️ Пропускаем создание PR для основной ветки: $CURRENT_BRANCH"
    exit 0
fi

# Проверяем, есть ли уже открытый PR для этой ветки
EXISTING_PR=$(gh pr list --head "$CURRENT_BRANCH" --state open --json number,url,title 2>/dev/null || echo "[]")

if [[ "$EXISTING_PR" != "[]" ]]; then
    # PR уже существует, сохраняем информацию
    PR_URL=$(echo "$EXISTING_PR" | jq -r '.[0].url' 2>/dev/null || echo "")
    PR_TITLE=$(echo "$EXISTING_PR" | jq -r '.[0].title' 2>/dev/null || echo "")
    
    if [[ -n "$PR_URL" ]]; then
        echo "$PR_URL" > .claude/current_pr_url
        log "✅ Используем существующий PR: $PR_URL"
        log "📋 Заголовок: $PR_TITLE"
        exit 0
    fi
fi

# Проверяем, есть ли изменения или коммиты для PR
if [[ $(git log --oneline origin/main..HEAD 2>/dev/null | wc -l) -eq 0 ]]; then
    log "ℹ️ Нет новых коммитов для PR, создание отложено"
    exit 0
fi

# Генерируем имя PR на основе ветки
PR_TITLE="feat: $CURRENT_BRANCH"
case "$CURRENT_BRANCH" in
    *fix*|*bugfix*)
        PR_TITLE="fix: $(echo $CURRENT_BRANCH | sed 's/.*fix[_-]*//' | tr '_-' ' ')"
        ;;
    *feature*|*feat*)
        PR_TITLE="feat: $(echo $CURRENT_BRANCH | sed 's/.*feat[ure]*[_-]*//' | tr '_-' ' ')"
        ;;
    *hotfix*)
        PR_TITLE="hotfix: $(echo $CURRENT_BRANCH | sed 's/.*hotfix[_-]*//' | tr '_-' ' ')"
        ;;
    *doc*)
        PR_TITLE="docs: $(echo $CURRENT_BRANCH | sed 's/.*doc[s]*[_-]*//' | tr '_-' ' ')"
        ;;
    *)
        PR_TITLE="feat: Changes in $CURRENT_BRANCH"
        ;;
esac

# Создаем PR тело
PR_BODY="## Summary
Автоматически созданный PR для ветки \`$CURRENT_BRANCH\`

## Changes Made
- Работа в процессе...

## Test plan
- [ ] Проверить функциональность
- [ ] Протестировать интеграцию
- [ ] Проверить отсутствие побочных эффектов

🤖 Автоматически создан с помощью [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Проверяем, что ветка запушена в origin
if ! git ls-remote --exit-code --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
    log "📤 Пушим ветку $CURRENT_BRANCH в origin..."
    if git push -u origin "$CURRENT_BRANCH" 2>/dev/null; then
        log "✅ Ветка успешно запушена"
    else
        log "❌ Не удалось запушить ветку"
        exit 1
    fi
fi

# Создаем PR
log "🚀 Создаем новый PR для ветки: $CURRENT_BRANCH"
PR_URL=$(gh pr create --title "$PR_TITLE" --body "$PR_BODY" 2>/dev/null || echo "")

if [[ -n "$PR_URL" ]]; then
    # Сохраняем URL PR для последующего использования
    echo "$PR_URL" > .claude/current_pr_url
    log "✅ PR создан успешно: $PR_URL"
    log "📋 Заголовок: $PR_TITLE"
    
    # Добавляем информацию в CLAUDE.md если есть
    if [[ -f "CLAUDE.md" ]]; then
        echo "" >> CLAUDE.md
        echo "<!-- Текущий PR: $PR_URL -->" >> CLAUDE.md
    fi
else
    log "❌ Не удалось создать PR"
    exit 1
fi

echo ""
log "🔗 ССЫЛКА НА PR: $PR_URL"
echo ""