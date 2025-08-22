import { Router } from 'express'
import { Routes } from '@interfaces/routes.interface'
import { competitorSubscriptionsRouter } from './competitorSubscriptions.route'

export class CompetitorSubscriptionsRoute implements Routes {
  public path = '/api/competitor-subscriptions'
  public router = Router()

  constructor() {
    this.initializeRoutes()
  }

  private initializeRoutes() {
    this.router.use(this.path, competitorSubscriptionsRouter)
  }
}