#!/usr/bin/env bun

/**
 * Тестовые шаблоны данных для Instagram Inngest функций
 *
 * Основано на лучших практиках Inngest:
 * - Используем правильные типы данных (string для telegram_id)
 * - Добавляем уникальные id для идемпотентности
 * - Задаем дефолтные значения для всех параметров
 * - Добавляем timestamp для отслеживания времени
 */

// Базовый шаблон для всех функций
const baseTemplate = {
  project_id: 1,
  requester_telegram_id: '144022504', // ВАЖНО: должен быть string, не number
  metadata: {
    timestamp: () => new Date().toISOString(),
    test_env: 'development' as const,
    version: '1.0.0',
  },
}

// Генератор уникальных ID для идемпотентности
const generateEventId = (functionName: string, testCase: string) => {
  const timestamp = Date.now()
  return `${functionName}-${testCase}-${timestamp}`
}

// 1. Find Competitors (Job 1)
export const findCompetitorsTestData = {
  // Дефолтные значения
  default: {
    id: () => generateEventId('findCompetitors', 'default'),
    name: 'instagram/find-competitors' as const,
    data: {
      ...baseTemplate,
      username_or_id: 'alexyanovsky',
      max_users: 3,
      min_followers: 1000,
      metadata: {
        ...baseTemplate.metadata,
        test: 'default-competitors',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с большим количеством пользователей
  large_batch: {
    id: () => generateEventId('findCompetitors', 'large-batch'),
    name: 'instagram/find-competitors' as const,
    data: {
      ...baseTemplate,
      username_or_id: 'alexyanovsky',
      max_users: 10,
      min_followers: 5000,
      metadata: {
        ...baseTemplate.metadata,
        test: 'large-batch-competitors',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с минимальными требованиями
  minimal: {
    id: () => generateEventId('findCompetitors', 'minimal'),
    name: 'instagram/find-competitors' as const,
    data: {
      ...baseTemplate,
      username_or_id: 'alexyanovsky',
      max_users: 1,
      min_followers: 100,
      metadata: {
        ...baseTemplate.metadata,
        test: 'minimal-competitors',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
}

// 2. Analyze Competitor Reels (Job 2)
export const analyzeCompetitorReelsTestData = {
  // Дефолтные значения
  default: {
    id: () => generateEventId('analyzeCompetitorReels', 'default'),
    name: 'instagram/analyze-reels' as const,
    data: {
      ...baseTemplate,
      username: 'alexyanovsky',
      days_back: 7,
      max_reels: 5,
      metadata: {
        ...baseTemplate.metadata,
        test: 'default-reels-analysis',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с большим периодом
  extended_period: {
    id: () => generateEventId('analyzeCompetitorReels', 'extended'),
    name: 'instagram/analyze-reels' as const,
    data: {
      ...baseTemplate,
      username: 'alexyanovsky',
      days_back: 30,
      max_reels: 15,
      metadata: {
        ...baseTemplate.metadata,
        test: 'extended-period-reels',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с минимальными параметрами
  minimal: {
    id: () => generateEventId('analyzeCompetitorReels', 'minimal'),
    name: 'instagram/analyze-reels' as const,
    data: {
      ...baseTemplate,
      username: 'alexyanovsky',
      days_back: 3,
      max_reels: 2,
      metadata: {
        ...baseTemplate.metadata,
        test: 'minimal-reels-analysis',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
}

// 3. Extract Top Content (Job 3)
export const extractTopContentTestData = {
  // Дефолтные значения
  default: {
    id: () => generateEventId('extractTopContent', 'default'),
    name: 'instagram/extract-top-content' as const,
    data: {
      ...baseTemplate,
      username: 'alexyanovsky',
      days_back: 14,
      limit: 5,
      metadata: {
        ...baseTemplate.metadata,
        test: 'default-top-content',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с большим лимитом
  large_limit: {
    id: () => generateEventId('extractTopContent', 'large-limit'),
    name: 'instagram/extract-top-content' as const,
    data: {
      ...baseTemplate,
      username: 'alexyanovsky',
      days_back: 30,
      limit: 20,
      metadata: {
        ...baseTemplate.metadata,
        test: 'large-limit-top-content',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с минимальными параметрами
  minimal: {
    id: () => generateEventId('extractTopContent', 'minimal'),
    name: 'instagram/extract-top-content' as const,
    data: {
      ...baseTemplate,
      username: 'alexyanovsky',
      days_back: 7,
      limit: 3,
      metadata: {
        ...baseTemplate.metadata,
        test: 'minimal-top-content',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
}

// 4. Generate Content Scripts (Job 4)
export const generateContentScriptsTestData = {
  // Дефолтные значения
  default: {
    id: () => generateEventId('generateContentScripts', 'default'),
    name: 'instagram/generate-content-scripts' as const,
    data: {
      ...baseTemplate,
      reel_id: 'test_reel_default',
      ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
      metadata: {
        ...baseTemplate.metadata,
        test: 'default-content-scripts',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с реальным рилсом
  real_reel: {
    id: () => generateEventId('generateContentScripts', 'real-reel'),
    name: 'instagram/generate-content-scripts' as const,
    data: {
      ...baseTemplate,
      reel_id: '3565423054066818531_11632928642', // Реальный ID из БД
      ig_reel_url: 'https://instagram.com/p/DHp5jLHt8v6/',
      metadata: {
        ...baseTemplate.metadata,
        test: 'real-reel-scripts',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с другим рилсом
  alternative_reel: {
    id: () => generateEventId('generateContentScripts', 'alternative'),
    name: 'instagram/generate-content-scripts' as const,
    data: {
      ...baseTemplate,
      reel_id: 'test_reel_alternative',
      ig_reel_url: 'https://instagram.com/p/CExample123/',
      metadata: {
        ...baseTemplate.metadata,
        test: 'alternative-reel-scripts',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
}

// 5. Instagram Scraper V2 (Job 5)
export const instagramScraperV2TestData = {
  // Дефолтные значения
  default: {
    id: () => generateEventId('instagramScraperV2', 'default'),
    name: 'instagram/scrape-similar-users' as const,
    data: {
      ...baseTemplate,
      username_or_id: 'alexyanovsky',
      max_users: 5,
      max_reels_per_user: 3,
      scrape_reels: true,
      metadata: {
        ...baseTemplate.metadata,
        test: 'default-scraper',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест без рилсов
  users_only: {
    id: () => generateEventId('instagramScraperV2', 'users-only'),
    name: 'instagram/scrape-similar-users' as const,
    data: {
      ...baseTemplate,
      username_or_id: 'alexyanovsky',
      max_users: 10,
      max_reels_per_user: 0,
      scrape_reels: false,
      metadata: {
        ...baseTemplate.metadata,
        test: 'users-only-scraper',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
  // Тест с большим количеством рилсов
  many_reels: {
    id: () => generateEventId('instagramScraperV2', 'many-reels'),
    name: 'instagram/scrape-similar-users' as const,
    data: {
      ...baseTemplate,
      username_or_id: 'alexyanovsky',
      max_users: 3,
      max_reels_per_user: 10,
      scrape_reels: true,
      metadata: {
        ...baseTemplate.metadata,
        test: 'many-reels-scraper',
        timestamp: () => new Date().toISOString(),
      },
    },
  },
}

// Экспортируем все тестовые данные
export const allTestData = {
  findCompetitors: findCompetitorsTestData,
  analyzeCompetitorReels: analyzeCompetitorReelsTestData,
  extractTopContent: extractTopContentTestData,
  generateContentScripts: generateContentScriptsTestData,
  instagramScraperV2: instagramScraperV2TestData,
}

// Функция для получения всех дефолтных тестовых данных
export const getDefaultTestData = () => {
  return {
    findCompetitors: findCompetitorsTestData.default,
    analyzeCompetitorReels: analyzeCompetitorReelsTestData.default,
    extractTopContent: extractTopContentTestData.default,
    generateContentScripts: generateContentScriptsTestData.default,
    instagramScraperV2: instagramScraperV2TestData.default,
  }
}

// Функция для генерации тестовых данных с динамическими значениями
export const generateTestEvent = (
  functionName: keyof typeof allTestData,
  testCase = 'default'
) => {
  const testData =
    allTestData[functionName][
      testCase as keyof (typeof allTestData)[typeof functionName]
    ]

  if (!testData) {
    throw new Error(
      `Test case "${testCase}" not found for function "${functionName}"`
    )
  }

  // Вызываем функции для генерации динамических значений
  const event = JSON.parse(JSON.stringify(testData))

  if (typeof event.id === 'function') {
    event.id = event.id()
  }

  if (typeof event.data.metadata.timestamp === 'function') {
    event.data.metadata.timestamp = event.data.metadata.timestamp()
  }

  return event
}

// Экспортируем константы для использования в тестах
export const TEST_PROJECT_ID = 1
export const TEST_TELEGRAM_ID = '144022504'
export const TEST_USERNAME = 'neuro_coder'
