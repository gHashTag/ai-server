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
import { logMonitor, triggerLogMonitor } from './logMonitor'
import { criticalErrorMonitor, healthCheck } from './criticalErrorMonitor'
import { instagramApifyScraper } from './instagramApifyScraper'
// TEMP DISABLED FOR PRODUCTION FIX
// import {
//   competitorAutoParser,
//   triggerCompetitorAutoParser,
// } from './competitorAutoParser'
import { competitorDelivery } from './competitorDelivery'
import { systemMonitor, triggerSystemMonitor } from './systemMonitor'
import {
  systemHealthCheck,
  triggerHealthCheck,
  healthTestHandler,
} from './systemHealthCheck'
import { generateVeo3Video } from './generateVeo3Video'

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
  logMonitor, // 📊 Функция мониторинга логов (запускается по расписанию)
  triggerLogMonitor, // 🔄 Функция ручного запуска мониторинга
  criticalErrorMonitor, // 🚨 Мониторинг критических ошибок в реальном времени
  healthCheck, // 💚 Проверка состояния сервисов каждые 30 минут
  instagramApifyScraper, // 📱 RILS парсер через Apify
  // TEMP DISABLED: competitorAutoParser, // ⏰ Автоматический парсинг конкурентов каждые 24 часа
  // TEMP DISABLED: triggerCompetitorAutoParser, // 🔄 Ручной запуск автопарсинга
  competitorDelivery, // 📬 Доставка рилсов конкурентов подписчикам
  systemMonitor, // 📊 Ежедневный системный мониторинг
  triggerSystemMonitor, // 🔄 Ручной запуск системного мониторинга
  systemHealthCheck, // 💚 Проверка здоровья системы каждые 30 минут
  triggerHealthCheck, // 🔄 Ручной запуск проверки здоровья
  healthTestHandler, // 🧪 Обработчик тестовых событий для health check
  generateVeo3Video, // 🎬 VEO3 видео генерация через Kie.ai API
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
export { logMonitor, triggerLogMonitor } // 📊 Функции мониторинга логов
export { criticalErrorMonitor, healthCheck } // 🚨💚 Функции критического мониторинга
export { instagramApifyScraper } // 📱 RILS парсер через Apify
// TEMP DISABLED: export { competitorAutoParser, triggerCompetitorAutoParser } // ⏰ Автоматический парсинг конкурентов
export { competitorDelivery } // 📬 Доставка рилсов конкурентов
export { systemMonitor, triggerSystemMonitor } // 📊 Системный мониторинг
export { systemHealthCheck, triggerHealthCheck, healthTestHandler } // 💚 Проверка здоровья системы
export { generateVeo3Video } // 🎬 VEO3 видео генерация через Kie.ai API

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
export * from './logMonitor' // 📊 Функции мониторинга логов
export * from './criticalErrorMonitor' // 🚨💚 Функции критического мониторинга
export * from './instagramApifyScraper' // 📱 RILS парсер через Apify
// TEMP DISABLED: export * from './competitorAutoParser' // ⏰ Автоматический парсинг конкурентов
export * from './competitorDelivery' // 📬 Доставка рилсов конкурентов
export * from './systemMonitor' // 📊 Системный мониторинг
export * from './systemHealthCheck' // 💚 Проверка здоровья системы
export * from './generateVeo3Video' // 🎬 VEO3 видео генерация через Kie.ai API

export default functions
