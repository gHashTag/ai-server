/**
 * Упрощенный тестовый сервер для проверки Dart AI интеграции
 */

const express = require('express');
const cors = require('cors');

const app = express();
const port = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Мок данных для тестирования
const mockStats = {
  total_syncs: 0,
  successful_syncs: 0,
  failed_syncs: 0,
  last_sync: null,
  api_configured: !!process.env.DART_AI_API_KEY,
  github_configured: !!process.env.GITHUB_TOKEN,
  api_url: process.env.DART_AI_API_URL || 'https://api.dartai.com'
};

// Dart AI API Routes

// GET /api/dart-ai/status
app.get('/api/dart-ai/status', (req, res) => {
  const health_check = {
    success: false,
    message: 'Dart AI API недоступен (тестовый режим)',
    details: {
      api_url: mockStats.api_url,
      api_configured: mockStats.api_configured
    }
  };

  res.json({
    success: true,
    status: 'operational',
    health_check,
    sync_stats: mockStats,
    timestamp: new Date().toISOString()
  });

  console.log('✅ Status request processed');
});

// POST /api/dart-ai/sync/github-issue
app.post('/api/dart-ai/sync/github-issue', (req, res) => {
  const { issue_number, repository } = req.body;

  if (!issue_number || !repository) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: issue_number, repository'
    });
  }

  mockStats.total_syncs++;
  mockStats.successful_syncs++;
  mockStats.last_sync = new Date().toISOString();

  console.log(`🔄 GitHub Issue sync: #${issue_number} in ${repository}`);

  res.json({
    success: true,
    message: 'Issue synced successfully (mock)',
    issue_number,
    repository,
    result: {
      success: true,
      tasks_created: 1,
      tasks_updated: 0
    }
  });
});

// POST /api/dart-ai/sync/task
app.post('/api/dart-ai/sync/task', (req, res) => {
  const { task_id, repository } = req.body;

  if (!task_id || !repository) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: task_id, repository'
    });
  }

  mockStats.total_syncs++;
  mockStats.successful_syncs++;
  mockStats.last_sync = new Date().toISOString();

  console.log(`🔄 Dart AI task sync: ${task_id} to ${repository}`);

  res.json({
    success: true,
    message: 'Task synced successfully (mock)',
    task_id,
    repository,
    result: {
      success: true,
      issues_created: 1,
      tasks_updated: 1
    }
  });
});

// POST /api/dart-ai/sync/bulk-issues
app.post('/api/dart-ai/sync/bulk-issues', (req, res) => {
  const { repository, state = 'open', limit = 50 } = req.body;

  if (!repository) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameter: repository'
    });
  }

  const mockResults = {
    total: Math.min(limit, 10), // Симулируем 10 issues
    successful: Math.min(limit, 8), // 8 успешных
    failed: 2, // 2 неудачных
    errors: ['Issue #123: Rate limit exceeded', 'Issue #456: Access denied']
  };

  mockStats.total_syncs += mockResults.total;
  mockStats.successful_syncs += mockResults.successful;
  mockStats.failed_syncs += mockResults.failed;
  mockStats.last_sync = new Date().toISOString();

  console.log(`🔄 Bulk sync: ${mockResults.total} issues in ${repository}`);

  res.json({
    success: mockResults.failed === 0,
    message: `Bulk sync completed: ${mockResults.successful}/${mockResults.total} successful (mock)`,
    repository,
    results: mockResults
  });
});

// Webhook endpoints (мок)

// POST /webhooks/dart-ai/tasks
app.post('/webhooks/dart-ai/tasks', (req, res) => {
  const { headers, body } = req;
  const event = headers['x-dart-event'];
  const delivery = headers['x-dart-delivery'] || 'test-delivery';

  console.log(`🔔 Dart AI webhook: ${event}, delivery: ${delivery}`);
  console.log('📦 Payload:', JSON.stringify(body, null, 2));

  mockStats.total_syncs++;
  mockStats.successful_syncs++;
  mockStats.last_sync = new Date().toISOString();

  res.json({
    success: true,
    message: 'Webhook processed successfully (mock)',
    event,
    delivery,
    processing_time_ms: 50,
    result: 'action_taken'
  });
});

// POST /webhooks/github/issues
app.post('/webhooks/github/issues', (req, res) => {
  const { headers, body } = req;
  const event = headers['x-github-event'];
  const action = body.action;

  console.log(`🔔 GitHub webhook: ${event}, action: ${action}`);
  console.log('📦 Issue:', body.issue?.number, body.repository?.full_name);

  mockStats.total_syncs++;
  mockStats.successful_syncs++;
  mockStats.last_sync = new Date().toISOString();

  res.json({
    success: true,
    message: 'GitHub webhook processed (mock)',
    action,
    issue: body.issue?.number,
    processing_time_ms: 75,
    result: 'synced'
  });
});

// Корневая страница
app.get('/', (req, res) => {
  res.json({
    message: 'Dart AI Integration Test Server',
    version: '1.0.0',
    endpoints: {
      'GET /api/dart-ai/status': 'Get integration status',
      'POST /api/dart-ai/sync/github-issue': 'Sync GitHub Issue to Dart AI',
      'POST /api/dart-ai/sync/task': 'Sync Dart AI task to GitHub',
      'POST /api/dart-ai/sync/bulk-issues': 'Bulk sync GitHub Issues',
      'POST /webhooks/dart-ai/tasks': 'Dart AI webhook handler',
      'POST /webhooks/github/issues': 'GitHub Issues webhook handler'
    }
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`\n🚀 Dart AI Test Server запущен на http://localhost:${port}`);
  console.log(`📊 Статус: http://localhost:${port}/api/dart-ai/status`);
  console.log(`🔑 DART_AI_API_KEY: ${process.env.DART_AI_API_KEY ? '✅ Настроен' : '❌ Не найден'}`);
  console.log(`🐙 GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? '✅ Настроен' : '❌ Не найден'}`);
  console.log(`\n🧪 Для тестирования запустите: node tests/dart-ai/test-dart-ai-integration.js\n`);
});