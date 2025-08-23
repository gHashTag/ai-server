/**
 * Демонстрация односторонней синхронизации Dart AI → GitHub Issues
 * Создает GitHub Issues из задач Dart AI
 */

const axios = require('axios');
require('dotenv').config();

// Конфигурация
const DART_AI_API_URL = process.env.DART_AI_API_URL || 'https://app.dartai.com/api/v0';
const DART_AI_API_KEY = process.env.DART_AI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.DEFAULT_GITHUB_REPO || 'gHashTag/ai-server';

// Цвета для консоли
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Получить задачи из Dart AI
 */
async function getDartAITasks() {
  try {
    log('📋 Получение задач из Dart AI...', colors.blue);
    
    const response = await axios.get(`${DART_AI_API_URL}/tasks`, {
      headers: {
        'Authorization': `Bearer ${DART_AI_API_KEY}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Dart-GitHub-Sync/1.0.0'
      },
      timeout: 10000
    });

    const tasks = response.data.results || [];
    const count = response.data.count || tasks.length;

    log(`✅ Получено задач: ${count}`, colors.green);
    return { tasks, count, success: true };
    
  } catch (error) {
    log(`❌ Ошибка получения задач: ${error.message}`, colors.red);
    return { tasks: [], count: 0, success: false, error: error.message };
  }
}

/**
 * Извлечь текст из rich-text описания Dart AI
 */
function extractDescriptionText(description) {
  if (typeof description === 'string') return description;
  if (!description || !description.root) return '';
  
  try {
    function extractText(node) {
      if (node.text) return node.text;
      if (node.children) {
        return node.children.map(extractText).join('');
      }
      return '';
    }
    
    return extractText(description.root);
  } catch (error) {
    return JSON.stringify(description);
  }
}

/**
 * Форматировать описание задачи для GitHub Issue
 */
function formatTaskDescription(task) {
  const description = extractDescriptionText(task.description) || 'Без описания';

  let formattedDescription = description;
  
  formattedDescription += `\n\n---\n## 🎯 Dart AI Task Info\n`;
  formattedDescription += `**Task ID:** \`${task.duid}\`\n`;
  formattedDescription += `**Space:** ${task.spaceDuid}\n`;
  
  if (task.kind) {
    formattedDescription += `**Type:** ${task.kind}\n`;
  }
  
  if (task.statusDuid) {
    formattedDescription += `**Status DUID:** ${task.statusDuid}\n`;
  }

  formattedDescription += `**Создано:** ${task.createdAt}\n`;
  formattedDescription += `**Обновлено:** ${task.updatedAt}\n`;

  formattedDescription += `\n> 🔗 *Синхронизировано из Dart AI: ${new Date().toLocaleString('ru-RU')}*`;

  return formattedDescription;
}

/**
 * Создать GitHub Issue из задачи Dart AI
 */
async function createGitHubIssueFromTask(task, repository) {
  if (!GITHUB_TOKEN) {
    log('❌ GitHub токен не настроен', colors.red);
    return null;
  }

  try {
    log(`📝 Создание GitHub Issue из задачи: "${task.title}"`, colors.yellow);

    const issueData = {
      title: `[Dart AI] ${task.title}`,
      body: formatTaskDescription(task),
      labels: ['dart-ai-sync', 'automated']
    };

    const response = await axios.post(
      `https://api.github.com/repos/${repository}/issues`,
      issueData,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Dart-GitHub-Sync/1.0.0'
        }
      }
    );

    const issue = {
      number: response.data.number,
      title: response.data.title,
      body: response.data.body,
      state: response.data.state,
      repository,
      assignees: response.data.assignees?.map(a => a.login) || [],
      labels: response.data.labels?.map(l => l.name) || [],
      created_at: response.data.created_at,
      updated_at: response.data.updated_at,
      html_url: response.data.html_url
    };

    log(`✅ GitHub Issue создан: #${issue.number}`, colors.green);
    log(`🔗 URL: ${issue.html_url}`, colors.green);

    return issue;
    
  } catch (error) {
    log(`❌ Ошибка создания GitHub Issue: ${error.message}`, colors.red);
    if (error.response?.data) {
      log(`📋 Детали: ${JSON.stringify(error.response.data, null, 2)}`, colors.yellow);
    }
    return null;
  }
}

/**
 * Основная функция синхронизации
 */
async function syncDartAIToGitHub() {
  log('\n🚀 Демонстрация синхронизации Dart AI → GitHub Issues\n', colors.bold);

  // Проверка конфигурации
  if (!DART_AI_API_KEY) {
    log('❌ DART_AI_API_KEY не настроен', colors.red);
    return;
  }

  if (!GITHUB_TOKEN) {
    log('❌ GITHUB_TOKEN не настроен', colors.red);
    return;
  }

  log(`🔗 Dart AI API: ${DART_AI_API_URL}`, colors.blue);
  log(`📂 GitHub Repo: ${GITHUB_REPO}`, colors.blue);

  // Получаем задачи из Dart AI
  const tasksResult = await getDartAITasks();
  
  if (!tasksResult.success) {
    log('💥 Не удалось получить задачи из Dart AI', colors.red);
    return;
  }

  if (tasksResult.tasks.length === 0) {
    log('ℹ️  Нет задач для синхронизации', colors.yellow);
    return;
  }

  // Синхронизируем первые 3 задачи для демонстрации
  log(`\n📋 Синхронизация первых 3 задач из ${tasksResult.count}...`, colors.blue);
  
  const tasksToSync = tasksResult.tasks.slice(0, 3);
  let successCount = 0;
  const results = [];

  for (let i = 0; i < tasksToSync.length; i++) {
    const task = tasksToSync[i];
    log(`\n${i + 1}/${tasksToSync.length}. Обработка: "${task.title}"`, colors.yellow);
    
    const issue = await createGitHubIssueFromTask(task, GITHUB_REPO);
    
    if (issue) {
      successCount++;
      results.push({
        task_duid: task.duid,
        task_title: task.title,
        issue_number: issue.number,
        issue_url: issue.html_url
      });
    }

    // Пауза между запросами
    if (i < tasksToSync.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Итоги
  log('\n📊 Результаты синхронизации:', colors.bold);
  log(`✅ Успешно синхронизировано: ${successCount}/${tasksToSync.length}`, colors.green);
  
  if (results.length > 0) {
    log('\n🎯 Созданные GitHub Issues:', colors.blue);
    results.forEach((result, index) => {
      log(`   ${index + 1}. Issue #${result.issue_number}: "${result.task_title}"`, colors.green);
      log(`      🔗 ${result.issue_url}`, colors.reset);
      log(`      📦 Dart AI Task: ${result.task_duid}`, colors.reset);
    });
  }

  log('\n✨ Синхронизация завершена!', colors.bold + colors.green);
  
  return {
    success: true,
    total_tasks: tasksResult.count,
    processed: tasksToSync.length,
    successful: successCount,
    results
  };
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  syncDartAIToGitHub()
    .then(result => {
      if (result && result.success) {
        log('\n🎉 Демонстрация завершена успешно!', colors.bold + colors.green);
      } else {
        log('\n💥 Демонстрация завершена с ошибками', colors.bold + colors.red);
      }
    })
    .catch(error => {
      log(`\n💥 Критическая ошибка: ${error.message}`, colors.bold + colors.red);
      console.error(error);
    });
}

module.exports = { 
  syncDartAIToGitHub, 
  getDartAITasks, 
  createGitHubIssueFromTask,
  extractDescriptionText,
  formatTaskDescription
};