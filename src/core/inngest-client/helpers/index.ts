// План А - Inngest обертки для существующих сервисов
export { generateModelTraining } from './generateModelTraining'
export { generateTextToImageInngest } from './generateTextToImage'
export { generateTextToVideoInngest } from './generateTextToVideo'
export { generateImageToVideoInngest } from './generateImageToVideo'
export { generateSpeechInngest, createVoiceAvatarInngest } from './generateSpeech'

// Новые Inngest функции
export { generateImageToPromptInngest } from './generateImageToPrompt'
export { generateNeuroImageInngest } from './generateNeuroImage'
export { generateNeuroImageV2Inngest } from './generateNeuroImageV2'
export { generateLipSyncInngest } from './generateLipSync'
export { generateModelTrainingV2Inngest } from './generateModelTrainingV2'

// Критические бизнес-сервисы
export { processPaymentInngest } from './processPayment'
export { broadcastMessageInngest, broadcastMessageBatchInngest } from './broadcastMessage'
export { createUserInngest, createUsersBatchInngest } from './createUser'
export { 
  sendTrainingErrorInngest, 
  sendSuccessNotificationInngest, 
  sendGenericNotificationInngest,
  sendBulkNotificationsInngest 
} from './sendNotification'

// A/B тестирование функции
export { analyzeABTestsInngest } from '@/core/mcp-server/ab-testing'
