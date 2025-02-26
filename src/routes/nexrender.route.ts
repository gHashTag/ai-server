import { Router } from 'express'
import { NexrenderController } from '@controllers/nexrender.controller'

export class NexrenderRoute {
  public path = '/nexrender'
  public router: Router = Router()
  public nexrenderController = new NexrenderController()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.get('/api/v1/jobs', this.nexrenderController.getJobs)
    this.router.get('/api/v1/jobs/:uid', this.nexrenderController.getJobById)
    this.router.post('/api/v1/jobs', this.nexrenderController.createJob)
    this.router.put('/api/v1/jobs/:uid', this.nexrenderController.updateJob)
    this.router.delete('/api/v1/jobs/:uid', this.nexrenderController.deleteJob)
    this.router.get('/api/v1/jobs/pickup', this.nexrenderController.pickupJob)
    this.router.get(
      '/api/v1/jobs/pickup/:tags',
      this.nexrenderController.pickupJobWithTags
    )
    this.router.get('/api/v1/health', this.nexrenderController.healthCheck)
  }
}
