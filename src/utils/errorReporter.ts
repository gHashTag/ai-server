import { inngest } from '@/core/inngest/clients'
import { logger } from '@/utils/logger'

export interface ErrorReport {
  error: string | Error
  stack?: string
  endpoint?: string
  userId?: string
  severity?: 'critical' | 'high' | 'medium'
  context?: any
}

/**
 * Отправляет событие об ошибке в Inngest для обработки и уведомления
 */
export async function reportError(errorData: ErrorReport): Promise<void> {
  try {
    const errorMessage = errorData.error instanceof Error 
      ? errorData.error.message 
      : String(errorData.error)
    
    const stack = errorData.stack || (errorData.error instanceof Error ? errorData.error.stack : undefined)
    
    // Определяем уровень критичности
    const severity = errorData.severity || determineErrorSeverity(errorMessage)
    
    // Логируем ошибку локально
    logger.error('Error reported to monitoring system', {
      error: errorMessage,
      severity,
      endpoint: errorData.endpoint,
      userId: errorData.userId
    })
    
    // Отправляем событие в Inngest только для критических и высоких ошибок
    if (severity === 'critical' || severity === 'high') {
      await inngest.send({
        name: 'app/error.critical',
        data: {
          error: errorMessage,
          stack,
          endpoint: errorData.endpoint,
          userId: errorData.userId,
          severity,
          context: errorData.context,
          timestamp: new Date().toISOString()
        }
      })
      
      logger.info('Critical error event sent to Inngest', { severity })
    }
  } catch (err) {
    // Не позволяем ошибке в системе мониторинга сломать приложение
    logger.error('Failed to report error to monitoring system', err)
  }
}

/**
 * Определяет уровень критичности ошибки на основе её содержания
 */
function determineErrorSeverity(errorMessage: string): 'critical' | 'high' | 'medium' {
  const message = errorMessage.toLowerCase()
  
  // Критические ошибки
  const criticalPatterns = [
    'database',
    'connection refused',
    'econnrefused',
    'out of memory',
    'cannot read property',
    'undefined is not',
    'payment',
    'unauthorized',
    'forbidden'
  ]
  
  // Высокие ошибки
  const highPatterns = [
    'timeout',
    'network',
    'api error',
    'validation error',
    'bad request',
    'not found'
  ]
  
  if (criticalPatterns.some(pattern => message.includes(pattern))) {
    return 'critical'
  }
  
  if (highPatterns.some(pattern => message.includes(pattern))) {
    return 'high'
  }
  
  return 'medium'
}

/**
 * Express middleware для автоматического отлова и репорта ошибок
 */
export function errorReporterMiddleware(err: any, req: any, res: any, next: any) {
  // Отправляем ошибку в систему мониторинга
  reportError({
    error: err,
    endpoint: `${req.method} ${req.path}`,
    userId: req.user?.id || req.body?.userId,
    context: {
      query: req.query,
      body: req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'x-real-ip': req.headers['x-real-ip']
      }
    }
  })
  
  // Передаем ошибку дальше для стандартной обработки
  next(err)
}

/**
 * Обертка для асинхронных функций с автоматическим репортом ошибок
 */
export function withErrorReporting<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: { endpoint?: string; userId?: string }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      await reportError({
        error: error as Error,
        ...context
      })
      throw error
    }
  }) as T
}
