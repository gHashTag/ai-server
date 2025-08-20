import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Request, Response } from 'express'

// Mock the service with any types to avoid TypeScript issues
const mockGetAiResponse: any = jest.fn()
jest.mock('@/services/aiAssistantService', () => ({
  AiAssistantService: jest.fn().mockImplementation(() => ({
    getAiResponse: mockGetAiResponse
  }))
}))

import { AiAssistantController } from './aiAssistant.controller'

describe('AiAssistantController', () => {
  let controller: AiAssistantController
  let mockRequest: any
  let mockResponse: any
  let statusSpy: any
  let jsonSpy: any

  beforeEach(() => {
    controller = new AiAssistantController()
    
    statusSpy = jest.fn().mockReturnThis()
    jsonSpy = jest.fn().mockReturnThis()
    
    mockRequest = {}
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    }

    mockGetAiResponse.mockClear()
  })

  describe('getAiResponse', () => {
    it('should return AI response successfully', async () => {
      // Arrange
      const mockAiResponse = 'Test AI response'
      const requestBody = {
        telegram_id: 123456,
        assistant_id: 'asst_test123',
        report: 'Test report',
        language_code: 'en',
        full_name: 'Test User'
      }
      
      mockRequest.body = requestBody
      mockGetAiResponse.mockResolvedValue({ ai_response: mockAiResponse })

      // Act
      await controller.getAiResponse(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockGetAiResponse).toHaveBeenCalledWith(
        requestBody.telegram_id,
        requestBody.assistant_id,
        requestBody.report,
        requestBody.language_code,
        requestBody.full_name
      )
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith({ ai_response: mockAiResponse })
    })

    it('should handle service errors', async () => {
      // Arrange
      const errorMessage = 'Service error'
      const requestBody = {
        telegram_id: 123456,
        assistant_id: 'asst_test123',
        report: 'Test report',
        language_code: 'en',
        full_name: 'Test User'
      }
      
      mockRequest.body = requestBody
      mockGetAiResponse.mockRejectedValue(new Error(errorMessage))

      // Mock console.error to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      await controller.getAiResponse(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(mockGetAiResponse).toHaveBeenCalledWith(
        requestBody.telegram_id,
        requestBody.assistant_id,
        requestBody.report,
        requestBody.language_code,
        requestBody.full_name
      )
      expect(consoleSpy).toHaveBeenCalledWith('Error in getAiResponse:', expect.any(Error))
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Internal server error' })

      // Restore console
      consoleSpy.mockRestore()
    })

    it('should handle missing request body fields', async () => {
      // Arrange
      mockRequest.body = {}

      // Mock console.error to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      await controller.getAiResponse(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(consoleSpy).toHaveBeenCalled()
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Internal server error' })

      // Restore console
      consoleSpy.mockRestore()
    })
  })
})