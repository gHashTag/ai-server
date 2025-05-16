import 'reflect-metadata'
import express, { Application } from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import hpp from 'hpp'
// const server = require('@nexrender/server')
// const { start } = require('@nexrender/worker')
import swaggerJSDoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import {
  NODE_ENV,
  PORT,
  LOG_FORMAT,
  // ORIGIN,
  // CREDENTIALS,
  // NEXRENDER_PORT,
} from '@config'
import { Routes } from '@interfaces/routes.interface'
import { getDynamicLogger, logger } from '@utils/logger'

import { Server } from 'http'
import path from 'path'
import morgan from 'morgan'
// import { checkSecretKey } from './utils/checkSecretKey'
import { inngestRouter } from './routes/inngest.route'
import { UploadRoute } from './routes/upload.route'
import { inngest } from './core/inngest/clients'

// const nexrenderPort = NEXRENDER_PORT
// const secret = process.env.NEXRENDER_SECRET

// server.listen(nexrenderPort, secret, () => {
//   console.log(`🚀 Nexrender Server listening on port ${nexrenderPort}`)
// })

export class App {
  public app: Application
  public env: string
  public port: string | number
  private server: Server

  constructor(routes: Routes[]) {
    this.app = express()
    this.env = NODE_ENV || 'development'
    this.port = PORT || 4000

    this.initializeMiddlewares()
    this.initializeRoutes(routes)
    this.initializeSwagger()
    this.initializeErrorHandling()
  }

  public listen() {
    this.server = this.app.listen(this.port, () => {
      logger.info(`=================================`)
      logger.info(`======= ENV: ${this.env} =======`)
      logger.info(`🚀 App listening on the port ${this.port}`)
      logger.info(`http://localhost:${this.port}`)
      logger.info(`=================================`)
    })
    return this.server
  }

  public getServer() {
    return this.app
  }

  public close(callback?: () => void) {
    if (this.server) {
      this.server.close(callback)
    }
  }

  private initializeMiddlewares() {
    // this.app.use(checkSecretKey);
    this.app.use((req, res, next) => {
      getDynamicLogger(LOG_FORMAT)(req, res, next)
    })
    this.app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'x-inngest-signature',
          'x-inngest-sdk',
        ],
      })
    )
    this.app.use(hpp())
    this.app.use(helmet())
    this.app.use(compression())
    // Временно комментируем для диагностики проблемы с multipart
    // this.app.use(express.json({ limit: '10mb' }));
    // this.app.use(express.urlencoded({ limit: '10mb', extended: true }));
    this.app.use(cookieParser())
    this.app.use(morgan('combined'))
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
  }

  private initializeRoutes(routes: Routes[]) {
    this.app.use('/api/inngest', inngestRouter)
    this.app.use('/api/upload', new UploadRoute().router)
    this.app.get('/trigger', async (req, res) => {
      await inngest.send({
        name: 'test/hello',
        data: { name: 'Пользователь' },
      })
      res.json({ status: 'Событие отправлено! 🚀' })
    })

    routes.forEach(route => {
      this.app.use('/', route.router)
    })

    this.app.get('/', (_req, res) => {
      try {
        res.status(200).json({
          status: 'success',
          message: 'Welcome to AI Server Express',
          version: '1.0.0',
          endpoints: {
            health: '/health',
            api: '/api/test',
          },
        })
      } catch (error) {
        logger.error('Error in root route:', error)
        res.status(500).json({
          status: 'error',
          message: 'Internal server error',
        })
      }
    })

    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
      })
    })

    this.app.get('/api/test', (_req, res) => {
      res.json({
        message: 'API is working',
      })
    })
  }

  private initializeSwagger() {
    const options = {
      swaggerDefinition: {
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'Example docs',
        },
      },
      apis: ['swagger.yaml'],
    }

    const specs = swaggerJSDoc(options)
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))
  }

  private initializeErrorHandling() {
    this.app.use((_req, res) => {
      res.status(404).json({
        status: 'error',
        message: 'Route not found',
      })
    })

    this.app.use((err: Error, _req: express.Request, res: express.Response) => {
      logger.error('Error:', err)
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      })
    })
  }
}
