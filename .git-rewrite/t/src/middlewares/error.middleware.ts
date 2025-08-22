import { NextFunction, Request, Response } from 'express'
import { HttpException } from '@exceptions/HttpException'
import { logger } from '@utils/logger'

export const ErrorMiddleware = (
  error: HttpException,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (res.headersSent) {
      return next(error)
    }
    const status: number = error.status || 500
    const message: string = error.message || 'Something went wrong'

    logger.error(
      `[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`
    )
    res.status(status).json({ message })
  } catch (error) {
    next(error)
  }
}
