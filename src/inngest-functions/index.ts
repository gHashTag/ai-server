// Main Inngest functions export
import { helloWorld } from './helloworld'
import { analyzeCompetitorReels } from './analyzeCompetitorReels'
import { instagramScraperV2 } from './instagramScraper-v2'
import { findCompetitors } from './findCompetitors'
import { extractTopContent } from './extractTopContent'
import { generateContentScripts } from './generateContentScripts'
import { generateScenarioClips } from './generateScenarioClips'
import { generateDetailedScript } from './generateDetailedScript'
import { generateModelTraining } from './generateModelTraining'
import { modelTrainingV2 } from './modelTrainingV2'
import { neuroImageGeneration } from './neuroImageGeneration'
import { broadcastMessage } from './broadcastMessage'
import { processPayment } from './paymentProcessing'
import { morphImages } from './morphImages'

// Export all functions in array (for Inngest registration)
export const functions = [
  helloWorld,
  analyzeCompetitorReels,
  instagramScraperV2,
  findCompetitors,
  extractTopContent,
  generateContentScripts,
  generateScenarioClips, // Функция для генерации сценарных клипов
  generateDetailedScript, // ⭐ НОВАЯ функция для генерации детальных скриптов раскадровки
  generateModelTraining,
  modelTrainingV2,
  neuroImageGeneration,
  broadcastMessage,
  processPayment,
  morphImages, // 🧬 НОВАЯ функция для морфинга изображений
]

// Individual exports for compatibility
export { helloWorld }
export { analyzeCompetitorReels }
export { instagramScraperV2 }
export { findCompetitors }
export { extractTopContent }
export { generateContentScripts }
export { generateScenarioClips } // Функция генерации сценарных клипов
export { generateDetailedScript } // ⭐ НОВАЯ функция генерации детальных скриптов
export { generateModelTraining }
export { modelTrainingV2 }
export { neuroImageGeneration }
export { broadcastMessage }
export { processPayment }
export { morphImages } // 🧬 НОВАЯ функция для морфинга изображений

// Export everything
export * from './helloworld'
export * from './analyzeCompetitorReels'
export * from './instagramScraper-v2'
export * from './findCompetitors'
export * from './extractTopContent'
export * from './generateContentScripts'
export * from './generateScenarioClips' // Экспорт всего из новой функции
export * from './generateModelTraining'
export * from './modelTrainingV2'
export * from './neuroImageGeneration'
export * from './broadcastMessage'
export * from './paymentProcessing'
export * from './morphImages' // 🧬 НОВАЯ функция для морфинга изображений

export default functions
