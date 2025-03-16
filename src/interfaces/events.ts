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
  }
}
