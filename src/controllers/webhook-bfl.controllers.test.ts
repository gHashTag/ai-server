import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { Request, Response } from 'express'
import { WebhookBFLController } from './webhook-bfl.controllers'

// Mock the service
jest.mock('@/core/supabase/notifyTrainingSuccess')
import { notifyTrainingSuccess } from '@/core/supabase/notifyTrainingSuccess'
const mockNotifyTrainingSuccess = notifyTrainingSuccess as any

describe('WebhookBFLController', () => {
  let controller: WebhookBFLController
  let mockRequest: any
  let mockResponse: any
  let statusSpy: any
  let jsonSpy: any

  beforeEach(() => {
    controller = new WebhookBFLController()
    
    statusSpy = jest.fn().mockReturnThis()
    jsonSpy = jest.fn().mockReturnThis()
    
    mockRequest = {}
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    }

    jest.clearAllMocks()
  })

  describe('handleWebhookBFL', () => {
    it('should handle SUCCESS status', async () => {
      // Arrange
      const requestBody = {
        task_id: 'task_123',
        status: 'SUCCESS',
        result: { output: 'test-result' }
      }
      
      mockRequest.body = requestBody
      mockNotifyTrainingSuccess.mockResolvedValue(undefined)

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      // Act
      await controller.handleWebhookBFL(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Webhook received:', requestBody)
      expect(mockNotifyTrainingSuccess).toHaveBeenCalledWith(
        requestBody.task_id,
        requestBody.status,
        requestBody.result
      )
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Webhook processed successfully' })

      // Restore console
      consoleSpy.mockRestore()
    })

    it('should handle non-SUCCESS status without calling notifyTrainingSuccess', async () => {
      // Arrange
      const requestBody = {
        task_id: 'task_123',
        status: 'FAILED',
        result: { error: 'test-error' }
      }
      
      mockRequest.body = requestBody

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      // Act
      await controller.handleWebhookBFL(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Webhook received:', requestBody)
      expect(mockNotifyTrainingSuccess).not.toHaveBeenCalled()
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Webhook processed successfully' })

      // Restore console
      consoleSpy.mockRestore()
    })

    it('should handle PROCESSING status', async () => {
      // Arrange
      const requestBody = {
        task_id: 'task_123',
        status: 'PROCESSING',
        result: null
      }
      
      mockRequest.body = requestBody

      // Mock console.log to avoid output during tests
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      // Act
      await controller.handleWebhookBFL(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Webhook received:', requestBody)
      expect(mockNotifyTrainingSuccess).not.toHaveBeenCalled()
      expect(statusSpy).toHaveBeenCalledWith(200)
      expect(jsonSpy).toHaveBeenCalledWith({ message: 'Webhook processed successfully' })

      // Restore console
      consoleSpy.mockRestore()
    })

    it('should handle errors', async () => {
      // Arrange
      const requestBody = {
        task_id: 'task_123',
        status: 'SUCCESS',
        result: { output: 'test-result' }
      }
      
      const error = new Error('Service error')
      
      mockRequest.body = requestBody
      mockNotifyTrainingSuccess.mockRejectedValue(error)

      // Mock console methods to avoid output during tests
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      // Act
      await controller.handleWebhookBFL(mockRequest as Request, mockResponse as Response)

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('Webhook received:', requestBody)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing webhook:', error)
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({ error: 'Internal server error' })

      // Restore console
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })
  })
})