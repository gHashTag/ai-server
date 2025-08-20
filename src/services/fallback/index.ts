// Fallback функции (План Б)
// Упрощенные версии основных функций для критических случаев

export { generateImageFallback } from './imageGeneration'
export { 
  generateTextToVideoFallback, 
  generateImageToVideoFallback 
} from './videoGeneration'
export { 
  generateSpeechFallback, 
  createVoiceAvatarFallback 
} from './speechGeneration'

// Дополнительные fallback функции могут быть добавлены здесь
// export { generateNeuroImageFallback } from './neuroImageGeneration'
// export { generateModelTrainingFallback } from './modelTraining'