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
import { BroadcastRoute } from './broadcast.route'
import { WebhookBFLRoute } from './webhook-bfl.route'
import { WebhookBFLNeurophotoRoute } from './webhook-bfl-neurophoto.route'
import { NexrenderRoute } from './nexrender.route'
import { ReplicateWebhookRoute } from './replicateWebhook.route'
import { DownloadRoute } from './download.route'
import { CompetitorSubscriptionsRoute } from './competitor-subscriptions.route'
import { UniversalWebhookRoute } from './universalWebhook.route'

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
  new BroadcastRoute(),
  new WebhookBFLRoute(),
  new WebhookBFLNeurophotoRoute(),
  new NexrenderRoute(),
  new ReplicateWebhookRoute(),
  new DownloadRoute(),
  new CompetitorSubscriptionsRoute(),
  new UniversalWebhookRoute(), // Универсальный webhook для всех AI провайдеров
]
