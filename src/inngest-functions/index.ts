import { helloWorld } from './helloworld'
import { neuroImageGeneration } from './neuroImageGeneration'
import { generateModelTraining } from './generateModelTraining'
import { modelTrainingV2 } from './modelTrainingV2'
import { broadcastMessage } from './broadcastMessage'
import { processPayment } from './paymentProcessing'
import { instagramScraperV2, createInstagramUser } from './instagramScraper-v2'
import { instagramReelsTest } from './instagramScraper-v2-simple'
import { findCompetitors } from './findCompetitors'
import { analyzeCompetitorReels } from './analyzeCompetitorReels'
import { extractTopContent } from './extractTopContent'
import { generateContentScripts } from './generateContentScripts'

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
  findCompetitors, // Job 1: Find Instagram Competitors
  analyzeCompetitorReels, // Job 2: Analyze Competitor Reels
  extractTopContent, // Job 3: Extract Top Content
  generateContentScripts, // Job 4: Generate Content Scripts
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
  findCompetitors,
  analyzeCompetitorReels,
  extractTopContent,
  generateContentScripts,
}

// Также экспортируем все через старый способ для совместимости
export * from './helloworld'
export * from './neuroImageGeneration'
export * from './generateModelTraining'
export * from './modelTrainingV2'
export * from './broadcastMessage'
export * from './paymentProcessing'
export * from './instagramScraper-v2'
export * from './findCompetitors'
export * from './analyzeCompetitorReels'
export * from './extractTopContent'
export * from './generateContentScripts'
