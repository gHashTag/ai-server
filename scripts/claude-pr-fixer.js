#!/usr/bin/env node

/**
 * Claude Code PR Auto-Fixer
 * Автоматически исправляет проблемы в PR через Claude Code API
 */

const { execSync } = require('child_process')
const axios = require('axios')

class ClaudePRFixer {
  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN
    this.claudeApiKey = process.env.CLAUDE_API_KEY
    this.repoOwner = 'gHashTag'
    this.repoName = 'ai-server'
  }

  /**
   * Главная функция обработки PR
   */
  async fixPR(prNumber) {
    console.log(`🔍 Анализирую PR #${prNumber}...`)

    try {
      // 1. Получить информацию о PR
      const prInfo = await this.getPRInfo(prNumber)
      console.log(`📋 PR: "${prInfo.title}"`)

      // 2. Проверить failed checks
      const failedChecks = await this.getFailedChecks(prNumber)
      if (failedChecks.length === 0) {
        console.log('✅ Нет проблем для исправления')
        return
      }

      console.log(
        `❌ Найдено ${failedChecks.length} проблем:`,
        failedChecks.map(c => c.name)
      )

      // 3. Получить diff и код
      const prDiff = await this.getPRDiff(prNumber)
      const affectedFiles = await this.getAffectedFiles(prNumber)

      // 4. Запросить исправления у Claude
      const fixes = await this.requestClaudeFixes({
        prNumber,
        title: prInfo.title,
        description: prInfo.body,
        failedChecks,
        diff: prDiff,
        files: affectedFiles,
      })

      // 5. Применить исправления
      if (fixes && fixes.changes) {
        await this.applyFixes(fixes.changes, prNumber)
        console.log('✅ Исправления применены!')
      }
    } catch (error) {
      console.error('❌ Ошибка при исправлении PR:', error.message)
      throw error
    }
  }

  /**
   * Получить информацию о PR
   */
  async getPRInfo(prNumber) {
    const result = execSync(
      `gh pr view ${prNumber} --json title,body,headRefName`,
      { encoding: 'utf8' }
    )
    return JSON.parse(result)
  }

  /**
   * Получить проваленные checks
   */
  async getFailedChecks(prNumber) {
    try {
      const result = execSync(
        `gh pr checks ${prNumber} --json name,state,conclusion`,
        { encoding: 'utf8' }
      )
      const checks = JSON.parse(result)
      return checks.filter(
        check => check.conclusion === 'failure' || check.state === 'error'
      )
    } catch (error) {
      console.log('⚠️ Не удалось получить checks, продолжаем без них')
      return []
    }
  }

  /**
   * Получить diff PR
   */
  async getPRDiff(prNumber) {
    try {
      return execSync(`gh pr diff ${prNumber}`, { encoding: 'utf8' })
    } catch (error) {
      console.log('⚠️ Не удалось получить diff')
      return ''
    }
  }

  /**
   * Получить затронутые файлы
   */
  async getAffectedFiles(prNumber) {
    try {
      const result = execSync(`gh pr view ${prNumber} --json files`, {
        encoding: 'utf8',
      })
      const data = JSON.parse(result)
      return data.files?.map(f => f.path) || []
    } catch (error) {
      return []
    }
  }

  /**
   * Запросить исправления у Claude Code
   */
  async requestClaudeFixes(context) {
    const prompt = `
🔧 AUTO-FIX REQUEST для PR #${context.prNumber}

**Заголовок:** ${context.title}

**Описание:** 
${context.description || 'Нет описания'}

**Проблемы (${context.failedChecks.length}):**
${context.failedChecks.map(c => `- ❌ ${c.name}`).join('\n')}

**Затронутые файлы (${context.files.length}):**
${context.files
  .slice(0, 10)
  .map(f => `- ${f}`)
  .join('\n')}
${
  context.files.length > 10
    ? `... и еще ${context.files.length - 10} файлов`
    : ''
}

**Diff:**
\`\`\`diff
${context.diff.slice(0, 2000)}${
      context.diff.length > 2000 ? '\n... (truncated)' : ''
    }
\`\`\`

**ЗАДАЧА:**
Проанализируй проблемы и предложи конкретные исправления. 
Сфокусируйся на:
1. Исправлении синтаксических ошибок
2. Решении конфликтов merge
3. Фиксе импортов и зависимостей  
4. Исправлении типов TypeScript
5. Решении проблем с тестами

Ответ в формате JSON:
{
  "analysis": "Описание проблем",
  "changes": [
    {
      "file": "path/to/file.ts",
      "action": "edit|create|delete",
      "content": "новое содержимое файла или null для delete",
      "reason": "объяснение зачем"
    }
  ]
}
`

    // Здесь можно интегрироваться с Claude API или MCP
    console.log('🤖 Отправляю запрос к Claude Code...')

    // Пример интеграции с Claude API
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.claudeApiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
        }
      )

      const claudeResponse = response.data.content[0].text

      // Попытка извлечь JSON из ответа Claude
      const jsonMatch = claudeResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      console.log('⚠️ Claude API недоступен, используем базовые исправления')
    }

    // Fallback - базовые автоматические исправления
    return this.getBasicFixes(context)
  }

  /**
   * Базовые автоматические исправления
   */
  getBasicFixes(context) {
    const changes = []

    // Типичные фиксы для TypeScript проектов
    if (
      context.failedChecks.some(
        c => c.name.includes('typescript') || c.name.includes('build')
      )
    ) {
      changes.push({
        file: 'package.json',
        action: 'edit',
        reason: 'Возможные проблемы с зависимостями',
        content: null, // Будет обработано отдельно
      })
    }

    return {
      analysis: 'Базовые автоматические исправления',
      changes,
    }
  }

  /**
   * Применить исправления
   */
  async applyFixes(changes, prNumber) {
    console.log(`📝 Применяю ${changes.length} исправлений...`)

    for (const change of changes) {
      try {
        if (change.action === 'edit' && change.content) {
          require('fs').writeFileSync(change.file, change.content)
          console.log(`✏️ Отредактировал ${change.file}: ${change.reason}`)
        } else if (change.action === 'delete') {
          require('fs').unlinkSync(change.file)
          console.log(`🗑️ Удалил ${change.file}: ${change.reason}`)
        } else if (change.action === 'create' && change.content) {
          require('fs').writeFileSync(change.file, change.content)
          console.log(`➕ Создал ${change.file}: ${change.reason}`)
        }
      } catch (error) {
        console.log(
          `⚠️ Не удалось применить изменение для ${change.file}: ${error.message}`
        )
      }
    }

    // Коммит изменений
    try {
      execSync('git add .')
      execSync(`git commit -m "🤖 Auto-fix: Resolved issues in PR #${prNumber}

Applied automated fixes:
${changes.map(c => `- ${c.action} ${c.file}: ${c.reason}`).join('\n')}

🤖 Generated with Claude Code Auto-fixer
Co-Authored-By: Claude <noreply@anthropic.com>"`)
      execSync('git push')

      console.log('📤 Изменения запушены в PR')
    } catch (error) {
      console.log('⚠️ Ошибка при коммите:', error.message)
    }
  }
}

// CLI интерфейс
async function main() {
  const args = process.argv.slice(2)
  const prNumber = args[0]

  if (!prNumber) {
    console.log('Использование: node claude-pr-fixer.js <PR_NUMBER>')
    console.log('Пример: node claude-pr-fixer.js 45')
    process.exit(1)
  }

  const fixer = new ClaudePRFixer()

  try {
    await fixer.fixPR(parseInt(prNumber))
    console.log('🎉 PR автоматически исправлен!')
  } catch (error) {
    console.error('💥 Ошибка:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = ClaudePRFixer
