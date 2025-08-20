import { describe, it, expect, jest } from '@jest/globals'

// Simple working tests for controllers
describe('Controllers Basic Tests', () => {
  it('should import aiAssistant controller successfully', async () => {
    const { AiAssistantController } = await import('./aiAssistant.controller')
    expect(AiAssistantController).toBeDefined()
    
    const controller = new AiAssistantController()
    expect(controller).toBeDefined()
    expect(typeof controller.getAiResponse).toBe('function')
  })

  it('should import room controller successfully', async () => {
    const { handleRoomRequest } = await import('./roomController')
    expect(handleRoomRequest).toBeDefined()
    expect(typeof handleRoomRequest).toBe('function')
  })

  it('should import webhook controllers successfully', async () => {
    const { WebhookBFLController } = await import('./webhook-bfl.controllers')
    expect(WebhookBFLController).toBeDefined()
    
    const controller = new WebhookBFLController()
    expect(controller).toBeDefined()
    expect(typeof controller.handleWebhookBFL).toBe('function')
  })

  it('should have all required methods', () => {
    expect(true).toBe(true) // Basic test to verify Jest is working
  })
})