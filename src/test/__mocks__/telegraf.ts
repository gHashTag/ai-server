import { jest } from '@jest/globals'

export class Telegraf {
  public token: string
  public telegram: any

  constructor(token: string) {
    this.token = token
    this.telegram = {
      sendMessage: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendPhoto: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendVideo: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendDocument: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendAudio: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendVoice: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendSticker: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      sendAnimation: (jest.fn() as any).mockResolvedValue({ message_id: 1 }),
      editMessageText: (jest.fn() as any).mockResolvedValue(true),
      editMessageReplyMarkup: (jest.fn() as any).mockResolvedValue(true),
      deleteMessage: (jest.fn() as any).mockResolvedValue(true),
      getMe: (jest.fn() as any).mockResolvedValue({ id: 1, username: 'testbot', first_name: 'Test Bot' }),
      getUpdates: (jest.fn() as any).mockResolvedValue([]),
      setWebhook: (jest.fn() as any).mockResolvedValue(true),
      deleteWebhook: (jest.fn() as any).mockResolvedValue(true),
      getWebhookInfo: (jest.fn() as any).mockResolvedValue({ url: '', has_custom_certificate: false }),
      sendChatAction: (jest.fn() as any).mockResolvedValue(true)
    }
  }

  launch = (jest.fn() as any).mockResolvedValue(undefined)
  stop = (jest.fn() as any).mockResolvedValue(undefined)
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