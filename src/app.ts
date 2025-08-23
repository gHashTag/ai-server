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

<<<<<<< HEAD
    // N8N Proxy - прокси все запросы /n8n/* на N8N сервер
    const n8nPort = process.env.N8N_PORT || '5678'
    const n8nHost = process.env.N8N_HOST || 'localhost'

    this.app.use(
      '/n8n',
      createProxyMiddleware({
        target: `http://${n8nHost}:${n8nPort}`,
        changeOrigin: true,
        pathRewrite: {
          '^/n8n': '', // убираем /n8n из пути при проксировании
        },
        ws: true, // поддержка WebSocket для N8N
        logLevel: 'debug',
        onProxyReq: (proxyReq, req, res) => {
          getDynamicLogger().info(
            `N8N Proxy: ${req.method} ${req.url} -> ${proxyReq.getHeader(
              'host'
            )}${proxyReq.path}`
          )
        },
        onError: (err, req, res) => {
          getDynamicLogger().error(`N8N Proxy Error: ${err.message}`)
          res.status(503).json({
            error: 'N8N service unavailable',
            message: 'N8N server is not responding',
            hint: 'Make sure N8N is running on port ' + n8nPort,
          })
        },
      })
    )
=======
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
>>>>>>> db1a088696d21b59a3333f88c7bfd3050f7edbc6

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
