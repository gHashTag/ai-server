import { existsSync, mkdirSync } from 'fs'
import winston from 'winston'
import morgan from 'morgan'
import { isDev } from '@/config'

// Force use of absolute paths only to avoid permission issues
function getLogDir(): string {
  const envLogDir = process.env.LOG_DIR
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Only use LOG_DIR if it's an absolute path (starts with /)
  if (envLogDir && envLogDir.startsWith('/')) {
    return envLogDir
  }
  
  // Use safe defaults for relative paths or missing LOG_DIR
  return isProduction ? '/app/logs' : '/tmp/logs'
}

const logDir = getLogDir()

console.log(`LOG_DIR environment variable: ${process.env.LOG_DIR}`)
console.log(`Using log directory: ${logDir}`)
console.log(`NODE_ENV: ${process.env.NODE_ENV}`)

if (!existsSync(logDir)) {
  try {
    mkdirSync(logDir, { recursive: true })
  } catch (error) {
    console.warn(`Unable to create log directory: ${error.message}`)
  }
}

// Установите уровень логирования через переменную окружения
const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info')
// Создаем логгер
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: `${logDir}/combined.log` }),
  ],
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
