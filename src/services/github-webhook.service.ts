import crypto from 'crypto'
import { execSync, spawn } from 'child_process'
import axios from 'axios'
import { logger } from '@utils/logger'

/**
 * GitHub Webhook Service
 * Основной сервис для автоматического исправления PR через Claude Code
 */
export class GitHubWebhookService {
  private readonly githubToken: string
  private readonly claudeApiKey: string
  private readonly webhookSecret: string
  private readonly autoFixStats = {
    total_processed: 0,
    successful_fixes: 0,
    failed_fixes: 0,
    last_activity: new Date().toISOString(),
  }

  constructor() {
    this.githubToken = process.env.GITHUB_TOKEN || ''
    this.claudeApiKey = process.env.CLAUDE_API_KEY || ''
    this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'default-secret'

    if (!this.githubToken) {
      logger.warn(
        '⚠️ GITHUB_TOKEN не установлен - некоторые функции будут недоступны'
      )
    }
  }

  /**
   * Валидация подписи GitHub webhook'а
   */
  public validateSignature(payload: string, signature: string): boolean {
    if (!signature || !signature.startsWith('sha256=')) {
      return false
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex')

    const actualSignature = signature.replace('sha256=', '')

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(actualSignature, 'hex')
    )
  }

  /**
   * Основная функция анализа и автоматического исправления PR
   */
  public async analyzePRForAutoFix(prInfo: any): Promise<any> {
    const startTime = Date.now()
    this.autoFixStats.total_processed++
    this.autoFixStats.last_activity = new Date().toISOString()

    try {
      logger.info('🔍 Начинаю анализ PR для автоматического исправления', {
        pr: prInfo.number,
        repository: prInfo.repository,
      })

      // Шаг 1: Получить информацию о PR и проверить статус
      const prDetails = await this.getPRDetails(
        prInfo.repository,
        prInfo.number
      )

      if (!prDetails || prDetails.state !== 'open') {
        logger.info('📋 PR закрыт или не найден, пропускаем', {
          pr: prInfo.number,
        })
        return { action: 'skipped', reason: 'pr_not_open' }
      }

      // Шаг 2: Получить failed checks
      const failedChecks = await this.getFailedChecks(
        prInfo.repository,
        prInfo.number
      )

      if (failedChecks.length === 0 && !prInfo.failed_checks) {
        logger.info('✅ Нет проблем для исправления', { pr: prInfo.number })
        return { action: 'skipped', reason: 'no_issues_found' }
      }

      logger.info(
        `🚨 Найдено ${failedChecks.length} проблем в PR #${prInfo.number}`,
        {
          checks: failedChecks.map(c => c.name),
        }
      )

      // Шаг 3: Получить diff и анализируемые файлы
      const prDiff = await this.getPRDiff(prInfo.repository, prInfo.number)
      const changedFiles = await this.getPRFiles(
        prInfo.repository,
        prInfo.number
      )

      // Шаг 4: Запросить решение у Claude Code
      const claudeAnalysis = await this.requestClaudeCodeFix({
        pr_number: prInfo.number,
        repository: prInfo.repository,
        title: prDetails.title,
        description: prDetails.body,
        failed_checks: failedChecks,
        diff: prDiff,
        changed_files: changedFiles,
        head_branch: prDetails.head.ref,
        base_branch: prDetails.base.ref,
      })

      if (!claudeAnalysis || !claudeAnalysis.fixes) {
        logger.info('🤔 Claude Code не предложил исправлений', {
          pr: prInfo.number,
        })
        return { action: 'no_fixes_suggested', analysis: claudeAnalysis }
      }

      // Шаг 5: Применить исправления к PR
      const applyResult = await this.applyFixesToPR(prInfo.repository, {
        pr_number: prInfo.number,
        head_branch: prDetails.head.ref,
        fixes: claudeAnalysis.fixes,
        analysis: claudeAnalysis.analysis,
      })

      const processingTime = Date.now() - startTime

      if (applyResult.success) {
        this.autoFixStats.successful_fixes++
        logger.info('✅ PR успешно исправлен автоматически!', {
          pr: prInfo.number,
          fixes_applied: applyResult.fixes_applied,
          processing_time_ms: processingTime,
        })
      } else {
        this.autoFixStats.failed_fixes++
        logger.error('💥 Не удалось применить исправления к PR', {
          pr: prInfo.number,
          error: applyResult.error,
          processing_time_ms: processingTime,
        })
      }

      return {
        action: applyResult.success ? 'fixes_applied' : 'fixes_failed',
        pr_number: prInfo.number,
        fixes_applied: applyResult.fixes_applied || 0,
        processing_time_ms: processingTime,
        claude_analysis: claudeAnalysis.analysis,
        error: applyResult.error || null,
      }
    } catch (error) {
      this.autoFixStats.failed_fixes++
      const processingTime = Date.now() - startTime

      logger.error('💥 Критическая ошибка при анализе PR для автофикса', {
        pr: prInfo.number,
        error: error.message,
        stack: error.stack,
        processing_time_ms: processingTime,
      })

      return {
        action: 'critical_error',
        pr_number: prInfo.number,
        error: error.message,
        processing_time_ms: processingTime,
      }
    }
  }

