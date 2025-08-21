/**
 * Тестовые события для Inngest Dashboard
 * Instagram-AI-Scraper & Content Agent
 */

export const testEvents = {
  /**
   * Job 1: Find Competitors
   * Событие: instagram/scraper-v2
   * Функция: findCompetitors (расширение instagramScraperV2)
   */
  findCompetitors: {
    name: 'instagram/scraper-v2',
    data: {
      username: 'test_user',
      similar_users_count: 10,
      min_followers: 1000,
      project_id: 123,
      bot_name: 'ai_koshey_bot',
      telegram_id: '144022504',
    },
    user: {
      id: 'test-user-001',
    },
    ts: Date.now(),
  },

  /**
   * Job 2: Analyze Competitor Reels
   * Событие: instagram/analyze-reels
   * Функция: analyzeCompetitorReels
   */
  analyzeCompetitorReels: {
    name: 'instagram/analyze-reels',
    data: {
      comp_username: 'test_competitor',
      project_id: 123,
      days_limit: 14,
      min_views: 1000,
      bot_name: 'ai_koshey_bot',
      telegram_id: '144022504',
    },
    user: {
      id: 'test-user-002',
    },
    ts: Date.now(),
  },

  /**
   * Job 3: Extract Top Content
   * Событие: instagram/extract-top
   * Функция: extractTopContent
   */
  extractTopContent: {
    name: 'instagram/extract-top',
    data: {
      comp_username: 'test_competitor',
      project_id: 123,
      days_limit: 14,
      limit: 10,
    },
    user: {
      id: 'test-user-003',
    },
    ts: Date.now(),
  },

  /**
   * Job 4: Generate Content Scripts
   * Событие: instagram/generate-scripts
   * Функция: generateContentScripts
   */
  generateContentScripts: {
    name: 'instagram/generate-scripts',
    data: {
      reel_id: 'test_reel_123',
      project_id: 123,
      openai_api_key: 'test-key-placeholder',
    },
    user: {
      id: 'test-user-004',
    },
    ts: Date.now(),
  },
}

/**
 * Полный тестовый workflow для демонстрации
 */
export const fullWorkflowTest = {
  /**
   * Шаг 1: Найти конкурентов
   */
  step1_findCompetitors: {
    name: 'instagram/scraper-v2',
    data: {
      username: 'neuro_blogger',
      similar_users_count: 5,
      min_followers: 5000,
      project_id: 999,
      bot_name: 'ai_koshey_bot',
      telegram_id: '144022504',
    },
    user: { id: 'workflow-test-001' },
    ts: Date.now(),
  },

  /**
   * Шаг 2: Проанализировать рилсы конкурента
   */
  step2_analyzeReels: {
    name: 'instagram/analyze-reels',
    data: {
      comp_username: 'competitor_found_in_step1',
      project_id: 999,
      days_limit: 14,
      min_views: 5000,
      bot_name: 'ai_koshey_bot',
      telegram_id: '144022504',
    },
    user: { id: 'workflow-test-002' },
    ts: Date.now(),
  },

  /**
   * Шаг 3: Извлечь топ контент
   */
  step3_extractTop: {
    name: 'instagram/extract-top',
    data: {
      comp_username: 'competitor_found_in_step1',
      project_id: 999,
      days_limit: 14,
      limit: 10,
    },
    user: { id: 'workflow-test-003' },
    ts: Date.now(),
  },

  /**
   * Шаг 4: Генерация скриптов
   */
  step4_generateScripts: {
    name: 'instagram/generate-scripts',
    data: {
      reel_id: 'top_reel_from_step3',
      project_id: 999,
      openai_api_key: process.env.OPENAI_API_KEY || 'test-key-placeholder',
    },
    user: { id: 'workflow-test-004' },
    ts: Date.now(),
  },
}

/**
 * Тестовые данные для базы данных
 */
export const testDatabaseData = {
  /**
   * Пример данных для таблицы reels_analysis
   * Необходимо для тестирования extractTopContent и generateContentScripts
   */
  reelsAnalysisData: {
    id: 'test-reel-uuid-123',
    comp_username: 'test_competitor',
    reel_id: 'test_reel_123',
    ig_reel_url: 'https://www.instagram.com/reel/test_reel_123/',
    caption: 'Тестовый рилс для проверки функций',
    views_count: 10000,
    likes_count: 500,
    comments_count: 50,
    created_at_instagram: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString(),
    project_id: 123,
  },

  /**
   * Пример данных для таблицы competitors
   * Необходимо для тестирования findCompetitors
   */
  competitorsData: {
    id: 'test-competitor-uuid-456',
    query_username: 'test_user',
    comp_username: 'test_competitor',
    followers_count: 15000,
    category: 'lifestyle',
    bio: 'Тестовый конкурент для проверки функций',
    ig_url: 'https://www.instagram.com/test_competitor/',
    project_id: 123,
  },
}

/**
 * Команды для тестирования через Inngest Dashboard
 */
export const dashboardCommands = {
  findCompetitors: `
    // Отправить событие для поиска конкурентов
    await inngest.send(${JSON.stringify(testEvents.findCompetitors, null, 2)});
  `,

  analyzeCompetitorReels: `
    // Отправить событие для анализа рилсов
    await inngest.send(${JSON.stringify(
      testEvents.analyzeCompetitorReels,
      null,
      2
    )});
  `,

  extractTopContent: `
    // Отправить событие для извлечения топ контента
    await inngest.send(${JSON.stringify(
      testEvents.extractTopContent,
      null,
      2
    )});
  `,

  generateContentScripts: `
    // Отправить событие для генерации скриптов
    await inngest.send(${JSON.stringify(
      testEvents.generateContentScripts,
      null,
      2
    )});
  `,
}

export default testEvents
