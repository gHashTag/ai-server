import { helloWorld } from './helloworld'
import { neuroImageGeneration } from './neuroImageGeneration'
import { generateModelTraining } from './generateModelTraining'
import { modelTrainingV2 } from './modelTrainingV2'
import { broadcastMessage } from './broadcastMessage'
import { processPayment } from './paymentProcessing'
import { instagramScraperV2, createInstagramUser } from './instagramScraper-v2'
import { instagramReelsTest } from './instagramScraper-v2-simple'

// Экспортируем массив функций для Inngest
export const functions = [
  helloWorld,
  neuroImageGeneration,
  generateModelTraining,
  modelTrainingV2,
  broadcastMessage,
  processPayment,
  instagramScraperV2, // Real Instagram API integration
  createInstagramUser, // Manual Instagram user creation
  instagramReelsTest, // Test function for reels API
]

// Экспортируем отдельные функции для прямого импорта
export {
  helloWorld,
  neuroImageGeneration,
  generateModelTraining,
  modelTrainingV2,
  broadcastMessage,
  processPayment,
  instagramScraperV2,
  createInstagramUser,
  instagramReelsTest,
}

// Также экспортируем все через старый способ для совместимости
export * from './helloworld'
export * from './neuroImageGeneration'
export * from './generateModelTraining'
export * from './modelTrainingV2'
export * from './broadcastMessage'
export * from './paymentProcessing'
export * from './instagramScraper-v2'
