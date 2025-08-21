import { Request, Response, NextFunction } from 'express'
import { ErrorMiddleware } from '@/middlewares/error.middleware'
import { HttpException } from '@/exceptions/HttpException'
import { logger } from '@/utils/logger'
import { jest, describe, it, beforeEach, expect } from '@jest/globals'

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}))

describe('ErrorMiddleware', () => {
  let req: Partial<Request>
  let res: Partial<Response>
  let next: NextFunction
  let mockLogger: jest.Mocked<typeof logger>

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/test',
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      headersSent: false,
    }
    next = jest.fn() as NextFunction
    mockLogger = logger as jest.Mocked<typeof logger>
    jest.clearAllMocks()
  })

  it('should handle HttpException with status and message', () => {
    const error = new HttpException(404, 'Not found')

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ message: 'Not found' })
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[GET] /test >> StatusCode:: 404, Message:: Not found'
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should use default status 500 when status is not provided', () => {
    const error = new HttpException(0, 'Test error')
    error.status = undefined as any

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Test error' })
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[GET] /test >> StatusCode:: 500, Message:: Test error'
    )
  })

  it('should use default message when message is not provided', () => {
    const error = new HttpException(400, '')
    error.message = undefined as any

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ message: 'Something went wrong' })
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[GET] /test >> StatusCode:: 400, Message:: Something went wrong'
    )
  })

  it('should call next if headers are already sent', () => {
    const error = new HttpException(500, 'Server error')
    res.headersSent = true

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(error)
    expect(mockLogger.error).not.toHaveBeenCalled()
  })

  it('should handle different HTTP methods and paths', () => {
    const error = new HttpException(422, 'Validation error')
    req.method = 'POST'
    req.path = '/api/users'

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({ message: 'Validation error' })
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[POST] /api/users >> StatusCode:: 422, Message:: Validation error'
    )
  })

  it('should handle internal error in middleware', () => {
    const error = new HttpException(500, 'Test error')
    res.status = jest.fn().mockImplementation(() => {
      throw new Error('Internal error')
    })

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should handle error without status property', () => {
    const error = { message: 'Plain error' } as HttpException

    ErrorMiddleware(error, req as Request, res as Response, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Plain error' })
    expect(mockLogger.error).toHaveBeenCalledWith(
      '[GET] /test >> StatusCode:: 500, Message:: Plain error'
    )
  })
})