import type { EventPayload } from 'inngest'

export interface TrainingStartEvent extends EventPayload {
  name: 'model/training.start'
  data: {
    bot_name: string
    modelName: string
    telegram_id: string
    triggerWord: string
    zipUrl: string
    steps: string | number
    is_ru: string | boolean
    gender?: string
  }
}

export interface TrainingCompletedEvent extends EventPayload {
  name: 'model/training.completed'
  data: {
    training_id: string
    telegram_id: string
    model_name: string
    status: string
    is_terminal: boolean
    metadata?: {
      bot_name?: string
      [key: string]: any
    }
    error?: string
    output?: any
    finetuneId?: string
    bot_name?: string
  }
}
