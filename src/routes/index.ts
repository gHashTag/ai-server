import { UploadRoute } from './upload.route'
import { WebhookRoute } from './webhook.route'
import { PaymentRoute } from './payment.route'
import { GenerationRoute } from './generation.route'
import { UserRoute } from './user.route'
import { GameRoute } from './leelagame.route'
import { AiAssistantRoute } from './ai.assistant.route'
import { VideoRoute } from './video.route'
import { RoomRoute } from './room.route'
import { CreateTasksRoute } from './create-tasks.route'

export const routes = [
  new UploadRoute(),
  new WebhookRoute(),
  new PaymentRoute(),
  new GenerationRoute(),
  new UserRoute(),
  new GameRoute(),
  new AiAssistantRoute(),
  new VideoRoute(),
  new RoomRoute(),
  new CreateTasksRoute(),
]
