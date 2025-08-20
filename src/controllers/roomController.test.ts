import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Request, Response } from 'express'
import { handleRoomRequest } from './roomController'

// Mock the service
jest.mock('../services/roomService')
import { createOrFetchRoom } from '../services/roomService'
const mockCreateOrFetchRoom = createOrFetchRoom as any

describe('roomController', () => {
  let mockRequest: any
  let mockResponse: any
  let statusSpy: any
  let jsonSpy: any

  beforeEach(() => {
    statusSpy = jest.fn().mockReturnThis()
    jsonSpy = jest.fn().mockReturnThis()
    
    mockRequest = {}
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    }

    jest.clearAllMocks()
  })

  describe('handleRoomRequest', () => {
    it('should create/fetch room successfully', async () => {
      // Arrange
      const requestBody = {
        name: 'Test Room',
        type: 'public',
        telegram_id: 123456,
        chat_id: 'chat_123',
        token: 'test_token'
      }
      
      const mockRooms = [
        {
          id: 1,
          name: 'Test Room',
          type: 'public',
          telegram_id: 123456,
          chat_id: 'chat_123'
        }
      ]
      
      mockRequest.body = requestBody
      mockCreateOrFetchRoom.mockResolvedValue(mockRooms)

      // Act
      await handleRoomRequest(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockCreateOrFetchRoom).toHaveBeenCalledWith({
        name: requestBody.name,
        type: requestBody.type,
        telegram_id: requestBody.telegram_id,
        chat_id: requestBody.chat_id,
        token: requestBody.token
      })
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith(mockRooms)
    })

    it('should return 400 for missing required fields', async () => {
      // Test missing name
      mockRequest.body = {
        type: 'public',
        telegram_id: 123456,
        chat_id: 'chat_123',
        token: 'test_token'
      }

      await handleRoomRequest(mockRequest as Request, mockResponse as Response)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Missing required fields' })
      expect(mockCreateOrFetchRoom).not.toHaveBeenCalled()
    })

    it('should return 400 for missing type', async () => {
      mockRequest.body = {
        name: 'Test Room',
        telegram_id: 123456,
        chat_id: 'chat_123',
        token: 'test_token'
      }

      await handleRoomRequest(mockRequest as Request, mockResponse as Response)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Missing required fields' })
      expect(mockCreateOrFetchRoom).not.toHaveBeenCalled()
    })

    it('should handle service errors', async () => {
      // Arrange
      const requestBody = {
        name: 'Test Room',
        type: 'public',
        telegram_id: 123456,
        chat_id: 'chat_123',
        token: 'test_token'
      }
      
      const error = new Error('Service error message')
      
      mockRequest.body = requestBody
      mockCreateOrFetchRoom.mockRejectedValue(error)

      // Mock console.error to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      await handleRoomRequest(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockCreateOrFetchRoom).toHaveBeenCalledWith({
        name: requestBody.name,
        type: requestBody.type,
        telegram_id: requestBody.telegram_id,
        chat_id: requestBody.chat_id,
        token: requestBody.token
      })
      expect(consoleSpy).toHaveBeenCalledWith('Error:', error)
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Service error message' })

      // Restore console
      consoleSpy.mockRestore()
    })
  })
})