import { existsSync, mkdirSync } from 'fs'
import winston from 'winston'
import morgan from 'morgan'
import { isDev } from '@/config'
import path from 'path'

// Smart log directory resolution with fallbacks
function getLogDir(): string {
  const envLogDir = process.env.LOG_DIR
  const isProduction = process.env.NODE_ENV === 'production'
  
  // If LOG_DIR is provided
  if (envLogDir) {
    // If it's an absolute path, use it directly
    if (path.isAbsolute(envLogDir)) {
      return envLogDir
    }
    // If it's a relative path in non-production, resolve it
    if (!isProduction) {
      return path.resolve(process.cwd(), envLogDir)
    }
  }
  
  // Production fallbacks - use /tmp which is always writable
  if (isProduction) {
    // Try to use /tmp which is typically writable in containers
    return '/tmp/ai-server-logs'
  }
  
  // Development fallback
  return path.resolve(process.cwd(), 'logs')
}

const logDir = getLogDir()

console.log(`LOG_DIR environment variable: ${process.env.LOG_DIR}`)
console.log(`Using log directory: ${logDir}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)

// Try to create log directory with better error handling
let logDirAvailable = false
if (!existsSync(logDir)) {
  try {
    mkdirSync(logDir, { recursive: true })
    logDirAvailable = true
    console.log(`Log directory created: ${logDir}`)
  } catch (error) {
    console.warn(`Unable to create log directory: ${error.message}`)
    console.warn('File logging will be disabled, using console output only')
  }
} else {
  logDirAvailable = true
}

// Установите уровень логирования через переменную окружения
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')

// Создаем базовые транспорты
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
]

// Добавляем файловый транспорт только если директория доступна
if (logDirAvailable) {
  try {
    transports.push(
      new winston.transports.File({ 
        filename: `${logDir}/combined.log`,
        handleExceptions: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    )
    console.log(`File logging enabled: ${logDir}/combined.log`)
  } catch (error) {
    console.warn(`Could not enable file logging: ${error.message}`)
  }
} else {
  console.warn('File logging disabled - using console output only')
}

// Создаем логгер
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports,
  exitOnError: false
})

// Использование logger
logger.info('Server started')
logger.error('Error occurred')

// Создаем разные форматы логирования
const morganDev = morgan('dev', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
})

const morganCombined = morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
})

// Экспортируем функцию для динамического выбора формата
const getDynamicLogger = (format = 'dev') => {
  return format === 'combined' ? morganCombined : morganDev
}

export { logger, getDynamicLogger }
