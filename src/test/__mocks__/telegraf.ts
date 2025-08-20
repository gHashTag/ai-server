import { jest } from '@jest/globals'

export class Telegraf {
  public token: string
  public telegram: any

  constructor(token: string) {
    this.token = token
    this.telegram = {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendPhoto: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendVideo: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendDocument: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendAudio: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendVoice: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendSticker: jest.fn().mockResolvedValue({ message_id: 1 }),
      sendAnimation: jest.fn().mockResolvedValue({ message_id: 1 }),
      editMessageText: jest.fn().mockResolvedValue(true),
      editMessageReplyMarkup: jest.fn().mockResolvedValue(true),
      deleteMessage: jest.fn().mockResolvedValue(true),
      getMe: jest.fn().mockResolvedValue({ id: 1, username: 'testbot', first_name: 'Test Bot' }),
      getUpdates: jest.fn().mockResolvedValue([]),
      setWebhook: jest.fn().mockResolvedValue(true),
      deleteWebhook: jest.fn().mockResolvedValue(true),
      getWebhookInfo: jest.fn().mockResolvedValue({ url: '', has_custom_certificate: false }),
      sendChatAction: jest.fn().mockResolvedValue(true)
    }
  }

  launch = jest.fn().mockResolvedValue(undefined)
  stop = jest.fn().mockResolvedValue(undefined)
  use = jest.fn()
  on = jest.fn()
  command = jest.fn()
  action = jest.fn()
  hears = jest.fn()
}

export const Context = jest.fn()
export const session = jest.fn()
export const Scenes = {
  Stage: jest.fn(),
  BaseScene: jest.fn(),
  WizardScene: jest.fn()
}

export default {
  Telegraf,
  Context,
  session,
  Scenes
}