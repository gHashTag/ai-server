import { Request, Response } from 'express';
import { logger } from '@utils/logger';
import { GitHubWebhookService } from '@services/github-webhook.service';

/**
 * GitHub Webhook Controller
 * Обрабатывает webhook'и от GitHub для автоматического исправления PR
 */
export class GitHubWebhookController {
  private githubWebhookService = new GitHubWebhookService();

  /**
   * Обработчик webhook'ов для проблем в PR
   * POST /webhooks/github/pr-issues
   */
  public handlePRIssues = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const { body, headers } = req;
      const event = headers['x-github-event'] as string;
      const signature = headers['x-hub-signature-256'] as string;
      const delivery = headers['x-github-delivery'] as string;

      logger.info('🔔 GitHub webhook received', {
        event,
        delivery,
        repository: body.repository?.full_name,
        action: body.action,
        pr: body.pull_request?.number
      });

      // Валидация подписи GitHub
      if (!this.githubWebhookService.validateSignature(JSON.stringify(body), signature)) {
        logger.error('❌ Invalid GitHub webhook signature', { delivery });
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Обработка различных типов событий GitHub
      let result = null;
      
      switch (event) {
        case 'pull_request':
          result = await this.handlePullRequestEvent(body);
          break;
          
        case 'check_suite':
          result = await this.handleCheckSuiteEvent(body);
          break;
          
        case 'check_run':  
          result = await this.handleCheckRunEvent(body);
          break;
          
        case 'pull_request_review':
          result = await this.handlePullRequestReviewEvent(body);
          break;
          
        default:
          logger.info('📋 Unsupported GitHub event, skipping', { event });
          res.status(200).json({ message: 'Event type not supported', event });
          return;
      }

      const processingTime = Date.now() - startTime;
      
      logger.info('✅ GitHub webhook processed successfully', {
        event,
        delivery,
        processingTime,
        result: result ? 'action_taken' : 'no_action_needed'
      });

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        event,
        delivery,
        processing_time_ms: processingTime,
        result: result || 'no_action_needed'
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('💥 GitHub webhook processing failed', {
        error: error.message,
        stack: error.stack,
        processingTime,
        body: req.body ? Object.keys(req.body) : null
      });

      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
        message: error.message,
        processing_time_ms: processingTime
      });
    }
  };

  /**
   * Обработка событий Pull Request
   */
  private async handlePullRequestEvent(body: any): Promise<any> {
    const { action, pull_request, repository } = body;
    
    // Интересуют только определенные действия
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      logger.info('📋 PR action not relevant for auto-fix', { action });
      return null;
    }

    const prInfo = {
      number: pull_request.number,
      title: pull_request.title,
      head_sha: pull_request.head.sha,
      head_branch: pull_request.head.ref,
      base_branch: pull_request.base.ref,
      repository: repository.full_name,
      author: pull_request.user.login,
      mergeable: pull_request.mergeable,
      state: pull_request.state
    };

    logger.info('🔄 Processing PR for auto-fix', prInfo);
    
    // Запускаем анализ PR через некоторое время (GitHub нужно время для запуска checks)
    setTimeout(async () => {
      try {
        await this.githubWebhookService.analyzePRForAutoFix(prInfo);
      } catch (error) {
        logger.error('💥 Failed to analyze PR for auto-fix', { 
          pr: prInfo.number, 
          error: error.message 
        });
      }
    }, 30000); // 30 секунд задержка

    return { action: 'pr_queued_for_analysis', pr: prInfo.number };
  }

  /**
   * Обработка событий Check Suite (когда завершаются CI/CD проверки)
   */
  private async handleCheckSuiteEvent(body: any): Promise<any> {
    const { action, check_suite, repository } = body;
    
    if (action !== 'completed') {
      return null;
    }

    // Только если есть failures
    if (check_suite.conclusion !== 'failure') {
      return null;
    }

    // Найти связанные PR
    const prs = check_suite.pull_requests || [];
    if (prs.length === 0) {
      return null;
    }

    logger.info('🚨 Check suite failed, analyzing PRs for auto-fix', {
      check_suite_id: check_suite.id,
      conclusion: check_suite.conclusion,
      prs: prs.map(pr => pr.number)
    });

    // Обработать каждый PR с проблемами
    const results = [];
    for (const pr of prs) {
      try {
        const result = await this.githubWebhookService.analyzePRForAutoFix({
          number: pr.number,
          repository: repository.full_name,
          head_sha: pr.head.sha,
          head_branch: pr.head.ref,
          failed_checks: true
        });
        results.push(result);
      } catch (error) {
        logger.error('💥 Failed to process failed check suite for PR', {
          pr: pr.number,
          error: error.message
        });
      }
    }

    return { action: 'failed_checks_processed', prs: results };
  }

  /**
   * Обработка отдельных Check Run событий  
   */
  private async handleCheckRunEvent(body: any): Promise<any> {
    const { action, check_run } = body;
    
    if (action !== 'completed' || check_run.conclusion !== 'failure') {
      return null;
    }

    logger.info('🔴 Individual check run failed', {
      check_run_name: check_run.name,
      conclusion: check_run.conclusion,
      head_sha: check_run.head_sha
    });

    // Пока что логируем, в будущем можно добавить более детальную обработку
    return { action: 'check_failure_logged', check: check_run.name };
  }

  /**
   * Обработка PR Review событий
   */
  private async handlePullRequestReviewEvent(body: any): Promise<any> {
    const { action, review, pull_request } = body;
    
    // Если review запрашивает изменения - это может быть поводом для auto-fix
    if (action === 'submitted' && review.state === 'changes_requested') {
      logger.info('📝 PR review requests changes', {
        pr: pull_request.number,
        reviewer: review.user.login,
        comment: review.body?.substring(0, 100) + '...'
      });

      // Можно добавить логику анализа комментариев review
      // и автоматического исправления на их основе
      
      return { action: 'review_changes_noted', pr: pull_request.number };
    }

    return null;
  }

  /**
   * Получить статус webhook системы
   * GET /webhooks/github/status  
   */
  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.githubWebhookService.getSystemStatus();
      
      res.json({
        success: true,
        status: 'operational',
        ...status,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Failed to get GitHub webhook status', error);
      res.status(500).json({
        success: false,
        status: 'error',
        error: error.message
      });
    }
  };

  /**
   * Ручной запуск анализа PR
   * POST /webhooks/github/analyze/:pr_number
   */
  public manualAnalyzePR = async (req: Request, res: Response): Promise<void> => {
    try {
      const { pr_number } = req.params;
      const { repository = 'gHashTag/ai-server' } = req.body;

      logger.info('🔍 Manual PR analysis requested', { pr_number, repository });

      const result = await this.githubWebhookService.analyzePRForAutoFix({
        number: parseInt(pr_number),
        repository,
        manual_trigger: true
      });

      res.json({
        success: true,
        message: 'PR analysis completed',
        pr_number: parseInt(pr_number),
        result
      });
      
    } catch (error) {
      logger.error('Failed manual PR analysis', { 
        pr_number: req.params.pr_number, 
        error: error.message 
      });
      
      res.status(500).json({
        success: false,
        error: 'Manual analysis failed',
        message: error.message,
        pr_number: req.params.pr_number
      });
    }
  };
}