  /**
   * Получить детальную информацию о PR
   */
  private async getPRDetails(
    repository: string,
    prNumber: number
  ): Promise<any> {
    try {
      const result = execSync(
        `gh pr view ${prNumber} --repo ${repository} --json title,body,state,head,base,mergeable`,
        { encoding: 'utf8' }
      )
      return JSON.parse(result)
    } catch (error) {
      logger.error('Ошибка получения информации о PR', {
        repository,
        prNumber,
        error: error.message,
      })
      return null
    }
  }

  /**
   * Получить список проваленных проверок
   */
  private async getFailedChecks(
    repository: string,
    prNumber: number
  ): Promise<any[]> {
    try {
      const result = execSync(
        `gh pr checks ${prNumber} --repo ${repository} --json name,state,conclusion`,
        { encoding: 'utf8' }
      )

      const checks = JSON.parse(result) || []
      return checks.filter(
        check =>
          check.state === 'failure' ||
          check.conclusion === 'failure' ||
          check.state === 'error'
      )
    } catch (error) {
      logger.warn('Не удалось получить статус проверок PR', {
        repository,
        prNumber,
      })
      return []
    }
  }

  /**
   * Получить diff PR
   */
  private async getPRDiff(
    repository: string,
    prNumber: number
  ): Promise<string> {
    try {
      return execSync(`gh pr diff ${prNumber} --repo ${repository}`, {
        encoding: 'utf8',
      })
    } catch (error) {
      logger.warn('Не удалось получить diff PR', { repository, prNumber })
      return ''
    }
  }

  /**
   * Получить список измененных файлов
   */
  private async getPRFiles(
    repository: string,
    prNumber: number
  ): Promise<string[]> {
    try {
      const result = execSync(
        `gh pr view ${prNumber} --repo ${repository} --json files`,
        { encoding: 'utf8' }
      )
      const data = JSON.parse(result)
      return data.files?.map(f => f.path) || []
    } catch (error) {
      logger.warn('Не удалось получить список файлов PR', {
        repository,
        prNumber,
      })
      return []
    }
  }

  /**
   * Запросить исправления у Claude Code API
   */
  private async requestClaudeCodeFix(context: any): Promise<any> {
    logger.info('🤖 Отправляю запрос к Claude Code для анализа PR...', {
      pr: context.pr_number,
      failed_checks: context.failed_checks.length,
      changed_files: context.changed_files.length,
    })

    const prompt = this.buildClaudePrompt(context)

    try {
      // Вариант 1: Claude API (если доступен)
      if (this.claudeApiKey) {
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-sonnet-20240229',
            max_tokens: 8000,
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
            timeout: 60000,
          }
        )

        return this.parseClaudeResponse(response.data.content[0].text)
      }

