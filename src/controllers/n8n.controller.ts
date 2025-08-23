import { NextFunction, Request, Response } from 'express';
import { Container } from 'typedi';
import { N8nService } from '@/services/n8n.service';
import { logger } from '@/utils/logger';

class N8nController {
  public n8nService = Container.get(N8nService);

  /**
   * Webhook endpoint для получения данных из N8N workflow'ов
   */
  public receiveWebhook = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workflowId, executionId, data } = req.body;
      
      logger.info('📥 N8N Webhook received:', { 
        workflowId, 
        executionId, 
        dataKeys: Object.keys(data || {}) 
      });

      const result = await this.n8nService.processWebhookData(workflowId, executionId, data);

      res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
        data: result
      });
    } catch (error) {
      logger.error('❌ Error processing N8N webhook:', error);
      next(error);
    }
  };

  /**
   * Запуск workflow'а в N8N
   */
  public triggerWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workflowName, data } = req.body;
      
      logger.info('🚀 Triggering N8N workflow:', { workflowName, data });

      const executionId = await this.n8nService.triggerWorkflow(workflowName, data);

      res.status(200).json({
        success: true,
        message: 'Workflow triggered successfully',
        executionId
      });
    } catch (error) {
      logger.error('❌ Error triggering N8N workflow:', error);
      next(error);
    }
  };

  /**
   * Получение статуса выполнения workflow'а
   */
  public getExecutionStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { executionId } = req.params;
      
      const status = await this.n8nService.getExecutionStatus(executionId);

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('❌ Error getting execution status:', error);
      next(error);
    }
  };

  /**
   * Получение списка доступных workflow'ов
   */
  public getWorkflows = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflows = await this.n8nService.getWorkflows();

      res.status(200).json({
        success: true,
        data: workflows
      });
    } catch (error) {
      logger.error('❌ Error getting workflows:', error);
      next(error);
    }
  };

  /**
   * Создание нового workflow'а
   */
  public createWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflowData = req.body;
      
      logger.info('📝 Creating new N8N workflow:', { name: workflowData.name });

      const workflow = await this.n8nService.createWorkflow(workflowData);

      res.status(201).json({
        success: true,
        message: 'Workflow created successfully',
        data: workflow
      });
    } catch (error) {
      logger.error('❌ Error creating workflow:', error);
      next(error);
    }
  };

  /**
   * Активация/деактивация workflow'а
   */
  public toggleWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workflowId } = req.params;
      const { active } = req.body;
      
      logger.info('🔄 Toggling N8N workflow:', { workflowId, active });

      const result = await this.n8nService.toggleWorkflow(workflowId, active);

      res.status(200).json({
        success: true,
        message: `Workflow ${active ? 'activated' : 'deactivated'} successfully`,
        data: result
      });
    } catch (error) {
      logger.error('❌ Error toggling workflow:', error);
      next(error);
    }
  };

  /**
   * Тестовый эндпоинт для проверки интеграции
   */
  public testIntegration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      logger.info('🧪 Testing N8N integration');
      
      // Запуск тестового workflow'а
      const testResult = await this.n8nService.runHealthCheck();

      res.status(200).json({
        success: true,
        message: 'N8N integration test completed',
        data: testResult
      });
    } catch (error) {
      logger.error('❌ N8N integration test failed:', error);
      next(error);
    }
  };
}

export default N8nController;