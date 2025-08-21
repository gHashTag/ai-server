import { Router } from 'express'
import { ingest } from '@controllers/ingest.controller'
import { Routes } from '@interfaces/routes.interface'

export class IngestRoute implements Routes {
  public path = '/api'
  public router = Router()

  constructor() {
    console.log('🔄 IngestRoute constructor called')
    this.initializeRoutes()
  }

  private initializeRoutes() {
    console.log('🔄 Setting up ingest route at:', `${this.path}/ingest`)
    this.router.post(`${this.path}/ingest`, ingest)
  }
}