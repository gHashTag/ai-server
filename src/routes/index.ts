import { UploadRoute } from './upload.route'
import { WebhookRoute } from './webhook.route'
import { PaymentRoute } from './payment.route'
import { GenerationRoute } from './generation.route'
import { UserRoute } from './user.route'
import { GameRoute } from './leelagame.route'
import { AiAssistantRoute } from './ai.assistant.route'

export const routes = [
  new UploadRoute(),
  new WebhookRoute(),
  new PaymentRoute(),
  new GenerationRoute(),
  new UserRoute(),
  new GameRoute(),
  new AiAssistantRoute(),
]