      // Вариант 2: Fallback - базовые исправления
      logger.info('🔧 Claude API недоступен, применяю базовые исправления')
      return this.generateBasicFixes(context)
    } catch (error) {
      logger.error('💥 Ошибка запроса к Claude Code', { error: error.message })
      return this.generateBasicFixes(context)
    }
  }

  /**
   * Построить промпт для Claude Code
   */
  private buildClaudePrompt(context: any): string {
    return `
🔧 GITHUB PR AUTO-FIX REQUEST

**Repository:** ${context.repository}
**PR #${context.pr_number}:** ${context.title}

**Description:**
${context.description || 'No description provided'}

**Failed Checks (${context.failed_checks.length}):**
${context.failed_checks.map(c => `- ❌ ${c.name} (${c.state})`).join('\n')}

**Changed Files (${context.changed_files.length}):**
${context.changed_files
  .slice(0, 15)
  .map(f => `- ${f}`)
  .join('\n')}
${
  context.changed_files.length > 15
    ? `... and ${context.changed_files.length - 15} more files`
    : ''
}

**Diff Preview:**
\`\`\`diff
${
  context.diff.length > 3000
    ? context.diff.slice(0, 3000) + '\n... (truncated)'
    : context.diff
}
\`\`\`

**TASK:**
Analyze the failed checks and PR diff. Provide specific fixes to resolve:
1. Build/compilation errors
2. Test failures  
3. Linting issues
4. Type errors
5. Merge conflicts
6. Import/dependency issues

**Response Format:**
\`\`\`json
{
  "analysis": "Brief description of identified issues",
  "confidence": "high|medium|low",
  "fixes": [
    {
      "file": "relative/path/to/file.ts",
      "action": "edit|create|delete", 
      "description": "What this fix does",
      "content": "Complete new file content (for edit/create) or null for delete",
      "line_range": [start_line, end_line]
    }
  ],
  "commit_message": "Suggested commit message for the fixes"
}
\`\`\`

Focus on practical, safe fixes that won't break functionality. If uncertain, suggest lower-risk changes.
`
  }

  /**
   * Парсинг ответа от Claude
   */
  private parseClaudeResponse(response: string): any {
    try {
      // Извлечь JSON из ответа Claude
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }

      // Попробовать найти JSON объект
      const objectMatch = response.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        return JSON.parse(objectMatch[0])
      }

      logger.warn('⚠️ Не удалось извлечь JSON из ответа Claude')
      return null
    } catch (error) {
      logger.error('💥 Ошибка парсинга ответа Claude', { error: error.message })
      return null
    }
  }

  /**
   * Базовые автоматические исправления (fallback)
   */
  private generateBasicFixes(context: any): any {
    const fixes = []

    // Простые исправления для типичных проблем
    const commonIssues = [
      // TypeScript/Build errors
      { pattern: /typescript|build|compile/, fix: 'package_json_update' },
      // Linting issues
      { pattern: /lint|eslint/, fix: 'lint_auto_fix' },
      // Test failures
      { pattern: /test|jest/, fix: 'test_config_update' },
      // Import/dependency issues
      { pattern: /import|module|dependency/, fix: 'dependency_update' },
    ]

    for (const check of context.failed_checks) {
      for (const issue of commonIssues) {
        if (issue.pattern.test(check.name.toLowerCase())) {
          fixes.push(this.generateBasicFix(issue.fix, context))
          break
        }
      }
    }

    return {
      analysis: 'Basic automated fixes for common CI/CD issues',
      confidence: 'low',
      fixes: fixes.slice(0, 3), // Ограничить количество
      commit_message: `🤖 Auto-fix: Resolve common CI/CD issues in PR #${context.pr_number}\n\n🤖 Generated with GitHub Auto-fixer`,
    }
  }

  /**
   * Генерировать базовое исправление
   */
  private generateBasicFix(fixType: string, context: any): any {
    switch (fixType) {
      case 'lint_auto_fix':
        return {
          file: '.eslintrc.js',
          action: 'edit',
          description: 'Update ESLint configuration for compatibility',
          content: null, // Будет сгенерировано при применении
          line_range: null,
        }

      case 'package_json_update':
        return {
          file: 'package.json',
          action: 'edit',
          description: 'Update dependencies and scripts',
          content: null,
          line_range: null,
        }

      default:
        return null
    }
  }

  /**
   * Применить исправления к PR
   */
  private async applyFixesToPR(repository: string, options: any): Promise<any> {
    const { pr_number, head_branch, fixes, analysis } = options

    try {
      logger.info('📝 Применяю исправления к PR', {
        pr: pr_number,
        fixes_count: fixes.length,
        branch: head_branch,
      })

      // Переключиться на ветку PR
      execSync(`git fetch origin ${head_branch}`)
      execSync(`git checkout ${head_branch}`)

      let appliedFixes = 0

      // Применить каждое исправление
      for (const fix of fixes) {
        try {
          if (fix.action === 'edit' && fix.content) {
            require('fs').writeFileSync(fix.file, fix.content)
            appliedFixes++
            logger.info(`✏️ Файл отредактирован: ${fix.file}`)
          } else if (fix.action === 'create' && fix.content) {
            require('fs').writeFileSync(fix.file, fix.content)
            appliedFixes++
            logger.info(`➕ Файл создан: ${fix.file}`)
          } else if (fix.action === 'delete') {
            if (require('fs').existsSync(fix.file)) {
              require('fs').unlinkSync(fix.file)
              appliedFixes++
              logger.info(`🗑️ Файл удален: ${fix.file}`)
            }
          }
        } catch (error) {
          logger.warn(`⚠️ Не удалось применить исправление для ${fix.file}`, {
            error: error.message,
          })
        }
      }

      if (appliedFixes === 0) {
        return {
          success: false,
          error: 'No fixes were applied',
          fixes_applied: 0,
        }
      }

      // Создать коммит с исправлениями
      execSync('git add .')

      const commitMessage =
        options.commit_message ||
        `🤖 Auto-fix: Resolved ${appliedFixes} issues in PR #${pr_number}\n\n${analysis}\n\n🤖 Generated with GitHub Auto-fixer\nCo-Authored-By: Claude <noreply@anthropic.com>`

      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`)
      execSync(`git push origin ${head_branch}`)

      logger.info('✅ Исправления успешно применены и запушены!', {
        pr: pr_number,
        fixes_applied: appliedFixes,
      })

      return {
        success: true,
        fixes_applied: appliedFixes,
        commit_sha: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
      }
    } catch (error) {
      logger.error('💥 Ошибка при применении исправлений', {
        pr: pr_number,
        error: error.message,
      })

      return {
        success: false,
        error: error.message,
        fixes_applied: 0,
      }
    }
  }

  /**
   * Получить статус системы автофикса
   */
  public async getSystemStatus(): Promise<any> {
    return {
      github_token_configured: !!this.githubToken,
      claude_api_configured: !!this.claudeApiKey,
      webhook_secret_configured: !!this.webhookSecret,
      stats: this.autoFixStats,
      last_check: new Date().toISOString(),
    }
  }
}
