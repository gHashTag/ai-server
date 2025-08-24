import 'reflect-metadata'
import express, { Application } from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import hpp from 'hpp'
// import { createProxyMiddleware } from 'http-proxy-middleware' // Временно отключен
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
    this.port = PORT || 3000

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
      logger.info(`📋 API ENDPOINTS:`)
      logger.info(`   GET  /               - Welcome page`)
      logger.info(`   GET  /health         - Health check`)
      logger.info(`   GET  /api/test       - API test`)
      logger.info(`   GET  /trigger        - Trigger test event`)
      logger.info(`   POST /api/inngest    - Inngest webhook`)
      logger.info(`   POST /api/upload     - File upload`)
      logger.info(`   GET  /api-docs       - Swagger documentation`)
      logger.info(`   GET  /uploads/*      - Static files`)
      logger.info(`=================================`)
      logger.info(`🔧 DEVELOPMENT TOOLS:`)
      logger.info(`   📊 Inngest Dashboard: http://localhost:8289`)
      logger.info(`   🔗 Inngest Functions: http://localhost:8289/functions`)
      logger.info(`   ⚡ Inngest Events: http://localhost:8289/events`)
      logger.info(`   📖 API Docs: http://localhost:${this.port}/api-docs`)
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
    // Полностью удаляем отладочный middleware, который переопределял res.send
    // и вызывал ошибки в обработчике ошибок

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
    // this.app.use(helmet()); // Temporarily commented out for Inngest dev troubleshooting
    this.app.use(compression())
    // Временно комментируем для диагностики проблемы с multipart
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }))
    this.app.use(cookieParser())
    this.app.use(morgan('combined'))
    // ✅ RESTORED: Простая статическая папка как было раньше
    this.app.use(
      '/uploads',
      express.static(path.join(__dirname, '..', 'uploads'))
    )
  }

  private initializeRoutes(routes: Routes[]) {
    // Удаляем этот специфический обработчик, так как serve из inngest/express должен сам его обрабатывать
    // this.app.head('/api/inngest', (req, res) => {
    //   res.status(200).end()
    // })

    // N8N Proxy - временно отключен для стабильности
    // TODO: Включить после настройки N8N сервера
    this.app.get('/n8n', (req, res) => {
      res.status(503).json({
        error: 'N8N service temporarily unavailable',
        message: 'N8N is being configured for production deployment',
        status: 'coming_soon'
      })
    })
    
    this.app.all('/n8n/*', (req, res) => {
      res.status(503).json({
        error: 'N8N service temporarily unavailable', 
        message: 'N8N is being configured for production deployment',
        status: 'coming_soon'
      })
    })

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

    this.app.get('/health', async (_req, res) => {
      try {
        const uptime = process.uptime()
        const memoryUsage = process.memoryUsage()
        
        // Объединенная версия с лучшими частями из обеих версий
        const health = {
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: Math.floor(uptime),
          environment: process.env.NODE_ENV || 'production',
          version: process.env.npm_package_version || '1.0.0',
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          },
          services: {
            api: 'healthy',
            server: 'healthy', 
            inngest: 'healthy',
            database: 'connected', // TODO: добавить реальную проверку БД
          }
        }

        // STARTING логика для Railway (критично важно!)
        if (uptime < 5) {
          // Если сервер работает менее 5 секунд, даем время на инициализацию
          health.status = 'STARTING'
          health.services.server = 'starting'
          health.services.inngest = 'initializing'
        }

        const statusCode = health.status === 'OK' ? 200 : 503
        res.status(statusCode).json(health)
        
      } catch (error) {
        logger.error('Health check failed:', error)
        res.status(503).json({
          status: 'ERROR',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
          uptime: Math.round(process.uptime())
        })
      }
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
    /* // Temporarily commented out for Inngest dev troubleshooting
    this.app.use((_req, res) => { 
      res.status(404).json({
        status: 'error',
        message: 'Route not found',
      });
    });
    */
    // Временно отключаем обработчик ошибок для диагностики
    /*
    this.app.use((err: Error, _req: express.Request, res: express.Response) => {
      logger.error('Error:', err)

      // Простой обработчик ошибок без fallback
      try {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error',
        })
      } catch (responseError) {
        logger.error('Error sending error response:', responseError)
        // Если даже это не работает, просто завершаем соединение
        res.end()
      }
    })
    */
  }
}
