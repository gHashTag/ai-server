import { Request, Response } from 'express'
import { UserController } from '@/controllers/user.controller'
import { createUserService } from '@/services'
import { jest, describe, it, beforeEach, expect } from '@jest/globals'

jest.mock('@/services', () => ({
  createUserService: jest.fn(),
}))

describe('UserController', () => {
  let userController: UserController
  let req: Partial<Request>
  let res: Partial<Response>
  let mockCreateUserService: jest.MockedFunction<typeof createUserService>

  beforeEach(() => {
    userController = new UserController()
    req = {
      body: {},
    }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    mockCreateUserService = createUserService as jest.MockedFunction<typeof createUserService>
    jest.clearAllMocks()
  })

  describe('createUserHandler', () => {
    it('should create user successfully', async () => {
      const userData = {
        telegram_id: '123456',
        username: 'testuser',
        language: 'en',
      }
      const expectedResult = { id: 1, ...userData }

      req.body = userData
      mockCreateUserService.mockResolvedValue(expectedResult)

      await userController.createUserHandler(req as Request, res as Response)

      expect(mockCreateUserService).toHaveBeenCalledWith(userData)
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expectedResult)
    })

    it('should handle service error', async () => {
      const userData = {
        telegram_id: '123456',
        username: 'testuser',
        language: 'en',
      }
      const error = new Error('Service error')

      req.body = userData
      mockCreateUserService.mockRejectedValue(error)

      await userController.createUserHandler(req as Request, res as Response)

      expect(mockCreateUserService).toHaveBeenCalledWith(userData)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ message: 'Service error' })
    })

    it('should handle empty body', async () => {
      const expectedResult = { id: 1 }

      req.body = {}
      mockCreateUserService.mockResolvedValue(expectedResult)

      await userController.createUserHandler(req as Request, res as Response)

      expect(mockCreateUserService).toHaveBeenCalledWith({})
      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(expectedResult)
    })

    it('should handle invalid user data', async () => {
      const userData = {
        telegram_id: null,
        username: '',
      }
      const error = new Error('Invalid user data')

      req.body = userData
      mockCreateUserService.mockRejectedValue(error)

      await userController.createUserHandler(req as Request, res as Response)

      expect(mockCreateUserService).toHaveBeenCalledWith(userData)
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid user data' })
    })
  })
})