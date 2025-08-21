import request from 'supertest'
import express from 'express'
import { UserRoute } from '@/routes/user.route'
import { UserController } from '@/controllers/user.controller'
import { jest, describe, it, beforeEach, expect } from '@jest/globals'

jest.mock('@/controllers/user.controller')

describe('UserRoute', () => {
  let app: express.Application
  let userRoute: UserRoute
  let mockUserController: jest.Mocked<UserController>

  beforeEach(() => {
    app = express()
    app.use(express.json())
    
    userRoute = new UserRoute()
    app.use('/', userRoute.router)

    mockUserController = UserController.prototype as jest.Mocked<UserController>
    mockUserController.createUserHandler = jest.fn()
    jest.clearAllMocks()
  })

  describe('Route Configuration', () => {
    it('should have correct path', () => {
      expect(userRoute.path).toBe('/user')
    })

    it('should have router instance', () => {
      expect(userRoute.router).toBeDefined()
    })

    it('should have userController instance', () => {
      expect(userRoute.userController).toBeDefined()
      expect(userRoute.userController).toBeInstanceOf(UserController)
    })
  })

  describe('POST /user/create', () => {
    it('should call createUserHandler for POST /user/create', async () => {
      mockUserController.createUserHandler.mockImplementation(async (req, res) => {
        res.status(200).json({ success: true })
      })

      const userData = {
        telegram_id: '123456',
        username: 'testuser',
        language: 'en',
      }

      const response = await request(app)
        .post('/user/create')
        .send(userData)
        .expect(200)

      expect(mockUserController.createUserHandler).toHaveBeenCalled()
      expect(response.body).toEqual({ success: true })
    })

    it('should handle empty request body', async () => {
      mockUserController.createUserHandler.mockImplementation(async (req, res) => {
        res.status(400).json({ message: 'Invalid data' })
      })

      await request(app)
        .post('/user/create')
        .send({})
        .expect(400)

      expect(mockUserController.createUserHandler).toHaveBeenCalled()
    })

    it('should handle controller errors', async () => {
      mockUserController.createUserHandler.mockImplementation(async (req, res) => {
        res.status(500).json({ message: 'Internal server error' })
      })

      const userData = {
        telegram_id: '123456',
        username: 'testuser',
      }

      await request(app)
        .post('/user/create')
        .send(userData)
        .expect(500)

      expect(mockUserController.createUserHandler).toHaveBeenCalled()
    })

    it('should pass request data to controller', async () => {
      let receivedReq: any
      let receivedRes: any

      mockUserController.createUserHandler.mockImplementation(async (req, res) => {
        receivedReq = req
        receivedRes = res
        res.status(201).json({ id: 1, ...req.body })
      })

      const userData = {
        telegram_id: '789012',
        username: 'newuser',
        language: 'ru',
      }

      const response = await request(app)
        .post('/user/create')
        .send(userData)
        .expect(201)

      expect(mockUserController.createUserHandler).toHaveBeenCalled()
      expect(receivedReq.body).toEqual(userData)
      expect(response.body).toEqual({ id: 1, ...userData })
    })
  })

  describe('Route not found', () => {
    it('should return 404 for undefined routes', async () => {
      await request(app)
        .get('/user/nonexistent')
        .expect(404)
    })

    it('should return 404 for wrong HTTP method', async () => {
      await request(app)
        .get('/user/create')
        .expect(404)
    })
  })
})