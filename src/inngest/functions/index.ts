// Все Inngest функции (План А)
// Asynchronous event-driven функции с расширенной обработкой ошибок

export { generateImageInngest } from './generateImage'
export { 
  generateTextToVideoInngest, 
  generateImageToVideoInngest 
} from './generateVideo'
export { 
  generateSpeechInngest, 
  createVoiceAvatarInngest 
} from './generateSpeech'

// Импорт существующей функции обучения модели
export { generateModelTraining } from '@/core/inngest-client/helpers/generateModelTraining'