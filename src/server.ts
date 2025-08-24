import dotenv from 'dotenv'

// Загружаем переменные окружения из .env файла
// Railway deployment trigger - force redeploy with Dart AI integration (2025-08-24)
dotenv.config()
import 'reflect-metadata'
import { App } from './app'

import { ValidateEnv } from '@utils/validateEnv'

import { routes } from './routes'

ValidateEnv()

const app = new App(routes)

app.listen()
