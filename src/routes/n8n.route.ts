import { Router } from 'express'
import N8nController from '@/controllers/n8n.controller'
import { Routes } from '@/interfaces/routes.interface'

class N8nRoute implements Routes {
  public path = '/n8n'
  public router = Router()
  public n8nController = new N8nController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    // Webhook endpoints
    this.router.post(`${this.path}/webhook`, this.n8nController.receiveWebhook)
    this.router.post(
      `${this.path}/trigger/:workflowName`,
      this.n8nController.triggerWorkflow
    )

    // Workflow management
    this.router.get(`${this.path}/workflows`, this.n8nController.getWorkflows)
    this.router.post(
      `${this.path}/workflows`,
      this.n8nController.createWorkflow
    )
    this.router.patch(
      `${this.path}/workflows/:workflowId/toggle`,
      this.n8nController.toggleWorkflow
    )

    // Execution management
    this.router.get(
      `${this.path}/executions/:executionId`,
      this.n8nController.getExecutionStatus
    )

    // System endpoints
    this.router.get(`${this.path}/health`, this.n8nController.testIntegration)
  }
}

export default N8nRoute
